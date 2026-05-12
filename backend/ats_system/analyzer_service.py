# ats_system/analyzer_service.py - Shared real-time ATS analysis service

import re
from collections import Counter

from rapidfuzz import fuzz

from .text_utils import clean_text, clean_text_nlp, normalize_skill, get_semantic_similarity, extract_key_phrases
from .ats_logic import (
    extract_skills,
    extract_skills_by_category,
    extract_jd_keywords,
    calculate_similarity,
    calculate_category_skill_score,
    analyze_skill_gaps,
)
from .section_parser import (
    detect_sections,
    extract_education_level,
    extract_certifications,
    count_projects,
    calculate_section_score,
)
from .fit_logic import calculate_fit_score
from .recruiter_logic import detect_role_level, calculate_recruiter_score, evaluate_recruiter_adjustments
from .feedback_engine import generate_feedback
from .config import SKILLS_BY_CATEGORY, SKILLS_LIST


VERDICT_BANDS = [
    (85, "excellent_match", "Excellent Match", "high"),
    (70, "strong_match", "Strong Match", "high"),
    (50, "good_match", "Good Match", "medium"),
    (30, "weak_match", "Weak Match", "medium"),
    (0, "needs_major_improvement", "Needs Major Improvement", "high"),
]

REQUIRED_HINTS = ("required", "must", "mandatory", "strong", "proficient", "hands-on", "experience with")
PREFERRED_HINTS = ("preferred", "nice to have", "good to have", "plus", "bonus", "familiarity")
STOP_TERMS = {
    "candidate", "team", "role", "work", "ability", "experience", "knowledge", "skills",
    "responsibilities", "requirements", "preferred", "required", "good", "strong",
    "solution", "solutions", "specific", "scalable", "performing", "deliver", "delivery",
    "tailored", "proficiency", "years", "job", "description", "no", "number",
}
BAD_PHRASE_STARTS = (
    "build ", "building ", "built ", "design ", "designing ", "develop ", "developing ",
    "candidate ", "responsibilities ", "requirements ", "experience ", "knowledge ",
    "ability ", "work ", "team ", "role ", "solutions ", "solution ", "to deliver ",
    "years ", "job ", "skills ",
)

KNOWN_SKILL_ALIASES = {normalize_skill(skill): skill for skill in SKILLS_LIST}
KNOWN_SKILL_NAMES = set(KNOWN_SKILL_ALIASES)
PHRASE_BLOCK_TERMS = {
    "tailored", "specific", "deliver", "delivery", "scalable", "high-performing",
    "high performing", "years", "job", "no", "atci", "description", "responsibilities",
}


def clamp(value, low=0.0, high=100.0):
    return max(low, min(float(value or 0), high))


def analyze_resume_file(resume_file, job_description, mode="preview"):
    """Run one normalized ATS analysis. mode='preview' never persists by itself."""
    from .resume_parser import extract_resume_text

    if not resume_file:
        return {"error": "Resume file is required"}, 400
    if not (job_description or "").strip():
        return {"error": "Job Description is required"}, 400

    allowed_ext = (".pdf", ".docx", ".txt")
    filename = (resume_file.filename or "").lower()
    if not filename.endswith(allowed_ext):
        return {"error": f"Unsupported file type. Allowed: {', '.join(allowed_ext)}"}, 400

    resume_raw, metadata = extract_resume_text(resume_file)
    if not metadata.get("extraction_success"):
        return {"error": f"Failed to read resume: {metadata.get('error')}"}, 400
    if not resume_raw.strip():
        return {"error": "Could not extract text. File might be image-based or empty."}, 400

    return analyze_resume_text(resume_raw, job_description, metadata=metadata, mode=mode), 200


