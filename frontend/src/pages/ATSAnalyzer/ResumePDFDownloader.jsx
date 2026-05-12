/**
 * ResumePDFDownloader.jsx
 * 5 templates — Classic, Modern, Minimal, Executive, Academic Pro.
 * Academic Pro replicates the user's sample: centered header, ALL-CAPS sections,
 * numbered projects, internship section, bullet lists.
 * Uses built-in fonts only (no CDN = no CORS issues).
 */

import {
  Document, Page, Text, View,
  PDFDownloadLink
} from '@react-pdf/renderer';
import { Download, X, Loader2 } from 'lucide-react';

// ─── Colour palette ────────────────────────────────────────────────────────────
const C = {
  blue:   '#1e40af', purple: '#7c3aed',
  slate:  '#1e293b', sky:    '#0369a1',
  g900: '#111827', g800: '#1f2937', g700: '#374151',
  g600: '#4b5563', g500: '#6b7280', g400: '#9ca3af',
  g200: '#e5e7eb', g100: '#f3f4f6', g50: '#f9fafb',
  white: '#ffffff',
};

// ─── Shared helpers ────────────────────────────────────────────────────────────
const Rule = ({ color = C.g200, thickness = 0.75, mt = 4, mb = 4 }) => (
  <View style={{ height: thickness, backgroundColor: color, marginTop: mt, marginBottom: mb }} />
);

const SecTitle = ({ title, color }) => (
  <View style={{ marginTop: 12, marginBottom: 5 }}>
    <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color, textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {title}
    </Text>
    <Rule color={color} thickness={0.75} mt={3} mb={0} />
  </View>
);

const Dot = ({ children, color = C.g700, size = 8.5 }) => (
  <View style={{ flexDirection: 'row', marginBottom: 2 }}>
    <Text style={{ fontSize: size, color: C.g500, width: 10 }}>•</Text>
    <Text style={{ fontSize: size, color, flex: 1, lineHeight: 1.45 }}>{children}</Text>
  </View>
);

const ContactRow = ({ items }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
    {items.filter(Boolean).map((v, i) => (
      <Text key={i} style={{ fontSize: 8, color: C.g500 }}>
        {i > 0 ? '  |  ' : ''}{v}
      </Text>
    ))}
  </View>
);

