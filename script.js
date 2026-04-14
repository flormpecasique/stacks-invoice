/* =========================================
   STACKS INVOICE — SCRIPT
   i18n · Canvas Invoice · Share · Storage
   ========================================= */

'use strict';

/* =========================================
   STACKSPAY PROTOCOL ENGINE (SIP-029)
   Pure JS · No dependencies · Bech32m
   ========================================= */

/* --- Bech32m constants --- */
const _SP_CHARSET   = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const _SP_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const _BECH32M_CONST = 0x2bc830a3;

function _spPolymod(values) {
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= _SP_GENERATOR[i];
    }
  }
  return chk;
}

function _spHrpExpand(hrp) {
  const r = [];
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) >> 5);
  r.push(0);
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) & 31);
  return r;
}

function _spChecksum(hrp, data) {
  const values = _spHrpExpand(hrp).concat(data, [0,0,0,0,0,0]);
  const pm = _spPolymod(values) ^ _BECH32M_CONST;
  const ret = [];
  for (let i = 0; i < 6; i++) ret.push((pm >> (5 * (5 - i))) & 31);
  return ret;
}

function _spConvertBits(data, from, to) {
  let acc = 0, bits = 0;
  const ret = [], maxv = (1 << to) - 1;
  for (const v of data) {
    acc = (acc << from) | v;
    bits += from;
    while (bits >= to) { bits -= to; ret.push((acc >> bits) & maxv); }
  }
  if (bits > 0) ret.push((acc << (to - bits)) & maxv);
  return ret;
}

function _bech32mEncode(hrp, data5) {
  const combined = data5.concat(_spChecksum(hrp, data5));
  return hrp + '1' + combined.map(d => _SP_CHARSET[d]).join('');
}

