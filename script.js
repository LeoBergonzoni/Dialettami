// Dialettami — Script principale
// IMPORTANTE: Non esporre la tua API key nel front-end.
// - In locale puoi creare un file .env e una funzione server che legge process.env.OPENAI_API_KEY
// - In produzione su Netlify, configura un'Environment Variable OPENAI_API_KEY
// - Imposta API_PROXY_URL alla tua funzione server (es. '/.netlify/functions/dialettami')

const API_PROXY_URL = '/.netlify/functions/dialettami'; // 👈 cambia/crea questa route lato server
// In alternativa (solo per test locali e NON in produzione) puoi temporaneamente usare l'endpoint diretto OpenAI.
// ⚠️ SCONSIGLIATO: la key sarebbe visibile a chiunque.
// const OPENAI_API_KEY = 'INSERISCI_LA_TUA_KEY_SOLO_PER_TEST (sconsigliato)';
// const DIRECT_OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const el = (id) => document.getElementById(id);
const $ = (sel) => document.querySelector(sel);

const translationEl = el('translation');
const explanationEl = el('explanation');
const btn = el('btn');

// Modalità
const formItToDia = el('form-it-to-dia');
const formDiaToIt = el('form-dia-to-it');

// Toggle pills
const pillItToDia = el('mode-it-to-dialetto');
const pillDiaToIt = el('mode-dialetto-to-it');

function setMode(mode){
  const itToDia = mode === 'it_to_dia';
  formItToDia.classList.toggle('hidden', !itToDia);
  formDiaToIt.classList.toggle('hidden', itToDia);
  pillItToDia.classList.toggle('active', itToDia);
  pillDiaToIt.classList.toggle('active', !itToDia);
}

// Iniziale
setMode('it_to_dia');

// Eventi
pillItToDia.addEventListener('click', ()=> setMode('it_to_dia'));
pillDiaToIt.addEventListener('click', ()=> setMode('dia_to_it'));

document.querySelectorAll('.copy').forEach(btn => {
  btn.addEventListener('click', async () => {
    const target = btn.getAttribute('data-target');
    const text = el(target).innerText.trim();
    if (!text) return;
    try{
      await navigator.clipboard.writeText(text);
      const old = btn.innerText;
      btn.innerText = 'Copiato!';
      setTimeout(()=> btn.innerText = old, 1000);
    }catch(e){
      alert('Copia non riuscita: ' + e.message);
    }
  });
});

btn.addEventListener('click', async () => {
  // Resetta output
  translationEl.textContent = '⏳ Sto generando la traduzione...';
  explanationEl.textContent = '…';

  const isItToDia = !formItToDia.classList.contains('hidden');

  if(isItToDia){
    const phrase = el('text-it').value.trim();
    const dialect = el('dialect').value;
    if(!phrase){
      translationEl.textContent = 'Per favore inserisci una frase da tradurre.';
      explanationEl.textContent = '';
      return;
    }
    const prompt = `Riformula questa frase "${phrase}" nel dialetto italiano "${dialect}" nella maniera più accurata possibile. ` +
                   `Mostrami la frase tradotta e, in maniera separata dalla traduzione, anche una breve spiegazione dei singoli termini tradotti. ` +
                   `Rispondi nel formato esatto:\nTRADUZIONE:\n<testo>\n\nSPIEGAZIONE:\n<elenco puntato breve>`;
    await askAI(prompt);
  } else {
    const phrase = el('text-dia').value.trim();
    if(!phrase){
      translationEl.textContent = 'Per favore inserisci una frase da tradurre.';
      explanationEl.textContent = '';
      return;
    }
    const prompt = `Riformula questa frase "${phrase}" scritta in dialetto in un italiano corretto nella maniera più accurata e formale possibile. ` +
                   `Mostrami la frase in italiano corretto e, in maniera separata dalla traduzione, anche una breve spiegazione dei singoli termini che hai tradotto dal dialetto e dimmi da quale dialetto vengono. ` +
                   `Rispondi nel formato esatto:\nTRADUZIONE:\n<testo>\n\nSPIEGAZIONE:\n<elenco puntato breve>`;
    await askAI(prompt);
  }
});

async function askAI(prompt){
  try{
    // Chiamata tramite proxy server (Netlify Function consigliata)
    const res = await fetch(API_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if(!res.ok){
      const errText = await res.text();
      throw new Error(errText || 'Errore di rete');
    }
    const data = await res.json();
    // data.output dovrebbe contenere il testo completo con "TRADUZIONE:" e "SPIEGAZIONE:"
    parseAndRender(data.output);
  }catch(err){
    // Fallback: mostra errore
    translationEl.textContent = 'Si è verificato un errore nel generare la traduzione.';
    explanationEl.textContent = (err && err.message) ? err.message : String(err);
  }
}

function parseAndRender(text){
  // Tenta di dividere in base ai marcatori richiesti
  const parts = splitSections(text);
  translationEl.textContent = parts.translation || '—';
  explanationEl.textContent = parts.explanation || '—';
}

function splitSections(text){
  // Cerca 'TRADUZIONE:' e 'SPIEGAZIONE:' indipendentemente da maiuscole/minuscole
  const regex = /TRADUZIONE\s*:\s*([\s\S]*?)(?:\n{2,}|\r{2,}|$)SPIEGAZIONE\s*:\s*([\s\S]*)/i;
  const m = text.match(regex);
  if(m){
    return {
      translation: m[1].trim(),
      explanation: m[2].trim()
    };
  }
  // fallback molto semplice: se non trova marcatori, mostra tutto come traduzione
  return { translation: text.trim(), explanation: '' };
}

// ------------------------------
// ESEMPIO DI FUNZIONE SERVER (Netlify) — DA CREARE A PARTE
// File: netlify/functions/dialettami.js
// 1) netlify.toml =>
//    [functions]
//    node_bundler = "esbuild"
// 2) Imposta la variabile d'ambiente OPENAI_API_KEY nel progetto Netlify
//
// exports.handler = async (event) => {
//   try{
//     const { prompt } = JSON.parse(event.body || '{}');
//     if(!prompt) return { statusCode: 400, body: 'prompt mancante' };
//
//     const resp = await fetch('https://api.openai.com/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
//       },
//       body: JSON.stringify({
//         model: 'gpt-4o-mini', // o altro modello compatibile
//         messages: [
//           { role: 'system', content: 'Sei un esperto di dialetti italiani. Rispondi in modo chiaro e con formato richiesto.' },
//           { role: 'user', content: prompt }
//         ],
//         temperature: 0.4
//       })
//     });
//     if(!resp.ok){
//       const t = await resp.text();
//       return { statusCode: resp.status, body: t };
//     }
//     const json = await resp.json();
//     const output = json.choices?.[0]?.message?.content || '';
//     return { statusCode: 200, body: JSON.stringify({ output }) };
//   }catch(e){
//     return { statusCode: 500, body: String(e) };
//   }
// };
// ------------------------------