def analyze_resume_text(resume_raw, job_description, metadata=None, mode="preview"):
    metadata = metadata or {"filename": "inline.txt", "file_type": "txt", "page_count": 1, "extraction_success": True, "error": None}
    resume_text = clean_text(resume_raw)
    jd_text = clean_text(job_description)
    resume_text_nlp = clean_text_nlp(resume_raw)
    jd_text_nlp = clean_text_nlp(job_description)

    sections = infer_sections(detect_sections(resume_raw), resume_raw)
    section_score = calculate_section_score(sections)
    parse_quality = build_parse_quality(resume_raw, sections, metadata, section_score)

    education_level, education_score = extract_education_level(sections.get("education", "") + " " + resume_text)
    certifications = extract_certifications(sections.get("certifications", "") + " " + resume_text)
    project_count = count_projects(sections.get("projects", "") + " " + resume_text)

    jd_static_skills, jd_skills_by_cat = extract_jd_keywords(jd_text)
    resume_skills = set(extract_skills(resume_text))
    resume_skills_by_cat = extract_skills_by_category(resume_text)

    requirement_terms = extract_requirement_terms(jd_text, jd_text_nlp, jd_static_skills)
    jd_skills = sorted(set(jd_static_skills) | {t["skill"] for t in requirement_terms})
    matched_skills = sorted(s for s in jd_skills if term_matches_resume(s, resume_text, resume_skills))
    missing_skills = sorted(set(jd_skills) - set(matched_skills))

    cat_score, category_details = calculate_category_skill_score(jd_skills_by_cat, resume_skills_by_cat)
    lexical_similarity = calculate_similarity(resume_text, jd_text)
    semantic_similarity = get_semantic_similarity(resume_text_nlp or resume_text, jd_text_nlp or jd_text)
    semantic_alignment = calculate_alignment_score(semantic_similarity, lexical_similarity)
    project_impact = calculate_section_relevance(sections.get("projects", ""), jd_text)
    experience_relevance = calculate_section_relevance(sections.get("experience", ""), jd_text)
    detail_strength = calculate_detail_strength(resume_text, sections, project_count, certifications)

    skill_match = calculate_skill_match_score(jd_skills, matched_skills, requirement_terms, resume_text)
    ats_score, score_breakdown = calculate_advanced_score(
        skill_match=skill_match,
        semantic_alignment=semantic_alignment,
        project_impact=project_impact,
        experience_relevance=experience_relevance,
        formatting_quality=section_score,
        evidence_strength=detail_strength,
    )

    priority_gaps = analyze_priority_gaps(jd_skills, matched_skills, requirement_terms, jd_text)
    role_level = detect_role_level(jd_text)
    resume_years = extract_years_of_experience(resume_text, source="resume")
    jd_years_required = extract_years_of_experience(jd_text, source="jd")
    if jd_years_required == 0 and not any(k in jd_text for k in ("fresher", "0 year", "intern")):
        jd_years_required = 2
    if resume_years == 0 and role_level in ["fresher", "intern"]:
        resume_years = 1

    fit_score = calculate_fit_score(
        ats_score,
        resume_years,
        jd_years_required,
        education_score=education_score,
        certification_count=len(certifications),
        role_level=role_level,
    )
    penalties, bonuses = evaluate_recruiter_adjustments(resume_text, role_level, resume_skills_by_cat)
    recruiter_score = calculate_recruiter_score(fit_score, penalties=penalties, bonuses=bonuses)

    warnings = build_analysis_warnings(parse_quality, jd_text, matched_skills, jd_skills, score_breakdown)
    confidence_score = calculate_confidence(parse_quality, jd_text, jd_skills, score_breakdown)
    verdict = generate_score_safe_verdict(ats_score, priority_gaps, score_breakdown, resume_years, jd_years_required)
    skill_intelligence = build_skill_intelligence(
        jd_skills,
        matched_skills,
        missing_skills,
        jd_skills_by_cat,
        resume_skills_by_cat,
        requirement_terms,
    )
    resume_detail_advice = build_resume_detail_advice(
        sections,
        matched_skills,
        missing_skills,
        priority_gaps,
        score_breakdown,
        parse_quality,
    )

    suggestions = generate_feedback(
        ats_score,
        fit_score,
        recruiter_score,
        priority_gaps,
        score_breakdown,
        category_details,
        section_score,
        education_level,
        len(certifications),
        resume_years,
        jd_years_required,
        role_level,
        penalties,
        bonuses,
    )
    suggestions = enrich_suggestions(suggestions, priority_gaps, score_breakdown)

    return {
        "mode": mode,
        "ats_score": round(ats_score, 2),
        "fit_score": round(fit_score, 2),
        "recruiter_score": round(recruiter_score, 2),
        "confidence_score": round(confidence_score, 2),
        "jd_match_percentage": round(semantic_alignment, 2),
        "verdict": verdict,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "category_breakdown": category_details,
        "category_skill_score": cat_score,
        "score_breakdown": score_breakdown,
        "priority_gaps": priority_gaps,
        "role_level": role_level,
        "resume_years": resume_years,
        "jd_years_required": jd_years_required,
        "education_level": education_level,
        "education_score": education_score,
        "certifications": certifications,
        "section_score": section_score,
        "project_count": project_count,
        "penalties": penalties,
        "bonuses": bonuses,
        "suggestions": suggestions,
        "resume_metadata": metadata,
        "parse_quality": parse_quality,
        "analysis_warnings": warnings,
        "skill_intelligence": skill_intelligence,
        "resume_detail_advice": resume_detail_advice,
        "resume_optimizer": build_resume_optimizer_seed(
            resume_raw, sections, matched_skills, missing_skills, priority_gaps, role_level, score_breakdown, resume_detail_advice
        ),
    }


