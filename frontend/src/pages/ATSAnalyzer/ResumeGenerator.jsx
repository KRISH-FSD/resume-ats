/**
 * ResumeGenerator.jsx
 * Resume templates (Classic, Modern, Minimal, Executive, Academic Pro, Plain ATS)
 * 8-step wizard (added Experience / Internship step)
 */

import { useState, useCallback, useRef, lazy, Suspense, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Briefcase, GraduationCap, Award,
  Plus, X, Layout, Sparkles, Download,
  ChevronRight, ChevronLeft, CheckCircle2,
  FileText, Code2, Phone, Mail, MapPin,
  Linkedin, Globe, BookOpen, Star,
  LayoutTemplate, Loader2, ArrowRight, Building2,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';

const ResumePDFDownloader = lazy(() => import('./ResumePDFDownloader'));

// ─── 5 Templates ─────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic Professional',
    atsScore: 98,
    desc: 'Clean ATS-optimised single column. Best for corporate & traditional industries.',
    accent: '#1e40af', accentLight: '#eff6ff', accentBorder: '#bfdbfe',
    previewBg: '#f8fafc', layout: 'single',
  },
  {
    id: 'modern',
    name: 'Modern Tech',
    atsScore: 96,
    desc: 'Two-column sidebar layout with skills highlight. Perfect for software engineers.',
    accent: '#7c3aed', accentLight: '#f5f3ff', accentBorder: '#ddd6fe',
    previewBg: '#faf5ff', layout: 'sidebar',
  },
  {
    id: 'minimal',
    name: 'Minimal Clean',
    atsScore: 99,
    desc: 'Ultra-minimal high-whitespace design. Maximum ATS parse-ability guaranteed.',
    accent: '#0f172a', accentLight: '#f1f5f9', accentBorder: '#cbd5e1',
    previewBg: '#f8fafc', layout: 'minimal',
  },
  {
    id: 'executive',
    name: 'Executive Bold',
    atsScore: 95,
    desc: 'Bold dark header accent bar. Ideal for senior roles and leadership positions.',
    accent: '#0369a1', accentLight: '#f0f9ff', accentBorder: '#bae6fd',
    previewBg: '#f0f9ff', layout: 'executive',
  },
  {
    id: 'academic',
    name: 'Academic Pro',
    atsScore: 97,
    desc: 'Traditional academic format. Centered header, bold section titles with underlines — ideal for campus placements.',
    accent: '#1e293b', accentLight: '#f8fafc', accentBorder: '#e2e8f0',
    previewBg: '#ffffff', layout: 'academic',
  },
  {
    id: 'plain',
    name: 'Plain ATS',
    atsScore: 100,
    desc: 'No-color single-column resume with simple headings, clean spacing, and maximum parser readability.',
    accent: '#111827', accentLight: '#ffffff', accentBorder: '#d1d5db',
    previewBg: '#ffffff', layout: 'plain',
  },
];

// ─── 8 Wizard Steps ───────────────────────────────────────────────────────────
const STEPS = [
  { id: 'personal',       label: 'Personal Info',        icon: User },
  { id: 'objective',      label: 'Career Objective',     icon: Briefcase },
  { id: 'skills',         label: 'Skills',               icon: Code2 },
  { id: 'education',      label: 'Education',            icon: GraduationCap },
  { id: 'projects',       label: 'Projects',             icon: Layout },
  { id: 'experience',     label: 'Experience',           icon: Building2 },
  { id: 'certifications', label: 'Certifications',       icon: Award },
  { id: 'review',         label: 'Review & Export',      icon: Download },
];

// ─── Default Form Data ─────────────────────────────────────────────────────────
const defaultData = () => ({
  personal: {
    name: 'Kathiresh S',
    subtitle: 'Aspiring Full Stack Developer | B.Tech Student',
    email: 'kathiresh.demo@gmail.com',
    phone: '+91 98765 43210',
    location: 'Kumbakonam, Tamil Nadu',
    linkedin: 'linkedin.com/in/kathiresh-s',
    portfolio: 'github.com/kathiresh-demo',
  },
  objective: 'Motivated B.Tech student with hands-on experience in React, Flask, MySQL, and AI-powered web applications. Passionate about building clean, user-friendly software and contributing as a full stack developer in a growth-focused tech team.',
  skills: {
    technical: [
      { label: 'Languages', value: 'JavaScript | Python | Java | SQL' },
      { label: 'Frontend', value: 'React | HTML | CSS | Tailwind CSS' },
      { label: 'Backend', value: 'Flask | REST APIs | Node.js (Basics)' },
      { label: 'Database & Tools', value: 'MySQL | Git | GitHub | VS Code' },
    ],
    soft: 'Problem Solving | Teamwork | Communication | Time Management | Adaptability',
  },
  education: [
    {
      degree: 'Bachelor of Technology (B.Tech)',
      school: 'Dhanalakshmi Srinivasan University (DSU)',
      year: '2023 - 2026',
      grade: 'CGPA: 8.2 / 10',
    },
    {
      degree: 'Higher Secondary Education',
      school: 'PHSS, Papanasam',
      year: '2021 - 2023',
      grade: 'Percentage: 87%',
    },
  ],
  projects: [
    {
      name: 'AI Resume Analyzer',
      links: 'github.com/kathiresh-demo/ai-resume-analyzer',
      tech: 'React, Flask, MySQL, REST API',
      description: 'Created a simple ATS resume analyzer that checks resume skills against a job description and shows improvement suggestions.',
    },
    {
      name: 'Student Task Manager',
      links: 'github.com/kathiresh-demo/task-manager',
      tech: 'React, JavaScript, CSS, Local Storage',
      description: 'Built a clean task manager for students to add, track, and complete daily academic tasks with a responsive interface.',
    },
  ],
  experience: [
    {
      title: 'Web Development Intern',
      company: 'LearnFlu Technologies',
      period: 'Jun 2024 - Aug 2024',
      description: 'Worked on frontend components, integrated backend APIs, and supported testing for a student-focused learning platform.',
      achievements: 'Delivered responsive UI improvements and helped reduce page load issues in core student workflows.',
    },
  ],
  certifications: [
    'Python Programming Certification - Infosys Springboard',
    'Frontend Development Workshop - GUVI',
    'Project Presentation Winner - College Technical Symposium',
  ],
  isReady: false,
});

const applyOptimizerSeed = (baseData, optimizerSeed) => {
  if (!optimizerSeed) return baseData;

  const targetKeywords = optimizerSeed.target_keywords || [];
  const technicalSkills = optimizerSeed.technical_skills || [];
  const projectTip = optimizerSeed.project_rewrite_suggestions?.[0];
  const experienceTip = optimizerSeed.experience_rewrite_suggestions?.[0];
  const existingSkillRows = baseData.skills.technical.filter((row) => !['Target Keywords', 'Matched / Core Skills'].includes(row.label));

  return {
    ...baseData,
    objective: optimizerSeed.summary || baseData.objective,
    skills: {
      ...baseData.skills,
      technical: [
        {
          label: 'Target Keywords',
          value: targetKeywords.length ? targetKeywords.join(' | ') : 'Tailor keywords from the target JD',
        },
        {
          label: 'Matched / Core Skills',
          value: technicalSkills.length ? technicalSkills.join(' | ') : baseData.skills.technical[0].value,
        },
        ...existingSkillRows.slice(0, 2),
      ],
    },
    projects: baseData.projects.map((project, index) => (
      index === 0 && projectTip ? { ...project, description: projectTip } : project
    )),
    experience: baseData.experience.map((item, index) => (
      index === 0 && experienceTip ? { ...item, achievements: experienceTip } : item
    )),
  };
};

