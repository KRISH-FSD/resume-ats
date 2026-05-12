from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request,
)
from flask_migrate import Migrate
from sqlalchemy import inspect
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

from ats_system.analyzer_service import analyze_resume_file
from ats_system.ai_service import (
    generate_objective,
    generate_project_description,
    optimize_resume,
    rewrite_bullet,
)
from config import Config
from extensions import db
from models import ATSResult, TokenBlocklist
from models import User

app = Flask(__name__)
app.config.from_object(Config)

CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
)
db.init_app(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return db.session.query(TokenBlocklist.id).filter_by(jti=jti).scalar() is not None


@app.errorhandler(Exception)
def handle_exception(exc):
    if isinstance(exc, HTTPException):
        return jsonify({"message": exc.name, "error": exc.description}), exc.code
    app.logger.exception("Unhandled server error")
    return jsonify({"message": "Internal Server Error", "error": str(exc)}), 500


def get_optional_jwt_identity_safely():
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        return int(user_id) if user_id else None
    except Exception as exc:
        app.logger.info("Ignoring invalid optional auth token: %s", exc)
        return None


def serialize_user(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username,
    }


def ensure_user_password_column():
    try:
        inspector = inspect(db.engine)
        columns = [column["name"] for column in inspector.get_columns("users")]
        if "password_hash" not in columns:
            with db.engine.begin() as connection:
                connection.exec_driver_sql("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)")
    except Exception as exc:
        app.logger.info("User auth schema check skipped: %s", exc)


def ensure_ats_result_columns():
    expected_columns = {
        "recruiter_score": "FLOAT",
        "full_result": "TEXT",
    }
    try:
        inspector = inspect(db.engine)
        columns = {column["name"] for column in inspector.get_columns("ats_results")}
        with db.engine.begin() as connection:
            for column_name, column_type in expected_columns.items():
                if column_name not in columns:
                    connection.exec_driver_sql(
                        f"ALTER TABLE ats_results ADD COLUMN {column_name} {column_type}"
                    )
    except Exception as exc:
        app.logger.info("ATS history schema check skipped: %s", exc)


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account already exists for this email."}), 409

    username_base = email.split("@")[0][:40] or "user"
    username = username_base
    suffix = 1
    while User.query.filter_by(username=username).first():
        suffix += 1
        username = f"{username_base}{suffix}"[:50]

    user = User(
        name=name,
        email=email,
        username=username,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    return jsonify({
        "message": "Registration successful.",
        "user": serialize_user(user),
        "access_token": access_token,
        "refresh_token": refresh_token,
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    user = User.query.filter_by(email=email).first() if email else None
    if not user or not user.password_hash or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password."}), 401

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    return jsonify({
        "message": "Login successful.",
        "user": serialize_user(user),
        "access_token": access_token,
        "refresh_token": refresh_token,
    })


@app.route("/api/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def auth_refresh():
    user_id = get_jwt_identity()
    return jsonify({"access_token": create_access_token(identity=user_id)})


@app.route("/api/auth/logout", methods=["POST"])
@jwt_required(optional=True)
def auth_logout():
    token = get_jwt()
    jti = token.get("jti") if token else None
    if jti:
        db.session.add(TokenBlocklist(jti=jti))
        db.session.commit()
    return jsonify({"message": "Logged out successfully."})


@app.route("/api/ats-check", methods=["POST"])
@jwt_required()
def ats_check():
    resume_file = request.files.get("resume")
    job_description = request.form.get("job_description")
    result_data, status = analyze_resume_file(resume_file, job_description, mode="final")
    if status != 200:
        return jsonify(result_data), status

    current_user_id = int(get_jwt_identity())
    if current_user_id:
        try:
            ats_entry = ATSResult(
                user_id=current_user_id,
                resume_filename=resume_file.filename if resume_file else "",
                job_description=job_description or "",
                ats_score=result_data.get("ats_score", 0),
                fit_score=result_data.get("fit_score", 0),
                recruiter_score=result_data.get("recruiter_score", 0),
                verdict=(result_data.get("verdict") or {}).get("label", ""),
                matched_skills=result_data.get("matched_skills", []),
                missing_skills=result_data.get("missing_skills", []),
                suggestions=result_data.get("suggestions", []),
                full_result=result_data,
            )
            db.session.add(ats_entry)
            db.session.commit()
        except Exception as exc:
            app.logger.warning("Could not save ATS scan history: %s", exc)
            db.session.rollback()

    return jsonify(result_data)


@app.route("/api/ats/preview", methods=["POST"])
@jwt_required()
def ats_preview():
    result_data, status = analyze_resume_file(
        request.files.get("resume"),
        request.form.get("job_description"),
        mode="preview",
    )
    return jsonify(result_data), status


@app.route("/api/ai/rewrite-bullet", methods=["POST"])
@jwt_required()
def ai_rewrite_bullet():
    return jsonify(rewrite_bullet(request.get_json(silent=True) or {}))


@app.route("/api/ai/optimize-resume", methods=["POST"])
@jwt_required()
def ai_optimize_resume():
    return jsonify(optimize_resume(request.get_json(silent=True) or {}))


@app.route("/api/ai/objective", methods=["POST"])
@jwt_required()
def ai_objective():
    return jsonify(generate_objective(request.get_json(silent=True) or {}))


@app.route("/api/ai/project-description", methods=["POST"])
@jwt_required()
def ai_project_description():
    return jsonify(generate_project_description(request.get_json(silent=True) or {}))


@app.route("/api/ats/history", methods=["GET"])
@jwt_required()
def ats_history():
    user_id = get_jwt_identity()
    results = (
        ATSResult.query.filter_by(user_id=int(user_id))
        .order_by(ATSResult.created_at.desc())
        .limit(20)
        .all()
    )
    return jsonify([
        {
            "id": item.id,
            "resume_filename": item.resume_filename,
            "ats_score": item.ats_score,
            "fit_score": item.fit_score,
            "verdict": item.verdict,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in results
    ])


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "ATS Resume"})


with app.app_context():
    db.create_all()
    ensure_user_password_column()
    ensure_ats_result_columns()


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
