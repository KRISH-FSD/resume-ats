import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///ats_resume.db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-ats-resume-secret")
    JWT_TOKEN_LOCATION = ["cookies", "headers"]
    JWT_COOKIE_CSRF_PROTECT = False
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