def infer_sections(sections, resume_raw):
    """Add lightweight fallbacks when headers are missing or parsing is sparse."""
    text = resume_raw or ""
    lower = text.lower()
    inferred = dict(sections or {})

    if not inferred.get("skills"):
        skill_lines = [line for line in text.splitlines() if any(token in line.lower() for token in ("python", "java", "react", "sql", "docker", "api", "cloud"))]
        inferred["skills"] = "\n".join(skill_lines[:8])
    if not inferred.get("projects"):
        project_lines = [line for line in text.splitlines() if re.search(r"\b(project|built|developed|created|implemented)\b", line.lower())]
        inferred["projects"] = "\n".join(project_lines[:10])
    if not inferred.get("experience"):
        exp_lines = [line for line in text.splitlines() if re.search(r"\b(intern|developer|engineer|worked|experience|company)\b", line.lower())]
        inferred["experience"] = "\n".join(exp_lines[:10])
    if not inferred.get("education") and re.search(r"\b(bca|b\.tech|btech|bachelor|degree|college|university)\b", lower):
        inferred["education"] = text

    return inferred


def build_parse_quality(resume_raw, sections, metadata, section_score):
    words = re.findall(r"\w+", resume_raw or "")
    present_sections = [name for name in ("summary", "skills", "experience", "projects", "education", "certifications") if sections.get(name, "").strip()]
    warnings = []
    if len(words) < 120:
        warnings.append("Resume text is short; analysis confidence may be lower.")
    if len(present_sections) < 3:
        warnings.append("Only a few resume sections were detected; use clear ATS-friendly headings.")
    if metadata.get("file_type") == "pdf" and len(words) < 40:
        warnings.append("PDF may be image-based or poorly extractable.")

    score = 35 + min(len(words) / 450 * 35, 35) + min(len(present_sections) * 5, 30)
    score = min(score, section_score * 0.35 + score * 0.65)
    return {
        "score": round(clamp(score), 2),
        "word_count": len(words),
        "detected_sections": present_sections,
        "missing_sections": [s for s in ("summary", "skills", "experience", "projects", "education") if s not in present_sections],
        "warnings": warnings,
    }


