# ats_system/ai_service.py - compact LLM helpers for resume features

import json
import os
import urllib.error
import urllib.request

from dotenv import load_dotenv


load_dotenv()

DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"


def compact_text(value, limit=1800):
    text = " ".join(str(value or "").split())
    return text[:limit]


def parse_json_object(text):
    try:
        return json.loads(text)
    except Exception:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except Exception:
                return None
    return None


def call_llm_json(system_prompt, user_payload, fallback):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {**fallback, "source": "local_fallback", "note": "Add OPENAI_API_KEY in backend .env to enable LLM output."}

    body = {
        "model": DEFAULT_MODEL,
        "temperature": 0.35,
        "max_tokens": 420,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ],
    }
    request = urllib.request.Request(
        OPENAI_CHAT_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=18) as response:
            raw = response.read().decode("utf-8")
        data = json.loads(raw)
        content = data["choices"][0]["message"]["content"]
        parsed = parse_json_object(content)
        if isinstance(parsed, dict):
            return {**parsed, "source": "llm"}
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
        return {**fallback, "source": "local_fallback", "note": f"LLM unavailable: {exc}"}

    return {**fallback, "source": "local_fallback", "note": "LLM returned an invalid format."}


def rewrite_bullet(data):
    bullet = compact_text(data.get("bullet"), 320)
    role = compact_text(data.get("role") or "software role", 80)
    fallback_text = (
        f"Built and improved {role.lower()} work using relevant tools, with clear ownership, "
        "clean implementation, and measurable user-focused impact."
    )
    return call_llm_json(
        "Rewrite one resume bullet. Return JSON: {\"rewritten\":\"...\",\"tips\":[\"...\",\"...\"]}. Keep it truthful, concise, ATS-friendly.",
        {"bullet": bullet, "target_role": role},
        {"rewritten": fallback_text, "tips": ["Start with an action verb.", "Add tech stack and measurable impact where truthful."]},
    )


def optimize_resume(data):
    fallback = {
        "summary": "Full stack developer focused on building clean web applications with React, backend APIs, databases, and practical project delivery.",
        "skills_to_add": data.get("missing_skills", [])[:6],
        "project_rewrites": [
            "Built a full stack web application using the target tech stack, improving usability with clean UI and structured backend APIs."
        ],
        "experience_rewrites": [
            "Developed reusable features, integrated APIs, and improved application reliability through testing and debugging."
        ],
        "warnings": ["Only add skills and claims you can explain in an interview."],
    }
    return call_llm_json(
        "You are a resume optimizer. Return compact JSON with keys summary, skills_to_add, project_rewrites, experience_rewrites, warnings. No markdown.",
        {
            "jd": compact_text(data.get("job_description"), 1400),
            "resume_excerpt": compact_text(data.get("resume_excerpt"), 1400),
            "matched_skills": data.get("matched_skills", [])[:12],
            "missing_skills": data.get("missing_skills", [])[:12],
            "priority_gaps": data.get("priority_gaps", [])[:8],
        },
        fallback,
    )


def generate_objective(data):
    role = compact_text(data.get("role") or "Full Stack Developer", 90)
    skills = compact_text(data.get("skills") or "React, Flask, MySQL", 180)
    education = compact_text(data.get("education") or "B.Tech student", 90)
    fallback = {
        "objective": f"Motivated {education} seeking a {role} role, with hands-on experience in {skills}. Focused on building clean, user-friendly applications and improving problem-solving through practical projects."
    }
    return call_llm_json(
        "Write one resume objective under 45 words. Return JSON: {\"objective\":\"...\"}. Keep it simple and ATS-friendly.",
        {"role": role, "skills": skills, "education": education},
        fallback,
    )


def generate_project_description(data):
    name = compact_text(data.get("name") or "Project", 100)
    tech = compact_text(data.get("tech") or "React, Flask, MySQL", 180)
    fallback = {
        "description": f"Built {name} using {tech}, focusing on a clean user interface, structured data flow, and practical problem-solving."
    }
    return call_llm_json(
        "Write one resume project description under 28 words. Return JSON: {\"description\":\"...\"}. Mention value, not hype.",
        {"project_name": name, "tech_stack": tech},
        fallback,
    )
