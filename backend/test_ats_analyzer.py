import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ats_system.analyzer_service import (
    analyze_resume_text,
    calculate_advanced_score,
    extract_requirement_terms,
    extract_years_of_experience,
    generate_score_safe_verdict,
)
from ats_system.ats_logic import extract_jd_keywords
from ats_system import text_utils

FIXTURES = Path(__file__).parent / "tests" / "fixtures"


def read_fixture(name):
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_low_score_verdict_never_good_match():
    verdict = generate_score_safe_verdict(16, [], {"skills_match": 0, "semantic_alignment": 10}, 0, 2)
    assert verdict["status"] == "needs_major_improvement"
    assert verdict["label"] == "Needs Major Improvement"


def test_strong_resume_scores_above_70():
    result = analyze_resume_text(
        read_fixture("software_engineer_resume.txt"),
        read_fixture("software_engineer_jd.txt"),
        mode="preview",
    )
    assert result["ats_score"] >= 70
    assert result["verdict"]["status"] in {"strong_match", "excellent_match"}
    assert "react" in result["matched_skills"]
    assert result["resume_optimizer"]["target_keywords"] is not None


def test_weak_resume_scores_below_35():
    result = analyze_resume_text(
        read_fixture("weak_resume.txt"),
        read_fixture("software_engineer_jd.txt"),
        mode="preview",
    )
    assert result["ats_score"] < 35
    assert result["verdict"]["status"] == "needs_major_improvement"
    assert len(result["priority_gaps"]) > 0


def test_semantic_similarity_uses_tfidf():
    score = text_utils.get_semantic_similarity("React Node APIs", "React and Node.js API development")
    assert score > 0


def test_jd_experience_ignores_education_years():
    jd = """
    Experience: 2-5 years
    Minimum 3 year(s) of experience is required
    Educational Qualification : 15 years full time education
    """
    assert extract_years_of_experience(jd, source="jd") == 3


def test_resume_experience_does_not_count_education_years():
    resume = """
    Bachelor of Engineering completed after 15 years of full time education.
    Worked as Software Engineer for 4 years.
    """
    assert extract_years_of_experience(resume, source="resume") == 4


def test_gap_intelligence_filters_jd_noise_phrases():
    jd = """
    Required: proficiency in React.js.
    Skills React.js good to have.
    Solutions tailored to specific clients.
    To deliver scalable high-performing applications.
    3 years job no. ATCI-5288199-S1932003.
    Required Docker, SQL, and Node.js.
    """
    static_skills, _ = extract_jd_keywords(jd.lower())
    terms = extract_requirement_terms(jd.lower(), jd.lower(), static_skills)
    skills = {term["skill"] for term in terms}

    assert {"react", "docker", "sql", "node.js"} <= skills
    assert "proficiency in react.js" not in skills
    assert "skills react.js good to" not in skills
    assert "solutions tailored to specific" not in skills
    assert "to deliver scalable high-performing" not in skills
    assert not any("atci" in skill or "job no" in skill for skill in skills)


def test_scoring_caps_low_skill_keyword_match():
    score, breakdown = calculate_advanced_score(
        skill_match=20,
        semantic_alignment=85,
        project_impact=80,
        experience_relevance=80,
        formatting_quality=90,
        evidence_strength=80,
    )

    assert score <= 45
    assert breakdown["scoring_logic"]["skills_match"] == "48%"


def test_scoring_rewards_balanced_strong_match():
    score, _ = calculate_advanced_score(
        skill_match=92,
        semantic_alignment=82,
        project_impact=78,
        experience_relevance=84,
        formatting_quality=88,
        evidence_strength=80,
    )

    assert score >= 80

