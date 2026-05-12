import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  FileSearch,
  FileText,
  PenLine,
  Search,
  Sparkles,
  UploadCloud,
  Wand2,
} from "lucide-react";
import BackgroundDecorations from "../../components/BackgroundDecorations/BackgroundDecorations";
import { useTheme } from "../../context/ThemeContext";
import "../ATSAnalyzer/ATSAnalyzer.css";
import "./HomePage.css";

const analyserSteps = [
  { icon: UploadCloud, title: "Upload resume", text: "Add your PDF, DOCX, or TXT resume so the analyser can extract and read the content." },
  { icon: FileSearch, title: "Add job description", text: "Paste the JD, fill the guided brief, or add job-link context for one exact target role." },
  { icon: BarChart3, title: "Read the score report", text: "Check ATS score, fit score, matched keywords, priority gaps, and recruiter readability." },
  { icon: Sparkles, title: "Improve and generate", text: "Use the suggestions to create a stronger resume with the generator and export a PDF." },
];

const generatorSteps = [
  { icon: PenLine, title: "Choose a template", text: "Pick Classic, Modern, Minimal, Executive, or Academic Pro based on the role." },
  { icon: FileText, title: "Fill the wizard", text: "Enter personal details, objective, skills, education, projects, experience, and certificates." },
  { icon: CheckCircle2, title: "Review structure", text: "Confirm section order, contact details, skill groups, and project descriptions." },
  { icon: Download, title: "Export PDF", text: "Download a clean resume PDF designed to stay readable for ATS parsers and recruiters." },
];

const roadmapSteps = [
  ...analyserSteps.map((step, index) => ({
    ...step,
    phase: "Phase 1",
    phaseTitle: "ATS Resume Analyser",
    phaseText: "Understand why the resume may not match a job before applying.",
    number: index + 1,
    type: "analyser",
  })),
  ...generatorSteps.map((step, index) => ({
    ...step,
    phase: "Phase 2",
    phaseTitle: "Resume Generator",
    phaseText: "Create a cleaner ATS-friendly resume after reviewing the gaps.",
    number: analyserSteps.length + index + 1,
    type: "generator",
  })),
];

const HomePage = () => {
  const { isLightMode } = useTheme();
  const roadmapRef = useRef(null);
  const [roadmapProgress, setRoadmapProgress] = useState(0);
  const [activeRoadmapStep, setActiveRoadmapStep] = useState(0);

  useEffect(() => {
    const updateRoadmapProgress = () => {
      const node = roadmapRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const total = rect.height + viewport * 0.6;
      const passed = viewport * 0.72 - rect.top;
      const progress = Math.min(Math.max(passed / Math.max(total, 1), 0), 1);
      const step = Math.min(roadmapSteps.length - 1, Math.floor(progress * roadmapSteps.length));

      setRoadmapProgress(progress);
      setActiveRoadmapStep(step);
    };

    updateRoadmapProgress();
    window.addEventListener("scroll", updateRoadmapProgress, { passive: true });
    window.addEventListener("resize", updateRoadmapProgress);
    return () => {
      window.removeEventListener("scroll", updateRoadmapProgress);
      window.removeEventListener("resize", updateRoadmapProgress);
    };
  }, []);

  return (
    <main className={isLightMode ? "home-page light-mode" : "home-page dark-mode"}>
      {!isLightMode && <BackgroundDecorations />}
      <div className="home-bubbles" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <section className="home-hero">
        <motion.div
          className="home-hero-copy"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="home-hero-badges">
            <span><Sparkles size={15} /> AI Powered</span>
            <span>ATS Optimized</span>
          </div>
          <h1>Perfect Your Resume <span>For Every Job</span></h1>
          <p>
            Beat the bots and land more interviews with our enterprise-grade ATS scanner. Get precise keyword analysis and structure validation in seconds.
          </p>
          <div className="home-actions">
            <Link className="home-primary-btn" to="/ats">
              Scan Now <ArrowRight size={18} />
            </Link>
            <Link className="home-ghost-btn" to="/ats?tab=generator">
              View Resume Generator
            </Link>
          </div>
          <div className="home-hero-stats">
            <div>
              <strong>98%</strong>
              <span>Accuracy</span>
            </div>
            <div>
              <strong>2s</strong>
              <span>Scan Time</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="home-ats-hero-visual"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="home-analysis-card">
            <div className="home-analysis-top">
              <div className="home-card-dots">
                <span />
                <span />
                <span />
              </div>
              <b>Real-Time Analysis</b>
            </div>
            <div className="home-analysis-score">
              <div className="home-score-ring">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="42" />
                  <circle cx="50" cy="50" r="42" />
                </svg>
                <div>
                  <b>85</b>
                  <span>Match %</span>
                </div>
              </div>
              <span className="home-analysis-status">Optimized for ATS</span>
            </div>
            <div className="home-keyword-row">
              <span className="match">React</span>
              <span className="match">Python</span>
              <span className="gap">Docker</span>
              <span className="match">Node.js</span>
            </div>
          </div>
        </motion.div>
      </section>

      <section
        className="home-master-roadmap"
        ref={roadmapRef}
        style={{ "--master-roadmap-progress": `${roadmapProgress * 100}%` }}
      >
        <div className="home-section-title roadmap-title">
          <span>Feature roadmap</span>
          <h2>From checking your resume to exporting the improved version.</h2>
          <p>Scroll through one simple roadmap. Phase 1 analyses your current resume, then Phase 2 helps you generate a better resume.</p>
        </div>

        <div className="home-master-roadmap-shell">
          <div className="home-master-line" />
          {roadmapSteps.map(({ icon: Icon, phase, phaseTitle, phaseText, number, type, title, text }, index) => (
            <motion.article
              className={`home-master-step ${type} ${index <= activeRoadmapStep ? "active" : ""} ${index < activeRoadmapStep ? "complete" : ""}`}
              key={`${phase}-${title}`}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.38 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <div className="home-master-node">
                <Icon size={21} />
                <span>{number}</span>
              </div>
              <div className="home-master-card">
                <div className="home-master-card-top">
                  <span className="home-master-mini-icon"><Icon size={15} /></span>
                  <span className="home-master-phase-pill">{phase}</span>
                </div>
                <div className="home-master-copy">
                  <h3>{title}</h3>
                  <span className="home-master-tool">{phaseTitle}</span>
                  <p>{text}</p>
                  <small>{phaseText}</small>
                </div>
              </div>
            </motion.article>
          ))}
          <div className="home-master-end">
            <CheckCircle2 size={24} />
            <div>
              <span>End</span>
              <strong>Apply with a clearer, job-matched resume.</strong>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
};

export default HomePage;
