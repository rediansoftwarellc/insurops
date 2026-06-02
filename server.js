'use strict';
require('dotenv').config();

const express    = require('express');
const nodemailer = require('nodemailer');
const rateLimit  = require('express-rate-limit');
const https      = require('https');
const path       = require('path');
const qs         = require('querystring');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

/* ─────────────────────────────────────────
   Rate limiter — 10 submissions per IP / 15 min
───────────────────────────────────────── */
const submitLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,
  max      : 10,
  standardHeaders: true,
  legacyHeaders  : false,
  message  : { ok: false, error: 'Too many submissions. Please try again in a few minutes.' }
});

/* ─────────────────────────────────────────
   reCAPTCHA v3 verification
───────────────────────────────────────── */
function verifyRecaptcha(token) {
  return new Promise((resolve) => {
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret || !token) { resolve(false); return; }

    const body = qs.stringify({ secret, response: token });
    const opts = {
      hostname: 'www.google.com',
      path    : '/recaptcha/api/siteverify',
      method  : 'POST',
      headers : {
        'Content-Type'  : 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Accept if score ≥ 0.5 (or score absent for v2 fallback)
          const passed = json.success && (json.score === undefined || json.score >= 0.5);
          resolve(passed);
        } catch { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

/* ─────────────────────────────────────────
   Nodemailer transporter (created fresh each send so env changes are picked up)
───────────────────────────────────────── */
function makeTransporter() {
  return nodemailer.createTransport({
    host  : process.env.SMTP_HOST,
    port  : parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',   // true = port 465, false = STARTTLS
    auth  : {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/* ─────────────────────────────────────────
   HTML email builder
───────────────────────────────────────── */
function buildEmail(type, fields) {
  const isDemo    = type === 'demo';
  const subject   = isDemo
    ? `InsurOps Demo Request — ${fields.company || fields.name}`
    : `InsurOps Partner Application — ${fields.company || fields.name}`;

  const labelMap = {
    name        : 'Full Name',
    email       : 'Email',
    company     : isDemo ? 'Company' : 'Insurer / Company',
    phone       : 'Phone',
    country     : isDemo ? 'Country' : 'Primary Market',
    size        : 'Team Size',
    role        : 'Role',
    insurer_type: 'Type of Insurer',
    gwp         : 'Annual GWP',
    num_products: 'No. of Products',
    source      : 'How They Heard',
    message     : isDemo ? 'Goals' : 'Partnership Goals'
  };

  const rows = Object.entries(fields)
    .filter(([k, v]) => v && v.toString().trim())
    .map(([k, v]) => {
      const label = labelMap[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `
        <tr>
          <td style="padding:10px 16px;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f1f5f9">${label}</td>
          <td style="padding:10px 16px;font-size:13px;color:#0f172a;vertical-align:top;border-bottom:1px solid #f1f5f9"><strong>${v}</strong></td>
        </tr>`;
    }).join('');

  const plainText = Object.entries(fields)
    .filter(([, v]) => v && v.toString().trim())
    .map(([k, v]) => {
      const label = labelMap[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `${label}: ${v}`;
    }).join('\n');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:#060E1E;padding:24px 28px;border-radius:10px 10px 0 0">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#3B82F6;margin-bottom:8px">
        ${isDemo ? 'New Demo Request' : 'New Partner Application'}
      </div>
      <h1 style="margin:0;font-size:18px;font-weight:800;color:white;letter-spacing:-0.3px">${subject}</h1>
    </div>
    <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px">
      ${rows}
    </table>
    <p style="margin-top:16px;font-size:11px;color:#94a3b8;text-align:center">
      Submitted via insurops.tech · Reply-To: ${fields.email || '—'}
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text: `${subject}\n\n${plainText}\n\nSubmitted via insurops.tech` };
}

/* ─────────────────────────────────────────
   POST /api/send
   Body: { type: 'demo'|'partner', recaptchaToken, ...fields }
───────────────────────────────────────── */
app.post('/api/send', submitLimiter, async (req, res) => {
  const { type, recaptchaToken, ...fields } = req.body || {};

  // Basic validation
  if (!['demo', 'partner'].includes(type)) {
    return res.status(400).json({ ok: false, error: 'Invalid form type.' });
  }
  if (!fields.name || !fields.email || !fields.company) {
    return res.status(400).json({ ok: false, error: 'Missing required fields.' });
  }

  // reCAPTCHA verification (skip if secret not configured — useful for local dev)
  if (process.env.RECAPTCHA_SECRET) {
    const ok = await verifyRecaptcha(recaptchaToken);
    if (!ok) {
      return res.status(400).json({ ok: false, error: 'Security check failed. Please refresh and try again.' });
    }
  }

  const to = process.env.SMTP_TO || 'hello@insurops.tech';
  const { subject, html, text } = buildEmail(type, fields);

  try {
    const transporter = makeTransporter();
    await transporter.sendMail({
      from   : `"InsurOps Website" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      replyTo: fields.email,
      subject,
      text,
      html
    });
    console.log(`[${new Date().toISOString()}] Email sent: ${subject}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] SMTP error:`, err.message);
    res.status(500).json({ ok: false, error: 'Could not send email. Please try again shortly.' });
  }
});

/* ─────────────────────────────────────────
   Clean URL routing  (mirrors .htaccess rewrite rules)
───────────────────────────────────────── */
const PAGES = ['brokers', 'insurers', 'integration', 'pricing', 'partners'];
PAGES.forEach(page => {
  app.get(`/${page}`, (_req, res) =>
    res.sendFile(path.join(__dirname, `${page}.html`))
  );
  // Also handle trailing slash
  app.get(`/${page}/`, (_req, res) =>
    res.redirect(301, `/${page}`)
  );
});

// Home
app.get('/', (_req, res) =>
  res.sendFile(path.join(__dirname, 'index.html'))
);

/* ─────────────────────────────────────────
   Static assets (CSS, JS, images, fonts)
───────────────────────────────────────── */
app.use(express.static(__dirname, {
  maxAge : process.env.NODE_ENV === 'production' ? '1y' : 0,
  index  : false,           // prevent directory listing
  dotfiles: 'deny'
}));

/* ─────────────────────────────────────────
   404 fallback
───────────────────────────────────────── */
app.use((_req, res) => {
  const f = path.join(__dirname, '404.html');
  res.status(404).sendFile(f, () => {
    res.status(404).send('<h1>404 — Page not found</h1>');
  });
});

/* ─────────────────────────────────────────
   Start
───────────────────────────────────────── */
const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, () => {
  console.log(`\n  InsurOps server  →  http://localhost:${PORT}\n`);
});
