# ats_system/section_parser.py — Resume section detection & scoring

import re
from .config import SECTION_HEADERS, EDUCATION_SCORES


# ══════════════════════════════════════════════════════════════════
#  SECTION DETECTION
# ══════════════════════════════════════════════════════════════════

def detect_sections(text):
    """Split resume text into named sections.
    Returns: {"education": "...", "experience": "...", "skills": "...", ...}
    """
    if not text:
        return {"other": ""}

    lines = text.split("\n")
    sections = {"other": []}
    current_section = "other"

    for line in lines:
        detected = _match_section_header(line.strip().lower())
        if detected:
            current_section = detected
            sections.setdefault(current_section, [])
            continue
        sections.setdefault(current_section, []).append(line)

    # Join lines back into text
    result = {section: "\n".join(lines_list).strip() for section, lines_list in sections.items()}

    # Ensure all standard sections exist (even if empty)
    for section_name in SECTION_HEADERS:
        result.setdefault(section_name, "")
    result.setdefault("other", "")

    return result


def _match_section_header(line):
    """Check if a line matches any known section header keyword."""
    cleaned = re.sub(r"[:\-_|#*=]", "", line).strip()

    if len(cleaned) < 2 or len(cleaned) > 50:
        return None

    for section_name, keywords in SECTION_HEADERS.items():
        for keyword in keywords:
            if cleaned == keyword or cleaned.startswith(keyword + " "):
                return section_name
    return None


# ══════════════════════════════════════════════════════════════════
#  EDUCATION & CERTIFICATIONS
# ══════════════════════════════════════════════════════════════════

def extract_education_level(text):
    """Detect highest education level. Returns (level_name, score)."""
    text_lower = text.lower()
    best_score = 0
    best_level = "unknown"

    for degree, score in EDUCATION_SCORES.items():
        if degree in text_lower and score > best_score:
            best_score = score
            best_level = degree

    return best_level, best_score


def extract_certifications(text):
    """Extract certification entries from text."""
    cert_patterns = [
        r"(?:certified|certification|certificate)\s+(?:in\s+)?([a-zA-Z\s\-\+\.]+)",
        r"(aws\s+(?:certified|solutions?\s+architect|developer|sysops)[\w\s\-]*)",
        r"(azure\s+(?:fundamentals|administrator|developer|solutions?\s+architect)[\w\s\-]*)",
        r"(google\s+cloud\s+(?:certified|professional|associate)[\w\s\-]*)",
        r"(pmp|prince2|itil|comptia|cissp|ccna|ccnp|cka|ckad)",
        r"(scrum\s+master|product\s+owner|safe\s+agilist)",
    ]

    text_lower = text.lower()
    certs = set()

    for pattern in cert_patterns:
        for match in re.findall(pattern, text_lower):
            cert = match.strip()
            if len(cert) > 2:
                certs.add(cert)

    return list(certs)


# ══════════════════════════════════════════════════════════════════
#  PROJECT & SECTION SCORING
# ══════════════════════════════════════════════════════════════════

def count_projects(text):
    """Estimate number of projects mentioned in text."""
    indicators = [
        r"project\s*\d",
        r"project\s*:",
        r"(?:\u2022|•)\s*\w",
        r"-\s+\w+.*(?:built|developed|created|designed|implemented)",
    ]
    count = sum(len(re.findall(p, text.lower())) for p in indicators)
    return max(count, 0)


def has_section(sections, section_name):
    """Check if a resume section has meaningful content (>10 chars)."""
    return len(sections.get(section_name, "").strip()) > 10


def calculate_section_score(sections):
    """Score resume structure quality (0-100) based on proper sections."""
    section_points = {
        "summary":        10,
        "education":      20,
        "experience":     25,
        "skills":         25,
        "projects":       10,
        "certifications": 10,
    }
    score = sum(pts for name, pts in section_points.items() if has_section(sections, name))
    return min(score, 100)