// ─── Shared Field Components ───────────────────────────────────────────────────
const buildSmartSuggestions = (analyzerResults) => {
  if (!analyzerResults) return [];
  const suggestions = [];
  const breakdown = analyzerResults.score_breakdown || {};

  if ((breakdown.skills_match || 0) < 85 || analyzerResults.missing_skills?.length) {
    suggestions.push({
      step: 'skills',
      title: 'Strengthen skill coverage',
      message: `Add truthful proof for: ${(analyzerResults.missing_skills || []).slice(0, 5).join(', ') || 'target JD keywords'}.`,
    });
  }
  if ((breakdown.project_impact || 0) < 75) {
    suggestions.push({
      step: 'projects',
      title: 'Projects need measurable impact',
      message: 'Rewrite project bullets with action, tech stack, metric, and outcome.',
    });
  }
  if ((breakdown.experience_relevance || 0) < 75) {
    suggestions.push({
      step: 'experience',
      title: 'Experience needs stronger role alignment',
      message: 'Mention ownership, tools used, and measurable contribution in each role.',
    });
  }
  if (analyzerResults.resume_detail_advice?.length) {
    analyzerResults.resume_detail_advice.slice(0, 2).forEach((item) => {
      const section = item.section?.toLowerCase() || '';
      suggestions.push({
        step: section.includes('project') ? 'projects' : section.includes('skill') ? 'skills' : 'objective',
        title: item.section,
        message: item.example,
      });
    });
  }

  return suggestions.slice(0, 5);
};

const getBulletStrength = (text = '') => {
  const value = text.trim().toLowerCase();
  if (!value) return { score: 0, label: 'Empty', level: 'empty', tips: ['Add a clear action and result.'] };

  const actionHit = /\b(built|created|developed|designed|implemented|deployed|optimized|automated|integrated|improved|reduced|increased|led|delivered|launched)\b/.test(value);
  const metricHit = /\b\d+(?:\.\d+)?\s*(?:%|x|k|m|ms|sec|seconds|users|clients|projects|features|apis)?\b/.test(value);
  const techHit = /\b(react|node|python|java|sql|mysql|mongodb|api|flask|django|docker|aws|git|typescript|javascript|html|css)\b/.test(value);
  const outcomeHit = /\b(improved|reduced|increased|faster|optimized|scalable|responsive|accuracy|performance|latency|conversion|workflow)\b/.test(value);
  const lengthHit = value.split(/\s+/).length >= 10;

  const score = [actionHit, metricHit, techHit, outcomeHit, lengthHit].filter(Boolean).length;
  const tips = [];
  if (!actionHit) tips.push('Start with an action verb.');
  if (!techHit) tips.push('Mention the tech/tool used.');
  if (!metricHit) tips.push('Add a number or measurable scope.');
  if (!outcomeHit) tips.push('Show user, business, or performance impact.');

  if (score >= 4) return { score, label: 'Strong', level: 'strong', tips: tips.slice(0, 1) };
  if (score >= 2) return { score, label: 'Good', level: 'good', tips: tips.slice(0, 2) };
  return { score, label: 'Weak', level: 'weak', tips: tips.slice(0, 2) };
};

const BulletStrengthMeter = ({ text }) => {
  const strength = getBulletStrength(text);
  const width = Math.min(100, strength.score * 20);

  return (
    <div className={`rg-bullet-meter ${strength.level}`}>
      <div className="rg-bullet-meter-top">
        <span>Bullet strength</span>
        <strong>{strength.label}</strong>
      </div>
      <div className="rg-bullet-meter-track"><i style={{ width: `${width}%` }} /></div>
      {!!strength.tips.length && <small>{strength.tips.join(' ')}</small>}
    </div>
  );
};

