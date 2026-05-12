from datetime import datetime
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(150), unique=True)
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    ats_results = db.relationship("ATSResult", backref="user", lazy=True)


class ATSResult(db.Model):
    __tablename__ = "ats_results"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    resume_filename = db.Column(db.String(255))
    job_description = db.Column(db.Text)
    ats_score = db.Column(db.Float)
    fit_score = db.Column(db.Float)
    recruiter_score = db.Column(db.Float)
    verdict = db.Column(db.String(100))
    matched_skills = db.Column(db.JSON)
    missing_skills = db.Column(db.JSON)
    suggestions = db.Column(db.JSON)
    full_result = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