/* --- Token config: decimals & SIP-010 contract addresses --- */
const TOKEN_CONFIG = {
  STX:   { decimals: 6,  contract: 'STX' },
  sBTC:  { decimals: 8,  contract: 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin' },
  NOT:   { decimals: 6,  contract: 'SP32AEEF6WW5Y0NMJ1S8SBSZDAY8R5J32NBZFPKKZ.nope' },
  WELSH: { decimals: 6,  contract: 'SP3NE50GEXFG9SZGTT51P40X2CKYSZ5CC4ZTZ7A2G.welshcorgicoin-token' },
  LEO:   { decimals: 6,  contract: 'SP1AY6K3PQV5MRT6988316ZMYY88BSKDNWZB43XS5.leo-token' },
  ALEX:  { decimals: 8,  contract: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-alex' },
};

/**
 * buildStacksPayUrl
 * Generates a web+stx:stxpay1... URL per SIP-029 spec.
 *
 * @param {string} recipient  - Stacks address (SP...)
 * @param {string} token      - 'STX' | 'sBTC' | 'NOT' | 'WELSH' | 'LEO' | 'ALEX'
 * @param {string} amount     - Human-readable amount (e.g. "2.5")
 * @param {string} description
 * @param {string} invoiceNumber
 * @param {string} dueDate    - ISO date string YYYY-MM-DD (optional)
 * @returns {string}          - Full web+stx: URL
 */
function buildStacksPayUrl({ recipient, token, amount, description, invoiceNumber, dueDate }) {
  const cfg = TOKEN_CONFIG[token] || TOKEN_CONFIG.STX;

  // Convert human amount → base units (integer, no decimals)
  const baseAmount = Math.round(parseFloat(amount) * Math.pow(10, cfg.decimals)).toString();

  const params = {
    operation:     'invoice',
    recipient,
    token:         cfg.contract,
    amount:        baseAmount,
    description:   description || '',
    invoiceNumber: invoiceNumber || '',
  };
  if (dueDate) params.dueDate = dueDate;

  // Remove empty values
  Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

  const queryString = new URLSearchParams(params).toString();

  // Encode query string bytes → 5-bit groups → Bech32m
  const bytes   = Array.from(new TextEncoder().encode(queryString));
  const bits5   = _spConvertBits(bytes, 8, 5);
  const encoded = _bech32mEncode('stxpay', bits5);

  return `web+stx:${encoded}`;
}


/* ---- i18n ---- */
const i18n = {
  en: {
    heroBadge:    'Web3 Native Invoicing',
    heroTitleLine1: 'Create Crypto Invoices',
    heroTitleLine2: 'in Seconds',
    heroSubtitle: 'Professional invoices for STX, sBTC and Stacks tokens. No signup. No fees. Instant download.',
    heroCta:      'Create your invoice ↓',
    formLabel:    'Invoice Details',
    labelToken:   'Token',
    labelFrom:    'Your Name / Company',
    labelClient:  'Client',
    optional:     '(optional)',
    labelDescription: 'Description',
    labelAmount:  'Amount',
    labelDate:    'Date',
    labelAddress: 'Stacks Address or BNS',
    labelNote:    'Note',
    btnGenerate:  'Generate Invoice',
    previewLabel: 'Preview',
    previewEmpty: 'Your invoice will appear here',
    btnDownload:  'Download',
    btnShare:     'Share',
    feat1Title: 'Instant Generation',
    feat1Desc:  'Professional invoices ready in under 3 seconds. No waiting, no loading screens.',
    feat2Title: 'No Wallet Required',
    feat2Desc:  'Enter your address only. No private keys stored, no wallet connection. 100% private.',
    feat3Title: 'QR Code Included',
    feat3Desc:  'Every invoice has a scannable QR code for any Stacks-compatible wallet payment.',
    feat4Title: '6 Tokens Supported',
    feat4Desc:  'STX, sBTC, NOT, WELSH, LEO, ALEX — the complete Stacks ecosystem in one tool.',
    faqTitle:   'Frequently Asked Questions',
    faq1Q: 'Is this free to use?',
    faq1A: 'Yes, completely free. No registration, no fees, no limits. Generate as many invoices as you need, forever.',
    faq2Q: 'Is my wallet address secure?',
    faq2A: 'Your address is only used locally in your browser to generate the QR code. We never store, transmit, or log any of your data.',
    faq3Q: 'Can I use a BNS name instead of an address?',
    faq3A: 'Yes! Enter your .btc name (e.g. flor.btc) and it will automatically resolve to your Stacks address using the Hiro public API.',
    faq4Q: 'What tokens are supported?',
    faq4A: 'Currently: STX (native token), sBTC (Bitcoin on Stacks), NOT (Notstrich), WELSH, LEO, and ALEX. Open source — contributions welcome.',
    faq5Q: 'How does the QR code payment work?',
    faq5A: 'The QR code encodes your Stacks wallet address. When scanned with any Stacks-compatible wallet (Leather, Xverse), it pre-fills the recipient field.',
    faq6Q: 'Can I use this on mobile?',
    faq6A: 'Absolutely. The tool is built mobile-first and works seamlessly on all screen sizes. Generate and share invoices directly from your phone.',
    errAmount:  'Please enter a valid amount.',
    errAddress: 'Please enter a Stacks address or BNS name.',
    errBns:     'Could not resolve BNS name. Please check it and try again.',
    errBnsApi:  'Error connecting to Hiro API. Check your connection.',
    errGeneral: 'Something went wrong. Please try again.',
    inv_title:  'INVOICE',
    inv_from:   'FROM',
    inv_to:     'CLIENT',
    inv_id:     'INVOICE #',
    inv_date:   'DATE',
    inv_desc:   'DESCRIPTION',
    inv_amount: 'AMOUNT',
    inv_total:  'TOTAL DUE',
    inv_pay:    'PAYMENT INSTRUCTIONS',
    inv_sendto: 'Send to:',
    inv_network:'Network: Stacks',
    inv_note:   'Notes',
    inv_footer: 'stacks-invoice.vercel.app',
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    copied: '✓ Copied!',
    btnPayNow:    'Pay Now',
    payNowLabel:  'StacksPay payment link',
    payNowHint:   'Opens in Leather, Xverse or any Stacks wallet',
    btnCopy:      'Copy',
  },
  es: {
    heroBadge:    'Facturación Web3 Nativa',
    heroTitleLine1: 'Crea Facturas Crypto',
    heroTitleLine2: 'en Segundos',
    heroSubtitle: 'Facturas profesionales en STX, sBTC y tokens de Stacks. Sin registro. Sin comisiones.',
    heroCta:      'Crea tu factura ↓',
    formLabel:    'Detalles de la Factura',
    labelToken:   'Token',
    labelFrom:    'Tu Nombre / Empresa',
    labelClient:  'Cliente',
    optional:     '(opcional)',
    labelDescription: 'Descripción',
    labelAmount:  'Monto',
    labelDate:    'Fecha',
    labelAddress: 'Dirección Stacks o BNS',
    labelNote:    'Nota',
    btnGenerate:  'Generar Factura',
    previewLabel: 'Vista previa',
    previewEmpty: 'Tu factura aparecerá aquí',
    btnDownload:  'Descargar',
    btnShare:     'Compartir',
    feat1Title: 'Generación Instantánea',
    feat1Desc:  'Facturas profesionales en menos de 3 segundos. Sin esperas.',
    feat2Title: 'Sin Wallet Requerida',
    feat2Desc:  'Solo tu dirección. Sin claves almacenadas. 100% privado.',
    feat3Title: 'QR Incluido',
    feat3Desc:  'Cada factura tiene un QR para cualquier wallet compatible con Stacks.',
    feat4Title: '6 Tokens Soportados',
    feat4Desc:  'STX, sBTC, NOT, WELSH, LEO, ALEX — todo el ecosistema Stacks.',
    faqTitle:   'Preguntas Frecuentes',
    faq1Q: '¿Es gratuito?',
    faq1A: 'Sí, completamente gratis. Sin registro, sin comisiones, sin límites. Genera todas las facturas que necesites.',
    faq2Q: '¿Es segura mi dirección de wallet?',
    faq2A: 'Tu dirección solo se usa localmente en tu navegador para generar el QR. No almacenamos ni transmitimos ningún dato.',
    faq3Q: '¿Puedo usar un nombre BNS en lugar de una dirección?',
    faq3A: 'Sí. Ingresa tu nombre .btc (ej. flor.btc) y se resolverá automáticamente usando la API pública de Hiro.',
    faq4Q: '¿Qué tokens están soportados?',
    faq4A: 'Actualmente: STX, sBTC, NOT, WELSH, LEO y ALEX. Proyecto open source — contribuciones bienvenidas.',
    faq5Q: '¿Cómo funciona el pago por QR?',
    faq5A: 'El QR codifica tu dirección Stacks. Al escanearlo con una wallet compatible (Leather, Xverse), prellenará el campo de destinatario.',
    faq6Q: '¿Puedo usarlo en el móvil?',
    faq6A: 'Por supuesto. La herramienta está diseñada mobile-first y funciona en cualquier tamaño de pantalla.',
    errAmount:  'Por favor ingresa un monto válido.',
    errAddress: 'Por favor ingresa una dirección Stacks o nombre BNS.',
    errBns:     'No se pudo resolver el nombre BNS. Verifica que sea correcto.',
    errBnsApi:  'Error al conectar con la API de Hiro. Verifica tu conexión.',
    errGeneral: 'Algo salió mal. Por favor intenta de nuevo.',
    inv_title:  'FACTURA',
    inv_from:   'DE',
    inv_to:     'CLIENTE',
    inv_id:     'FACTURA #',
    inv_date:   'FECHA',
    inv_desc:   'DESCRIPCIÓN',
    inv_amount: 'MONTO',
    inv_total:  'TOTAL A PAGAR',
    inv_pay:    'INSTRUCCIONES DE PAGO',
    inv_sendto: 'Enviar a:',
    inv_network:'Red: Stacks',
    inv_note:   'Notas',
    inv_footer: 'stacks-invoice.vercel.app',
    months: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    copied: '✓ Copiado!',
    btnPayNow:    'Pagar Ahora',
    payNowLabel:  'Link de pago StacksPay',
    payNowHint:   'Se abre en Leather, Xverse o cualquier wallet Stacks',
    btnCopy:      'Copiar',
  }
};

/* ---- Language Detection ---- */
let lang = navigator.language?.startsWith('es') ? 'es' : 'en';

function t(key) {
  return i18n[lang][key] ?? i18n['en'][key] ?? key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });
  document.getElementById('lang-label').textContent = lang === 'en' ? 'ES' : 'EN';
  document.documentElement.lang = lang;
}

