# ats_system/fit_logic.py - Multi-factor candidate fit scoring

from .config import (
    FIT_EXPERIENCE_WEIGHT,
    FIT_SKILLS_WEIGHT,
    FIT_EDUCATION_WEIGHT,
    FIT_CERTIFICATION_WEIGHT,
    FRESHER_EXPERIENCE_BOOST,
)


def calculate_fit_score(
    ats_score,
    resume_years,
    jd_years_required,
    education_score=50,
    certification_count=0,
    role_level="fresher",
):
    """
    Multi-factor fit score:
      - Skills/ATS score    (55%)
      - Experience match    (30%)
      - Education level     (10%)
      - Certifications      (5%)
    Returns: 0-100
    """

    if jd_years_required <= 0:
        exp_ratio = 1.0
    elif resume_years <= 0:
        if role_level in ["fresher", "intern"]:
            resume_years = FRESHER_EXPERIENCE_BOOST
            exp_ratio = resume_years / max(jd_years_required, 1)
        else:
            exp_ratio = 0.0
    elif resume_years >= jd_years_required:
        exp_ratio = min(1.0 + (resume_years - jd_years_required) * 0.03, 1.08)
    else:
        exp_ratio = resume_years / jd_years_required

    experience_component = exp_ratio * FIT_EXPERIENCE_WEIGHT
    skills_component = (ats_score / 100) * FIT_SKILLS_WEIGHT
    edu_component = (education_score / 100) * FIT_EDUCATION_WEIGHT
    cert_score = min(certification_count * 35, 100)
    cert_component = (cert_score / 100) * FIT_CERTIFICATION_WEIGHT

    total = experience_component + skills_component + edu_component + cert_component
    return round(min(total, 100), 2)
