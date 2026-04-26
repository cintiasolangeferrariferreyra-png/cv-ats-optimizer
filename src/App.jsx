import { useState, useRef, useCallback } from "react";

const ACCENT = "#E8171F";
const GOLD = "#C9A84C";
const DARK = "#1A1A1A";
const CREAM = "#F5F0E8";
const EU_BLUE = "#003399";

async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
}

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsText(file, "UTF-8");
  });
}

function isPDF(file) {
  return file?.type === "application/pdf" || file?.name?.endsWith(".pdf");
}

export default function App() {
  const [cvFile, setCvFile] = useState(null);
  const [ofertaText, setOfertaText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState("upload");
  const [progress, setProgress] = useState("");
  const cvInputRef = useRef();

  const handleCvDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file) setCvFile(file);
  }, []);

  const analyze = async () => {
    if (!cvFile || !ofertaText.trim()) {
      setError("Por favor subí tu CV y pegá la oferta laboral.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    setProgress("Leyendo tu CV...");

    try {
      let cvContent = [];

      if (isPDF(cvFile)) {
        const base64Data = await readFileAsBase64(cvFile);
        cvContent = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } },
          { type: "text", text: "Este es el CV del usuario." },
        ];
      } else {
        const text = await readFileAsText(cvFile);
        cvContent = [{ type: "text", text: `CV DEL USUARIO:\n\n${text}` }];
      }

      setProgress("Analizando y optimizando para ATS...");

      const systemPrompt = `Eres un experto en recursos humanos europeo especializado en:
1. Formato Europass (estándar de la Unión Europea)
2. Optimización ATS (Applicant Tracking Systems)
3. Redacción de CVs en español para el mercado laboral español y europeo

Tu tarea: analizar el CV del usuario y la oferta de trabajo, y devolver un CV completamente optimizado.

REGLAS:
- Seguir el formato Europass de la UE
- Incorporar las palabras clave exactas de la oferta laboral
- Usar verbos de acción fuertes (gestioné, lideré, implementé, reduje, incrementé...)
- Cuantificar logros siempre que sea posible
- NO inventar información — solo reorganizar y reformular
- Español de España (mercado europeo)
- Secciones Europass: Datos personales, Experiencia profesional, Educación y formación, Competencias digitales, Idiomas, Información adicional
- Idiomas: Marco Común Europeo (A1-C2)
- Formato limpio sin tablas ni columnas (los ATS no las leen bien)

ESTRUCTURA DE RESPUESTA:
Devuelve SOLO el CV optimizado en texto plano.
Al final agrega "═══ ANÁLISIS ATS ═══" con:
- Palabras clave detectadas e incorporadas
- Puntuación ATS estimada (antes y después)
- 3 recomendaciones personalizadas`;

      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: [
                ...cvContent,
                {
                  type: "text",
                  text: `OFERTA LABORAL:\n\n${ofertaText}\n\nOptimizá mi CV para esta oferta, siguiendo el formato Europass y maximizando la puntuación ATS.`,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || "Error al procesar");

      const text = data.content?.map((b) => b.text || "").join("") || "";
      setResult(text);
      setStep("result");
    } catch (err) {
      setError(err.message || "Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setStep("upload"); setResult(null);
    setCvFile(null); setOfertaText(""); setError(null);
  };

  const splitResult = (text) => {
    const marker = "═══ ANÁLISIS ATS ═══";
    const idx = text.indexOf(marker);
    if (idx === -1) return { cv: text, analysis: null };
    return { cv: text.slice(0, idx).trim(), analysis: text.slice(idx).trim() };
  };

  return (
    <div style={s.root}>
      <div style={s.euStrip}>
        <span style={s.euStars}>★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★</span>
        <span style={s.euLabel}>UNIÓN EUROPEA · FORMATO EUROPASS · OPTIMIZACIÓN ATS</span>
      </div>

      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.redTag}>Herramienta gratuita</div>
          <h1 style={s.h1}>Tu CV optimizado para<br /><span style={{ color: GOLD }}>filtros ATS</span> y formato europeo</h1>
          <p style={s.headerSub}>Subí tu CV y la oferta laboral. La IA lo reescribe en formato Europass y lo optimiza para pasar los sistemas automáticos de selección.</p>
        </div>
        <div style={s.headerDeco} />
      </header>

      <main style={s.main}>
        {step === "upload" && (
          <>
            <div style={s.stepsRow}>
              {[
                { n: "1", title: "Subí tu CV", desc: "PDF o texto (.txt)" },
                { n: "2", title: "Pegá la oferta", desc: "La descripción del puesto" },
                { n: "3", title: "Obtené tu CV ATS", desc: "Listo para postularte" },
              ].map((st) => (
                <div key={st.n} style={s.stepCard}>
                  <div style={s.stepNum}>{st.n}</div>
                  <div>
                    <div style={s.stepTitle}>{st.title}</div>
                    <div style={s.stepDesc}>{st.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={s.sectionLabel}><span>TU CV ACTUAL</span><div style={s.labelLine} /></div>

            <div
              style={{ ...s.dropZone, borderColor: cvFile ? ACCENT : "#D9D2C5", background: cvFile ? "#FFF5F5" : "#fff" }}
              onClick={() => cvInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCvDrop}
            >
              <input ref={cvInputRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display: "none" }} onChange={handleCvDrop} />
              {cvFile ? (
                <div style={s.fileChosen}>
                  <span style={{ fontSize: 32 }}>📄</span>
                  <div>
                    <div style={s.fileName}>{cvFile.name}</div>
                    <div style={s.fileSize}>{(cvFile.size / 1024).toFixed(0)} KB · Listo</div>
                  </div>
                  <button style={s.removeBtn} onClick={(e) => { e.stopPropagation(); setCvFile(null); }}>✕</button>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, color: "#8A8A8A", marginBottom: 10 }}>⬆</div>
                  <div style={s.dropTitle}>Arrastrá tu CV aquí o hacé click</div>
                  <div style={s.dropSub}>PDF, TXT, DOC — máx. 5 MB</div>
                </div>
              )}
            </div>

            <div style={{ ...s.sectionLabel, marginTop: 28 }}><span>OFERTA LABORAL</span><div style={s.labelLine} /></div>

            <textarea
              style={s.textarea}
              placeholder="Pegá aquí la descripción completa del puesto al que querés postularte..."
              value={ofertaText}
              onChange={(e) => setOfertaText(e.target.value)}
              rows={9}
            />
            <div style={s.charCount}>{ofertaText.length} caracteres</div>

            {error && <div style={s.errorBox}>{error}</div>}

            <button style={{ ...s.analyzeBtn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }} onClick={analyze} disabled={loading}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><Spinner />{progress}</span>
                : "✦ Optimizar mi CV para ATS"}
            </button>
            <div style={s.disclaimer}>🔒 Tu información se procesa en el momento y no se almacena.</div>
          </>
        )}

        {step === "result" && result && (() => {
          const { cv, analysis } = splitResult(result);
          return (
            <>
              <div style={s.resultHeader}>
                <div>
                  <div style={s.resultBadge}>✓ CV OPTIMIZADO</div>
                  <h2 style={s.resultTitle}>Tu CV listo para ATS y formato Europass</h2>
                </div>
                <button style={s.resetBtn} onClick={handleReset}>← Volver a empezar</button>
              </div>

              <div style={s.outputCard}>
                <div style={s.outputToolbar}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ ...s.dot, background: "#FF5F57" }} />
                    <span style={{ ...s.dot, background: "#FFBD2E" }} />
                    <span style={{ ...s.dot, background: "#28C840" }} />
                    <span style={s.termLabel}>curriculum-vitae-europass.txt</span>
                  </div>
                  <button style={{ ...s.copyBtn, background: copied ? "#1c8c50" : ACCENT }} onClick={handleCopy}>
                    {copied ? "✓ Copiado" : "Copiar CV"}
                  </button>
                </div>
                <pre style={s.cvText}>{cv}</pre>
              </div>

              {analysis && (
                <div style={s.analysisCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 20 }}>📊</span>
                    <span style={s.analysisTitle}>Análisis ATS</span>
                  </div>
                  <pre style={s.analysisText}>{analysis.replace("═══ ANÁLISIS ATS ═══", "").trim()}</pre>
                </div>
              )}

              <div style={s.tipsRow}>
                {[
                  { icon: "📎", tip: "Guardá el CV en .docx o .pdf sin columnas para mejor lectura ATS" },
                  { icon: "🔑", tip: "Usá exactamente las palabras de la oferta, los ATS buscan coincidencias exactas" },
                  { icon: "📐", tip: "El formato Europass es reconocido en todos los países de la UE y el EEE" },
                ].map((t, i) => (
                  <div key={i} style={s.tipCard}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
                    <span style={s.tipText}>{t.tip}</span>
                  </div>
                ))}
              </div>

              <div style={s.cintiaBox}>
                <div style={s.cintiaInner}>
                  <div>
                    <div style={s.cintiaTitle}>¿Necesitás también regularizar tu situación en España?</div>
                    <div style={s.cintiaSub}>Cintia Ferreyra — Abogada especialista en extranjería para latinos en España. Tramitá tu residencia con acompañamiento real.</div>
                  </div>
                  <a href="https://cintiaferreyra.com" target="_blank" rel="noopener noreferrer" style={s.cintiaBtn}>Ver servicios →</a>
                </div>
              </div>
            </>
          );
        })()}
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 16, height: 16,
      border: "2px solid rgba(255,255,255,0.3)",
      borderTop: "2px solid #fff",
      borderRadius: "50%",
      display: "inline-block",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