document.getElementById('lang-toggle').addEventListener('click', () => {
  lang = lang === 'en' ? 'es' : 'en';
  applyTranslations();
  localStorage.setItem('si_lang', lang);
});

// Restore saved language
const savedLang = localStorage.getItem('si_lang');
if (savedLang && (savedLang === 'en' || savedLang === 'es')) lang = savedLang;

applyTranslations();

/* ---- Token Selector ---- */
let selectedToken = 'STX';

document.querySelectorAll('.token-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.token-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    selectedToken = btn.dataset.token;
    document.getElementById('selected-token').value = selectedToken;
    document.getElementById('amount-token').textContent = selectedToken;
    localStorage.setItem('si_token', selectedToken);
  });
});

// Restore saved token
const savedToken = localStorage.getItem('si_token');
if (savedToken) {
  const btn = document.querySelector(`.token-btn[data-token="${savedToken}"]`);
  if (btn) btn.click();
}

/* ---- Default Date ---- */
const dateEl = document.getElementById('invoice-date');
dateEl.value = new Date().toISOString().split('T')[0];

/* ---- Local Storage Persistence ---- */
const PERSIST_FIELDS = ['from-name', 'client-name', 'description', 'stacks-address', 'invoice-note'];

function saveField(id) {
  const val = document.getElementById(id)?.value;
  if (val !== undefined) localStorage.setItem(`si_${id}`, val);
}