const SmartSuggestionBox = ({ suggestions = [], step }) => {
  const filtered = suggestions.filter((item) => item.step === step).slice(0, 2);
  if (!filtered.length) return null;

  return (
    <div className="rg-smart-suggestions">
      <div className="rg-smart-suggestions-title"><Sparkles size={13} /> Smart section suggestions</div>
      {filtered.map((item, index) => (
        <div key={`${item.title}-${index}`} className="rg-smart-suggestion">
          <strong>{item.title}</strong>
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
};

const FieldLabel = ({ children, required }) => (
  <label className="rg-field-label">
    {children}{required && <span className="rg-required">*</span>}
  </label>
);

const Input = ({ icon: Icon, value, onChange, placeholder, type = 'text' }) => (
  <div className="rg-input-wrap">
    {Icon && <Icon size={15} className="rg-input-icon" />}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`rg-input ${Icon ? 'rg-input--icon' : ''}`}
    />
  </div>
);

const Textarea = ({ value, onChange, placeholder, rows = 5 }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className="rg-textarea"
  />
);

const AddBtn = ({ onClick, label }) => (
  <button type="button" onClick={onClick} className="rg-add-btn">
    <Plus size={13} /> {label}
  </button>
);

const DelBtn = ({ onClick }) => (
  <button type="button" onClick={onClick} className="rg-del-btn">
    <X size={13} />
  </button>
);

// ─── Step Components ──────────────────────────────────────────────────────────

const StepPersonal = ({ data, setData }) => {
  const upd = (k, v) => setData(p => ({ ...p, personal: { ...p.personal, [k]: v } }));
  return (
    <div className="rg-step-body">
      <div className="rg-step-intro">
        <h3 className="rg-step-title">Let's start with your basics</h3>
        <p className="rg-step-hint">Fields marked <span className="rg-required">*</span> are required for a complete resume.</p>
      </div>
      <div className="rg-grid-2">
        {[['name','Full Name','e.g. KATHIRESH S',User,true],
          ['subtitle','Job Title / Designation','e.g. B.Tech Student | Full Stack Developer',Briefcase,true],
          ['email','Email Address','kathiresh@gmail.com',Mail,true],
          ['phone','Phone Number','+91 98765 43210',Phone,true],
          ['location','City / Location','KUMBAKONAM',MapPin,false],
          ['linkedin','LinkedIn / GitHub','LinkedIn | GitHub',Linkedin,false]].map(([k,lbl,ph,Icon,req]) => (
          <div key={k} className="rg-field">
            <FieldLabel required={req}>{lbl}</FieldLabel>
            <Input icon={Icon} value={data.personal[k]||''} onChange={e=>upd(k,e.target.value)} placeholder={ph} />
          </div>
        ))}
        <div className="rg-field rg-field--full">
          <FieldLabel>Portfolio / GitHub URL</FieldLabel>
          <Input icon={Globe} value={data.personal.portfolio||''} onChange={e=>upd('portfolio',e.target.value)} placeholder="github.com/yourusername" />
        </div>
      </div>
    </div>
  );
};

const StepObjective = ({ data, setData }) => {
  const [aiBusy, setAiBusy] = useState(false);
  const skillsText = data.skills.technical.map((item) => item.value).filter(Boolean).join(" | ");
  const generateObjective = async () => {
    setAiBusy(true);
    try {
      const { data: ai } = await api.post('/api/ai/objective', {
        role: data.personal.subtitle,
        skills: skillsText,
        education: data.education?.[0]?.degree,
      });
      if (ai.objective) setData((prev) => ({ ...prev, objective: ai.objective }));
    } finally {
      setAiBusy(false);
    }
  };

  return (
  <div className="rg-step-body">
    <div className="rg-step-intro">
      <h3 className="rg-step-title">Write your career objective</h3>
      <p className="rg-step-hint">A strong 2–3 sentence summary highlighting your expertise and career goals.</p>
    </div>
    <div className="rg-field">
      <div className="rg-ai-label-row">
        <FieldLabel required>Career Objective / Professional Summary</FieldLabel>
        <button type="button" className="rg-ai-mini-btn" onClick={generateObjective} disabled={aiBusy}>
          <Sparkles size={13} /> {aiBusy ? 'Writing...' : 'AI Write'}
        </button>
      </div>
      <Textarea
        value={data.objective}
        onChange={e => setData(p => ({ ...p, objective: e.target.value }))}
        placeholder="Aspiring B.Tech student with fundamentals in React, Flask backend development, and MySQL. Experienced in building clean web applications, seeking to apply problem-solving skills in full stack development roles."
        rows={6}
      />
    </div>
    <div className="rg-tip-card">
      <Star size={13} />
      <span><strong>Pro Tip:</strong> Keep under 60 words. Use action verbs and include 2–3 key skills relevant to your target role.</span>
    </div>
  </div>
  );
};

const StepSkills = ({ data, setData, smartSuggestions = [] }) => {
  const updTech = (i, field, val) => {
    const ns = [...data.skills.technical];
    ns[i] = { ...ns[i], [field]: val };
    setData(p => ({ ...p, skills: { ...p.skills, technical: ns } }));
  };
  const addRow = () => setData(p => ({ ...p, skills: { ...p.skills, technical: [...p.skills.technical, { label: '', value: '' }] } }));
  const delRow = i => setData(p => ({ ...p, skills: { ...p.skills, technical: p.skills.technical.filter((_, j) => j !== i) } }));
  return (
    <div className="rg-step-body">
      <div className="rg-step-intro">
        <h3 className="rg-step-title">Add your technical skills</h3>
        <p className="rg-step-hint">Group by category. Use <code>|</code> as a separator between skills.</p>
      </div>
      <SmartSuggestionBox suggestions={smartSuggestions} step="skills" />
      <div className="rg-section-block">
        <div className="rg-section-block-header">
          <span className="rg-section-block-title"><Code2 size={14}/> Technical Skills (Category → Skills)</span>
          <AddBtn onClick={addRow} label="Add Category" />
        </div>
        {data.skills.technical.map((sk, i) => (
          <div key={i} className="rg-skill-row">
            <input value={sk.label} onChange={e => updTech(i,'label',e.target.value)} placeholder="e.g. Languages" className="rg-input rg-skill-cat" />
            <input value={sk.value} onChange={e => updTech(i,'value',e.target.value)} placeholder="e.g. Java | Python | JavaScript" className="rg-input rg-skill-val" />
            <DelBtn onClick={() => delRow(i)} />
          </div>
        ))}
      </div>
      <div className="rg-field" style={{ marginTop: 20 }}>
        <FieldLabel>Soft Skills</FieldLabel>
        <Input value={data.skills.soft} onChange={e => setData(p => ({ ...p, skills: { ...p.skills, soft: e.target.value } }))} placeholder="Teamwork | Analytical Thinking | Problem Solving | Communication" />
      </div>
    </div>
  );
};

const StepEducation = ({ data, setData }) => {
  const upd = (i, k, v) => { const l=[...data.education]; l[i]={...l[i],[k]:v}; setData(p=>({...p,education:l})); };
  const add = () => setData(p => ({ ...p, education: [...p.education, { degree:'',school:'',year:'',grade:'' }] }));
  const del = i => setData(p => ({ ...p, education: p.education.filter((_,j)=>j!==i) }));
  return (
    <div className="rg-step-body">
      <div className="rg-step-intro">
        <h3 className="rg-step-title">Add your educational background</h3>
        <p className="rg-step-hint">List most recent qualification first.</p>
      </div>
      <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:16 }}>
        <AddBtn onClick={add} label="Add Education" />
      </div>
      {data.education.map((edu, i) => (
        <div key={i} className="rg-card-entry">
          <div className="rg-card-entry-header">
            <div className="rg-card-entry-num"><GraduationCap size={13}/> Education #{i+1}</div>
            <DelBtn onClick={() => del(i)} />
          </div>
          <div className="rg-grid-2">
            {[['degree','Degree / Qualification','Bachelor of Technology (B.Tech)',true],
              ['school','School / University','Dhanalakshmi Srinivasan University (DSU)',true],
              ['year','Year Range','2023 – Present',false],
              ['grade','CGPA / Percentage','CGPA: 7.6 / 10',false]].map(([k,lbl,ph,req]) => (
              <div key={k} className="rg-field">
                <FieldLabel required={req}>{lbl}</FieldLabel>
                <input className="rg-input" value={edu[k]} onChange={e=>upd(i,k,e.target.value)} placeholder={ph} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const StepProjects = ({ data, setData, smartSuggestions = [] }) => {
  const [aiBusyIndex, setAiBusyIndex] = useState(null);
  const upd = (i, k, v) => { const l=[...data.projects]; l[i]={...l[i],[k]:v}; setData(p=>({...p,projects:l})); };
  const add = () => setData(p => ({ ...p, projects: [...p.projects, { name:'',links:'',tech:'',description:'' }] }));
  const del = i => setData(p => ({ ...p, projects: p.projects.filter((_,j)=>j!==i) }));
  const generateDescription = async (i, proj) => {
    setAiBusyIndex(i);
    try {
      const { data: ai } = await api.post('/api/ai/project-description', {
        name: proj.name,
        tech: proj.tech,
      });
      if (ai.description) upd(i, 'description', ai.description);
    } finally {
      setAiBusyIndex(null);
    }
  };
  return (
    <div className="rg-step-body">
      <div className="rg-step-intro">
        <h3 className="rg-step-title">Showcase your projects</h3>
        <p className="rg-step-hint">Add 2–4 best projects. Include tech stack and a clear one-line description of impact.</p>
      </div>
      <SmartSuggestionBox suggestions={smartSuggestions} step="projects" />
      <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:16 }}>
        <AddBtn onClick={add} label="Add Project" />
      </div>
      {data.projects.map((proj, i) => (
        <div key={i} className="rg-card-entry">
          <div className="rg-card-entry-header">
            <div className="rg-card-entry-num"><Layout size={13}/> Project #{i+1}</div>
            <DelBtn onClick={() => del(i)} />
          </div>
          <div className="rg-grid-2">
            <div className="rg-field">
              <FieldLabel required>Project Name</FieldLabel>
              <input className="rg-input" value={proj.name} onChange={e=>upd(i,'name',e.target.value)} placeholder="AI Resume Analyzer" />
            </div>
            <div className="rg-field">
              <FieldLabel>GitHub / Live Link</FieldLabel>
              <Input icon={Globe} value={proj.links} onChange={e=>upd(i,'links',e.target.value)} placeholder="github.com/username/project" />
            </div>
            <div className="rg-field">
              <FieldLabel>Tech Stack</FieldLabel>
              <input className="rg-input" value={proj.tech} onChange={e=>upd(i,'tech',e.target.value)} placeholder="React, Flask, MySQL, REST API" />
            </div>
            <div className="rg-field">
              <div className="rg-ai-label-row">
                <FieldLabel>One-line Description</FieldLabel>
                <button type="button" className="rg-ai-mini-btn" onClick={() => generateDescription(i, proj)} disabled={aiBusyIndex === i}>
                  <Sparkles size={13} /> {aiBusyIndex === i ? 'Writing...' : 'AI Write'}
                </button>
              </div>
              <input className="rg-input" value={proj.description||''} onChange={e=>upd(i,'description',e.target.value)} placeholder="Simple web app that compares resume skills with a job description and gives improvement tips." />
              <BulletStrengthMeter text={`${proj.description || ''} ${proj.tech || ''}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const StepExperience = ({ data, setData, smartSuggestions = [] }) => {
  const upd = (i, k, v) => { const l=[...data.experience]; l[i]={...l[i],[k]:v}; setData(p=>({...p,experience:l})); };
  const add = () => setData(p => ({ ...p, experience: [...p.experience, { title:'',company:'',period:'',description:'',achievements:'' }] }));
  const del = i => setData(p => ({ ...p, experience: p.experience.filter((_,j)=>j!==i) }));
  return (
    <div className="rg-step-body">
      <div className="rg-step-intro">
        <h3 className="rg-step-title">Add internships & work experience</h3>
        <p className="rg-step-hint">Include internships, part-time roles, freelance work, or any professional experience. Skip if not applicable.</p>
      </div>
      <SmartSuggestionBox suggestions={smartSuggestions} step="experience" />
      <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:16 }}>
        <AddBtn onClick={add} label="Add Experience" />
      </div>
      {data.experience.map((exp, i) => (
        <div key={i} className="rg-card-entry">
          <div className="rg-card-entry-header">
            <div className="rg-card-entry-num"><Building2 size={13}/> Experience #{i+1}</div>
            <DelBtn onClick={() => del(i)} />
          </div>
          <div className="rg-grid-2">
            <div className="rg-field">
              <FieldLabel required>Role / Internship Title</FieldLabel>
              <input className="rg-input" value={exp.title} onChange={e=>upd(i,'title',e.target.value)} placeholder="Web Development Intern" />
            </div>
            <div className="rg-field">
              <FieldLabel required>Company / Organisation</FieldLabel>
              <Input icon={Building2} value={exp.company} onChange={e=>upd(i,'company',e.target.value)} placeholder="Learn Flu EdTech" />
            </div>
            <div className="rg-field">
              <FieldLabel>Duration / Period</FieldLabel>
              <input className="rg-input" value={exp.period} onChange={e=>upd(i,'period',e.target.value)} placeholder="June 2024 – Aug 2024" />
            </div>
          </div>
          <div className="rg-field" style={{ marginTop:12 }}>
            <FieldLabel>Work Description (what you did)</FieldLabel>
            <Textarea value={exp.description} onChange={e=>upd(i,'description',e.target.value)}
              placeholder="Contributed to a live web development project involving frontend implementation and basic backend integration." rows={3} />
            <BulletStrengthMeter text={exp.description} />
          </div>
          <div className="rg-field" style={{ marginTop:10 }}>
            <FieldLabel>Achievements / Awards</FieldLabel>
            <Textarea value={exp.achievements} onChange={e=>upd(i,'achievements',e.target.value)}
              placeholder="Completed a full stack mini project and presented it during a college technical review." rows={2} />
            <BulletStrengthMeter text={exp.achievements} />
          </div>
        </div>
      ))}
      <div className="rg-tip-card" style={{ marginTop:14 }}>
        <BookOpen size={13}/>
        <span>Even if you don't have formal experience, add hackathons, open-source contributions, or volunteering here.</span>
      </div>
    </div>
  );
};

const StepCertifications = ({ data, setData }) => {
  const upd = (i, v) => { const l=[...data.certifications]; l[i]=v; setData(p=>({...p,certifications:l})); };
  const add = () => setData(p => ({ ...p, certifications: [...p.certifications,''] }));
  const del = i => setData(p => ({ ...p, certifications: p.certifications.filter((_,j)=>j!==i) }));
  return (
    <div className="rg-step-body">
      <div className="rg-step-intro">
        <h3 className="rg-step-title">Add your certifications & achievements</h3>
        <p className="rg-step-hint">Include online courses, workshops, hackathon wins, and academic achievements.</p>
      </div>
      <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:16 }}>
        <AddBtn onClick={add} label="Add Certification" />
      </div>
      {data.certifications.map((cert, i) => (
        <div key={i} className="rg-cert-row">
          <Award size={15} className="rg-cert-icon" />
          <input className="rg-input" value={cert} onChange={e=>upd(i,e.target.value)} placeholder="Python Programming Workshop – IIT Madras (Mechanica 2024)" />
          <DelBtn onClick={() => del(i)} />
        </div>
      ))}
    </div>
  );
};

const StepReview = ({ data, template, setData, allTemplates, onTemplateChange }) => {
  const { personal: p, objective, skills, education, projects, experience, certifications } = data;
  const validCerts = certifications.filter(c => c.trim());
  const validExp   = experience.filter(e => e.title || e.company);

  const switchTemplate = (t) => {
    // Reset isReady so the downloader re-initialises with new template
    setData(p => ({ ...p, isReady: false }));
    onTemplateChange(t);
  };

  return (
    <div className="rg-step-body">
      <div className="rg-step-intro">
        <h3 className="rg-step-title">Review your resume data</h3>
        <p className="rg-step-hint">Everything looks good? Pick a template and download your PDF below.</p>
      </div>

      <div className="rg-review-grid">
        <div className="rg-review-panel">
          <div className="rg-review-panel-title"><User size={13}/> Personal</div>
          {[['Name',p.name],['Title',p.subtitle],['Email',p.email],['Phone',p.phone],['Location',p.location],['LinkedIn',p.linkedin]].map(([lbl,val]) => val ? (
            <div key={lbl} className="rg-review-row"><span>{lbl}</span><strong>{val}</strong></div>
          ):null)}
        </div>
        <div className="rg-review-panel">
          <div className="rg-review-panel-title"><GraduationCap size={13}/> Education</div>
          {education.map((e,i)=>(
            <div key={i} className="rg-review-edu-block">
              <strong>{e.degree||'—'}</strong>
              <span>{e.school}{e.year?` · ${e.year}`:''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rg-review-panel" style={{ marginTop:12 }}>
        <div className="rg-review-panel-title"><Code2 size={13}/> Technical Skills</div>
        {skills.technical.map((sk,i)=>sk.label?(
          <div key={i} className="rg-review-row"><span>{sk.label}</span><strong>{sk.value||'—'}</strong></div>
        ):null)}
        {skills.soft&&<div className="rg-review-row"><span>Soft Skills</span><strong>{skills.soft}</strong></div>}
      </div>

      <div className="rg-review-grid" style={{ marginTop:12 }}>
        <div className="rg-review-panel">
          <div className="rg-review-panel-title"><Layout size={13}/> Projects ({projects.length})</div>
          {projects.map((proj,i)=>(
            <div key={i} className="rg-review-edu-block"><strong>{proj.name||'—'}</strong><span>{proj.tech}</span></div>
          ))}
        </div>
        {validExp.length>0&&(
          <div className="rg-review-panel">
            <div className="rg-review-panel-title"><Building2 size={13}/> Experience ({validExp.length})</div>
            {validExp.map((exp,i)=>(
              <div key={i} className="rg-review-edu-block"><strong>{exp.title||'—'}</strong><span>{exp.company}{exp.period?` · ${exp.period}`:''}</span></div>
            ))}
          </div>
        )}
      </div>

      {validCerts.length>0&&(
        <div className="rg-review-panel" style={{ marginTop:12 }}>
          <div className="rg-review-panel-title"><Award size={13}/> Certifications ({validCerts.length})</div>
          {validCerts.map((c,i)=><div key={i} className="rg-review-cert">· {c}</div>)}
        </div>
      )}

      {/* ── Template Switcher — Visual Icon Cards ── */}
      <div className="rg-template-switcher">
        <div className="rg-template-switcher-label">
          <LayoutTemplate size={13}/> Change Template — your data stays intact
        </div>
        <div className="rg-tpl-icon-grid">
          {allTemplates.map(t => {
            const isActive = t.id === template.id;
            return (
              <motion.button
                key={t.id}
                className={`rg-tpl-icon-card ${isActive ? 'active' : ''}`}
                style={{ '--chip-accent': t.accent }}
                onClick={() => switchTemplate(t)}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                title={t.desc}
              >
                {/* Layout-specific visual thumbnail */}
                <div className="rg-tpl-icon-thumb" style={{ background: t.accentLight }}>

                  {/* SIDEBAR — two-column */}
                  {t.layout === 'sidebar' && (
                    <div style={{ display:'flex', height:'100%' }}>
                      <div style={{ width:'32%', background:`${t.accent}28`, flexShrink:0 }} />
                      <div style={{ flex:1, padding:'7px 6px', display:'flex', flexDirection:'column', gap:3 }}>
                        {[90,65,80,55,70].map((w,i)=>(
                          <div key={i} style={{ height:2.5, width:`${w}%`, borderRadius:2, background:`${t.accent}${i===0?'90':'30'}` }}/>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* EXECUTIVE — dark header bar */}
                  {t.layout === 'executive' && (
                    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
                      <div style={{ height:'32%', background:t.accent, flexShrink:0, display:'flex', alignItems:'center', padding:'0 8px' }}>
                        <div style={{ width:'60%', height:4, borderRadius:2, background:'rgba(255,255,255,0.6)' }}/>
                      </div>
                      <div style={{ flex:1, padding:'6px 8px', display:'flex', flexDirection:'column', gap:3 }}>
                        {[100,72,88,55].map((w,i)=>(
                          <div key={i} style={{ height:2.5, width:`${w}%`, borderRadius:2, background:`${t.accent}30` }}/>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ACADEMIC — centered name + full-width rules */}
                  {t.layout === 'academic' && (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', height:'100%', padding:'7px 8px', gap:3 }}>
                      <div style={{ width:'65%', height:5, borderRadius:2, background:t.accent, marginBottom:2 }}/>
                      <div style={{ width:'50%', height:3, borderRadius:2, background:`${t.accent}70`, marginBottom:4 }}/>
                      <div style={{ width:'100%', height:1.5, background:t.accent, borderRadius:1, marginBottom:2 }}/>
                      {[100,80,90,65,75].map((w,i)=>(
                        <div key={i} style={{ height:2.5, width:`${w}%`, borderRadius:2, background:`${t.accent}25` }}/>
                      ))}
                    </div>
                  )}

                  {/* CLASSIC — accent header band */}
                  {t.layout === 'single' && (
                    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
                      <div style={{ height:'26%', background:`${t.accent}18`, borderBottom:`2px solid ${t.accent}60`, flexShrink:0, display:'flex', alignItems:'center', padding:'0 8px' }}>
                        <div style={{ width:'55%', height:4, borderRadius:2, background:`${t.accent}80` }}/>
                      </div>
                      <div style={{ flex:1, padding:'5px 8px', display:'flex', flexDirection:'column', gap:3 }}>
                        {[100,70,85,55,78].map((w,i)=>(
                          <div key={i} style={{ height:2.5, width:`${w}%`, borderRadius:2, background:`${t.accent}25` }}/>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MINIMAL — ultra-clean lines */}
                  {t.layout === 'minimal' && (
                    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'8px 8px', gap:3 }}>
                      <div style={{ width:'70%', height:5, borderRadius:2, background:t.accent, marginBottom:4 }}/>
                      {[100,60,0,90,72,0,85,55,70].map((w,i)=>(
                        w===0
                          ? <div key={i} style={{ height:1, background:'#e2e8f0', marginVertical:2 }}/>
                          : <div key={i} style={{ height:2.5, width:`${w}%`, borderRadius:2, background:`${t.accent}20` }}/>
                      ))}
                    </div>
                  )}
                </div>

                {/* Name + ATS % */}
                <div className="rg-tpl-icon-info">
                  <span className="rg-tpl-icon-name">{t.name}</span>
                  <span className="rg-tpl-icon-score" style={{ color: t.accent }}>{t.atsScore}%</span>
                </div>

                {/* Active checkmark */}
                {isActive && (
                  <div className="rg-tpl-icon-badge" style={{ background: t.accent }}>
                    <CheckCircle2 size={11} color="#fff"/>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Download Zone */}
      <div className="rg-download-zone">
        <div className="rg-download-zone-left">
          <div className="rg-download-template-tag" style={{ background:template.accentLight,color:template.accent,borderColor:template.accentBorder }}>
            <LayoutTemplate size={13}/> {template.name}
          </div>
          <div className="rg-download-meta">ATS Score: <strong>{template.atsScore}%</strong> · PDF Format</div>
        </div>
        {!data.isReady ? (
          <button className="rg-generate-btn" style={{ background:`linear-gradient(135deg, ${template.accent}, ${template.accent}dd)` }}
            onClick={() => setData(p => ({ ...p, isReady: true }))}>
            <CheckCircle2 size={17}/> Generate Resume PDF
          </button>
        ) : (
          <Suspense fallback={<div className="rg-pdf-loading"><Loader2 size={16} className="rg-spin"/> Building PDF…</div>}>
            <ResumePDFDownloader data={data} templateId={template.id} onCancel={() => setData(p => ({ ...p, isReady: false }))} />
          </Suspense>
        )}
      </div>
    </div>
  );
};

// ─── Template SVG Previews ────────────────────────────────────────────────────
const TemplatePreviewCard = ({ template, onSelect }) => {
  const { accent, accentLight, accentBorder } = template;
  const templateTags = {
    classic: ['Corporate', 'Single column'],
    modern: ['Tech roles', 'Sidebar'],
    minimal: ['Clean ATS', 'High whitespace'],
    executive: ['Leadership', 'Bold header'],
    academic: ['Campus ready', 'Formal'],
    plain: ['No color', 'Parser first'],
  };
  const tags = templateTags[template.id] || ['ATS ready', 'PDF'];

  const PreviewSVG = () => {
    const Line = ({ x, y, w, h = 4, fill = '#dbe4ef', opacity = 1 }) => (
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} opacity={opacity} />
    );
    const Section = ({ y, titleW = 44, rows = 3, x = 22, w = 176 }) => (
      <g>
        <Line x={x} y={y} w={titleW} h={5} fill={accent} opacity="0.82" />
        <Line x={x} y={y + 11} w={w} h={1.2} fill="#e5edf6" />
        {Array.from({ length: rows }).map((_, i) => (
          <Line
            key={i}
            x={x}
            y={y + 18 + i * 8}
            w={w - i * 16 + (i % 2) * 8}
            h={3.8}
            fill="#dbe4ef"
          />
        ))}
      </g>
    );

    if (template.layout === 'academic') return (
      <svg viewBox="0 0 220 290" className="rg-template-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="220" height="290" fill="#fff" rx="10"/>
        <Line x="58" y="20" w="104" h="9" fill="#172033" />
        <Line x="70" y="36" w="80" h="4" fill="#64748b" />
        <Line x="46" y="48" w="128" h="3" fill="#94a3b8" opacity="0.55" />
        <rect x="18" y="62" width="184" height="1.5" fill="#172033" />
        <Section y={76} titleW={78} rows={2} x={18} w={184} />
        <Section y={118} titleW={50} rows={4} x={18} w={170} />
        <Section y={176} titleW={62} rows={3} x={18} w={176} />
        <Section y={228} titleW={74} rows={2} x={18} w={156} />
      </svg>
    );

    if (template.layout === 'sidebar') return (
      <svg viewBox="0 0 220 290" className="rg-template-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="220" height="290" fill="#fff" rx="10"/>
        <rect x="0" y="0" width="74" height="290" fill={accentLight} rx="10"/>
        <circle cx="37" cy="34" r="16" fill={accent} opacity="0.78"/>
        <Line x="16" y="62" w="42" h="6" fill={accent} />
        <Line x="16" y="76" w="34" h="4" fill={accent} opacity="0.45" />
        <Line x="16" y="102" w="42" h="1" fill={accent} opacity="0.25" />
        {[0,1,2,3,4].map(i => <Line key={i} x="16" y={116 + i * 12} w={28 + (i % 2) * 12} h="5" fill="#94a3b8" opacity="0.55" />)}
        <Line x="16" y="190" w="42" h="1" fill={accent} opacity="0.25" />
        {[0,1,2].map(i => <Line key={i} x="16" y={204 + i * 12} w={32} h="5" fill="#94a3b8" opacity="0.48" />)}
        <Line x="92" y="22" w="104" h="12" fill={accent} />
        <Line x="92" y="42" w="72" h="5" fill="#94a3b8" opacity="0.55" />
        <Section y={68} titleW={42} rows={3} x={92} w={100} />
        <Section y={126} titleW={46} rows={3} x={92} w={104} />
        <Section y={190} titleW={38} rows={4} x={92} w={96} />
      </svg>
    );
    if (template.layout === 'executive') return (
      <svg viewBox="0 0 220 290" className="rg-template-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="220" height="290" fill="#fff" rx="10"/>
        <rect x="0" y="0" width="220" height="64" fill={accent} rx="10"/>
        <rect x="0" y="54" width="220" height="10" fill="#fff" opacity="0.18"/>
        <Line x="22" y="20" w="102" h="11" fill="#fff" opacity="0.96" />
        <Line x="22" y="40" w="70" h="5" fill="#fff" opacity="0.58" />
        <Line x="150" y="22" w="44" h="5" fill="#fff" opacity="0.42" />
        <Line x="150" y="34" w="34" h="5" fill="#fff" opacity="0.36" />
        <Section y={86} titleW={44} rows={3} x={22} w={174} />
        <g>
          <Line x="22" y="148" w="48" h="5" fill={accent} opacity="0.85" />
          {[0,1].map(i => (
            <g key={i}>
              <Line x="22" y={164 + i * 36} w="94" h="6" fill="#334155" opacity="0.75" />
              <Line x="22" y={176 + i * 36} w="150" h="4" />
              <Line x="22" y={184 + i * 36} w="116" h="4" />
            </g>
          ))}
        </g>
        <Section y={240} titleW={50} rows={2} x={22} w={150} />
      </svg>
    );
    if (template.layout === 'minimal') return (
      <svg viewBox="0 0 220 290" className="rg-template-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="220" height="290" fill="#fff" rx="10"/>
        <Line x="28" y="28" w="118" h="10" fill="#172033" />
        <Line x="28" y="48" w="80" h="4" fill="#94a3b8" />
        <rect x="28" y="66" width="164" height="1" fill="#e2e8f0" />
        <Section y={82} titleW={62} rows={2} x={28} w={156} />
        <rect x="28" y="128" width="164" height="1" fill="#e2e8f0" />
        <Section y={146} titleW={46} rows={3} x={28} w={150} />
        <rect x="28" y="208" width="164" height="1" fill="#e2e8f0" />
        {[0,1,2,3].map(i => <Line key={i} x="28" y={226 + i * 10} w={128 + (i % 2) * 16} h="4" />)}
      </svg>
    );
    if (template.layout === 'plain') return (
      <svg viewBox="0 0 220 290" className="rg-template-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="220" height="290" fill="#fff" rx="10"/>
        <Line x="24" y="22" w="110" h="9" fill="#111827" />
        <Line x="24" y="39" w="150" h="3.5" fill="#4b5563" opacity="0.75" />
        <rect x="24" y="54" width="172" height="1" fill="#111827" />
        {[76, 124, 178, 228].map((y, i) => (
          <g key={y}>
            <Line x="24" y={y} w={i === 0 ? 54 : 44 + i * 7} h="5" fill="#111827" />
            <rect x="24" y={y + 10} width="172" height="1" fill="#d1d5db" />
            <Line x="24" y={y + 19} w="154" h="4" fill="#6b7280" opacity="0.58" />
            <Line x="24" y={y + 28} w={i % 2 ? 126 : 166} h="4" fill="#6b7280" opacity="0.5" />
          </g>
        ))}
      </svg>
    );
    // Classic (default)
    return (
      <svg viewBox="0 0 220 290" className="rg-template-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="220" height="290" fill="#fff" rx="10"/>
        <rect x="0" y="0" width="220" height="70" fill={accentLight} rx="10"/>
        <Line x="22" y="22" w="112" h="11" fill={accent} />
        <Line x="22" y="42" w="80" h="5" fill={accent} opacity="0.48" />
        <Line x="22" y="54" w="126" h="4" fill="#94a3b8" opacity="0.55" />
        <Section y={88} titleW={56} rows={3} x={22} w={174} />
        <g>
          <Line x="22" y="150" w="54" h="5" fill={accent} opacity="0.84" />
          {[0,1].map(i => (
            <g key={i}>
              <Line x="22" y={166 + i * 34} w="130" h="6" fill="#334155" opacity="0.78" />
              <Line x="22" y={178 + i * 34} w="98" h="4" fill="#94a3b8" opacity="0.52" />
              <Line x="22" y={186 + i * 34} w="156" h="4" />
            </g>
          ))}
        </g>
        <Section y={238} titleW={48} rows={2} x={22} w={154} />
      </svg>
    );
  };

  return (
    <motion.button
      className="rg-template-card"
      onClick={() => onSelect(template)}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type:'spring', stiffness:300, damping:22 }}
      style={{ '--accent': accent }}
    >
      <div className="rg-template-preview" style={{ '--preview-bg': template.previewBg, '--accent-light': accentLight }}>
        <div className="rg-template-preview-glow" />
        <div className="rg-template-paper">
          <PreviewSVG />
        </div>
        <div className="rg-ats-badge" style={{ background:accentLight, color:accent, borderColor:accentBorder }}>
          <Star size={10}/> {template.atsScore}%
        </div>
      </div>
      <div className="rg-template-info">
        <div className="rg-template-tags">
          {tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
        <h4 className="rg-template-name">{template.name}</h4>
        <p className="rg-template-desc">{template.desc}</p>
        <div className="rg-template-footer">
          <span className="rg-template-score"><CheckCircle2 size={13}/> ATS {template.atsScore}</span>
          <span className="rg-template-cta">Use Template <ArrowRight size={13}/></span>
        </div>
      </div>
    </motion.button>
  );
};

// ─── Step Validation ─────────────────────────────────────────────────────
const validateStep = (stepIdx, data) => {
  const errs = [];
  switch (stepIdx) {
    case 0: { // Personal Info
      const n = data.personal.name?.trim();
      const e = data.personal.email?.trim();
      const p = data.personal.phone?.trim();
      if (!n) errs.push('Full name is required.');
      else if (n.length < 2) errs.push('Name must be at least 2 characters.');
      if (!e) errs.push('Email address is required.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errs.push('Enter a valid email (e.g. you@gmail.com).');
      if (p && !/^[\+\d][\d\s\-\(\)]{5,14}$/.test(p)) errs.push('Phone number appears invalid — use 7–15 digits.');
      break;
    }
    case 1: { // Objective
      const words = (data.objective || '').trim().split(/\s+/).filter(Boolean);
      if (!data.objective?.trim()) errs.push('Career objective / summary is required.');
      else if (words.length < 10)
        errs.push(`Objective too short — ${words.length}/10 words minimum for a strong impression.`);
      break;
    }
    case 2: { // Skills
      const filled = data.skills.technical.filter(s => s.label?.trim() && s.value?.trim());
      if (filled.length === 0)
        errs.push('Add at least one skill category with values (e.g. Languages: Java | Python).');
      break;
    }
    case 3: { // Education
      data.education.forEach((edu, i) => {
        if (!edu.degree?.trim()) errs.push(`Education #${i + 1}: Degree / qualification is required.`);
        if (!edu.school?.trim()) errs.push(`Education #${i + 1}: School / university name is required.`);
      });
      break;
    }
    case 4: { // Projects
      data.projects.forEach((proj, i) => {
        if (!proj.name?.trim()) errs.push(`Project #${i + 1}: Project name is required.`);
      });
      break;
    }
    case 5: { // Experience
      data.experience.forEach((exp, i) => {
        const hasData = exp.title?.trim() || exp.company?.trim() || exp.period?.trim() || exp.description?.trim();
        if (hasData) {
          if (!exp.title?.trim()) errs.push(`Experience #${i + 1}: Job title is required.`);
          if (!exp.company?.trim()) errs.push(`Experience #${i + 1}: Company name is required.`);
        }
      });
      break;
    }
    default: break; // Step 6 (Certs) is optional
  }
  return { isValid: errs.length === 0, errs };
};

// ─── Wizard Modal ─────────────────────────────────────────────────────────────
const ResumeWizard = ({ template, onClose, optimizerSeed, analyzerResults }) => {
  const [step, setStep]           = useState(0);
  const [data, setData]           = useState(() => applyOptimizerSeed(defaultData(), optimizerSeed));
  const [animDir, setDir]         = useState(1);
  const [key, setKey]             = useState(0);
  const [activeTemplate, setActiveTemplate] = useState(template);
  // Validation
  const [stepErrors, setStepErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const shakeRef   = useRef(null);

  const total = STEPS.length;
  const pct   = Math.round(((step + 1) / total) * 100);
  const Icon  = STEPS[step].icon;
  const smartSuggestions = buildSmartSuggestions(analyzerResults);
  const suggestedStepIds = new Set(smartSuggestions.map((item) => item.step));

  const applyAtsGaps = () => {
    setData((prev) => ({ ...applyOptimizerSeed(prev, optimizerSeed), isReady: false }));
  };

  const goTo = useCallback((next) => {
    // Only validate when moving FORWARD
    if (next > step) {
      const { isValid, errs } = validateStep(step, data);
      if (!isValid) {
        setStepErrors(errs);
        setShowErrors(true);
        // Trigger shake on the Continue button
        if (shakeRef.current) {
          shakeRef.current.classList.remove('rg-shake');
          void shakeRef.current.offsetWidth; // reflow to re-trigger animation
          shakeRef.current.classList.add('rg-shake');
        }
        return;
      }
    }
    // Clear errors and navigate
    setShowErrors(false);
    setStepErrors([]);
    setDir(next > step ? 1 : -1);
    setKey(k => k + 1);
    setStep(next);
  }, [step, data]);

  const stepVariants = {
    initial: (d) => ({ opacity:0, x: d>0 ? 40 : -40 }),
    animate: { opacity:1, x:0, transition:{ duration:0.25, ease:'easeOut' } },
    exit:    (d) => ({ opacity:0, x: d>0 ? -40 : 40, transition:{ duration:0.2 } }),
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <StepPersonal       data={data} setData={setData}/>;
      case 1: return <StepObjective      data={data} setData={setData}/>;
      case 2: return <StepSkills         data={data} setData={setData} smartSuggestions={smartSuggestions}/>;
      case 3: return <StepEducation      data={data} setData={setData}/>;
      case 4: return <StepProjects       data={data} setData={setData} smartSuggestions={smartSuggestions}/>;
      case 5: return <StepExperience     data={data} setData={setData} smartSuggestions={smartSuggestions}/>;
      case 6: return <StepCertifications data={data} setData={setData}/>;
      case 7: return <StepReview data={data} setData={setData} template={activeTemplate} allTemplates={TEMPLATES} onTemplateChange={setActiveTemplate}/>;
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="rg-overlay"
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        exit={{ opacity:0 }}
        onClick={e => e.target===e.currentTarget && onClose()}
      >
        <motion.div
          className="rg-wizard"
          initial={{ opacity:0, y:30, scale:0.94 }}
          animate={{ opacity:1, y:0, scale:1 }}
          exit={{ opacity:0, y:20 }}
          transition={{ type:'spring', stiffness:280, damping:26 }}
        >
          {/* Header */}
          <div className="rg-wizard-header">
            <div className="rg-wizard-header-left">
              <div className="rg-wizard-icon" style={{ background:activeTemplate.accentLight, color:activeTemplate.accent }}>
                <Icon size={17}/>
              </div>
              <div>
                <div className="rg-wizard-title">{STEPS[step].label}</div>
                <div className="rg-wizard-sub">Step {step+1} of {total} · {activeTemplate.name}</div>
              </div>
            </div>
            <div className="rg-wizard-actions">
              {optimizerSeed && (
                <button className="rg-apply-gaps-btn" type="button" onClick={applyAtsGaps}>
                  <Sparkles size={13} /> Apply ATS Gaps
                </button>
              )}
              <button className="rg-wizard-close" onClick={onClose}><X size={17}/></button>
            </div>
          </div>

          {/* Progress — Advanced Step Track */}
          <div className="rg-wizard-progress">
            <div className="rg-step-track">
              {STEPS.map((s, i) => {
                const SIcon  = s.icon;
                const done   = i < step;
                const active = i === step;
                return (
                  // Fragment with key fixes laggy React reconciliation
                  <Fragment key={i}>
                    <button
                      className={`rg-step-node ${done ? 'done' : ''} ${active ? 'active' : ''} ${suggestedStepIds.has(s.id) ? 'suggested' : ''}`}
                      onClick={() => goTo(i)}
                    >
                      <span className="rg-step-node-circle">
                        {done ? <CheckCircle2 size={14}/> : <SIcon size={13}/>}
                      </span>
                      <span className="rg-step-node-label">{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={`rg-step-connector ${done ? 'filled' : ''}`} />
                    )}
                  </Fragment>
                );
              })}
            </div>
            <div className="rg-progress-track">
              <motion.div className="rg-progress-fill"
                style={{ background:`linear-gradient(90deg, ${activeTemplate.accent}, ${activeTemplate.accent}cc)` }}
                animate={{ width:`${pct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <div className="rg-progress-pct">{pct}% complete</div>
          </div>

          {/* Step Content */}
          <div className="rg-wizard-body">
            <AnimatePresence mode="wait" custom={animDir}>
              <motion.div key={key} custom={animDir} variants={stepVariants} initial="initial" animate="animate" exit="exit">
                {renderStep()}
              </motion.div>
            </AnimatePresence>

            {/* Inline validation error panel */}
            {showErrors && stepErrors.length > 0 && (
              <div className="rg-validation-panel">
                <AlertCircle size={15} className="rg-validation-icon" />
                <ul className="rg-validation-list">
                  {stepErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="rg-wizard-footer">
            <button className="rg-btn-back" onClick={step === 0 ? onClose : () => goTo(step - 1)}>
              {step === 0 ? <><X size={14}/> Close</> : <><ChevronLeft size={15}/> Back</>}
            </button>
            <div className="rg-step-counter">{step + 1} / {total}</div>
            {step < total - 1 ? (
              <button
                ref={shakeRef}
                className="rg-btn-next"
                style={{ background: `linear-gradient(135deg, ${activeTemplate.accent}, ${activeTemplate.accent}dd)` }}
                onClick={() => goTo(step + 1)}
              >
                Continue <ChevronRight size={15}/>
              </button>
            ) : <span/>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Landing Page ─────────────────────────────────────────────────────────────
const TemplateSelector = ({ onSelect, optimizerSeed, analyzerResults }) => {
  const spotlightTemplates = TEMPLATES.filter((template) => ['modern', 'classic', 'minimal'].includes(template.id));
  return (
    <div className="rg-landing">
      <div className="rg-landing-hero">
        <motion.div className="rg-landing-badge" initial={{ opacity:0,y:-10 }} animate={{ opacity:1,y:0 }}>
          <Sparkles size={13}/> {optimizerSeed ? 'ATS Optimizer Ready' : 'ATS Resume Builder'}
        </motion.div>
        <motion.h2 className="rg-landing-h2" initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1 }}>
          Build Your <span className="rg-gradient-text">Perfect Resume</span>
        </motion.h2>
      </div>

      {optimizerSeed && (
        <div className="rg-ats-gap-apply">
          <div>
            <span><Sparkles size={13} /> One-click ATS gaps</span>
            <strong>{analyzerResults?.missing_skills?.slice(0, 5).join(' | ') || 'Target keywords ready'}</strong>
            <p>Your summary, skills, first project, and experience suggestions will be prefilled when you choose a template.</p>
          </div>
          <button type="button" onClick={() => onSelect(TEMPLATES.find((template) => template.id === 'modern') || TEMPLATES[0])}>
            Apply gaps with Modern
          </button>
        </div>
      )}

      <div className="rg-live-template-strip">
        <div className="rg-template-switcher-label">
          <LayoutTemplate size={13}/> Live template preview
        </div>
        <div className="rg-live-template-options">
          {spotlightTemplates.map((template) => (
            <button key={template.id} type="button" onClick={() => onSelect(template)} style={{ '--tpl-accent': template.accent }}>
              <span>{template.name}</span>
              <small>{template.layout === 'sidebar' ? 'Modern' : template.layout === 'minimal' ? 'Minimal' : 'Classic ATS'}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="rg-templates-grid">
        {TEMPLATES.map((t,i)=>(
          <motion.div key={t.id} initial={{ opacity:0,y:24 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1+i*0.07 }}>
            <TemplatePreviewCard template={t} onSelect={onSelect}/>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────
const ResumeGenerator = ({ optimizerSeed = null, analyzerResults = null }) => {
  const [selected, setSelected] = useState(null);
  const [open, setOpen]         = useState(false);
  const pick  = (t) => { setSelected(t); setOpen(true); };
  const close = ()  => { setOpen(false); setSelected(null); };
  return (
    <>
      <TemplateSelector onSelect={pick} optimizerSeed={optimizerSeed} analyzerResults={analyzerResults} />
      {open && selected && <ResumeWizard template={selected} onClose={close} optimizerSeed={optimizerSeed} analyzerResults={analyzerResults} />}
    </>
  );
};

export default ResumeGenerator;