const styleEl = document.createElement("style");
styleEl.textContent = `@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; margin: 0; padding: 0; }`;
document.head.appendChild(styleEl);

const s = {
  root: { minHeight: "100vh", background: CREAM, fontFamily: "Georgia, serif" },
  euStrip: { background: EU_BLUE, padding: "8px 24px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  euStars: { color: "#FFCC00", fontSize: 11, letterSpacing: 2 },
  euLabel: { color: "#fff", fontSize: 10, fontFamily: "sans-serif", letterSpacing: 2, opacity: 0.85, fontWeight: 600 },
  header: { background: DARK, color: CREAM, padding: "44px 28px 40px", position: "relative", overflow: "hidden" },
  headerInner: { maxWidth: 700, position: "relative", zIndex: 1 },
  headerDeco: { position: "absolute", top: -50, right: -50, width: 260, height: 260, borderRadius: "50%", background: ACCENT, opacity: 0.12 },
  redTag: { display: "inline-block", background: ACCENT, color: "#fff", fontFamily: "sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "4px 12px", borderRadius: 2, marginBottom: 16 },
  h1: { fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, lineHeight: 1.15, marginBottom: 14 },
  headerSub: { color: "#AAAA9A", fontSize: 14, lineHeight: 1.7, fontFamily: "sans-serif", maxWidth: 520 },
  main: { maxWidth: 820, margin: "0 auto", padding: "36px 20px 60px" },
  stepsRow: { display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" },
  stepCard: { flex: "1 1 180px", background: "#fff", border: "1px solid #D9D2C5", borderRadius: 4, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 },
  stepNum: { background: DARK, color: CREAM, fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 18, width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepTitle: { fontFamily: "sans-serif", fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 2 },
  stepDesc: { fontFamily: "sans-serif", fontSize: 11, color: "#8A8A8A" },
  sectionLabel: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12, fontFamily: "sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "#8A8A8A" },
  labelLine: { flex: 1, height: 1, background: "#D9D2C5" },
  dropZone: { border: "2px dashed", borderRadius: 6, padding: 32, cursor: "pointer", transition: "all 0.2s", minHeight: 130, display: "flex", alignItems: "center", justifyContent: "center" },
  dropTitle: { fontFamily: "sans-serif", fontSize: 15, fontWeight: 600, color: DARK, marginBottom: 4 },
  dropSub: { fontFamily: "sans-serif", fontSize: 12, color: "#8A8A8A" },
  fileChosen: { display: "flex", alignItems: "center", gap: 16, width: "100%" },
  fileName: { fontFamily: "sans-serif", fontSize: 14, fontWeight: 600, color: DARK },
  fileSize: { fontFamily: "sans-serif", fontSize: 12, color: "#1c8c50", marginTop: 2 },
  removeBtn: { marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#8A8A8A", padding: 4 },
  textarea: { width: "100%", border: "1px solid #D9D2C5", borderRadius: 4, padding: "16px 18px", fontSize: 13, fontFamily: "sans-serif", lineHeight: 1.7, color: DARK, background: "#fff", resize: "vertical", outline: "none" },
  charCount: { fontFamily: "sans-serif", fontSize: 11, color: "#8A8A8A", textAlign: "right", marginTop: 4, marginBottom: 24 },
  errorBox: { background: "#FFF0F0", border: "1px solid #F5BABA", borderLeft: `4px solid ${ACCENT}`, borderRadius: 4, padding: "12px 16px", fontFamily: "sans-serif", fontSize: 13, color: "#8B1A1A", marginBottom: 20 },
  analyzeBtn: { width: "100%", background: ACCENT, color: "#fff", border: "none", borderRadius: 4, padding: "18px 24px", fontSize: 15, fontWeight: 700, fontFamily: "sans-serif", letterSpacing: 0.5, transition: "opacity 0.2s" },
  disclaimer: { fontFamily: "sans-serif", fontSize: 11, color: "#8A8A8A", textAlign: "center", marginTop: 14 },
  resultHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 },
  resultBadge: { display: "inline-block", background: "#1c8c50", color: "#fff", fontFamily: "sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, padding: "4px 12px", borderRadius: 2, marginBottom: 8 },
  resultTitle: { fontSize: "clamp(18px, 3vw, 26px)", fontWeight: 800, color: DARK, margin: 0 },
  resetBtn: { background: "none", border: "1px solid #D9D2C5", borderRadius: 4, padding: "10px 18px", fontFamily: "sans-serif", fontSize: 13, color: "#555", cursor: "pointer" },
  outputCard: { background: DARK, borderRadius: 6, overflow: "hidden", marginBottom: 20, boxShadow: "0 6px 30px rgba(0,0,0,0.15)" },
  outputToolbar: { background: "#111", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
  termLabel: { fontFamily: "monospace", fontSize: 11, color: "#666", marginLeft: 8 },
  copyBtn: { border: "none", color: "#fff", fontFamily: "sans-serif", fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 3, cursor: "pointer" },
  cvText: { color: "#E0DDD6", fontSize: 12.5, lineHeight: 1.85, padding: "24px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'Courier New', monospace", maxHeight: 560, overflowY: "auto" },
  analysisCard: { background: "#fff", border: "1px solid #D9D2C5", borderLeft: `4px solid ${GOLD}`, borderRadius: 4, padding: 24, marginBottom: 20 },
  analysisTitle: { fontFamily: "sans-serif", fontSize: 14, fontWeight: 700, color: DARK },
  analysisText: { fontFamily: "sans-serif", fontSize: 13, color: "#3D3D3D", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  tipsRow: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 },
  tipCard: { flex: "1 1 200px", background: "#fff", border: "1px solid #D9D2C5", borderRadius: 4, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" },
  tipText: { fontFamily: "sans-serif", fontSize: 12, color: "#555", lineHeight: 1.5 },
  cintiaBox: { background: DARK, borderRadius: 6, padding: "24px 28px", color: CREAM },
  cintiaInner: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 },
  cintiaTitle: { fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, marginBottom: 6 },
  cintiaSub: { fontFamily: "sans-serif", fontSize: 12, color: "#AAAA9A", lineHeight: 1.6, maxWidth: 440 },
  cintiaBtn: { background: ACCENT, color: "#fff", textDecoration: "none", fontFamily: "sans-serif", fontWeight: 700, fontSize: 13, padding: "12px 22px", borderRadius: 3, whiteSpace: "nowrap" },
};