// ─── ACADEMIC PRO ──────────────────────────────────────────────────────────────
// Replicates the user's sample resume exactly:
// centered header, thick rule, ALL-CAPS bold sections with underlines,
// numbered projects, internship/experience section, bullet certs.
const AcademicDoc = ({ data }) => {
  const { personal: p, objective, skills, education, projects, experience, certifications } = data;
  const certs   = (certifications || []).filter(c => c.trim());
  const validExp = (experience || []).filter(e => e.title || e.company);

  const SH = ({ children }) => (
    <View style={{ marginTop: 11, marginBottom: 0 }}>
      <Text style={{
        fontSize: 10, fontFamily: 'Helvetica-Bold',
        color: C.g900, textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        {children}
      </Text>
      <Rule color={C.g900} thickness={1.5} mt={2} mb={4} />
    </View>
  );

  return (
    <Document title={`${p.name || 'Resume'} — HireIQ`}>
      <Page size="A4" style={{
        fontFamily: 'Helvetica',
        fontSize: 9.5,
        color: C.g900,
        backgroundColor: C.white,
        paddingVertical: 38,
        paddingHorizontal: 44,
      }}>

        {/* ── Centered header ── */}
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.g900, letterSpacing: 1 }}>
            {(p.name || 'YOUR NAME').toUpperCase()}
          </Text>
          {p.subtitle && (
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.g700, marginTop: 2 }}>
              {p.subtitle}
            </Text>
          )}
          <ContactRow items={[p.email, p.phone, p.location]} />
          {(p.linkedin || p.portfolio) && (
            <View style={{ flexDirection: 'row', marginTop: 2 }}>
              {p.linkedin  && <Text style={{ fontSize: 8, color: '#1a56db', marginRight: 8 }}>LinkedIn</Text>}
              {p.portfolio && <Text style={{ fontSize: 8, color: '#1a56db' }}>GitHub</Text>}
            </View>
          )}
        </View>

        <Rule color={C.g900} thickness={1.5} mt={4} mb={8} />

        {/* ── Career Objective ── */}
        {objective && (
          <>
            <SH>Career Objective</SH>
            <Text style={{ fontSize: 9, color: C.g700, lineHeight: 1.6, textAlign: 'justify' }}>
              {objective}
            </Text>
          </>
        )}

        {/* ── Skills ── */}
        {(skills.technical.some(s => s.label) || skills.soft) && (
          <>
            <SH>Skills</SH>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.g900, marginBottom: 4 }}>
              Technical Skills:
            </Text>
            {skills.technical.filter(s => s.label && s.value).map((sk, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 3, paddingLeft: 14 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.g800 }}>{sk.label}: </Text>
                <Text style={{ fontSize: 9, color: C.g700 }}>{sk.value}.</Text>
              </View>
            ))}
            {skills.soft && (
              <View style={{ flexDirection: 'row', marginTop: 3 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.g800 }}>  Soft Skills: </Text>
                <Text style={{ fontSize: 9, color: C.g700 }}>{skills.soft}.</Text>
              </View>
            )}
          </>
        )}

        {/* ── Education ── */}
        {education.length > 0 && (
          <>
            <SH>Education</SH>
            {education.map((edu, i) => (
              <View key={i} style={{ marginBottom: 7 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.g900 }}>
                  {edu.degree}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 9, color: C.g700, fontFamily: 'Helvetica-Oblique' }}>
                    {'  '}{edu.school}
                    {edu.year ? ` | ${edu.year}` : ''}
                    {edu.grade ? ` | ${edu.grade}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Projects ── */}
        {projects.length > 0 && (
          <>
            <SH>Projects</SH>
            {projects.map((proj, i) => (
              <View key={i} style={{ marginBottom: 9 }}>
                {/* Numbered title row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.g900 }}>
                    {i + 1}) {proj.name}
                  </Text>
                  {proj.links && (
                    <Text style={{ fontSize: 8, color: '#1a56db' }}>  Links: {proj.links}</Text>
                  )}
                </View>
                {proj.tech && (
                  <Text style={{ fontSize: 8.5, color: C.g600, paddingLeft: 12 }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>Tech Stack: </Text>{proj.tech}.
                  </Text>
                )}
                {proj.description && (
                  <View style={{ paddingLeft: 12, marginTop: 2 }}>
                    <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.g800, marginBottom: 2 }}>
                      Description:
                    </Text>
                    <Dot size={8.5}>{proj.description}</Dot>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── Internship / Experience ── */}
        {validExp.length > 0 && (
          <>
            <SH>Internship</SH>
            {validExp.map((exp, i) => (
              <View key={i} style={{ marginBottom: 10 }}>
                {/* Internship Experience line */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.g900 }}>
                    Internship Experience:
                  </Text>
                  {exp.period && (
                    <Text style={{ fontSize: 8.5, color: C.g500 }}>{exp.period}</Text>
                  )}
                </View>
                <View style={{ paddingLeft: 14, marginTop: 2 }}>
                  <Text style={{ fontSize: 9, color: C.g700 }}>
                    {exp.title}{exp.company ? ` (${exp.company})` : ''}
                  </Text>
                  {exp.description && (
                    <Dot size={8.5}>{exp.description}</Dot>
                  )}
                </View>
                {/* Achievements sub-section */}
                {exp.achievements && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.g900, paddingLeft: 0 }}>
                      Achievements:
                    </Text>
                    <View style={{ paddingLeft: 14 }}>
                      <Dot size={8.5}>{exp.achievements}</Dot>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── Certificates ── */}
        {certs.length > 0 && (
          <>
            <SH>Certificates</SH>
            {certs.map((c, i) => <Dot key={i}>{c}</Dot>)}
          </>
        )}
      </Page>
    </Document>
  );
};

// ─── CLASSIC ──────────────────────────────────────────────────────────────────
const ClassicDoc = ({ data }) => {
  const { personal: p, objective, skills, education, projects, experience, certifications } = data;
  const acc   = C.blue;
  const certs = (certifications || []).filter(c => c.trim());
  const validExp = (experience || []).filter(e => e.title || e.company);

  return (
    <Document title={`${p.name || 'Resume'} — HireIQ`}>
      <Page size="A4" style={{ fontFamily: 'Helvetica', fontSize: 9.5, color: C.g900, backgroundColor: C.white, padding: 44 }}>
        <View style={{ backgroundColor: '#eff6ff', padding: 18, borderRadius: 4, marginBottom: 6 }}>
          <Text style={{ fontSize: 21, fontFamily: 'Helvetica-Bold', color: acc }}>{p.name || 'YOUR NAME'}</Text>
          {p.subtitle && <Text style={{ fontSize: 10.5, color: C.g700, marginTop: 2 }}>{p.subtitle}</Text>}
          <View style={{ flexDirection:'row', flexWrap:'wrap', marginTop: 4 }}>
            {[p.email,p.phone,p.location,p.linkedin,p.portfolio].filter(Boolean).map((v,i)=>(
              <Text key={i} style={{ fontSize: 8, color: C.g500 }}>{i>0?'  ·  ':''}{v}</Text>
            ))}
          </View>
        </View>
        {objective && (<><SecTitle title="Professional Summary" color={acc}/><Text style={{ lineHeight:1.55, color:C.g700, fontSize:9 }}>{objective}</Text></>)}
        <SecTitle title="Technical Skills" color={acc}/>
        {skills.technical.filter(s=>s.label).map((sk,i)=>(
          <Text key={i} style={{ fontSize:9, color:C.g700, marginBottom:2 }}><Text style={{ fontFamily:'Helvetica-Bold', color:C.g900 }}>{sk.label}: </Text>{sk.value}</Text>
        ))}
        {skills.soft && <Text style={{ fontSize:9, color:C.g700, marginTop:2 }}><Text style={{ fontFamily:'Helvetica-Bold', color:C.g900 }}>Soft Skills: </Text>{skills.soft}</Text>}
        <SecTitle title="Education" color={acc}/>
        {education.map((e,i)=>(
          <View key={i} style={{ marginBottom:7 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontFamily:'Helvetica-Bold', fontSize:10, color:C.g900 }}>{e.school}</Text>
              <Text style={{ fontSize:8, color:C.g500 }}>{e.year}</Text>
            </View>
            <Text style={{ fontSize:8.5, color:C.g600 }}>{e.degree}{e.grade?` · ${e.grade}`:''}</Text>
          </View>
        ))}
        <SecTitle title="Projects" color={acc}/>
        {projects.map((proj,i)=>(
          <View key={i} style={{ marginBottom:8 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontFamily:'Helvetica-Bold', fontSize:10, color:C.g900 }}>{proj.name}</Text>
              <Text style={{ fontSize:7.5, color:acc }}>{proj.links}</Text>
            </View>
            {proj.tech && <Text style={{ fontSize:8, color:C.g500, marginBottom:1 }}>Stack: {proj.tech}</Text>}
            {proj.description && <Dot color={C.g700}>{proj.description}</Dot>}
          </View>
        ))}
        {validExp.length > 0 && (<>
          <SecTitle title="Experience" color={acc}/>
          {validExp.map((exp,i)=>(
            <View key={i} style={{ marginBottom:7 }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                <Text style={{ fontFamily:'Helvetica-Bold', fontSize:10, color:C.g900 }}>{exp.title}{exp.company?` — ${exp.company}`:''}</Text>
                <Text style={{ fontSize:8, color:C.g500 }}>{exp.period}</Text>
              </View>
              {exp.description && <Dot color={C.g700}>{exp.description}</Dot>}
              {exp.achievements && <Text style={{ fontSize:8.5, color:C.g600, marginTop:2 }}>Achievement: {exp.achievements}</Text>}
            </View>
          ))}
        </>)}
        {certs.length > 0 && (<><SecTitle title="Certifications" color={acc}/>{certs.map((c,i)=><Dot key={i} color={C.g700}>{c}</Dot>)}</>)}
      </Page>
    </Document>
  );
};

// ─── MODERN (Sidebar) ─────────────────────────────────────────────────────────
const ModernDoc = ({ data }) => {
  const { personal: p, objective, skills, education, projects, experience, certifications } = data;
  const acc   = C.purple;
  const certs = (certifications || []).filter(c => c.trim());
  const validExp = (experience || []).filter(e => e.title || e.company);

  const SH = ({ children }) => (
    <Text style={{ fontSize:8, fontFamily:'Helvetica-Bold', color:acc, textTransform:'uppercase', letterSpacing:0.7, marginTop:14, marginBottom:4 }}>{children}</Text>
  );
  return (
    <Document title={`${p.name || 'Resume'} — HireIQ`}>
      <Page size="A4" style={{ fontFamily:'Helvetica', fontSize:9.5, backgroundColor:C.white }}>
        <View style={{ flexDirection:'row', minHeight:'100%' }}>
          <View style={{ width:'30%', backgroundColor:'#f5f3ff', padding:26, paddingTop:36 }}>
            <Text style={{ fontSize:16, fontFamily:'Helvetica-Bold', color:acc }}>{p.name}</Text>
            <Text style={{ fontSize:9, color:C.g700, marginTop:3, marginBottom:12 }}>{p.subtitle}</Text>
            <SH>Contact</SH>
            {[p.email,p.phone,p.location,p.linkedin,p.portfolio].filter(Boolean).map((v,i)=>(
              <Text key={i} style={{ fontSize:7.5, color:C.g600, marginBottom:2 }}>{v}</Text>
            ))}
            <SH>Skills</SH>
            {skills.technical.filter(s=>s.label).map((sk,i)=>(
              <View key={i} style={{ marginBottom:5 }}>
                <Text style={{ fontSize:7.5, fontFamily:'Helvetica-Bold', color:C.g900 }}>{sk.label}</Text>
                <Text style={{ fontSize:7, color:C.g500 }}>{sk.value}</Text>
              </View>
            ))}
            {skills.soft && (<><SH>Soft Skills</SH><Text style={{ fontSize:7.5, color:C.g600, lineHeight:1.5 }}>{skills.soft}</Text></>)}
            {certs.length>0 && (<><SH>Certifications</SH>{certs.map((c,i)=><Text key={i} style={{ fontSize:7.5, color:C.g600, marginBottom:2 }}>· {c}</Text>)}</>)}
          </View>
          <View style={{ flex:1, padding:28, paddingTop:36 }}>
            {objective && (<><Text style={{ fontSize:8.5, fontFamily:'Helvetica-Bold', color:acc, textTransform:'uppercase', letterSpacing:0.7 }}>Summary</Text><Rule color={acc}/><Text style={{ fontSize:9, color:C.g700, lineHeight:1.55, marginBottom:4 }}>{objective}</Text></>)}
            <SecTitle title="Education" color={acc}/>
            {education.map((e,i)=>(
              <View key={i} style={{ marginBottom:7 }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                  <Text style={{ fontFamily:'Helvetica-Bold', fontSize:9.5, color:C.g900 }}>{e.school}</Text>
                  <Text style={{ fontSize:8, color:C.g500 }}>{e.year}</Text>
                </View>
                <Text style={{ fontSize:8.5, color:C.g600 }}>{e.degree}{e.grade?` · ${e.grade}`:''}</Text>
              </View>
            ))}
            <SecTitle title="Projects" color={acc}/>
            {projects.map((proj,i)=>(
              <View key={i} style={{ marginBottom:9 }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                  <Text style={{ fontFamily:'Helvetica-Bold', fontSize:10, color:C.g900 }}>{proj.name}</Text>
                  <Text style={{ fontSize:7.5, color:acc }}>{proj.links}</Text>
                </View>
                {proj.tech && <Text style={{ fontSize:8, color:C.g500, marginBottom:1 }}>Stack: {proj.tech}</Text>}
                {proj.description && <Dot color={C.g700}>{proj.description}</Dot>}
              </View>
            ))}
            {validExp.length>0 && (<>
              <SecTitle title="Experience" color={acc}/>
              {validExp.map((exp,i)=>(
                <View key={i} style={{ marginBottom:7 }}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                    <Text style={{ fontFamily:'Helvetica-Bold', fontSize:9.5, color:C.g900 }}>{exp.title} — {exp.company}</Text>
                    <Text style={{ fontSize:8, color:C.g500 }}>{exp.period}</Text>
                  </View>
                  {exp.description && <Dot color={C.g700}>{exp.description}</Dot>}
                </View>
              ))}
            </>)}
          </View>
        </View>
      </Page>
    </Document>
  );
};

// ─── MINIMAL ──────────────────────────────────────────────────────────────────
const MinimalDoc = ({ data }) => {
  const { personal: p, objective, skills, education, projects, experience, certifications } = data;
  const certs = (certifications || []).filter(c => c.trim());
  const validExp = (experience || []).filter(e => e.title || e.company);
  const Div = () => <View style={{ height:0.5, backgroundColor:C.g200, marginVertical:10 }}/>;
  const Lbl = ({ children }) => <Text style={{ fontSize:8.5, fontFamily:'Helvetica-Bold', color:C.g500, textTransform:'uppercase', letterSpacing:0.8, marginBottom:5 }}>{children}</Text>;
  return (
    <Document title={`${p.name || 'Resume'} — HireIQ`}>
      <Page size="A4" style={{ fontFamily:'Helvetica', fontSize:9.5, color:C.g900, backgroundColor:C.white, padding:50 }}>
        <Text style={{ fontSize:22, fontFamily:'Helvetica-Bold', color:C.g900 }}>{p.name}</Text>
        <Text style={{ fontSize:11, color:C.g500, marginTop:2 }}>{p.subtitle}</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', marginTop:4 }}>
          {[p.email,p.phone,p.location,p.linkedin,p.portfolio].filter(Boolean).map((v,i)=>(
            <Text key={i} style={{ fontSize:8, color:C.g400 }}>{i>0?'  ·  ':''}{v}</Text>
          ))}
        </View>
        <Div/>
        {objective && (<><Lbl>Summary</Lbl><Text style={{ fontSize:9, color:C.g700, lineHeight:1.6, marginBottom:4 }}>{objective}</Text><Div/></>)}
        <Lbl>Skills</Lbl>
        {skills.technical.filter(s=>s.label).map((sk,i)=>(
          <Text key={i} style={{ fontSize:9, color:C.g700, marginBottom:2 }}><Text style={{ fontFamily:'Helvetica-Bold', color:C.g900 }}>{sk.label}: </Text>{sk.value}</Text>
        ))}
        {skills.soft && <Text style={{ fontSize:9, color:C.g700, marginTop:2 }}><Text style={{ fontFamily:'Helvetica-Bold', color:C.g900 }}>Soft: </Text>{skills.soft}</Text>}
        <Div/>
        <Lbl>Education</Lbl>
        {education.map((e,i)=>(
          <View key={i} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:7 }}>
            <View><Text style={{ fontFamily:'Helvetica-Bold', fontSize:9.5, color:C.g900 }}>{e.degree}</Text><Text style={{ fontSize:8.5, color:C.g500 }}>{e.school}{e.grade?` · ${e.grade}`:''}</Text></View>
            <Text style={{ fontSize:8.5, color:C.g400 }}>{e.year}</Text>
          </View>
        ))}
        <Div/>
        <Lbl>Projects</Lbl>
        {projects.map((proj,i)=>(
          <View key={i} style={{ marginBottom:8 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontFamily:'Helvetica-Bold', fontSize:9.5, color:C.g900 }}>{proj.name}</Text>
              <Text style={{ fontSize:7.5, color:C.g400 }}>{proj.links}</Text>
            </View>
            {proj.tech && <Text style={{ fontSize:8, color:C.g500 }}>{proj.tech}</Text>}
            {proj.description && <Text style={{ fontSize:8.5, color:C.g700, marginTop:1 }}>{proj.description}</Text>}
          </View>
        ))}
        {validExp.length>0 && (<><Div/><Lbl>Experience</Lbl>{validExp.map((exp,i)=>(
          <View key={i} style={{ marginBottom:7 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontFamily:'Helvetica-Bold', fontSize:9.5, color:C.g900 }}>{exp.title}{exp.company?` — ${exp.company}`:''}</Text>
              <Text style={{ fontSize:8.5, color:C.g400 }}>{exp.period}</Text>
            </View>
            {exp.description && <Text style={{ fontSize:8.5, color:C.g700, marginTop:1 }}>{exp.description}</Text>}
          </View>
        ))}</>)}
        {certs.length>0 && (<><Div/><Lbl>Certifications</Lbl>{certs.map((c,i)=><Text key={i} style={{ fontSize:9, color:C.g700, marginBottom:2 }}>· {c}</Text>)}</>)}
      </Page>
    </Document>
  );
};

// ─── EXECUTIVE ─────────────────────────────────────────────────────────────────
const ExecutiveDoc = ({ data }) => {
  const { personal: p, objective, skills, education, projects, experience, certifications } = data;
  const acc   = C.sky;
  const certs = (certifications || []).filter(c => c.trim());
  const validExp = (experience || []).filter(e => e.title || e.company);
  return (
    <Document title={`${p.name || 'Resume'} — HireIQ`}>
      <Page size="A4" style={{ fontFamily:'Helvetica', fontSize:9.5, backgroundColor:C.white }}>
        <View style={{ backgroundColor:acc, paddingVertical:24, paddingHorizontal:44 }}>
          <Text style={{ fontSize:22, fontFamily:'Helvetica-Bold', color:C.white }}>{p.name||'YOUR NAME'}</Text>
          {p.subtitle && <Text style={{ fontSize:10.5, color:'rgba(255,255,255,0.8)', marginTop:3 }}>{p.subtitle}</Text>}
          <View style={{ flexDirection:'row', flexWrap:'wrap', marginTop:4 }}>
            {[p.email,p.phone,p.location,p.linkedin,p.portfolio].filter(Boolean).map((v,i)=>(
              <Text key={i} style={{ fontSize:8, color:'rgba(255,255,255,0.7)' }}>{i>0?'  ·  ':''}{v}</Text>
            ))}
          </View>
        </View>
        <View style={{ height:4, backgroundColor:'#0ea5e9' }}/>
        <View style={{ padding:44, paddingTop:28 }}>
          {objective && (<><SecTitle title="Executive Summary" color={acc}/><Text style={{ fontSize:9, color:C.g700, lineHeight:1.6 }}>{objective}</Text></>)}
          <SecTitle title="Core Competencies" color={acc}/>
          {skills.technical.filter(s=>s.label).map((sk,i)=>(
            <Text key={i} style={{ fontSize:9, color:C.g700, marginBottom:2 }}><Text style={{ fontFamily:'Helvetica-Bold', color:C.g900 }}>{sk.label}: </Text>{sk.value}</Text>
          ))}
          {skills.soft && <Text style={{ fontSize:9, color:C.g700, marginTop:2 }}><Text style={{ fontFamily:'Helvetica-Bold', color:C.g900 }}>Soft Skills: </Text>{skills.soft}</Text>}
          <SecTitle title="Education" color={acc}/>
          {education.map((e,i)=>(
            <View key={i} style={{ marginBottom:7 }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                <Text style={{ fontFamily:'Helvetica-Bold', fontSize:10, color:C.g900 }}>{e.school}</Text>
                <Text style={{ fontSize:8.5, color:C.g500 }}>{e.year}</Text>
              </View>
              <Text style={{ fontSize:8.5, color:C.g600 }}>{e.degree}{e.grade?` · ${e.grade}`:''}</Text>
            </View>
          ))}
          <SecTitle title="Key Projects" color={acc}/>
          {projects.map((proj,i)=>(
            <View key={i} style={{ marginBottom:8 }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                <Text style={{ fontFamily:'Helvetica-Bold', fontSize:10, color:C.g900 }}>{proj.name}</Text>
                <Text style={{ fontSize:7.5, color:acc }}>{proj.links}</Text>
              </View>
              {proj.tech && <Text style={{ fontSize:8, color:C.g500, marginBottom:1 }}>Technologies: {proj.tech}</Text>}
              {proj.description && <Dot color={C.g700}>{proj.description}</Dot>}
            </View>
          ))}
          {validExp.length>0 && (<>
            <SecTitle title="Experience" color={acc}/>
            {validExp.map((exp,i)=>(
              <View key={i} style={{ marginBottom:7 }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                  <Text style={{ fontFamily:'Helvetica-Bold', fontSize:10, color:C.g900 }}>{exp.title}{exp.company?` — ${exp.company}`:''}</Text>
                  <Text style={{ fontSize:8.5, color:C.g500 }}>{exp.period}</Text>
                </View>
                {exp.description && <Dot color={C.g700}>{exp.description}</Dot>}
                {exp.achievements && <Text style={{ fontSize:8.5, color:C.g600, marginTop:2 }}>Achievement: {exp.achievements}</Text>}
              </View>
            ))}
          </>)}
          {certs.length>0 && (<><SecTitle title="Certifications & Awards" color={acc}/>{certs.map((c,i)=><Dot key={i} color={C.g700}>{c}</Dot>)}</>)}
        </View>
      </Page>
    </Document>
  );
};

// ─── Document selector ─────────────────────────────────────────────────────────
const PlainATSDoc = ({ data }) => {
  const { personal: p, objective, skills, education, projects, experience, certifications } = data;
  const certs = (certifications || []).filter(c => c.trim());
  const validExp = (experience || []).filter(e => e.title || e.company);
  const Section = ({ children }) => (
    <View style={{ marginTop:11, marginBottom:4 }}>
      <Text style={{ fontSize:9.5, fontFamily:'Helvetica-Bold', color:C.g900, textTransform:'uppercase' }}>{children}</Text>
      <Rule color={C.g900} thickness={0.6} mt={3} mb={0}/>
    </View>
  );
  const TextLine = ({ children }) => <Text style={{ fontSize:9, color:C.g900, lineHeight:1.45, marginBottom:2 }}>{children}</Text>;

  return (
    <Document title={`${p.name || 'Resume'} - ATS Plain`}>
      <Page size="A4" style={{ fontFamily:'Helvetica', fontSize:9.5, color:C.g900, backgroundColor:C.white, padding:46 }}>
        <Text style={{ fontSize:20, fontFamily:'Helvetica-Bold', color:C.g900 }}>{p.name || 'YOUR NAME'}</Text>
        {p.subtitle && <Text style={{ fontSize:10.5, color:C.g900, marginTop:2 }}>{p.subtitle}</Text>}
        <Text style={{ fontSize:8.5, color:C.g900, marginTop:4 }}>{[p.email,p.phone,p.location,p.linkedin,p.portfolio].filter(Boolean).join(' | ')}</Text>
        <Rule color={C.g900} thickness={0.75} mt={8} mb={8}/>
        {objective && (<><Section>Summary</Section><TextLine>{objective}</TextLine></>)}
        <Section>Skills</Section>
        {skills.technical.filter(s=>s.label).map((sk,i)=><TextLine key={i}><Text style={{ fontFamily:'Helvetica-Bold' }}>{sk.label}: </Text>{sk.value}</TextLine>)}
        {skills.soft && <TextLine><Text style={{ fontFamily:'Helvetica-Bold' }}>Soft Skills: </Text>{skills.soft}</TextLine>}
        <Section>Education</Section>
        {education.map((e,i)=>(
          <View key={i} style={{ marginBottom:6 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontSize:9.5, fontFamily:'Helvetica-Bold', color:C.g900 }}>{e.degree}</Text>
              <Text style={{ fontSize:8.5, color:C.g900 }}>{e.year}</Text>
            </View>
            <TextLine>{e.school}{e.grade ? ` | ${e.grade}` : ''}</TextLine>
          </View>
        ))}
        <Section>Projects</Section>
        {projects.map((proj,i)=>(
          <View key={i} style={{ marginBottom:7 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontSize:9.5, fontFamily:'Helvetica-Bold', color:C.g900 }}>{proj.name}</Text>
              {proj.links && <Text style={{ fontSize:8, color:C.g900 }}>{proj.links}</Text>}
            </View>
            {proj.tech && <TextLine><Text style={{ fontFamily:'Helvetica-Bold' }}>Tech: </Text>{proj.tech}</TextLine>}
            {proj.description && <TextLine>{proj.description}</TextLine>}
          </View>
        ))}
        {validExp.length>0 && (<><Section>Experience</Section>{validExp.map((exp,i)=>(
          <View key={i} style={{ marginBottom:7 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontSize:9.5, fontFamily:'Helvetica-Bold', color:C.g900 }}>{exp.title}{exp.company ? ` - ${exp.company}` : ''}</Text>
              <Text style={{ fontSize:8.5, color:C.g900 }}>{exp.period}</Text>
            </View>
            {exp.description && <TextLine>{exp.description}</TextLine>}
            {exp.achievements && <TextLine><Text style={{ fontFamily:'Helvetica-Bold' }}>Achievement: </Text>{exp.achievements}</TextLine>}
          </View>
        ))}</>)}
        {certs.length>0 && (<><Section>Certifications</Section>{certs.map((c,i)=><TextLine key={i}>{c}</TextLine>)}</>)}
      </Page>
    </Document>
  );
};

const buildDoc = (data, templateId) => {
  switch (templateId) {
    case 'modern':    return <ModernDoc    data={data}/>;
    case 'minimal':   return <MinimalDoc   data={data}/>;
    case 'executive': return <ExecutiveDoc data={data}/>;
    case 'academic':  return <AcademicDoc  data={data}/>;
    case 'plain':     return <PlainATSDoc  data={data}/>;
    default:          return <ClassicDoc   data={data}/>;
  }
};

// ─── Download Component ────────────────────────────────────────────────────────
const ResumePDFDownloader = ({ data, templateId, onCancel }) => {
  const safeName = (data.personal?.name || 'Resume').replace(/\s+/g, '_');
  const fileName = `${safeName}_HireIQ_Resume.pdf`;
  const doc      = buildDoc(data, templateId);

  return (
    <div className="rg-downloader-btns">
      <PDFDownloadLink document={doc} fileName={fileName}>
        {({ loading, error }) => (
          <button
            disabled={loading}
            className="rg-download-btn-main"
            style={{
              background: error
                ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.85 : 1,
            }}
          >
            {loading
              ? <><Loader2 size={17} style={{ animation:'rgSpin 0.8s linear infinite' }}/> Building PDF…</>
              : error
                ? <><X size={17}/> Error — retry</>
                : <><Download size={17}/> Download Resume PDF</>
            }
          </button>
        )}
      </PDFDownloadLink>

      <button onClick={onCancel} className="rg-edit-btn-alt">
        <X size={13}/> Edit Details
      </button>

      <style>{`
        @keyframes rgSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ResumePDFDownloader;
