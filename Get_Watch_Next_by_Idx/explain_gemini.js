// explain_gemini.js
// Genera una spiegazione "perché è suggerito?" usando Google Gemini API.
// Requisiti: GEMINI_API_KEY (da AI Studio), (opz.) GEMINI_MODEL = gemini-1.5-flash

require('dotenv').config({ path: './variables.env' });

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const API_KEY = process.env.GEMINI_API_KEY;

// NLP locale per keyphrase (usa compromise)
const analyzeKeyPhrases = require('./localNLP');

// ----------------- helpers -----------------
const norm = s => String(s || '').trim().toLowerCase();

function toArrayTags(t) {
  if (!t) return [];
  if (Array.isArray(t)) return t.map(norm).filter(Boolean);
  return String(t).split(',').map(norm).filter(Boolean);
}

function intersect(a = [], b = []) {
  if (!a.length || !b.length) return [];
  const B = new Set(b);
  return a.filter(x => B.has(x));
}

function clip(text, max = 2000) { return (text || '').slice(0, max); }
// -------------------------------------------

async function callGemini(prompt, model = DEFAULT_MODEL) {
  if (!API_KEY) throw new Error('GEMINI_API_KEY missing');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        // chiediamo direttamente output JSON
        responseMimeType: "application/json"
      }
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  // testo JSON restituito dal modello
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

function buildPrompt(current, candidate) {
  const titleA = current?.title || '';
  const titleB = candidate?.data?.title || candidate?.title || '';
  const tagsA  = (current?.tags || []).join(', ');
  const tagsB  = (candidate?.data?.tags || candidate?.tags || []).join(', ');
  const descA  = clip(current?.description);
  const descB  = clip(candidate?.data?.description || candidate?.description);

  return `Sei un sistema di raccomandazione TEDx.
Confronta Talk A e Talk B e spiega brevemente PERCHE' B è suggerito dopo A.

Talk A: "${titleA}"
Tag A: ${tagsA || '—'}
Descrizione A: ${descA || '—'}

Talk B: "${titleB}"
Tag B: ${tagsB || '—'}
Descrizione B: ${descB || '—'}

Fornisci SOLO un JSON con le seguenti chiavi:
- "details": stringa breve (max 200 caratteri).
- "reasons": array di 3 bullet sintetici.
- "score": numero 0..1 che rifletta la similarità percepita.`;
}

async function explainWithGemini(current, candidate) {
  // ---- 1) calcolo overlaps locali (tag + keyphrases) ----
  const tagsA = toArrayTags(current?.tags);
  const tagsB = toArrayTags(candidate?.data?.tags || candidate?.tags);
  const tagOverlap = intersect(tagsA, tagsB).slice(0, 10);

  const textA = `${current?.title || ''}. ${current?.description || ''}`;
  const textB = `${candidate?.data?.title || candidate?.title || ''}. ${candidate?.data?.description || candidate?.description || ''}`;

  const kpA = (analyzeKeyPhrases(textA).KeyPhrases || []).map(norm);
  const kpB = (analyzeKeyPhrases(textB).KeyPhrases || []).map(norm);
  const kpOverlap = intersect(kpA, kpB).slice(0, 10);

  // ---- 2) spiegazione LLM (Gemini) ----
  const prompt = buildPrompt(current, candidate);

  let parsed;
  try {
    const raw = await callGemini(prompt);
    parsed = JSON.parse(raw);
  } catch {
    // fallback robusto: se il modello non restituisce JSON valido
    parsed = {
      details: 'suggerito per similarità (calcolo locale)',
      reasons: [],
      score: tagOverlap.length || kpOverlap.length ? 0.7 : 0.4
    };
  }

  return {
    score: Math.max(0, Math.min(1, Number(parsed.score ?? (tagOverlap.length || kpOverlap.length ? 0.7 : 0.4)))),
    details: parsed.details || 'suggerito per similarità (calcolo locale)',
    overlaps: {
      tags: tagOverlap,
      keyphrases: kpOverlap
    },
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 3) : []
  };
}

module.exports = { explainWithGemini };