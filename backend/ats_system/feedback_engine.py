# ats_system/feedback_engine.py — Suggestions & verdict generation


# ══════════════════════════════════════════════════════════════════
#  FEEDBACK GENERATION
# ══════════════════════════════════════════════════════════════════

def generate_feedback(ats_score, fit_score, recruiter_score,
                      priority_gaps, score_breakdown,
                      category_details, section_score,
                      education_level, certification_count,
                      resume_years, jd_years_required,
                      role_level, penalties, bonuses):
    """Generate prioritized, actionable improvement suggestions based on explainable factors."""
    suggestions = []

    # ── Missing skills (high priority / Explainable AI) ────────
    high_priority_gaps = [g["skill"] for g in priority_gaps if g["priority"] == "High"]
    if high_priority_gaps:
        suggestions.append({
            "priority": "high",
            "category": "Missing Critical Skills",
            "message":  f"You are missing non-negotiable skills mentioned frequently in the JD: {', '.join(high_priority_gaps[:5])}",
            "impact":   "Adding these could significantly boost your semantic score.",
        })
        
    medium_priority_gaps = [g["skill"] for g in priority_gaps if g["priority"] == "Medium"]
    if medium_priority_gaps:
        suggestions.append({
            "priority": "medium",
            "category": "Missing Preferred Skills",
            "message":  f"Nice-to-have skills that are missing: {', '.join(medium_priority_gaps[:5])}",
            "impact":   "Improves overall keyword density and recruiter perception.",
        })

    # Category-specific gaps
    for cat_name, details in category_details.items():
        if details["missing"] and details["weight"] >= 10:
            label = cat_name.replace("_", " ").title()
            suggestions.append({
                "priority": "high",
                "category": f"{label} Gap",
                "message":  f"You're missing key {label} skills: {', '.join(details['missing'][:5])}",
                "impact":   f"This category has {details['weight']}% weight in scoring",
            })

    # ── Experience gap ────────────────────────────────────────
    if resume_years < jd_years_required:
        gap = jd_years_required - resume_years
        suggestions.append({
            "priority": "high",
            "category": "Experience Gap",
            "message":  f"JD requires {jd_years_required} years but resume shows {resume_years} years ({gap} year gap)",
            "impact":   "Experience mismatch is a primary rejection reason",
        })

    # ── Resume structure ──────────────────────────────────────
    if section_score < 60:
        suggestions.append({
            "priority": "medium",
            "category": "Resume Structure",
            "message":  "Missing key sections. Add: Summary, Skills, Experience, Education, Projects",
            "impact":   "Well-structured resumes score 15-20% higher in ATS systems",
        })

    if section_score < 40:
        suggestions.append({
            "priority": "high",
            "category": "Resume Format",
            "message":  "Lacks proper formatting. Use clear headers: 'EDUCATION', 'EXPERIENCE', 'SKILLS'",
            "impact":   "ATS systems rely on section headers to extract information",
        })

    # ── Education ─────────────────────────────────────────────
    if education_level == "unknown":
        suggestions.append({
            "priority": "medium",
            "category": "Education",
            "message":  "Education details not clearly visible. Add degree, university, and graduation year",
            "impact":   "Clear education info adds credibility",
        })

    # ── Certifications ────────────────────────────────────────
    if certification_count == 0 and role_level in ["mid", "senior", "lead"]:
        suggestions.append({
            "priority": "medium",
            "category": "Certifications",
            "message":  f"For {role_level}-level roles, consider AWS/Azure/GCP or industry certifications",
            "impact":   "Certifications can boost recruiter confidence by 10-15%",
        })

    # ── Overall match ─────────────────────────────────────────
    if ats_score < 40:
        suggestions.append({
            "priority": "high",
            "category": "Overall Match",
            "message":  "Very low alignment with JD. Consider tailoring your resume for this role",
            "impact":   "Customized resumes are 3x more likely to pass ATS screening",
        })
    elif ats_score < 60:
        suggestions.append({
            "priority": "medium",
            "category": "Overall Match",
            "message":  "Partial match. Focus on adding missing skills and using JD language",
            "impact":   "Matching JD language improves similarity scoring",
        })

    # ── Stand out ─────────────────────────────────────────────
    if not bonuses:
        suggestions.append({
            "priority": "low",
            "category": "Stand Out",
            "message":  "Add differentiators: open-source contributions, leadership, or side projects",
            "impact":   "These earn bonus points in recruiter evaluation",
        })

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda x: priority_order.get(x["priority"], 3))

    return suggestions


# ══════════════════════════════════════════════════════════════════
#  VERDICT GENERATION
# ══════════════════════════════════════════════════════════════════

def generate_verdict(ats_score, fit_score, recruiter_score,
                     resume_years, jd_years_required,
                     score_breakdown=None, priority_gaps=None):
    """Generate final verdict with status, confidence level, and Explainable AI reasons."""

    # Build Explainable AI Reason String
    reasons = []
    
    if priority_gaps:
        high_gaps = [g["skill"] for g in priority_gaps if g["priority"] == "High"]
        if high_gaps:
            reasons.append(f"Missing Critical Skills: {', '.join(high_gaps[:3])}")
            
    if score_breakdown:
        if score_breakdown.get("project_impact", 0) < 50:
            reasons.append("Weak project descriptions (Low relevancy to JD)")
        if score_breakdown.get("formatting_quality", 0) < 60:
            reasons.append("Non-standard Formatting (Missing key sections)")
            
    exp_gap = 0
    if resume_years < jd_years_required and jd_years_required > 0:
        exp_gap = jd_years_required - resume_years
        reasons.append(f"Experience Shortfall ({exp_gap} years short)")

    # Combine XAI reasons
    reason_str = " • ".join(reasons) if reasons else "Excellent alignment with role requirements"

    if exp_gap > 3:
        return {
            "status":     "rejected",
            "label":      "Not Recommended",
            "reason":     reason_str or "Significant experience gap",
            "confidence": "high",
        }

    if recruiter_score >= 75:
        return {
            "status":     "strong_match",
            "label":      "Strong Match",
            "reason":     reason_str if reasons else "Excellent alignment with role requirements",
            "confidence": "high",
        }
    elif recruiter_score >= 55:
        return {
            "status":     "good_match",
            "label":      "Good Match",
            "reason":     reason_str if reasons else "Solid alignment with some areas to improve",
            "confidence": "medium",
        }
    elif recruiter_score >= 40:
        return {
            "status":     "possible_fit",
            "label":      "Possible Fit",
            "reason":     reason_str if reasons else "Partial match — improvement suggestions available",
            "confidence": "low",
        }
    else:
        return {
            "status":     "weak_match",
            "label":      "Needs Improvement",
            "reason":     reason_str if reasons else "Low alignment — significant gaps found",
            "confidence": "high",
        }
