<?php
// ═══════════════════════════════════════════
//  InsurOps — Configuration
//  Keep this file OUTSIDE public access or
//  protected by .htaccess (already done).
//  DO NOT commit this file to git.
// ═══════════════════════════════════════════

// ── SMTP — ZeptoMail ─────────────────────
define('SMTP_HOST',      'smtp.zeptomail.in');
define('SMTP_PORT',      587);
define('SMTP_SECURE',    'tls');          // 'tls' = STARTTLS on 587 | 'ssl' = port 465
define('SMTP_USER',      'emailapikey');
define('SMTP_PASS',      'PHtE6r0MF7jp2WUrpkQJ5qLtR8WnMdsu9b40fwhH445ECfJQGk0Dr499mje3rEwjXaFBE6KTwYs55enJ5uOMdznlM2lND2qyqK3sx/VYSPOZsbq6x00euF0SdEbeV4/sdN5p1CDVudbbNA==');
define('SMTP_FROM',      'enquiry@rediansoftware.com');
define('SMTP_FROM_NAME', 'InsurOps Website');
define('SMTP_TO',        'hello@insurops.tech');

// ── Google reCAPTCHA v3 ──────────────────
// Get keys at: https://www.google.com/recaptcha/admin/create
// Site key goes in js/main.js — Secret key goes here
define('RECAPTCHA_SECRET', '');   // ← paste your secret key

// ── Rate limiting ────────────────────────
define('RATE_LIMIT_MAX',    10);   // max submissions per IP
define('RATE_LIMIT_WINDOW', 900);  // time window in seconds (15 min)
