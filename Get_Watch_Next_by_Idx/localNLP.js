// localNLP.js
// Estrae "keyphrases" dal testo usando compromise.
// Ritorna { KeyPhrases: [...] }

const nlp = require('compromise');

function analyzeKeyPhrases(text = '') {
  const doc = nlp(text || '');

  // sostantivi (singoli) + composti frequenti
  const nouns = doc.nouns().toLowerCase().out('array').map(s => s.trim());
  // prova a prendere anche alcuni composti tipo "virtual reality", "social justice"
  const compounds = doc.nouns().terms().out('array')
    .map(s => s.toLowerCase())
    .filter(s => s.includes(' '));

  const merged = [...nouns, ...compounds]
    .filter(s => s && s.length >= 3);

  // dedup e limite
  const unique = [...new Set(merged)].slice(0, 30);

  return { KeyPhrases: unique };
}

module.exports = analyzeKeyPhrases;