function loadSavedFields() {
  PERSIST_FIELDS.forEach(id => {
    const saved = localStorage.getItem(`si_${id}`);
    const el = document.getElementById(id);
    if (saved && el) el.value = saved;
  });
}

PERSIST_FIELDS.forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => saveField(id));
});

loadSavedFields();

/* ---- Error Display ---- */
function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.style.display = 'block';
}
function clearError() {
  const el = document.getElementById('error-msg');
  el.style.display = 'none';
  el.textContent = '';
}

/* ---- Generate Invoice Handler ---- */
document.getElementById('generate-btn').addEventListener('click', async () => {
  clearError();
  const btn = document.getElementById('generate-btn');

  let amount = document.getElementById('amount').value.replace(',', '.').trim();
  const description = document.getElementById('description').value.trim();
  let address = document.getElementById('stacks-address').value.trim();
  const fromName = document.getElementById('from-name').value.trim() || 'Stacks User';
  const clientName = document.getElementById('client-name').value.trim();
  const note = document.getElementById('invoice-note').value.trim();
  const date = document.getElementById('invoice-date').value;

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    showError(t('errAmount')); return;
  }
  if (!address) {
    showError(t('errAddress')); return;
  }

  btn.classList.add('loading');

  let bnsName = '';
  if (address.toLowerCase().endsWith('.btc')) {
    try {
      const res = await fetch(`https://api.hiro.so/v1/names/${address.toLowerCase()}`);
      if (!res.ok) throw new Error('not ok');
      const data = await res.json();
      if (data?.address) {
        bnsName = address.toLowerCase();
        address = data.address;
      } else {
        showError(t('errBns'));
        btn.classList.remove('loading');
        return;
      }
    } catch {
      showError(t('errBnsApi'));
      btn.classList.remove('loading');
      return;
    }
  }

  try {
    await buildInvoice({ token: selectedToken, amount, description, address, bnsName, fromName, clientName, note, date });

    // Scroll to preview on mobile
    if (window.innerWidth < 900) {
      document.getElementById('invoice-output').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    console.error('Invoice generation error:', err);
    showError(t('errGeneral'));
  }

  btn.classList.remove('loading');
});