def extract_requirement_terms(jd_text, jd_text_nlp, static_skills):
    terms = []
    seen = set()

    def add(skill, source="jd", priority="preferred"):
        skill = normalize_skill(skill.strip(" .,:;()[]{}"))
        if len(skill) < 2 or skill in STOP_TERMS or skill in seen:
            return
        seen.add(skill)
        terms.append({"skill": skill, "source": source, "priority": priority})

    for skill in static_skills:
        priority = infer_term_priority(skill, jd_text)
        add(skill, "known_skill", priority)

    # Extract only skill-shaped JD phrases. If a phrase contains a known skill
    # plus filler words, keep the known skill and discard the filler.
    phrase_candidates = set(extract_key_phrases(jd_text)[:60])
    phrase_candidates.update(re.findall(r"\b[a-z][a-z0-9.+#/-]*(?:\s+[a-z][a-z0-9.+#/-]*){1,3}\b", jd_text_nlp or jd_text))
    for phrase in phrase_candidates:
        p = phrase.lower().strip()
        for skill in extract_known_skills_from_phrase(p):
            add(skill, "known_skill", infer_term_priority(skill, jd_text))
        if any(h in p for h in REQUIRED_HINTS + PREFERRED_HINTS):
            continue
        if len(p) > 35 or len(p.split()) > 4:
            continue
        if p.startswith(BAD_PHRASE_STARTS):
            continue
        if looks_like_skill_phrase(p):
            add(p, "jd_phrase", infer_term_priority(p, jd_text))

    return terms[:45]


def looks_like_skill_phrase(phrase):
    words = phrase.split()
    if any(term in phrase for term in PHRASE_BLOCK_TERMS):
        return False
    if any(word in STOP_TERMS for word in words):
        return False
    if len(words) > 2:
        return False
    if phrase in KNOWN_SKILL_NAMES:
        return True
    if re.fullmatch(r"[a-z]{1,5}[.+#/-][a-z0-9.+#/-]*", phrase):
        return True
    return False


def extract_known_skills_from_phrase(phrase):
    found = []
    phrase = clean_text(phrase)
    for skill in sorted(SKILLS_LIST, key=len, reverse=True):
        normalized = normalize_skill(skill)
        if normalized in found:
            continue
        if bounded_term_search(skill.lower(), phrase) or bounded_term_search(normalized, phrase):
            found.append(normalized)
    return found


def infer_term_priority(skill, jd_text):
    window = 80
    jd = jd_text.lower()
    idx = jd.find(skill.lower())
    context = jd[max(0, idx - window): idx + len(skill) + window] if idx >= 0 else jd
    if any(h in context for h in REQUIRED_HINTS):
        return "required"
    if any(h in context for h in PREFERRED_HINTS):
        return "preferred"
    return "standard"


def term_matches_resume(term, resume_text, resume_skills):
    normalized = normalize_skill(term)
    if normalized in resume_skills:
        return True
    if bounded_term_search(normalized, resume_text):
        return True
    return any(fuzz.token_set_ratio(normalized, chunk) >= 88 for chunk in ngram_chunks(resume_text, normalized))


