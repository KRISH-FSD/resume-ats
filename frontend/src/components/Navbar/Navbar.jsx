import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, Home, Mail, Menu, Moon, Search, Sun, User, UserPlus, Wand2, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import logo from "../../assets/images/Logo.png";
import "./Navbar.css";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState(null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const { isLightMode, toggleTheme } = useTheme();
  const { user, isAuthenticated, login, logout } = useAuth();
  const navRef = useRef(null);
  const notificationTimerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleOpenLogin = () => openAuthModal("login");
    window.addEventListener("auth:open-login", handleOpenLogin);
    return () => window.removeEventListener("auth:open-login", handleOpenLogin);
  }, []);

  const closeMobileMenu = () => setMenuOpen(false);
  const showNotification = (type, message) => {
    setNotification({ type, message });
    window.clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = window.setTimeout(() => setNotification(null), 3200);
  };
  const openAuthModal = (mode) => {
    setAuthModal(mode);
    setAuthForm({ name: "", email: "", password: "", confirmPassword: "" });
  };
  const closeAuthModal = () => setAuthModal(null);
  const updateAuthForm = (field, value) => setAuthForm((prev) => ({ ...prev, [field]: value }));
  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (authModal === "register" && authForm.password !== authForm.confirmPassword) {
      showNotification("error", "Passwords do not match.");
      return;
    }
    setAuthLoading(true);
    try {
      const endpoint = authModal === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = authModal === "login"
        ? { email: authForm.email, password: authForm.password }
        : { name: authForm.name, email: authForm.email, password: authForm.password };
      const { data } = await api.post(endpoint, payload);
      login(data);
      closeAuthModal();
      showNotification("success", data.message || (authModal === "login" ? "Login successful." : "Registration successful."));
    } catch (error) {
      showNotification("error", error.response?.data?.error || "Authentication failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };
  const handleLogout = async () => {
    await logout();
    showNotification("success", "Logged out successfully.");
  };
  const searchParams = new URLSearchParams(location.search);
  const isGenerator = location.pathname === "/ats" && searchParams.get("tab") === "generator";
  const isAnalyzer = location.pathname === "/ats" && !isGenerator;

  return (
    <>
      <nav className={`navbar resume-navbar ${scrolled ? "navbar-scrolled" : ""}`} ref={navRef}>
        <div className="nav-shell-left">
          <button className="theme-toggle-btn desktop-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        <div className="nav-shell-center">
          <div className="nav-primary-switch resume-primary-switch" role="navigation" aria-label="Primary navigation">
            <Link to="/ats" className={`nav-primary-link ${isAnalyzer ? "active" : ""}`}>
              RESUME ANALYSER
            </Link>
            <Link to="/" className="nav-primary-logo" aria-label="HireIQ home">
              <img src={logo} alt="HireIQ" />
            </Link>
            <Link to="/ats?tab=generator" className={`nav-primary-link ${isGenerator ? "active" : ""}`}>
              RESUME GENERATOR
            </Link>
          </div>
        </div>

        <div className="nav-right">
          <div className="nav-auth-static">
            {isAuthenticated ? (
              <>
                <span className="nav-user-chip"><User size={14} /> {user?.name || "User"}</span>
                <button type="button" className="nav-auth-link nav-auth-login" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <button type="button" className="nav-auth-link nav-auth-login" onClick={() => openAuthModal("login")}>
                  Login
                </button>
                <button type="button" className="nav-auth-link nav-auth-register" onClick={() => openAuthModal("register")}>
                  <UserPlus size={14} />
                  Register
                </button>
              </>
            )}
          </div>
        </div>

        <button
          className={`nav-hamburger ${menuOpen ? "active" : ""}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={`nav-center ${menuOpen ? "open" : ""}`}>
          <div className="nav-links">
            <Link to="/" className={`nav-link ${location.pathname === "/" ? "active" : ""}`} onClick={closeMobileMenu}>
              <Home size={17} /> Home
            </Link>
            <Link to="/ats" className={`nav-link ${isAnalyzer ? "active" : ""}`} onClick={closeMobileMenu}>
              <Search size={17} /> Resume Analyser
            </Link>
            <Link to="/ats?tab=generator" className={`nav-link ${isGenerator ? "active" : ""}`} onClick={closeMobileMenu}>
              <Wand2 size={17} /> Resume Generator
            </Link>
          </div>

          <div className="nav-auth-mobile">
            <button className="theme-toggle-btn mobile-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {isLightMode ? <Moon size={20} /> : <Sun size={20} />}
              <span>{isLightMode ? "Dark Mode" : "Light Mode"}</span>
            </button>
            {isAuthenticated ? (
              <button type="button" className="nav-mobile-auth-btn primary" onClick={() => { handleLogout(); closeMobileMenu(); }}>
                Logout
              </button>
            ) : (
              <>
                <button type="button" className="nav-mobile-auth-btn" onClick={() => { openAuthModal("login"); closeMobileMenu(); }}>
                  Login
                </button>
                <button type="button" className="nav-mobile-auth-btn primary" onClick={() => { openAuthModal("register"); closeMobileMenu(); }}>
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {menuOpen && <div className="nav-backdrop" onClick={closeMobileMenu} />}

      <div className="nav-dock">
        <Link to="/" className={`dock-link ${location.pathname === "/" ? "active" : ""}`}>
          <span className="dock-link-icon"><Home size={20} /></span>
          <span className="dock-link-text">Home</span>
        </Link>
        <Link to="/ats" className={`dock-link ${isAnalyzer ? "active" : ""}`}>
          <span className="dock-link-icon"><FileText size={20} /></span>
          <span className="dock-link-text">Analyser</span>
        </Link>
        <Link to="/ats?tab=generator" className={`dock-link ${isGenerator ? "active" : ""}`}>
          <span className="dock-link-icon"><Wand2 size={20} /></span>
          <span className="dock-link-text">Generator</span>
        </Link>
      </div>

      {notification && (
        <div className={`auth-toast ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {authModal && (
        <div className="auth-modal-backdrop" onClick={closeAuthModal}>
          <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="auth-modal-close" onClick={closeAuthModal} aria-label="Close popup">
              <X size={18} />
            </button>

            <div className="auth-modal-icon">
              {authModal === "login" ? <User size={22} /> : <UserPlus size={22} />}
            </div>
            <span className="auth-modal-kicker">{authModal === "login" ? "Welcome back" : "Create account"}</span>
            <h2>{authModal === "login" ? "Login Details" : "Register Details"}</h2>
            <p>
              {authModal === "login"
                ? "Login to save ATS scan history and continue securely."
                : "Create an account with basic details to save your resume scans."}
            </p>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authModal === "register" && (
                <label>
                  Full Name
                  <span className="auth-input-wrap">
                    <User size={15} />
                    <input type="text" placeholder="Enter your name" value={authForm.name} onChange={(event) => updateAuthForm("name", event.target.value)} required />
                  </span>
                </label>
              )}
              <label>
                Email Address
                <span className="auth-input-wrap">
                  <Mail size={15} />
                  <input type="email" placeholder="you@example.com" value={authForm.email} onChange={(event) => updateAuthForm("email", event.target.value)} required />
                </span>
              </label>
              <label>
                Password
                <span className="auth-input-wrap">
                  <User size={15} />
                  <input type="password" placeholder="Enter password" value={authForm.password} onChange={(event) => updateAuthForm("password", event.target.value)} required minLength={6} />
                </span>
              </label>
              {authModal === "register" && (
                <label>
                  Confirm Password
                  <span className="auth-input-wrap">
                    <User size={15} />
                    <input type="password" placeholder="Confirm password" value={authForm.confirmPassword} onChange={(event) => updateAuthForm("confirmPassword", event.target.value)} required minLength={6} />
                  </span>
                </label>
              )}
              <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                {authLoading ? "Please wait..." : authModal === "login" ? "Login" : "Register"}
              </button>
            </form>

            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => openAuthModal(authModal === "login" ? "register" : "login")}
            >
              {authModal === "login" ? "New user? Register here" : "Already registered? Login here"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
