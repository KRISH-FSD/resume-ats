import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  FileSearch,
  Mail,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import logo from "../../assets/images/Logo.png";
import "./Footer.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="app-footer-shell">
        <div className="app-footer-main">
          <section className="app-footer-brand-block">
            <Link to="/" className="app-footer-brand" aria-label="AI-HIRE IQ home">
              <span className="app-footer-logo">
                <img src={logo} alt="" />
              </span>
              <span>
                <strong>AI-HIRE IQ</strong>
                <small>ATS resume assistant</small>
              </span>
            </Link>
            <p>
              Build job-ready resumes, analyse ATS gaps, and export clean professional PDFs
              with a focused workflow made for students and early-career developers.
            </p>
            <div className="app-footer-trust">
              <span><ShieldCheck size={14} /> ATS friendly</span>
              <span><CheckCircle2 size={14} /> PDF ready</span>
            </div>
          </section>

          <nav className="app-footer-col" aria-label="Product links">
            <h3>Product</h3>
            <Link to="/ats"><FileSearch size={15} /> Resume Analyser</Link>
            <Link to="/ats?tab=generator"><Wand2 size={15} /> Resume Generator</Link>
            <Link to="/"><Sparkles size={15} /> Feature Roadmap</Link>
          </nav>

          <nav className="app-footer-col" aria-label="Workflow links">
            <h3>Workflow</h3>
            <Link to="/ats">Upload Resume</Link>
            <Link to="/ats">Paste Job Description</Link>
            <Link to="/ats?tab=generator">Choose Template</Link>
            <Link to="/ats?tab=generator">Export PDF</Link>
          </nav>

          <section className="app-footer-col app-footer-contact">
            <h3>Support</h3>
            <p>Need help understanding your ATS score or improving your resume content?</p>
            <a href="mailto:support@aihireiq.local"><Mail size={15} /> support@aihireiq.local</a>
          </section>
        </div>

        <div className="app-footer-bottom">
          <p>© {currentYear} AI-HIRE IQ. Crafted for smarter resume preparation.</p>
          <div className="app-footer-bottom-links">
            <span>Privacy focused</span>
            <span>Resume-first design</span>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">
              Back to top <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
