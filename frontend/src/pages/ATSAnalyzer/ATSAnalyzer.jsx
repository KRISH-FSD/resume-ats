import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Search, BarChart3, Lightbulb,
  CheckCircle2, AlertCircle, XCircle, AlertTriangle,
  Sparkles, Bot, ArrowRight, FileText, Paperclip,
  UploadCloud, User, Calendar, GraduationCap,
  Layout, MousePointer2, X, Rocket, ChevronDown,
  Info, ShieldCheck, Zap, Briefcase, Lock, LogIn
} from "lucide-react";
import Scene3D from "../../components/Scene3D/Scene3D";
import BackgroundDecorations from "../../components/BackgroundDecorations/BackgroundDecorations";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import ResumeGenerator from "./ResumeGenerator";
import "./ATSAnalyzer.css";
import "./ResumeGenerator.css";
import "./ZenithHero.css";

const ATS_FEATURES = [
  { icon: <ShieldCheck size={22} />, title: "ATS Validation", desc: "Enterprise-grade resume parsing" },
  { icon: <Zap size={22} />, title: "Keyword Optimization", desc: "Identify critical missing industry terms" },
  { icon: <BarChart3 size={22} />, title: "Score Breakdown", desc: "Quantitative metrics for every section" },
  { icon: <Bot size={22} />, title: "AI Insights", desc: "Deep semantic career suggestions" },
];

const normalizeTerm = (value = "") => value.toLowerCase().replace(/[^a-z0-9.+#/-]+/g, " ").trim();
const HEATMAP_NOISE_TERMS = new Set([
  "cross-functional",
  "communication",
  "teamwork",
  "collaboration",
  "time management",
  "problem solving",
  "leadership",
]);

const boundedTermRegex = (term) => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, "i");
};

