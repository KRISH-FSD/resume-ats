# ats_system/recruiter_logic.py — Role detection & recruiter scoring

from .config import (
    STUDENT_PENALTY, NO_CLOUD_PENALTY, NO_LEADERSHIP_PENALTY,
    LEADERSHIP_BONUS, OPEN_SOURCE_BONUS, CERTIFICATION_BONUS,
    DIVERSE_SKILLS_BONUS, ROLE_KEYWORDS
)


# ══════════════════════════════════════════════════════════════════
#  ROLE LEVEL DETECTION
# ══════════════════════════════════════════════════════════════════

def detect_role_level(jd_text):
    """Detect role level from JD text.
    Returns one of: intern, fresher, junior, mid, senior, lead
    """
    text_lower = jd_text.lower()

    # Check from highest to lowest priority
    for level in ["lead", "senior", "mid", "junior", "intern", "fresher"]:
        keywords = ROLE_KEYWORDS.get(level, [])
        if any(kw in text_lower for kw in keywords):
            return level

    return "fresher"


# ══════════════════════════════════════════════════════════════════
#  RECRUITER SCORE
# ══════════════════════════════════════════════════════════════════

def calculate_recruiter_score(fit_score, penalties=None, bonuses=None):
    """Apply human-like recruiter adjustments (penalties & bonuses)."""
    score = fit_score

    if penalties:
        score -= sum(penalties.values())
    if bonuses:
        score += sum(bonuses.values())

    return round(max(min(score, 100), 0), 2)


# ══════════════════════════════════════════════════════════════════
#  PENALTY & BONUS EVALUATION
# ══════════════════════════════════════════════════════════════════

def evaluate_recruiter_adjustments(resume_text, role_level, resume_skills_by_cat):
    """Evaluate role-aware penalties and bonuses.
    Returns: (penalties_dict, bonuses_dict)
    """
    penalties = {}
    bonuses = {}
    text = resume_text.lower()

    # ── PENALTIES ─────────────────────────────────────────────

    # Student applying for non-entry roles
    if role_level in ["junior", "mid", "senior", "lead"]:
        student_indicators = ["student", "currently studying", "pursuing"]
        if any(ind in text for ind in student_indicators):
            penalties["student_profile"] = STUDENT_PENALTY

    # No cloud experience for senior/lead roles
    if role_level in ["senior", "lead"]:
        if not resume_skills_by_cat.get("cloud_devops", []):
            penalties["no_cloud_experience"] = NO_CLOUD_PENALTY

    # No leadership for lead roles
    if role_level == "lead":
        leadership_kw = ["led", "managed", "mentored", "directed", "headed",
                         "supervised", "team lead", "tech lead", "leadership"]
        if not any(kw in text for kw in leadership_kw):
            penalties["no_leadership"] = NO_LEADERSHIP_PENALTY

    # ── BONUSES ───────────────────────────────────────────────

    # Leadership mentions for senior+ roles
    if role_level in ["senior", "lead"]:
        leadership_kw = ["led", "managed", "mentored", "architecture", "team lead", "tech lead"]
        if any(kw in text for kw in leadership_kw):
            bonuses["leadership"] = LEADERSHIP_BONUS

    # Open source contributions
    opensource_kw = ["open source", "open-source", "github contributions", "contributor", "maintainer"]
    if any(kw in text for kw in opensource_kw):
        bonuses["open_source"] = OPEN_SOURCE_BONUS

    # Certifications
    cert_kw = ["certified", "certification", "aws certified", "azure certified",
               "google certified", "pmp", "scrum master"]
    if any(kw in text for kw in cert_kw):
        bonuses["certifications"] = CERTIFICATION_BONUS

    # Diverse skill set (4+ categories)
    if len(resume_skills_by_cat) >= 4:
        bonuses["diverse_skills"] = DIVERSE_SKILLS_BONUS

    return penalties, bonuses
