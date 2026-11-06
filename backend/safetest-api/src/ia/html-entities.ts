/**
 * Entidades HTML nombradas más habituales en textos académicos en español.
 *
 * La lista es deliberadamente explícita: no se interpretan entidades
 * desconocidas para no alterar contenido legítimo que contenga un `&`.
 */
const ENTIDADES_NOMBRADAS: Readonly<Record<string, string>> = {
  // Caracteres básicos
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",

  // Espacios
  nbsp: '\u00a0',
  ensp: '\u2002',
  emsp: '\u2003',
  thinsp: '\u2009',

  // Vocales acentuadas y letras del español
  aacute: 'á',
  Aacute: 'Á',
  eacute: 'é',
  Eacute: 'É',
  iacute: 'í',
  Iacute: 'Í',
  oacute: 'ó',
  Oacute: 'Ó',
  uacute: 'ú',
  Uacute: 'Ú',
  ntilde: 'ñ',
  Ntilde: 'Ñ',
  uuml: 'ü',
  Uuml: 'Ü',
  iuml: 'ï',
  Iuml: 'Ï',
  euml: 'ë',
  Euml: 'Ë',
  auml: 'ä',
  Auml: 'Ä',
  ouml: 'ö',
  Ouml: 'Ö',
  ccedil: 'ç',
  Ccedil: 'Ç',
  aring: 'å',
  Aring: 'Å',
  aelig: 'æ',
  AElig: 'Æ',
  oslash: 'ø',
  Oslash: 'Ø',
  szlig: 'ß',
  eth: 'ð',
  ETH: 'Ð',
  thorn: 'þ',
  THORN: 'Þ',

  // Signos de puntuación y apertura
  iexcl: '¡',
  iquest: '¿',
  laquo: '«',
  raquo: '»',
  lsaquo: '‹',
  rsaquo: '›',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  sbquo: '‚',
  bdquo: '„',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  bull: '•',
  middot: '·',
  sect: '§',
  para: '¶',
  dagger: '†',
  Dagger: '‡',
  permil: '‰',
  prime: '′',
  Prime: '″',

  // Símbolos académicos y matemáticos
  deg: '°',
  plusmn: '±',
  times: '×',
  divide: '÷',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  sup1: '¹',
  sup2: '²',
  sup3: '³',
  micro: 'µ',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  currency: '¤',
  brvbar: '¦',
  not: '¬',
  shy: '\u00ad',
  macr: '¯',
  acute: '´',
  uml: '¨',
  cedil: '¸',
  ordm: 'º',
  ordf: 'ª',
  infin: '∞',
  ne: '≠',
  le: '≤',
  ge: '≥',
  asymp: '≈',
  equiv: '≡',
  sum: '∑',
  prod: '∏',
  radic: '√',
  int: '∫',
  part: '∂',
  nabla: '∇',
  isin: '∈',
  notin: '∉',
  cap: '∩',
  cup: '∪',
  forall: '∀',
  exist: '∃',
  empty: '∅',

  // Letras griegas
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  omicron: 'ο',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  sigmaf: 'ς',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Alpha: 'Α',
  Beta: 'Β',
  Gamma: 'Γ',
  Delta: 'Δ',
  Epsilon: 'Ε',
  Zeta: 'Ζ',
  Eta: 'Η',
  Theta: 'Θ',
  Iota: 'Ι',
  Kappa: 'Κ',
  Lambda: 'Λ',
  Mu: 'Μ',
  Nu: 'Ν',
  Xi: 'Ξ',
  Omicron: 'Ο',
  Pi: 'Π',
  Rho: 'Ρ',
  Sigma: 'Σ',
  Tau: 'Τ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Chi: 'Χ',
  Psi: 'Ψ',
  Omega: 'Ω',

  // Flechas
  larr: '←',
  uarr: '↑',
  rarr: '→',
  darr: '↓',
  harr: '↔',
  crarr: '↵',
  lArr: '⇐',
  uArr: '⇑',
  rArr: '⇒',
  dArr: '⇓',
  hArr: '⇔',
};

/** Coincide con una entidad nombrada o numérica terminada en `;`. */
const PATRON_ENTIDAD =
  /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]+));/g;

/**
 * Decodifica una sola vez las entidades HTML de un texto generado por la IA.
 *
 * - Solo reconoce entidades terminadas en `;` y con nombre conocido.
 * - Las entidades desconocidas se dejan intactas.
 * - No analiza ni modifica etiquetas HTML: únicamente sustituye referencias.
 * - Es una sustitución de una sola pasada, por lo que no decodifica de forma
 *   recursiva (`&amp;uacute;` queda como `&uacute;`, no como `ú`).
 *
 * Debe aplicarse una única vez, en el límite de entrada del proveedor. No debe
 * volver a aplicarse sobre el mismo contenido en la capa de lectura.
 *
 * Esta función normaliza texto, no sanitiza HTML. La salida debe seguir
 * renderizándose como texto plano (React ya escapa los caracteres peligrosos).
 */
export function decodificarEntidadesHtml(texto: string): string {
  if (!texto.includes('&')) {
    return texto;
  }

  return texto.replace(
    PATRON_ENTIDAD,
    (
      coincidencia: string,
      decimal: string | undefined,
      hexadecimal: string | undefined,
      nombre: string | undefined,
    ): string => {
      if (nombre !== undefined) {
        return ENTIDADES_NOMBRADAS[nombre] ?? coincidencia;
      }

      const codigo = decimal
        ? Number(decimal)
        : Number.parseInt(hexadecimal ?? '', 16);

      return esPuntoCodigoValido(codigo)
        ? String.fromCodePoint(codigo)
        : coincidencia;
    },
  );
}

/**
 * Evita controles invisibles, sustitutos UTF-16 y puntos fuera de Unicode.
 * Se permiten tabulador, salto de línea y retorno de carro.
 */
function esPuntoCodigoValido(codigo: number): boolean {
  if (!Number.isInteger(codigo) || codigo <= 0 || codigo > 0x10ffff) {
    return false;
  }

  if (codigo >= 0xd800 && codigo <= 0xdfff) {
    return false;
  }

  if (codigo < 0x20 && codigo !== 0x09 && codigo !== 0x0a && codigo !== 0x0d) {
    return false;
  }

  return true;
}