/* =========================================
   CANVAS INVOICE RENDERER
   ========================================= */
async function buildInvoice({ token, amount, description, address, bnsName, fromName, clientName, note, date }) {
  // Guard: ensure QRCode library is available
  if (typeof QRCode === 'undefined') {
    throw new Error('QRCode library not loaded. Reload the page and try again.');
  }

  const DPR = 2; // Retina / high-DPI
  const W = 800;

  // Needs explicit dimensions to measure text accurately
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = W;
  tempCanvas.height = 100;
  const tempCtx = tempCanvas.getContext('2d');
  const descLines = wrapText(tempCtx, description, 440, '400 15px -apple-system,sans-serif');
  const hasNote = !!note;
  const H = 740 + (descLines.length - 1) * 24 + (hasNote ? 74 : 0);

  const canvas = document.createElement('canvas');
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  const PAD = 44;

  /* ---- BACKGROUND ---- */
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, W, H);

  /* ---- HEADER BAND ---- */
  ctx.fillStyle = '#080810';
  ctx.fillRect(0, 0, W, 86);

  // Orange accent stripe
  ctx.fillStyle = '#FF5500';
  ctx.fillRect(0, 86, W, 3);

  // Brand
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 21px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ӿ  STACKS', PAD, 43);

  // Invoice title (right)
  ctx.fillStyle = '#FF5500';
  ctx.font = '700 21px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(t('inv_title'), W - PAD, 43);

  /* ---- META ROW (invoice ID + date) ---- */
  const invoiceId = genId();

  // Build the StacksPay payment URL (SIP-029) — used for QR + Pay Now button
  const stacksPayUrl = buildStacksPayUrl({
    recipient:     address,
    token,
    amount,
    description:   description || 'Invoice payment',
    invoiceNumber: invoiceId,
    dueDate:       date || '',
  });
  const dateStr = formatDate(date || new Date().toISOString().split('T')[0]);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#9999BB';
  ctx.font = '400 12px -apple-system,"Segoe UI",sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${t('inv_id')}${invoiceId}`, W - PAD, 122);
  ctx.fillText(`${t('inv_date')}: ${dateStr}`, W - PAD, 142);

  /* ---- FROM / CLIENT ---- */
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FF5500';
  ctx.font = '700 10px -apple-system,"Segoe UI",sans-serif';
  ctx.fillText(t('inv_from'), PAD, 118);

  ctx.fillStyle = '#111120';
  ctx.font = '600 17px -apple-system,"Segoe UI",sans-serif';
  ctx.fillText(fromName, PAD, 141);

  if (clientName) {
    const midX = W / 2;
    ctx.fillStyle = '#FF5500';
    ctx.font = '700 10px -apple-system,"Segoe UI",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('inv_to'), midX, 118);

    ctx.fillStyle = '#111120';
    ctx.font = '600 17px -apple-system,"Segoe UI",sans-serif';
    ctx.fillText(clientName, midX, 141);
    ctx.textAlign = 'left';
  }

  /* ---- SECTION DIVIDER ---- */
  let y = 166;
  drawDivider(ctx, PAD, W - PAD, y);

  /* ---- ITEMS TABLE ---- */
  y += 16;
  // Table header
  ctx.fillStyle = '#F0F0F8';
  fillRoundRect(ctx, PAD, y, W - PAD * 2, 34, 6);

  ctx.fillStyle = '#7878A0';
  ctx.font = '700 10px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(t('inv_desc'), PAD + 18, y + 22);
  ctx.textAlign = 'right';
  ctx.fillText(t('inv_amount'), W - PAD - 18, y + 22);

  y += 50;

  // Description row
  ctx.fillStyle = '#222234';
  ctx.font = '400 15px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'left';
  descLines.forEach((line, i) => ctx.fillText(line, PAD + 18, y + i * 24));

  // Amount
  ctx.fillStyle = '#111120';
  ctx.font = '600 15px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${amount} ${token}`, W - PAD - 18, y);

  y += descLines.length * 24 + 20;

  /* ---- SUBTOTAL LINE ---- */
  drawDivider(ctx, PAD, W - PAD, y);
  y += 16;

  /* ---- TOTAL BAND ---- */
  ctx.fillStyle = '#111120';
  fillRoundRect(ctx, PAD, y, W - PAD * 2, 54, 8);

  ctx.fillStyle = '#FF5500';
  ctx.font = '700 10px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(t('inv_total'), PAD + 18, y + 22);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 26px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${amount} ${token}`, W - PAD - 18, y + 38);

  y += 78;

  /* ---- PAYMENT SECTION ---- */
  ctx.fillStyle = '#FF5500';
  ctx.font = '700 10px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(t('inv_pay'), PAD, y);

  y += 14;
  drawDivider(ctx, PAD, W - PAD, y);
  y += 22;

  // Generate QR code
  const qrSize = 150;
  const qrCanvas = await makeQR(stacksPayUrl, qrSize);
  ctx.drawImage(qrCanvas, PAD, y, qrSize, qrSize);

  // Subtle QR border
  ctx.strokeStyle = '#E0E0EE';
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD, y, qrSize, qrSize);

  // Payment details (right of QR)
  const pdX = PAD + qrSize + 28;
  const pdW = W - PAD - pdX - 10;
  let pdY = y + 12;

  ctx.fillStyle = '#9999BB';
  ctx.font = '400 11px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(t('inv_sendto'), pdX, pdY);
  pdY += 20;

  if (bnsName) {
    ctx.fillStyle = '#FF5500';
    ctx.font = '600 14px -apple-system,"Segoe UI",sans-serif';
    ctx.fillText(bnsName, pdX, pdY);
    pdY += 18;
    ctx.fillStyle = '#AAAACC';
    ctx.font = `400 10px 'Courier New',monospace`;
    const addrLines = wrapText(ctx, address, pdW, `400 10px 'Courier New',monospace`);
    addrLines.forEach((line, i) => ctx.fillText(line, pdX, pdY + i * 14));
    pdY += addrLines.length * 14 + 4;
  } else {
    ctx.fillStyle = '#AAAACC';
    ctx.font = `400 10px 'Courier New',monospace`;
    const addrLines = wrapText(ctx, address, pdW, `400 10px 'Courier New',monospace`);
    addrLines.forEach((line, i) => ctx.fillText(line, pdX, pdY + i * 14));
    pdY += addrLines.length * 14 + 4;
  }

  pdY += 8;
  ctx.fillStyle = '#7878A0';
  ctx.font = '400 11px -apple-system,"Segoe UI",sans-serif';
  ctx.fillText(`${t('inv_network')} · ${token}`, pdX, pdY);
  pdY += 20;

  ctx.fillStyle = '#111120';
  ctx.font = '600 16px -apple-system,"Segoe UI",sans-serif';
  ctx.fillText(`${amount} ${token}`, pdX, pdY);

  /* ---- NOTE ---- */
  if (hasNote) {
    const noteY = y + qrSize + 20;
    ctx.fillStyle = '#F4F4FC';
    fillRoundRect(ctx, PAD, noteY, W - PAD * 2, 52, 6);

    ctx.fillStyle = '#9999BB';
    ctx.font = '400 10px -apple-system,"Segoe UI",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t('inv_note') + ':', PAD + 16, noteY + 18);

    ctx.fillStyle = '#444460';
    ctx.font = '400 13px -apple-system,"Segoe UI",sans-serif';
    ctx.fillText(note.substring(0, 90), PAD + 16, noteY + 36);
  }

  /* ---- FOOTER BAND ---- */
  ctx.fillStyle = '#0D0D1A';
  ctx.fillRect(0, H - 46, W, 46);

  // Orange left accent
  ctx.fillStyle = '#FF5500';
  ctx.fillRect(0, H - 46, 3, 46);

  ctx.fillStyle = '#FF5500';
  ctx.font = '600 13px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Ӿ', PAD, H - 17);

  ctx.fillStyle = '#44445A';
  ctx.font = '400 11px -apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t('inv_footer'), W / 2, H - 17);

  /* ---- OUTPUT ---- */
  const imgData = canvas.toDataURL('image/png', 1.0);
  const img = document.getElementById('invoice-img');
  img.src = imgData;
  img.classList.remove('invoice-reveal');
  void img.offsetWidth; // force reflow for animation restart
  img.classList.add('invoice-reveal');

  document.getElementById('preview-empty').style.display = 'none';
  const output = document.getElementById('invoice-output');
  output.style.display = 'block';

  // Cache for download/share
  window._invoiceData = imgData;
  window._stacksPayUrl = stacksPayUrl;
  wireButtons(imgData, stacksPayUrl);
}

