// Diagnóstico de la conexión con Gemini, sin tocar la base de datos.
//
//   node --env-file=.env scripts/verificar-gemini.mjs
//
// Usa GEMINI_API_KEY y GEMINI_MODEL del .env, hace UNA solicitud mínima y, si
// falla, muestra el estado HTTP y el motivo que devuelve Google. Nunca imprime
// la clave. Lista además algunos modelos disponibles para esa clave, útil para
// elegir un GEMINI_MODEL válido.
import { GoogleGenAI } from '@google/genai';

const ocultar = (texto) =>
  String(texto ?? '')
    .replace(/(?:AIza|AQ\.)[0-9A-Za-z._-]{10,}/g, '[clave-oculta]')
    .replace(new RegExp((process.env.GEMINI_API_KEY ?? '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || '(?!)', 'g'), '[clave-oculta]')
    .slice(0, 600);

const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
const modelo = (process.env.GEMINI_MODEL ?? '').trim();

console.log('IA_PROVIDER      :', process.env.IA_PROVIDER ?? '(no definido)');
console.log('GEMINI_MODEL     :', modelo || '(no definido)');
console.log('GEMINI_API_KEY   :', apiKey ? `definida (${apiKey.length} caracteres, empieza por "${apiKey.slice(0, 4)}")` : '(VACÍA)');

if (!apiKey || !modelo) {
  console.error('\nFalta GEMINI_API_KEY o GEMINI_MODEL en el .env.');
  process.exit(1);
}
if (/["'\s]/.test(process.env.GEMINI_API_KEY ?? '')) {
  console.warn('\nAviso: la clave contiene comillas o espacios; quítalos del .env.');
}

const ai = new GoogleGenAI({ apiKey });
let codigo = 0;

try {
  const respuesta = await ai.models.generateContent({
    model: modelo,
    contents: 'Responde únicamente con la palabra: ok',
  });
  console.log('\nOK. El modelo respondió:', JSON.stringify((respuesta.text ?? '').trim().slice(0, 40)));
} catch (error) {
  codigo = 1;
  const estado = typeof error?.status === 'number' ? error.status : 'sin respuesta HTTP';
  console.error(`\nFALLÓ (HTTP ${estado}): ${ocultar(error?.message)}`);
  if (estado === 401) console.error('-> La clave no es válida o fue revocada/filtrada. Genera una nueva en Google AI Studio.');
  if (estado === 403) console.error('-> La clave existe pero no tiene permiso: revisa restricciones de la clave (IP/referrer/API), que la "Generative Language API" esté habilitada en su proyecto, o que no esté bloqueada por filtración.');
  if (estado === 404) console.error('-> El modelo no existe para esta clave. Usa uno de la lista de abajo en GEMINI_MODEL.');
  if (estado === 429) console.error('-> Cuota o límite de solicitudes agotado.');
}

try {
  const nombres = [];
  for await (const m of await ai.models.list()) {
    if (typeof m?.name === 'string' && m.name.includes('gemini')) nombres.push(m.name.replace(/^models\//, ''));
    if (nombres.length >= 25) break;
  }
  console.log('\nModelos "gemini" visibles con esta clave:', nombres.length ? '\n  - ' + nombres.join('\n  - ') : '(ninguno)');
} catch (error) {
  console.log('\nNo se pudo listar modelos:', ocultar(error?.message));
}

process.exit(codigo);
