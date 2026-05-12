# ats_system/ats_logic.py — Skill extraction, similarity & ATS scoring

from rapidfuzz import fuzz
from .config import (
    SKILLS_BY_CATEGORY, SKILLS_LIST, CATEGORY_WEIGHTS,
    SKILL_MATCH_WEIGHT, SIMILARITY_WEIGHT, SECTION_BONUS_WEIGHT,
    FORMAT_QUALITY_WEIGHT, BASE_SCORE, FUZZY_MATCH_THRESHOLD
)
from .text_utils import normalize_skill
import re


# ══════════════════════════════════════════════════════════════════
#  SKILL EXTRACTION
# ══════════════════════════════════════════════════════════════════

def extract_skills(text):
    """Extract all known skills from text (flat list)."""
    if not text:
        return []
    text_lower = text.lower()
    return list({normalize_skill(s) for s in SKILLS_LIST if _skill_in_text(s, text_lower)})


def extract_skills_by_category(text):
    """Extract skills grouped by category.
    Returns: {"programming_languages": ["python", "java"], ...}
    """
    if not text:
        return {}

    text_lower = text.lower()
    result = {}

    for category, skills in SKILLS_BY_CATEGORY.items():
        matched = []
        for skill in skills:
            if _skill_in_text(skill, text_lower):
                normalized = normalize_skill(skill)
                if normalized not in matched:
                    matched.append(normalized)
        if matched:
            result[category] = matched

    return result


def extract_jd_keywords(jd_text):
    """Extract keywords from a Job Description.
    Returns: (flat_skills_list, skills_by_category_dict)
    """
    if not jd_text:
        return [], {}
    skills_by_cat = extract_skills_by_category(jd_text)
    all_skills = [s for cat_skills in skills_by_cat.values() for s in cat_skills]
    return list(set(all_skills)), skills_by_cat


def _skill_in_text(skill, text):
    """Check if a skill exists in text with word boundary awareness."""
    escaped = re.escape(skill.lower())
    return bool(re.search(r'(?<![a-z0-9])' + escaped + r'(?![a-z0-9])', text))


# ══════════════════════════════════════════════════════════════════
#  SIMILARITY
# ══════════════════════════════════════════════════════════════════

def calculate_similarity(resume_text, jd_text):
    """Calculate text similarity using rapidfuzz token-set ratio."""
    if not resume_text or not jd_text:
        return 0.0
    return fuzz.token_set_ratio(resume_text, jd_text)


# ══════════════════════════════════════════════════════════════════
#  CATEGORY-WISE SKILL SCORE
# ══════════════════════════════════════════════════════════════════

def calculate_category_skill_score(jd_skills_by_cat, resume_skills_by_cat):
    """Calculate weighted skill match score per category.
    Returns: (overall_score, category_details_dict)
    """
    category_details = {}
    total_weighted_score = 0
    total_weight = 0

    for category, jd_skills in jd_skills_by_cat.items():
        resume_skills = resume_skills_by_cat.get(category, [])
        matched = [s for s in jd_skills if s in resume_skills]
        missing = [s for s in jd_skills if s not in resume_skills]
        match_ratio = len(matched) / len(jd_skills) if jd_skills else 0

        weight = CATEGORY_WEIGHTS.get(category, 5)
        total_weighted_score += match_ratio * weight
        total_weight += weight

        category_details[category] = {
            "matched":     matched,
            "missing":     missing,
            "match_ratio": round(match_ratio * 100, 1),
            "weight":      weight,
        }

    overall = (total_weighted_score / total_weight) * 100 if total_weight > 0 else 0
    return round(overall, 2), category_details


from .text_utils import normalize_skill, get_semantic_similarity

# ...
# ══════════════════════════════════════════════════════════════════
#  ATS SCORE (multi-factor / Startup-level)
# ══════════════════════════════════════════════════════════════════

def calculate_ats_score(jd_skills, resume_skills, similarity,
                        jd_skills_by_cat=None, resume_skills_by_cat=None,
                        section_score=0, resume_text="", jd_text="", sections=None):
    """Calculate comprehensive ATS score combining skill match, semantic relevance, and formatting."""
    
    # 1. Skill Match Component
    if jd_skills_by_cat and resume_skills_by_cat:
        cat_score, _ = calculate_category_skill_score(jd_skills_by_cat, resume_skills_by_cat)
        skill_component = (cat_score / 100) * 40
    else:
        match_ratio = len(set(jd_skills) & set(resume_skills)) / len(jd_skills) if jd_skills else 0
        skill_component = match_ratio * 40

    # 2. Project Relevance (Semantic)
    project_text = sections.get("projects", "") if sections else ""
    project_semantic_score = get_semantic_similarity(project_text, jd_text)
    project_component = (project_semantic_score / 100) * 20
    
    # 3. Experience/General Semantic Relevance
    experience_text = sections.get("experience", "") if sections else resume_text
    exp_semantic_score = get_semantic_similarity(experience_text, jd_text)
    experience_component = (exp_semantic_score / 100) * 20

    # 4. Formatting / ATS Quality
    format_component  = (section_score / 100) * 20

    # Final score
    final = skill_component + project_component + experience_component + format_component
    
    breakdown = {
        "skills_match": round((skill_component/40)*100, 2),
        "experience_relevance": round(exp_semantic_score, 2),
        "project_impact": round(project_semantic_score, 2),
        "formatting_quality": round(section_score, 2)
    }
    
    return round(min(final, 100), 2), breakdown


def analyze_skill_gaps(jd_skills, resume_skills, jd_text):
    """Identify missing skills and attach a priority based on their occurrence/importance."""
    missing = sorted(set(jd_skills) - set(resume_skills))
    gaps = []
    
    # Simple heuristic: If it appears multiple times, it's high priority.
    jd_lower = jd_text.lower()
    for skill in missing:
        count = jd_lower.count(skill.lower())
        priority = "Low"
        if count >= 3 or "required" in skill or "must" in skill:
            priority = "High"
        elif count == 2:
            priority = "Medium"
        gaps.append({"skill": skill, "priority": priority})
        
    return sorted(gaps, key=lambda x: {"High": 1, "Medium": 2, "Low": 3}[x["priority"]])