def bounded_term_search(term, text):
    return bool(re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", text or ""))


def ngram_chunks(text, term):
    words = re.findall(r"[a-z0-9.+#/-]+", text or "")
    term_len = max(1, len((term or "").split()))
    for size in range(max(1, term_len - 1), min(term_len + 2, 5) + 1):
        for i in range(0, max(0, len(words) - size + 1)):
            yield " ".join(words[i:i + size])


def calculate_skill_match_score(jd_skills, matched_skills, requirement_terms, resume_text):
    if not jd_skills:
        return 35.0 if len(resume_text.split()) > 120 else 15.0
    weights = {"required": 2.0, "standard": 1.0, "preferred": 0.55}
    term_priority = {t["skill"]: t["priority"] for t in requirement_terms}
    total = sum(weights.get(term_priority.get(skill, "standard"), 1.0) for skill in jd_skills)
    matched = sum(weights.get(term_priority.get(skill, "standard"), 1.0) for skill in matched_skills)
    coverage_score = (matched / total) * 100 if total else 0
    breadth_score = (len(set(matched_skills)) / len(set(jd_skills))) * 100 if jd_skills else 0
    return clamp(coverage_score * 0.85 + breadth_score * 0.15)


def calculate_alignment_score(semantic_similarity, lexical_similarity):
    """Blend meaning and exact JD language without letting fuzzy overlap inflate the score."""
    semantic = clamp(semantic_similarity)
    lexical = clamp(lexical_similarity)
    if semantic <= 0:
        return round(lexical * 0.55, 2)
    return round(clamp(semantic * 0.72 + lexical * 0.28), 2)


def calculate_section_relevance(section_text, jd_text):
    """Score only the actual section text; missing sections should not borrow the full resume."""
    if not (section_text or "").strip():
        return 0.0
    semantic = get_semantic_similarity(section_text, jd_text)
    lexical = calculate_similarity(clean_text(section_text), jd_text)
    return calculate_alignment_score(semantic, lexical)


def calculate_detail_strength(resume_text, sections, project_count, certifications):
    text = resume_text or ""
    metric_hits = len(re.findall(r"\b\d+(?:\.\d+)?\s*(?:%|k|m|x|ms|sec|seconds|users|clients|projects|apis|features)\b", text))
    action_hits = len(re.findall(r"\b(built|developed|designed|implemented|deployed|optimized|automated|integrated|improved|reduced|increased|created|led)\b", text))
    link_hits = len(re.findall(r"\b(github|linkedin|portfolio|live demo|vercel|netlify|http)\b", text))
    section_hits = sum(1 for key in ("summary", "skills", "experience", "projects", "education") if sections.get(key, "").strip())

    score = 12
    score += min(metric_hits * 10, 25)
    score += min(action_hits * 4, 28)
    score += min(project_count * 8, 16)
    score += min(len(certifications) * 6, 12)
    score += min(link_hits * 4, 10)
    score += min(section_hits * 3, 15)
    return clamp(score)


def calculate_advanced_score(skill_match, semantic_alignment, project_impact, experience_relevance, formatting_quality, evidence_strength=0):
    breakdown = {
        "skills_match": round(clamp(skill_match), 2),
        "semantic_alignment": round(clamp(semantic_alignment), 2),
        "project_impact": round(clamp(project_impact), 2),
        "experience_relevance": round(clamp(experience_relevance), 2),
        "formatting_quality": round(clamp(formatting_quality), 2),
        "evidence_strength": round(clamp(evidence_strength), 2),
    }
    score = (
        breakdown["skills_match"] * 0.48
        + breakdown["semantic_alignment"] * 0.18
        + breakdown["experience_relevance"] * 0.14
        + breakdown["project_impact"] * 0.09
        + breakdown["formatting_quality"] * 0.07
        + breakdown["evidence_strength"] * 0.04
    )
    caps = []
    if breakdown["skills_match"] < 25:
        caps.append(45)
    elif breakdown["skills_match"] < 45:
        caps.append(62)
    if breakdown["semantic_alignment"] < 30 and breakdown["skills_match"] < 65:
        caps.append(65)
    if breakdown["formatting_quality"] < 35:
        caps.append(70)
    if caps:
        score = min(score, min(caps))

    breakdown["scoring_logic"] = {
        "skills_match": "48%",
        "semantic_alignment": "18%",
        "experience_relevance": "14%",
        "project_impact": "9%",
        "formatting_quality": "7%",
        "evidence_strength": "4%",
    }
    return clamp(score), breakdown


def analyze_priority_gaps(jd_skills, matched_skills, requirement_terms, jd_text):
    matched = set(matched_skills)
    term_priority = {t["skill"]: t["priority"] for t in requirement_terms}
    counts = Counter(re.findall(r"[a-z0-9.+#/-]+", jd_text.lower()))
    gaps = []
    for skill in sorted(set(jd_skills) - matched):
        priority = "Low"
        if term_priority.get(skill) == "required" or counts.get(skill, 0) >= 3:
            priority = "High"
        elif term_priority.get(skill) in {"standard", "preferred"} or counts.get(skill, 0) == 2:
            priority = "Medium"
        gaps.append({"skill": skill, "priority": priority})
    return sorted(gaps, key=lambda x: {"High": 0, "Medium": 1, "Low": 2}[x["priority"]])


EDUCATION_YEAR_CONTEXT = (
    "education",
    "full time education",
    "academic",
    "qualification",
    "degree",
    "graduation",
    "school",
    "college",
    "university",
)
WORK_YEAR_CONTEXT = (
    "worked",
    "work",
    "experience",
    "engineer",
    "developer",
    "intern",
    "employment",
    "company",
    "role",
    "position",
)

EXPERIENCE_REQUIRED_PATTERNS = (
    r"minimum\s+(\d+)\s*year(?:s)?(?:\s*\(s\))?\s+of\s+experience",
    r"at\s+least\s+(\d+)\s*year(?:s)?(?:\s*\(s\))?\s+of\s+experience",
    r"(\d+)\+?\s*year(?:s)?(?:\s*\(s\))?\s+of\s+experience\s+(?:is\s+)?required",
    r"required\s*:?\s*(\d+)\s*[\-to]+\s*(\d+)\s*year(?:s)?",
    r"experience\s*:?\s*(\d+)\s*[\-to]+\s*(\d+)\s*year(?:s)?",
)

EXPERIENCE_GENERIC_PATTERNS = (
    r"(\d+)\+?\s*year(?:s)?(?:\s*\(s\))?\s+of\s+experience",
    r"experience\s*:?\s*(\d+)\s*[\-to]+\s*(\d+)\s*year(?:s)?",
    r"(\d+)\s*[\-to]+\s*(\d+)\s*year(?:s)?",
    r"(\d+)\+?\s*(?:years|year|yrs|yr)",
)


def _is_education_context(text, start, end, window=48):
    def has_context_term(fragment, terms):
        return any(
            re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", fragment)
            for term in terms
        )

    line_start = text.rfind("\n", 0, start) + 1
    line_end = text.find("\n", end)
    if line_end == -1:
        line_end = len(text)
    line = text[line_start:line_end]
    if has_context_term(line, WORK_YEAR_CONTEXT):
        return False
    if has_context_term(line, EDUCATION_YEAR_CONTEXT):
        return True

    snippet = text[max(0, start - window):min(len(text), end + window)]
    return (
        has_context_term(snippet, EDUCATION_YEAR_CONTEXT)
        and not has_context_term(snippet, WORK_YEAR_CONTEXT)
    )


def _pick_year_value(match_groups):
    numbers = [int(value) for value in match_groups if value and value.isdigit()]
    return min(numbers) if numbers else 0


def extract_years_of_experience(text, source="generic"):
    text = (text or "").lower()
    if not text:
        return 0

    if source == "jd":
        required_years = []
        for pattern in EXPERIENCE_REQUIRED_PATTERNS:
            for match in re.finditer(pattern, text):
                if not _is_education_context(text, match.start(), match.end()):
                    value = _pick_year_value(match.groups())
                    if value:
                        required_years.append(value)
        if required_years:
            return max(required_years)

    years = []
    for pattern in EXPERIENCE_GENERIC_PATTERNS:
        for match in re.finditer(pattern, text):
            if _is_education_context(text, match.start(), match.end()):
                continue
            value = _pick_year_value(match.groups())
            if value:
                years.append(value)

    if not years:
        return 0

    return max(years) if source == "resume" else min(years)


def generate_score_safe_verdict(ats_score, priority_gaps, score_breakdown, resume_years, jd_years_required):
    status, label, confidence = VERDICT_BANDS[-1][1:]
    for minimum, candidate_status, candidate_label, candidate_confidence in VERDICT_BANDS:
        if ats_score >= minimum:
            status, label, confidence = candidate_status, candidate_label, candidate_confidence
            break

    reasons = []
    high_gaps = [g["skill"] for g in priority_gaps if g["priority"] == "High"]
    if high_gaps:
        reasons.append("Missing critical skills: " + ", ".join(high_gaps[:3]))
    if score_breakdown.get("skills_match", 0) < 35:
        reasons.append("Low required keyword alignment")
    if score_breakdown.get("semantic_alignment", 0) < 35:
        reasons.append("Resume language does not closely match the JD")
    if resume_years < jd_years_required and jd_years_required > 0:
        reasons.append(f"Experience shortfall ({jd_years_required - resume_years} years short)")
    if not reasons:
        reasons.append("Resume aligns well with the target job description")

    return {"status": status, "label": label, "reason": " | ".join(reasons), "confidence": confidence}


def build_analysis_warnings(parse_quality, jd_text, matched_skills, jd_skills, score_breakdown):
    warnings = list(parse_quality.get("warnings", []))
    if len(jd_text.split()) < 80:
        warnings.append("Job description is short; add responsibilities and required skills for better prediction.")
    if jd_skills and not matched_skills:
        warnings.append("No JD keywords were found in the resume. Try adding exact required skills where truthful.")
    if score_breakdown.get("formatting_quality", 0) < 50:
        warnings.append("Resume formatting/section structure may reduce ATS readability.")
    return warnings


def calculate_confidence(parse_quality, jd_text, jd_skills, score_breakdown):
    confidence = parse_quality.get("score", 0) * 0.45
    confidence += min(len(jd_text.split()) / 180 * 25, 25)
    confidence += min(len(jd_skills) / 10 * 20, 20)
    confidence += 10 if score_breakdown.get("semantic_alignment", 0) > 0 else 0
    return clamp(confidence)


def enrich_suggestions(suggestions, priority_gaps, score_breakdown):
    enriched = list(suggestions or [])
    if priority_gaps:
        top = ", ".join(g["skill"] for g in priority_gaps[:5])
        enriched.insert(0, {
            "priority": "high",
            "category": "Targeted Resume Rewrite",
            "message": f"Add truthful evidence for these target JD terms: {top}",
            "impact": "Can improve keyword and semantic alignment in the next live preview.",
        })
    if score_breakdown.get("project_impact", 0) < 45:
        enriched.append({
            "priority": "medium",
            "category": "Project Impact",
            "message": "Rewrite project bullets with action, technology, metric, and business result.",
            "impact": "Improves project relevance and recruiter readability.",
        })
    return enriched[:8]


def build_skill_intelligence(jd_skills, matched_skills, missing_skills, jd_skills_by_cat, resume_skills_by_cat, requirement_terms):
    matched_set = set(matched_skills)
    required_terms = {t["skill"] for t in requirement_terms if t["priority"] == "required"}
    category_coverage = []

    for category, known_skills in SKILLS_BY_CATEGORY.items():
        jd_category = sorted(set(jd_skills_by_cat.get(category, [])) | (set(known_skills) & set(jd_skills)))
        if not jd_category:
            continue
        found = sorted(set(jd_category) & matched_set)
        coverage = round((len(found) / len(jd_category)) * 100, 2) if jd_category else 0
        category_coverage.append({
            "category": category.replace("_", " ").title(),
            "coverage": coverage,
            "matched": found,
            "missing": sorted(set(jd_category) - set(found)),
        })

    category_coverage.sort(key=lambda item: item["coverage"], reverse=True)
    strongest = [c for c in category_coverage if c["matched"]][:3]
    weakest = [c for c in sorted(category_coverage, key=lambda item: item["coverage"]) if c["missing"]][:3]

    return {
        "coverage": round((len(matched_skills) / len(jd_skills)) * 100, 2) if jd_skills else 0,
        "required_coverage": round((len(required_terms & matched_set) / len(required_terms)) * 100, 2) if required_terms else None,
        "strongest_categories": strongest,
        "weakest_categories": weakest,
        "core_strengths": matched_skills[:10],
        "must_add_keywords": [s for s in missing_skills if s in required_terms][:8] or missing_skills[:8],
        "resume_skill_inventory": resume_skills_by_cat,
    }


def build_resume_detail_advice(sections, matched_skills, missing_skills, priority_gaps, score_breakdown, parse_quality):
    top_gaps = [g["skill"] for g in priority_gaps[:5]] or missing_skills[:5]
    core_skills = matched_skills[:6] or ["target role skills"]
    advice = []

    if "summary" in parse_quality.get("missing_sections", []) or score_breakdown.get("semantic_alignment", 0) < 70:
        advice.append({
            "section": "Targeted Professional Summary",
            "why": "Gives ATS and recruiters the exact role, core stack, and domain fit in the first 3 lines.",
            "example": f"Software Engineer focused on {', '.join(core_skills[:4])}, building production-ready applications with measurable product impact.",
        })

    if score_breakdown.get("skills_match", 0) < 85 or top_gaps:
        advice.append({
            "section": "Technical Skills Matrix",
            "why": "Separates languages, frameworks, databases, cloud/devops, and tools so keyword parsing is stronger.",
            "example": f"Add truthful target keywords: {', '.join(top_gaps[:6]) if top_gaps else ', '.join(core_skills[:6])}.",
        })

    if not sections.get("projects", "").strip() or score_breakdown.get("project_impact", 0) < 75:
        advice.append({
            "section": "Selected Projects With Metrics",
            "why": "Project bullets should prove skill usage, not just list technology names.",
            "example": "Built [feature] using [tech stack], improving [metric] by [number] for [users/team/client].",
        })

    if score_breakdown.get("experience_relevance", 0) < 75:
        advice.append({
            "section": "Experience Impact Bullets",
            "why": "Recruiters look for ownership, action verbs, business outcome, and scale.",
            "example": "Implemented REST APIs and optimized database queries, reducing response time by 35%.",
        })

    if "certifications" in parse_quality.get("missing_sections", []):
        advice.append({
            "section": "Certifications, Links, and Proof",
            "why": "GitHub, portfolio, certificates, and live demos increase confidence in the scan.",
            "example": "Add GitHub, LinkedIn, portfolio, deployed project links, and relevant certificates.",
        })

    return advice[:5]


def build_resume_optimizer_seed(resume_raw, sections, matched_skills, missing_skills, priority_gaps, role_level, score_breakdown, resume_detail_advice=None):
    target_keywords = [g["skill"] for g in priority_gaps[:8]] + missing_skills[:6]
    skill_line = sorted(set(matched_skills + target_keywords[:8]))
    summary = (
        f"ATS-focused {role_level} candidate with experience aligned to the target role. "
        f"Strengths include {', '.join(matched_skills[:5]) if matched_skills else 'software delivery, problem solving, and project execution'}. "
        "Resume should be tailored with measurable achievements and JD-specific keywords."
    )
    project_suggestion = "Rewrite each project as: Built [feature] using [tech] to achieve [measurable result]."
    if target_keywords:
        project_suggestion += " Include evidence for: " + ", ".join(target_keywords[:5]) + "."

    return {
        "summary": summary,
        "technical_skills": skill_line,
        "target_keywords": sorted(set(target_keywords)),
        "project_rewrite_suggestions": [project_suggestion],
        "experience_rewrite_suggestions": ["Start bullets with action verbs and include metrics, scale, users, latency, accuracy, or revenue impact."],
        "recommended_sections": resume_detail_advice or [],
        "source_score_breakdown": score_breakdown,
        "raw_resume_excerpt": (resume_raw or "")[:1200],
        "sections": {k: (sections.get(k, "")[:800] if sections else "") for k in ["summary", "skills", "projects", "experience", "education"]},
    }