/* =========================================
   CANVAS HELPERS
   ========================================= */
function drawDivider(ctx, x1, x2, y) {
  ctx.strokeStyle = '#E4E4EE';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function fillRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x, y + h - r,     r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r, y,          r);
  ctx.closePath();
  ctx.fill();
}

function wrapText(ctx, text, maxWidth, font) {
  const prev = ctx.font;
  ctx.font = font;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  ctx.font = prev;
  return lines.length ? lines : [''];
}

function makeQR(data, size) {
  return new Promise((resolve, reject) => {
    QRCode.toCanvas(
      data,
      { width: size, margin: 1, color: { dark: '#080810', light: '#FFFFFF' } },
      (err, c) => err ? reject(err) : resolve(c)
    );
  });
}

function genId() {
  const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => pool[Math.floor(Math.random() * pool.length)]).join('');
}

function formatDate(dateStr) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const months = t('months');
    return `${d} ${months[m - 1]} ${y}`;
  } catch {
    return dateStr;
  }
}

/* =========================================
   ACTION BUTTONS
   ========================================= */
function wireButtons(imgData, stacksPayUrl) {
  const dlBtn    = document.getElementById('btn-download');
  const payBtn   = document.getElementById('btn-paynow');
  const shareBtn = document.getElementById('btn-share');
  const waBtn    = document.getElementById('btn-whatsapp');
  const copyBtn  = document.getElementById('btn-copy-link');

  // Remove old listeners by cloning
  const newDl    = dlBtn.cloneNode(true);
  const newPay   = payBtn.cloneNode(true);
  const newShare = shareBtn.cloneNode(true);
  const newWa    = waBtn.cloneNode(true);
  const newCopy  = copyBtn.cloneNode(true);
  dlBtn.replaceWith(newDl);
  payBtn.replaceWith(newPay);
  shareBtn.replaceWith(newShare);
  waBtn.replaceWith(newWa);
  copyBtn.replaceWith(newCopy);

  // Populate + show the StacksPay link block
  const urlInput   = document.getElementById('paynow-url');
  const paynowWrap = document.getElementById('paynow-wrap');
  urlInput.value   = stacksPayUrl;
  paynowWrap.style.display = 'block';

  // Pay Now — fire a hidden <a> with the web+stx: href.
  // This triggers the OS protocol handler without navigating the page.
  // If no wallet is installed the browser silently ignores it (no error page).
  newPay.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = stacksPayUrl;
    a.style.cssText = 'position:absolute;opacity:0;pointer-events:none';
    document.body.appendChild(a);
    a.click();
    // Clean up after a tick so the click has time to fire
    setTimeout(() => document.body.removeChild(a), 300);
  });

  // Copy StacksPay link — 3-layer fallback
  newCopy.addEventListener('click', async () => {
    let success = false;

    // Layer 1: modern Clipboard API (requires HTTPS, works on desktop + iOS 13.4+)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(stacksPayUrl);
        success = true;
      } catch { /* try next */ }
    }

    // Layer 2: execCommand via a temporary <textarea> (works on Android WebView,
    //           older iOS, and any context where Clipboard API is blocked)
    if (!success) {
      try {
        const ta = document.createElement('textarea');
        ta.value = stacksPayUrl;
        // Must be visible + in viewport for iOS to allow selection
        ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;opacity:0;border:0;padding:0';
        document.body.appendChild(ta);
        ta.focus();
        ta.setSelectionRange(0, ta.value.length);
        success = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { /* try next */ }
    }

    // Layer 3: native share of just the text (last resort on mobile)
    if (!success && navigator.share) {
      try {
        await navigator.share({ title: 'StacksPay link', text: stacksPayUrl });
        success = true;
      } catch { /* silent */ }
    }

    // Visual feedback
    if (success) {
      const origHTML = newCopy.innerHTML;
      newCopy.textContent = t('copied');
      newCopy.classList.add('copied');
      setTimeout(() => { newCopy.innerHTML = origHTML; newCopy.classList.remove('copied'); }, 2200);
    }
  });

  // Download
  newDl.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `stacks-invoice-${Date.now()}.png`;
    a.href = imgData;
    a.click();
  });

  // Native share / clipboard fallback
  newShare.addEventListener('click', async () => {
    try {
      const blob = await (await fetch(imgData)).blob();
      const file = new File([blob], 'stacks-invoice.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Stacks Invoice',
          text: 'Your crypto invoice from Stacks Invoice Generator',
          files: [file]
        });
      } else {
        await copyToClipboard(blob, newShare);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        // Try clipboard as last resort
        try {
          const blob2 = await (await fetch(imgData)).blob();
          await copyToClipboard(blob2, newShare);
        } catch { /* silent */ }
      }
    }
  });

  // WhatsApp — share the actual invoice image via native share sheet (mobile)
  // or auto-download + open WhatsApp Web on desktop
  newWa.addEventListener('click', async () => {
    const origHTML = newWa.innerHTML;

    try {
      const blob = await (await fetch(imgData)).blob();
      const file = new File([blob], 'stacks-invoice.png', { type: 'image/png' });

      // Mobile: Web Share API with files → native sheet → user picks WhatsApp
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Stacks Invoice' });
        return;
      }

      // Desktop fallback: auto-download the image, then open WhatsApp Web
      // so the user can attach the saved file manually
      const a = document.createElement('a');
      a.download = 'stacks-invoice.png';
      a.href = imgData;
      a.click();

      newWa.textContent = lang === 'es' ? '↓ Imagen guardada…' : '↓ Image saved…';
      setTimeout(() => {
        newWa.innerHTML = origHTML;
        window.open('https://web.whatsapp.com', '_blank', 'noopener');
      }, 1800);

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('WhatsApp share error:', err);
        newWa.innerHTML = origHTML;
      }
    }
  });
}

async function copyToClipboard(blob, btn) {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    const origHTML = btn.innerHTML;
    btn.textContent = t('copied');
    setTimeout(() => { btn.innerHTML = origHTML; }, 2200);
  } catch {
    alert(lang === 'es'
      ? 'Usa el botón Descargar para guardar la factura.'
      : 'Use the Download button to save your invoice.');
  }
}