const buildKeywordHeatmap = (jobText, analysis) => {
  const text = jobText || "";
  if (!text.trim() || !analysis) return [];

  const terms = [
    ...(analysis.matched_skills || []).map((skill) => ({ skill, status: "found" })),
    ...(analysis.priority_gaps || []).map((gap) => ({
      skill: gap.skill,
      status: gap.priority === "Low" ? "weak" : "missing",
    })),
    ...(analysis.missing_skills || []).map((skill) => ({ skill, status: "missing" })),
  ];

  const uniqueTerms = Array.from(
    new Map(terms.map((item) => [normalizeTerm(item.skill), item])).values()
  ).filter((item) => item.skill && !HEATMAP_NOISE_TERMS.has(normalizeTerm(item.skill)));

  return uniqueTerms
    .map((item) => {
      const match = text.match(boundedTermRegex(item.skill));
      return match ? { ...item, index: match.index + match[1].length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index)
    .slice(0, 24);
};

const buildFixChecklist = (analysis) => {
  if (!analysis) return [];
  const items = [];
  const gaps = analysis.priority_gaps?.length
    ? analysis.priority_gaps.map((gap) => gap.skill)
    : analysis.missing_skills || [];

  gaps.slice(0, 3).forEach((skill) => {
    items.push({
      id: `skill-${skill}`,
      label: `Add truthful evidence for ${skill}`,
      detail: "Place it in skills, project tech, or experience only if you can explain it.",
    });
  });

  if ((analysis.score_breakdown?.project_impact || 0) < 70) {
    items.push({
      id: "project-metric",
      label: "Rewrite one project with a measurable result",
      detail: "Use action + tech + metric, for example reduced load time by 30%.",
    });
  }

  if (!analysis.resume_metadata?.filename || (analysis.score_breakdown?.formatting_quality || 0) < 75) {
    items.push({
      id: "format-sections",
      label: "Use clear ATS section headings",
      detail: "Keep headings like Summary, Skills, Projects, Experience, Education.",
    });
  }

  if (!analysis.parse_quality?.detected_sections?.includes("certifications")) {
    items.push({
      id: "proof-links",
      label: "Add GitHub, portfolio, certificates, or live demo links",
      detail: "Proof links improve recruiter confidence and scan completeness.",
    });
  }

  while (items.length < 5) {
    const fallback = [
      {
        id: "summary-target",
        label: "Target the summary to the exact role",
        detail: "Mention the role, core stack, and 1 strong outcome in 2 lines.",
      },
      {
        id: "skills-matrix",
        label: "Group skills into a compact technical matrix",
        detail: "Separate languages, frontend, backend, database, and tools.",
      },
      {
        id: "experience-impact",
        label: "Start weak bullets with strong action verbs",
        detail: "Use built, implemented, optimized, automated, integrated, or improved.",
      },
    ].find((item) => !items.some((existing) => existing.id === item.id));
    if (!fallback) break;
    items.push(fallback);
  }

  return items.slice(0, 5);
};

const ATSAnalyzer = () => {
  const location = useLocation();
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jdInputMode, setJdInputMode] = useState("paste");
  const [jdBrief, setJdBrief] = useState({
    role: "",
    company: "",
    skills: "",
    responsibilities: "",
    experience: "",
    jobUrl: "",
    notes: "",
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveStatus, setLiveStatus] = useState("");
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState(() => (
    new URLSearchParams(window.location.search).get("tab") === "generator" ? "generator" : "analyzer"
  )); // 'analyzer' or 'generator'
  const [dockReleased, setDockReleased] = useState(false);
  const [aiBusy, setAiBusy] = useState("");
  const [aiOptimizer, setAiOptimizer] = useState(null);
  const [bulletDraft, setBulletDraft] = useState("");
  const [bulletRewrite, setBulletRewrite] = useState(null);
  const [checkedFixes, setCheckedFixes] = useState({});
  const { isLightMode } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();


  const fileInputRef = useRef(null);
  const footerDockRef = useRef(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("hireiq_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadingSteps = [
    "Extracting document text...",
    "Normalizing skill aliases...",
    "Computing TF-IDF matrices...",
    "Extracting project semantics...",
    "Structuring priority gaps...",
    "Generating intelligence report..."
  ];

  const composeGuidedJobDescription = (brief) => {
    const parts = [
      brief.role && `Target role: ${brief.role}`,
      brief.company && `Company: ${brief.company}`,
      brief.experience && `Experience requirement: ${brief.experience}`,
      brief.skills && `Required skills: ${brief.skills}`,
      brief.responsibilities && `Responsibilities: ${brief.responsibilities}`,
      brief.notes && `Additional information: ${brief.notes}`,
    ].filter(Boolean);
    return parts.join("\n\n");
  };

  const resetAnalysisState = () => {
    setResults(null);
    setError("");
    setLiveStatus("");
    setAiOptimizer(null);
    setBulletRewrite(null);
  };

  const handleJobDescriptionChange = (value) => {
    setJobDescription(value);
    resetAnalysisState();
  };

  const updateJdBrief = (field, value) => {
    const next = { ...jdBrief, [field]: value };
    setJdBrief(next);
    if (jdInputMode === "guided") {
      setJobDescription(composeGuidedJobDescription(next));
    }
    if (jdInputMode === "link") {
      setJobDescription([
        next.jobUrl && `Job URL: ${next.jobUrl}`,
        next.role && `Target role: ${next.role}`,
        next.company && `Company: ${next.company}`,
        next.notes && `Additional information: ${next.notes}`,
      ].filter(Boolean).join("\n\n"));
    }
    resetAnalysisState();
  };

  const switchJdMode = (mode) => {
    setJdInputMode(mode);
    if (mode === "guided") {
      setJobDescription(composeGuidedJobDescription(jdBrief));
    }
    if (mode === "link") {
      setJobDescription([
        jdBrief.jobUrl && `Job URL: ${jdBrief.jobUrl}`,
        jdBrief.role && `Target role: ${jdBrief.role}`,
        jdBrief.company && `Company: ${jdBrief.company}`,
        jdBrief.notes && `Additional information: ${jdBrief.notes}`,
      ].filter(Boolean).join("\n\n"));
    }
    resetAnalysisState();
  };

  const addJdTemplate = () => {
    const template = [
      "Target role: Software Engineer",
      "Company: Target company",
      "Experience requirement: 0-2 years or entry-level",
      "Required skills: React, Node.js, Python, SQL, REST API, Git",
      "Responsibilities: Build scalable web applications, integrate APIs, write clean code, collaborate with cross-functional teams, and improve performance.",
      "Additional information: Include domain, tools, location, salary range, or any special requirements from the job post.",
    ].join("\n\n");
    setJobDescription(template);
    setJdBrief((prev) => ({
      ...prev,
      role: prev.role || "Software Engineer",
      skills: prev.skills || "React, Node.js, Python, SQL, REST API, Git",
      responsibilities: prev.responsibilities || "Build scalable web applications, integrate APIs, write clean code, collaborate with cross-functional teams, and improve performance.",
      experience: prev.experience || "0-2 years or entry-level",
    }));
    setJdInputMode("paste");
    resetAnalysisState();
  };

  const renderJobInputMethods = (textareaClassName) => (
    <div className="jd-method-panel">
      <div className="jd-method-tabs">
        {[
          { id: "paste", label: "Paste JD", icon: <FileText size={14} /> },
          { id: "guided", label: "Guided Brief", icon: <Layout size={14} /> },
        ].map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`jd-method-tab ${jdInputMode === mode.id ? "active" : ""}`}
            onClick={() => switchJdMode(mode.id)}
          >
            {mode.icon} {mode.label}
          </button>
        ))}
      </div>

      {jdInputMode === "guided" ? (
        <div className="guided-jd-grid">
          <input value={jdBrief.role} onChange={(e) => updateJdBrief("role", e.target.value)} placeholder="Target role, e.g. Frontend Developer" />
          <input value={jdBrief.company} onChange={(e) => updateJdBrief("company", e.target.value)} placeholder="Company name or industry" />
          <input value={jdBrief.experience} onChange={(e) => updateJdBrief("experience", e.target.value)} placeholder="Experience, e.g. 1-3 years" />
          <input value={jdBrief.skills} onChange={(e) => updateJdBrief("skills", e.target.value)} placeholder="Must-have skills, comma separated" />
          <textarea value={jdBrief.responsibilities} onChange={(e) => updateJdBrief("responsibilities", e.target.value)} placeholder="Main responsibilities or project expectations" />
          <textarea value={jdBrief.notes} onChange={(e) => updateJdBrief("notes", e.target.value)} placeholder="Extra details: location, domain, tools, salary, hiring round, etc." />
        </div>
      ) : jdInputMode === "link" ? (
        <div className="job-link-panel">
          <input value={jdBrief.jobUrl} onChange={(e) => updateJdBrief("jobUrl", e.target.value)} placeholder="Paste job post URL or reference link" />
          <div className="guided-jd-grid compact">
            <input value={jdBrief.role} onChange={(e) => updateJdBrief("role", e.target.value)} placeholder="Target role" />
            <input value={jdBrief.company} onChange={(e) => updateJdBrief("company", e.target.value)} placeholder="Company" />
          </div>
          <textarea value={jdBrief.notes} onChange={(e) => updateJdBrief("notes", e.target.value)} placeholder="Paste visible job details, recruiter notes, or extra requirements here" />
        </div>
      ) : (
        <>
          <textarea
            className={textareaClassName}
            placeholder="Paste the full job description, requirements, responsibilities, or recruiter message here..."
            value={jobDescription}
            onChange={(e) => handleJobDescriptionChange(e.target.value)}
          />
          <div className="jd-helper-row">
            <button type="button" onClick={addJdTemplate}>Use smart template</button>
            <span>{jobDescription.trim().length} characters</span>
          </div>
        </>
      )}

      <div className="jd-input-hints">
        <span><CheckCircle2 size={12} /> Full JD paste</span>
        <span><CheckCircle2 size={12} /> Role + skills brief</span>
        <span><CheckCircle2 size={12} /> Recruiter notes</span>
        <span><CheckCircle2 size={12} /> Job URL context</span>
      </div>
    </div>
  );

  useEffect(() => {
    setActiveTab(new URLSearchParams(location.search).get("tab") === "generator" ? "generator" : "analyzer");
  }, [location.search]);

  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Smooth scroll to results
  useEffect(() => {
    if (results) {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setCheckedFixes({});
    }
  }, [results]);

  useEffect(() => {
    const node = footerDockRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setDockReleased(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const renderModeToggle = (extraClass = "") => (
    <div
      className={`mode-toggle-container ${dockReleased ? "mode-toggle-released" : "mode-toggle-fixed"} ${isLightMode ? "light-mode" : "dark-mode"} ${extraClass}`.trim()}
    >
      <div className="mode-toggle">
        <motion.div
          className="active-indicator-bg"
          initial={false}
          animate={{
            x: activeTab === "analyzer" ? "0%" : "100%"
          }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
        <button
          className={`mode-btn ${activeTab === "analyzer" ? "active" : ""}`}
          onClick={() => setActiveTab("analyzer")}
          style={{ color: activeTab === "analyzer" && isLightMode ? "var(--primary)" : "" }}
        >
          <ShieldCheck size={18} />
          <span>ATS Analyzer</span>
        </button>
        <button
          className={`mode-btn ${activeTab === "generator" ? "active" : ""}`}
          onClick={() => setActiveTab("generator")}
          style={{ color: activeTab === "generator" && isLightMode ? "var(--primary)" : "" }}
        >
          <Sparkles size={18} />
          <span>Resume Generator</span>
        </button>
      </div>
    </div>
  );



  // ------- FILE HANDLING -------
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedResume(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedResume(e.target.files[0]);
    }
  };

  const setSelectedResume = (file) => {
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const fileName = file.name.toLowerCase();
    if (!allowedExtensions.some((extension) => fileName.endsWith(extension))) {
      setResume(null);
      setResults(null);
      setError("Unsupported resume file. Please upload a PDF, DOCX, or TXT file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setResume(file);
    setResults(null);
    setError("");
    setLiveStatus("");
  };

  const removeFile = () => {
    setResume(null);
    setResults(null);
    setLiveStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ------- SUBMIT ANALYSIS -------
  const handleSubmit = async () => {
    if (!isAuthenticated) {
      setError("Please login to analyse your resume.");
      window.dispatchEvent(new CustomEvent("auth:open-login"));
      return;
    }
    if (!resume) return setError("Please upload your resume");
    if (!jobDescription.trim()) return setError("Please paste the job description");

    setSaving(true);
    setLoading(true);
    setError("");
    setLiveStatus("Analysing resume against the job description...");

    const formData = new FormData();
    formData.append("resume", resume);
    formData.append("job_description", jobDescription);

    try {
      const { data } = await api.post("/api/ats-check", formData, { headers: getAuthHeaders() });
      setResults(data);
      setLiveStatus("Analysis complete.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not connect to backend. Please ensure the server is active.");
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  const handleAiOptimize = async () => {
    if (!results) return;
    setAiBusy("optimizer");
    setError("");
    try {
      const { data } = await api.post("/api/ai/optimize-resume", {
        job_description: jobDescription,
        resume_excerpt: results.resume_optimizer?.raw_resume_excerpt || "",
        matched_skills: results.matched_skills || [],
        missing_skills: results.missing_skills || [],
        priority_gaps: results.priority_gaps || [],
      });
      setAiOptimizer(data);
    } catch (err) {
      setError(err.response?.data?.error || "AI optimizer failed. Add API key or try again.");
    } finally {
      setAiBusy("");
    }
  };

  const handleBulletRewrite = async () => {
    if (!bulletDraft.trim()) return;
    setAiBusy("bullet");
    setError("");
    try {
      const { data } = await api.post("/api/ai/rewrite-bullet", {
        bullet: bulletDraft,
        role: jdBrief.role || "Full Stack Developer",
      });
      setBulletRewrite(data);
    } catch (err) {
      setError(err.response?.data?.error || "AI bullet rewrite failed. Add API key or try again.");
    } finally {
      setAiBusy("");
    }
  };

  // ------- HELPERS -------
  const getScoreColor = (score) => {
    if (score >= 75) return "#10b981"; // Emerald
    if (score >= 50) return "#f59e0b"; // Amber
    if (score >= 30) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const getVerdictDetails = (status) => {
    const verdicts = {
      strong_match: { color: "#10b981", icon: <CheckCircle2 size={32} />, label: "Strong Match", class: "verdict-strong" },
      excellent_match: { color: "#059669", icon: <CheckCircle2 size={32} />, label: "Excellent Match", class: "verdict-strong" },
      good_match: { color: "#3b82f6", icon: <CheckCircle2 size={32} />, label: "Good Match", class: "verdict-good" },
      possible_fit: { color: "#f59e0b", icon: <Info size={32} />, label: "Possible Fit", class: "verdict-possible" },
      weak_match: { color: "#f97316", icon: <AlertTriangle size={32} />, label: "Weak Match", class: "verdict-weak" },
      needs_major_improvement: { color: "#ef4444", icon: <XCircle size={32} />, label: "Needs Major Improvement", class: "verdict-low" },
      rejected: { color: "#ef4444", icon: <XCircle size={32} />, label: "Not Recommended", class: "verdict-low" },
    };
    return verdicts[status] || verdicts.weak_match;
  };

  const openLogin = () => {
    window.dispatchEvent(new CustomEvent("auth:open-login"));
  };

  const heatmapItems = buildKeywordHeatmap(jobDescription, results);
  const fixChecklist = buildFixChecklist(results);

  const toggleFix = (id) => setCheckedFixes((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderInteractiveAnalyzerTools = (variant = "light") => {
    if (!results) return null;
    const completed = fixChecklist.filter((item) => checkedFixes[item.id]).length;

    return (
      <div className={`ats-interactive-grid ${variant === "dark" ? "dark" : ""}`}>
        <div className="ats-interactive-card heatmap-card">
          <div className="ats-tool-head">
            <h4><Search size={16} /> Keyword Heatmap</h4>
            <span>{heatmapItems.length} JD terms</span>
          </div>
          <div className="heatmap-legend">
            <span className="legend-found">Found</span>
            <span className="legend-missing">Missing</span>
            <span className="legend-weak">Weak</span>
          </div>
          <div className="keyword-heatmap">
            {heatmapItems.length ? heatmapItems.map((item, index) => (
              <button key={`${item.skill}-${index}`} className={`heatmap-token ${item.status}`} type="button">
                {item.skill}
              </button>
            )) : (
              <p>No JD keywords detected in the pasted description yet.</p>
            )}
          </div>
        </div>

        <div className="ats-interactive-card checklist-card">
          <div className="ats-tool-head">
            <h4><CheckCircle2 size={16} /> Resume Fix Checklist</h4>
            <span>{completed}/{fixChecklist.length}</span>
          </div>
          <div className="fix-checklist">
            {fixChecklist.map((item) => (
              <label key={item.id} className={`fix-item ${checkedFixes[item.id] ? "done" : ""}`}>
                <input type="checkbox" checked={!!checkedFixes[item.id]} onChange={() => toggleFix(item.id)} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </label>
            ))}
          </div>
        </div>

      </div>
    );
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <>
        <div className={isLightMode ? "ats-page light-mode" : "ats-modern-container dark-mode"}>
          {!isLightMode && <BackgroundDecorations />}
          <section className="ats-login-gate">
            <div className="ats-login-gate-icon">
              <Lock size={28} />
            </div>
            <span>Login required</span>
            <h1>Login to use the resume analyser and generator</h1>
            <p>
              Your scans, ATS gaps, checklist progress, and optimized resume builder are available only after login.
            </p>
            <button type="button" onClick={openLogin}>
              <LogIn size={18} /> Login to Continue
            </button>
          </section>
        </div>
        <div ref={footerDockRef}>
          {renderModeToggle(activeTab === "generator" ? "mode-toggle-generator" : "")}
        </div>
      </>
    );
  }

  return (
    <>
      {activeTab === "generator" ? (
        <div className={isLightMode ? "ats-page light-mode" : "ats-modern-container dark-mode"}>
          {!isLightMode && <BackgroundDecorations />}
          <ResumeGenerator optimizerSeed={results?.resume_optimizer} analyzerResults={results} />
        </div>
      ) : isLightMode ? (
        <div className="ats-page">
          <Scene3D />
          {/* ═══════ ORIGINAL HERO ═══════ */}
          {/* ═══════ ZENITH HERO (LIGHT MODE) ═══════ */}
          <header className="ats-hero-zenith">
            <div className="hero-background-elements">
              <div className="zenith-orb orb-indigo" />
              <div className="zenith-orb orb-blue" />
            </div>

            <div className="zenith-container">
              <motion.div
                className="zenith-content"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="zenith-badge-row">
                  <span className="zenith-pill pill-primary">
                    <Sparkles size={14} style={{ marginRight: '6px' }} /> AI Powered
                  </span>
                  <span className="zenith-pill pill-outline">ATS Optimized</span>
                </div>

                <h1 className="zenith-title">
                  Perfect Your Resume <br />
                  <span className="title-highlight">For Every Job</span>
                </h1>

                <p className="zenith-description">
                  Beat the bots and land more interviews with our enterprise-grade ATS scanner.
                  Get precise keyword analysis and structure validation in seconds.
                </p>

                <div className="zenith-actions">
                  <button
                    className="btn-zenith-primary"
                    onClick={() => document.getElementById('upload').scrollIntoView({ behavior: 'smooth' })}
                  >
                    Scan Now <ArrowRight size={20} />
                  </button>
                  <button className="btn-zenith-secondary">
                    View Sample Report
                  </button>
                </div>
                
                <div className="ats-hero-stats" style={{ marginTop: '20px' }}>
                  <div className="hero-stat">
                    <span className="hero-stat-val">98%</span>
                    <span className="hero-stat-lbl">Accuracy</span>
                  </div>
                  <div className="hero-stat">
                    <span className="hero-stat-val">2s</span>
                    <span className="hero-stat-lbl">Scan Time</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="zenith-visual"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 }}
              >
                <motion.div className="mockup-stack"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="mockup-card-main">
                    <div className="mockup-header-row">
                      <div className="mockup-dots">
                        <div className="mockup-dot mockup-dot-red" />
                        <div className="mockup-dot mockup-dot-yellow" />
                        <div className="mockup-dot mockup-dot-green" />
                      </div>
                      <span className="preview-title">Real-time Analysis</span>
                    </div>

                    <div className="mockup-score-section">
                      <div className="circular-score">
                        <svg viewBox="0 0 100 100" className="score-svg">
                          <circle cx="50" cy="50" r="45" className="score-circle-bg" />
                          <motion.circle
                            cx="50" cy="50" r="45"
                            className="score-circle-fill"
                            initial={{ strokeDashoffset: 283 }}
                            whileInView={{ strokeDashoffset: 283 - (283 * 85) / 100 }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, delay: 0.5 }}
                            strokeDasharray="283"
                          />
                        </svg>
                        <div className="score-text">
                          <span className="score-num">85</span>
                          <span className="score-label">Match %</span>
                        </div>
                      </div>
                      <div className="preview-status" style={{ color: '#10b981', fontWeight: '700', fontSize: '13px' }}>Optimized for ATS</div>
                    </div>

                    <div className="preview-keyword-strip">
                      <div className="keyword-chip match">React</div>
                      <div className="keyword-chip match">Python</div>
                      <div className="keyword-chip missing">Docker</div>
                      <div className="keyword-chip match">Node.js</div>
                    </div>
                  </div>

                  {/* Hero mockup visual */}
                </motion.div>
              </motion.div>
            </div>
          </header>


          <section className="ats-upload-section" id="upload">
            <div className="ats-section-header">
              <h2 className="ats-section-title">Upload <span className="gradient-text">Resume</span></h2>
              <p className="ats-section-desc">Get your compatibility score in seconds</p>
            </div>

            <div className="ats-input-section">
              <div className="ats-card">
                <h4 className="card-title"><FileText size={18} /> Resume File</h4>
                <div
                  className={`drop-zone ${dragActive ? "drop-active" : ""} ${resume ? "has-file" : ""}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} hidden />
                  {resume ? (
                    <div className="file-info">
                      <FileText className="file-icon" />
                      <span className="file-name">{resume.name}</span>
                      <button className="remove-file" onClick={(e) => { e.stopPropagation(); removeFile(); }}><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="drop-content">
                      <UploadCloud className="upload-icon" />
                      <p>Click to upload or drag & drop</p>
                      <span className="drop-hint">PDF, DOCX, TXT (Max 5MB)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="ats-card">
                <h4 className="card-title"><Briefcase size={18} /> Job Description</h4>
                {renderJobInputMethods("jd-input")}
              </div>
            </div>

            {error && <div className="ats-error">{error}</div>}
            {liveStatus && !error && <div className="ats-live-status">{liveStatus}</div>}

            {loading ? (
              <div className="smart-loader-wrapper">
                <div className="smart-loader-bar"><div className="smart-loader-fill"></div></div>
                <div className="smart-loader-text">
                  <Bot size={18} className="loader-icon bounce" />
                  <span>{loadingSteps[loadingStep]}</span>
                </div>
              </div>
            ) : (
              <button className="analyze-btn" disabled={!resume || !jobDescription.trim()} onClick={handleSubmit}>
                <Bot size={20} /> {saving ? "Analysing..." : "Analyse Resume"}
              </button>
            )}

            {results && (
              <div id="results" className="report-container">
                <div className="report-header">
                  <div className="report-brand"><FileText size={18} /> Deep-Scan Intelligence Report</div>
                  <div className="report-date">
                    <button className="generate-roadmap-btn" onClick={() => setActiveTab("generator")}>
                      <Sparkles size={15} /> Build Optimized Resume
                    </button>
                    Generated on {new Date().toLocaleDateString()}
                  </div>
                </div>
                {!!results.analysis_warnings?.length && (
                  <div className="ats-warning-strip">
                    <AlertTriangle size={16} />
                    <span>{results.analysis_warnings.slice(0, 2).join(" ")}</span>
                  </div>
                )}

                <div className="report-quick-stats">
                  <div className="quick-stat-card primary" style={{ "--accent": getScoreColor(results.ats_score) }}>
                    <div className="quick-stat-icon"><Target size={17} /></div>
                    <div className="quick-stat-copy">
                      <div className="quick-stat-head">
                        <span>ATS Score</span>
                        <strong>{Math.round(results.ats_score)}%</strong>
                      </div>
                      <small>{getVerdictDetails(results.verdict.status).label}</small>
                      <div className="quick-stat-meter">
                        <i style={{ width: `${Math.min(results.ats_score || 0, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="quick-stat-card" style={{ "--accent": "#2563eb" }}>
                    <div className="quick-stat-icon"><ShieldCheck size={17} /></div>
                    <div className="quick-stat-copy">
                      <div className="quick-stat-head">
                        <span>Fit Score</span>
                        <strong>{Math.round(results.fit_score)}%</strong>
                      </div>
                      <small>Role alignment</small>
                      <div className="quick-stat-meter">
                        <i style={{ width: `${Math.min(results.fit_score || 0, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="quick-stat-card" style={{ "--accent": "#7c3aed" }}>
                    <div className="quick-stat-icon"><User size={17} /></div>
                    <div className="quick-stat-copy">
                      <div className="quick-stat-head">
                        <span>Recruiter View</span>
                        <strong>{Math.round(results.recruiter_score)}%</strong>
                      </div>
                      <small>Human readability</small>
                      <div className="quick-stat-meter">
                        <i style={{ width: `${Math.min(results.recruiter_score || 0, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="quick-stat-card" style={{ "--accent": "#059669" }}>
                    <div className="quick-stat-icon"><CheckCircle2 size={17} /></div>
                    <div className="quick-stat-copy">
                      <div className="quick-stat-head">
                        <span>Confidence</span>
                        <strong>{Math.round(results.confidence_score || 0)}%</strong>
                      </div>
                      <small>Parse quality</small>
                      <div className="quick-stat-meter">
                        <i style={{ width: `${Math.min(results.confidence_score || 0, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="report-top-split">
                  <div className="report-verdict-box" style={{ borderTop: `4px solid ${getVerdictDetails(results.verdict.status).color}` }}>
                    <div className="verdict-status">
                      <div style={{ color: getVerdictDetails(results.verdict.status).color }}>{getVerdictDetails(results.verdict.status).icon}</div>
                      <div>
                        <h2>{getVerdictDetails(results.verdict.status).label}</h2>
                        <p>{results.verdict.reason}</p>
                      </div>
                    </div>

                    <div className="report-master-dial">
                      <div className="report-score-circle">
                        <svg viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="54" className="circle-bg" />
                          <circle
                            cx="60"
                            cy="60"
                            r="54"
                            className="circle-progress"
                            style={{ stroke: getScoreColor(results.ats_score), strokeDashoffset: 339 - (339 * results.ats_score) / 100 }}
                          />
                        </svg>
                        <div className="dial-value" style={{ color: getScoreColor(results.ats_score) }}>{Math.round(results.ats_score)}<span className="pct">%</span></div>
                      </div>
                      <span className="dial-lbl">Overall Match Compatibility</span>
                    </div>
                  </div>

                  <div className="report-metrics-box">
                    <h3 className="metrics-box-title">Multidimensional Breakdown</h3>

                    <div className="metric-row">
                      <div className="metric-info">
                        <span className="metric-name">Skills Match</span>
                        <span className="metric-pct">{results.score_breakdown ? results.score_breakdown.skills_match.toFixed(0) : Math.round(results.fit_score)}/100</span>
                      </div>
                      <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: `${results.score_breakdown ? results.score_breakdown.skills_match : results.fit_score}%`, background: '#3b82f6' }}></div></div>
                    </div>

                    <div className="metric-row">
                      <div className="metric-info">
                        <span className="metric-name">Semantic Project Impact</span>
                        <span className="metric-pct">{results.score_breakdown ? results.score_breakdown.project_impact.toFixed(0) : Math.round(results.recruiter_score)}/100</span>
                      </div>
                      <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: `${results.score_breakdown ? results.score_breakdown.project_impact : results.recruiter_score}%`, background: '#8b5cf6' }}></div></div>
                    </div>

                    <div className="metric-row">
                      <div className="metric-info">
                        <span className="metric-name">Experience Relevance</span>
                        <span className="metric-pct">{results.score_breakdown ? results.score_breakdown.experience_relevance.toFixed(0) : results.section_score}/100</span>
                      </div>
                      <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: `${results.score_breakdown ? results.score_breakdown.experience_relevance : results.section_score}%`, background: '#10b981' }}></div></div>
                    </div>

                    <div className="metric-row">
                      <div className="metric-info">
                        <span className="metric-name">Formatting Quality</span>
                        <span className="metric-pct">{Math.round(results.section_score || 0)}/100</span>
                      </div>
                      <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: `${Math.min(results.section_score || 0, 100)}%`, background: '#f59e0b' }}></div></div>
                    </div>
                  </div>
                </div>

                {renderInteractiveAnalyzerTools("light")}

                <div className="report-skills-split">
                  <div className="report-skills-panel matched-panel">
                    <div className="panel-hdr">
                      <h4><CheckCircle2 size={16} /> Discovered Keywords</h4>
                      <span className="panel-cnt">{results.matched_skills?.length || 0}</span>
                    </div>
                    <div className="mini-tags">
                      {results.matched_skills?.length ? (
                        results.matched_skills.map((s, i) => <span key={i} className="m-tag matched">{s}</span>)
                      ) : (
                        <span className="m-tag">No matched keywords yet. Add JD terms truthfully to your resume.</span>
                      )}
                    </div>
                  </div>

                  <div className="report-skills-panel missing-panel">
                    <div className="panel-hdr">
                      <h4><AlertTriangle size={16} /> Gap Intelligence Analysis</h4>
                      <span className="panel-cnt miss">{results.missing_skills?.length || 0}</span>
                    </div>
                    <div className="gap-list">
                      {results.priority_gaps ? (
                        results.priority_gaps.length ? results.priority_gaps.map((g, i) => (
                          <div key={i} className={`gap-item prio-${g.priority.toLowerCase()}`}>
                            <span className="gap-name">{g.skill}</span>
                            <span className="gap-badge">{g.priority} Priority Gap</span>
                          </div>
                        )) : <div className="gap-item basic"><span className="gap-name">No priority gaps detected.</span></div>
                      ) : (
                        results.missing_skills?.map((s, i) => (
                          <div key={i} className="gap-item basic">
                            <span className="gap-name">{s}</span>
                          </div>
                        ))
                      )}
                    </div>
                    {(results.priority_gaps?.length > 0 || results.missing_skills?.length > 0) && (
                      <button 
                        className="generate-roadmap-btn"
                        onClick={() => setActiveTab("generator")}
                      >
                        <Sparkles size={16} />
                        Build Resume With These Gaps
                      </button>
                    )}
                  </div>
                </div>

                {(results.skill_intelligence || results.resume_detail_advice?.length > 0) && (
                  <div className="report-guidance-grid">
                    <div className="report-skills-panel insight-panel">
                      <div className="panel-hdr">
                        <h4><Sparkles size={16} /> Strong Skill Intelligence</h4>
                        <span className="panel-cnt">{results.skill_intelligence?.coverage?.toFixed?.(0) || 0}%</span>
                      </div>
                      <div className="insight-list">
                        {results.skill_intelligence?.strongest_categories?.length ? (
                          results.skill_intelligence.strongest_categories.map((cat, i) => (
                            <div key={i} className="insight-row">
                              <div>
                                <strong>{cat.category}</strong>
                                <span>{cat.matched.slice(0, 5).join(", ")}</span>
                              </div>
                              <b>{cat.coverage.toFixed(0)}%</b>
                            </div>
                          ))
                        ) : (
                          <div className="insight-row"><span>Add more exact JD skills to build stronger category coverage.</span></div>
                        )}
                      </div>
                    </div>

                    <div className="report-skills-panel insight-panel">
                      <div className="panel-hdr">
                        <h4><Lightbulb size={16} /> Useful Sections To Add</h4>
                        <span className="panel-cnt">{results.resume_detail_advice?.length || 0}</span>
                      </div>
                      <div className="section-advice-list">
                        {results.resume_detail_advice?.map((item, i) => (
                          <div key={i} className="section-advice-card">
                            <strong>{item.section}</strong>
                            <p>{item.why}</p>
                            <span>{item.example}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="ai-tools-panel">
                  <div className="ai-tools-head">
                    <div>
                      <h4><Sparkles size={16} /> AI Resume Tools</h4>
                      <p>Compact LLM helpers for rewriting and improving the generated resume content.</p>
                    </div>
                    <button className="generate-roadmap-btn" onClick={handleAiOptimize} disabled={aiBusy === "optimizer"}>
                      <Sparkles size={15} /> {aiBusy === "optimizer" ? "Improving..." : "Improve With AI"}
                    </button>
                  </div>

                  {aiOptimizer && (
                    <div className="ai-output-grid">
                      <div className="ai-output-card">
                        <strong>Summary</strong>
                        <p>{aiOptimizer.summary}</p>
                      </div>
                      <div className="ai-output-card">
                        <strong>Skills To Add Truthfully</strong>
                        <div className="mini-tags">
                          {aiOptimizer.skills_to_add?.map((skill, i) => <span key={i} className="m-tag missing">{skill}</span>)}
                        </div>
                      </div>
                      <div className="ai-output-card">
                        <strong>Project Rewrite</strong>
                        <p>{aiOptimizer.project_rewrites?.[0]}</p>
                      </div>
                      <div className="ai-output-card">
                        <strong>Experience Rewrite</strong>
                        <p>{aiOptimizer.experience_rewrites?.[0]}</p>
                      </div>
                    </div>
                  )}

                  <div className="ai-bullet-tool">
                    <textarea
                      value={bulletDraft}
                      onChange={(e) => setBulletDraft(e.target.value)}
                      placeholder="Paste a weak resume bullet, e.g. Made website using React"
                    />
                    <button className="generate-roadmap-btn" onClick={handleBulletRewrite} disabled={!bulletDraft.trim() || aiBusy === "bullet"}>
                      <Bot size={15} /> {aiBusy === "bullet" ? "Rewriting..." : "Rewrite Bullet"}
                    </button>
                  </div>
                  {bulletRewrite?.rewritten && (
                    <div className="ai-output-card ai-rewrite-result">
                      <strong>Improved Bullet</strong>
                      <p>{bulletRewrite.rewritten}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="ats-features-strip">
            {ATS_FEATURES.map((f, i) => (
              <div key={i} className="ats-feature-chip">
                <div className="ats-feat-icon">{f.icon}</div>
                <div>
                  <h4 className="ats-feat-title">{f.title}</h4>
                  <p className="ats-feat-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="ats-modern-container">
          <BackgroundDecorations />
          {/* ... keeping existing V2 structure for dark mode ... */}
          {/* ─── Hero Section ─── */}
          <header className="ats-hero-zenith">
            <div className="hero-background-elements">
              <div className="zenith-orb orb-indigo" />
              <div className="zenith-orb orb-blue" />
            </div>

            <div className="zenith-container">
              <motion.div
                className="zenith-content"
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <div className="zenith-badge-row">
                  <span className="zenith-pill pill-primary">
                    <Sparkles size={14} style={{ marginRight: '6px' }} /> AI Powered
                  </span>
                  <span className="zenith-pill pill-outline">ATS Optimized</span>
                </div>

                <h1 className="zenith-title">
                  Perfect Your Resume <br />
                  <span className="title-highlight">For Every Job</span>
                </h1>

                <p className="zenith-description">
                  Beat the bots and land more interviews with our enterprise-grade ATS scanner.
                  Get precise keyword analysis and structure validation in seconds.
                </p>

                <div className="zenith-actions">
                  <button
                    className="btn-zenith-primary"
                    onClick={() => document.getElementById('upload').scrollIntoView({ behavior: 'smooth' })}
                  >
                    Scan Now <ArrowRight size={20} />
                  </button>
                  <button className="btn-zenith-secondary">
                    View Sample Report
                  </button>
                </div>
                
                <div className="ats-hero-stats" style={{ marginTop: '20px' }}>
                  <div className="hero-stat">
                    <span className="hero-stat-val">98%</span>
                    <span className="hero-stat-lbl">Accuracy</span>
                  </div>
                  <div className="hero-stat">
                    <span className="hero-stat-val">2s</span>
                    <span className="hero-stat-lbl">Scan Time</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="zenith-visual"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 }}
              >
                <motion.div className="mockup-stack"
                   animate={{ y: [0, -10, 0] }}
                   transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="mockup-card-main">
                    <div className="mockup-header-row">
                      <div className="mockup-dots">
                        <div className="mockup-dot mockup-dot-red" />
                        <div className="mockup-dot mockup-dot-yellow" />
                        <div className="mockup-dot mockup-dot-green" />
                      </div>
                      <span className="preview-title">Real-time Analysis</span>
                    </div>

                    <div className="mockup-score-section">
                      <div className="circular-score">
                        <svg viewBox="0 0 100 100" className="score-svg">
                          <circle cx="50" cy="50" r="45" className="score-circle-bg" />
                          <motion.circle
                            cx="50" cy="50" r="45"
                            className="score-circle-fill"
                            initial={{ strokeDashoffset: 283 }}
                            whileInView={{ strokeDashoffset: 283 - (283 * 85) / 100 }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, delay: 0.5 }}
                            strokeDasharray="283"
                          />
                        </svg>
                        <div className="score-text">
                          <span className="score-num">85</span>
                          <span className="score-label">Match %</span>
                        </div>
                      </div>
                      <div className="preview-status" style={{ color: '#10b981', fontWeight: '700', fontSize: '13px' }}>Optimized for ATS</div>
                    </div>

                    <div className="preview-keyword-strip">
                      <div className="keyword-chip match">React</div>
                      <div className="keyword-chip match">Python</div>
                      <div className="keyword-chip missing">Docker</div>
                      <div className="keyword-chip match">Node.js</div>
                    </div>
                  </div>

                  {/* Hero mockup visual */}
                </motion.div>
              </motion.div>
            </div>
          </header>




          {/* ─── Input Hub ─── */}
          <section className="ats-input-hub" id="upload">
            <div className="input-hub-grid">
              {/* Resume Upload */}
              <motion.div
                className="glass-card upload-hub"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="hub-header">
                  <div className="hub-icon-box"><FileText size={20} /></div>
                  <div className="hub-title-box">
                    <h3>Resume Source</h3>
                    <p>PDF, DOCX, or TXT formats</p>
                  </div>
                </div>

                <div
                  className={`modern-drop-zone ${dragActive ? "active" : ""} ${resume ? "has-file" : ""}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} hidden />
                  {resume ? (
                    <div className="hub-file-display">
                      <div className="file-blob">
                        <Paperclip size={24} />
                      </div>
                      <div className="file-meta">
                        <span className="file-name">{resume.name}</span>
                        <span className="file-size">{(resume.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button className="hub-remove-btn" onClick={(e) => { e.stopPropagation(); removeFile(); }}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="hub-empty-state">
                      <div className="upload-anim-box">
                        <UploadCloud size={40} className="float-anim" />
                      </div>
                      <p>Drop file here or <span>browse</span></p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* JD Input */}
              <motion.div
                className="glass-card jd-hub"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="hub-header">
                  <div className="hub-icon-box"><Briefcase size={20} /></div>
                  <div className="hub-title-box">
                    <h3>Target Role</h3>
                    <p>Paste the job description or build a guided brief</p>
                  </div>
                </div>
                {renderJobInputMethods("modern-textarea")}
              </motion.div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="hub-error-box"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <AlertCircle size={18} /> {error}
                </motion.div>
              )}
            </AnimatePresence>
            {liveStatus && !error && <div className="hub-live-status">{liveStatus}</div>}

            <div className="hub-actions">
              {loading ? (
                <div className="smart-loader-wrapper hub-dark">
                  <div className="smart-loader-bar"><div className="smart-loader-fill"></div></div>
                  <div className="smart-loader-text">
                    <Rocket size={18} className="loader-icon bounce" />
                    <span>{loadingSteps[loadingStep]}</span>
                  </div>
                </div>
              ) : (
                <button
                  className="hub-scan-btn"
                  onClick={handleSubmit}
                  disabled={!resume || !jobDescription.trim()}
                >
                  <Rocket size={20} /> {saving ? "Analysing..." : "Analyse Resume"}
                </button>
              )}
            </div>
          </section>

          {/* ─── Result Dashboard ─── */}
          <AnimatePresence>
            {results && (
              <motion.section
                id="results"
                className="ats-dashboard"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="dash-header">
                  <div className="dash-title">
                    <h2>Strategic <span className="text-gradient">Report</span></h2>
                    <p>AI generated analysis for technical compatibility</p>
                  </div>
                  <div className="dash-timestamp">
                    <button className="generate-roadmap-btn v2-roadmap-btn" onClick={() => setActiveTab("generator")}>
                      <Sparkles size={15} /> Build Optimized Resume
                    </button>
                    <Calendar size={14} /> Scan ID: #{Math.floor(Math.random() * 900000) + 100000}
                  </div>
                </div>
                {!!results.analysis_warnings?.length && (
                  <div className="ats-warning-strip dark">
                    <AlertTriangle size={16} />
                    <span>{results.analysis_warnings.slice(0, 2).join(" ")}</span>
                  </div>
                )}

                {/* Top Banner: Score + Verdict */}
                <div className={`dash-summary-card ${getVerdictDetails(results.verdict.status).class}`}>
                  <div className="summary-main">
                    <div className="summary-verdict">
                      <div className="verdict-icon-v2">{getVerdictDetails(results.verdict.status).icon}</div>
                      <div className="verdict-text-v2">
                        <h3>{getVerdictDetails(results.verdict.status).label}</h3>
                        <p>{results.verdict.reason}</p>
                      </div>
                    </div>
                    <div className="summary-master-score">
                      <div className="master-circle">
                        <svg viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" className="track" />
                          <motion.circle
                            cx="50" cy="50" r="45"
                            className="progress"
                            initial={{ strokeDashoffset: 283 }}
                            animate={{ strokeDashoffset: 283 - (283 * results.ats_score) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            style={{ stroke: getScoreColor(results.ats_score) }}
                          />
                        </svg>
                        <div className="count-box">
                          <span className="count">{Math.round(results.ats_score)}</span>
                          <span className="label">ATS Score</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="summary-metrics-row">
                    <div className="metric-v2">
                      <span className="m-val">{results.score_breakdown ? results.score_breakdown.skills_match.toFixed(0) : Math.round(results.fit_score)}%</span>
                      <span className="m-lbl">Skills Match</span>
                    </div>
                    <div className="metric-divider"></div>
                    <div className="metric-v2">
                      <span className="m-val">{results.score_breakdown ? results.score_breakdown.project_impact.toFixed(0) : Math.round(results.recruiter_score)}%</span>
                      <span className="m-lbl">Project Impact</span>
                    </div>
                    <div className="metric-divider"></div>
                    <div className="metric-v2">
                      <span className="m-val">{results.score_breakdown ? results.score_breakdown.experience_relevance.toFixed(0) : results.section_score}%</span>
                      <span className="m-lbl">Exp Relevance</span>
                    </div>
                    <div className="metric-divider"></div>
                    <div className="metric-v2">
                      <span className="m-val">{Math.round(results.section_score || 0)}%</span>
                      <span className="m-lbl">Format Quality</span>
                    </div>
                  </div>
                </div>

                {renderInteractiveAnalyzerTools("dark")}

                <div className="dash-main-grid">
                  {/* Insights Panel */}
                  <div className="dash-column left">
                    {/* Experience Stats */}
                    <div className="glass-card results-mini-card">
                      <h4 className="card-sub-title"><User size={16} /> Candidate Profile</h4>
                      <div className="profile-stats">
                        <div className="p-stat">
                          <span className="p-lbl">Role Tier</span>
                          <span className="p-val">{results.role_level}</span>
                        </div>
                        <div className="p-stat">
                          <span className="p-lbl">Experience</span>
                          <span className="p-val">{results.resume_years} / {results.jd_years_required} Yrs</span>
                        </div>
                        <div className="p-stat">
                          <span className="p-lbl">Education</span>
                          <span className="p-val">{results.education_level}</span>
                        </div>
                      </div>
                    </div>

                    {/* Skills Cloud */}
                    <div className="glass-card skills-dashboard">
                      <div className="skills-v2-header">
                        <h4 className="card-sub-title"><Search size={16} /> Semantic Gap</h4>
                        <div className="skill-count-chip">
                          {results.matched_skills?.length || 0} Matched • {results.missing_skills?.length || 0} Gaps
                        </div>
                      </div>

                      <div className="skills-scroll-area">
                        <div className="skill-group-v2">
                          <label className="green-label"><CheckCircle2 size={12} /> Keywords Found</label>
                          <div className="cloud-v2">
                            {results.matched_skills?.length ? (
                              results.matched_skills.map((s, i) => (
                                <span key={i} className="v2-tag found">{s}</span>
                              ))
                            ) : (
                              <span className="v2-tag">No matched keywords yet. Add truthful JD terms to improve alignment.</span>
                            )}
                          </div>
                        </div>

                        <div className="skill-group-v2">
                          <label className="red-label"><AlertCircle size={12} /> Priority Gaps</label>
                          <div className="cloud-v2">
                            {results.priority_gaps ? (
                              results.priority_gaps.length ? results.priority_gaps.map((g, i) => (
                                <span key={i} className={`v2-tag missing gap-priority-${g.priority.toLowerCase()}`}>
                                  {g.skill} <span className="prio-lbl">({g.priority})</span>
                                </span>
                              )) : <span className="v2-tag found">No priority gaps detected.</span>
                            ) : (
                              results.missing_skills?.map((s, i) => (
                                <span key={i} className="v2-tag missing">{s}</span>
                              ))
                            )}
                          </div>
                          {(results.priority_gaps?.length > 0 || results.missing_skills?.length > 0) && (
                            <button 
                              className="generate-roadmap-btn v2-roadmap-btn"
                              onClick={() => setActiveTab("generator")}
                            >
                              <Sparkles size={15} />
                              Build Resume With These Gaps
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {(results.skill_intelligence || results.resume_detail_advice?.length > 0) && (
                      <div className="glass-card skills-dashboard intelligence-dashboard">
                        <div className="skills-v2-header">
                          <h4 className="card-sub-title"><Sparkles size={16} /> Stronger Resume Details</h4>
                          <div className="skill-count-chip">{results.skill_intelligence?.coverage?.toFixed?.(0) || 0}% Coverage</div>
                        </div>

                        <div className="skill-group-v2">
                          <label className="green-label"><CheckCircle2 size={12} /> Strongest Skill Areas</label>
                          <div className="cloud-v2">
                            {results.skill_intelligence?.strongest_categories?.length ? (
                              results.skill_intelligence.strongest_categories.map((cat, i) => (
                                <span key={i} className="v2-tag found">{cat.category}: {cat.coverage.toFixed(0)}%</span>
                              ))
                            ) : (
                              <span className="v2-tag">Add exact JD skills to strengthen this section.</span>
                            )}
                          </div>
                        </div>

                        <div className="section-advice-list dark">
                          {results.resume_detail_advice?.map((item, i) => (
                            <div key={i} className="section-advice-card">
                              <strong>{item.section}</strong>
                              <p>{item.why}</p>
                              <span>{item.example}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="glass-card ai-tools-panel dark">
                      <div className="ai-tools-head">
                        <div>
                          <h4><Sparkles size={16} /> AI Resume Tools</h4>
                          <p>Improve summary, project, experience, and weak bullets with compact AI prompts.</p>
                        </div>
                        <button className="generate-roadmap-btn v2-roadmap-btn" onClick={handleAiOptimize} disabled={aiBusy === "optimizer"}>
                          <Sparkles size={15} /> {aiBusy === "optimizer" ? "Improving..." : "Improve With AI"}
                        </button>
                      </div>
                      {aiOptimizer && (
                        <div className="ai-output-grid">
                          <div className="ai-output-card"><strong>Summary</strong><p>{aiOptimizer.summary}</p></div>
                          <div className="ai-output-card"><strong>Skills</strong><p>{aiOptimizer.skills_to_add?.join(", ")}</p></div>
                          <div className="ai-output-card"><strong>Project</strong><p>{aiOptimizer.project_rewrites?.[0]}</p></div>
                          <div className="ai-output-card"><strong>Experience</strong><p>{aiOptimizer.experience_rewrites?.[0]}</p></div>
                        </div>
                      )}
                      <div className="ai-bullet-tool">
                        <textarea value={bulletDraft} onChange={(e) => setBulletDraft(e.target.value)} placeholder="Paste a weak bullet to rewrite..." />
                        <button className="generate-roadmap-btn v2-roadmap-btn" onClick={handleBulletRewrite} disabled={!bulletDraft.trim() || aiBusy === "bullet"}>
                          <Bot size={15} /> {aiBusy === "bullet" ? "Rewriting..." : "Rewrite Bullet"}
                        </button>
                      </div>
                      {bulletRewrite?.rewritten && <div className="ai-output-card ai-rewrite-result"><strong>Improved Bullet</strong><p>{bulletRewrite.rewritten}</p></div>}
                    </div>
                  </div>

                  {/* Suggestions Panel */}
                  <div className="dash-column right">
                    <div className="glass-card recommendations-panel">
                      <div className="rec-header">
                        <h4 className="card-sub-title"><Lightbulb size={18} /> Strategic Improvements</h4>
                        <span className="rec-count">{results.suggestions?.length || 0} Items</span>
                      </div>

                      <div className="rec-list">
                        {results.suggestions?.map((tip, i) => (
                          <motion.div
                            key={i}
                            className={`rec-item priority-${tip.priority}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <div className="item-head">
                              <div className="item-prio-badge">{tip.priority}</div>
                              <span className="item-cat">{tip.category}</span>
                            </div>
                            <p className="item-msg">{tip.message}</p>
                            {tip.impact && (
                              <div className="item-impact">
                                <strong>Expected Impact:</strong> {tip.impact}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* ─── Feature Grid ─── */}
          <div className="ats-feature-v2">
            {ATS_FEATURES.map((f, i) => (
              <motion.div key={i} className="feature-v2-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="feature-v2-icon">{f.icon}</div>
                <h4 className="feature-v2-title">{f.title}</h4>
                <p className="feature-v2-desc">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      <div ref={footerDockRef}>
        {renderModeToggle(activeTab === "generator" ? "mode-toggle-generator" : "")}
      </div>
    </>
  );
};

export default ATSAnalyzer;
