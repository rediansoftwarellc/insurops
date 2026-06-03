/* ═══════════════════════════════════════════
   reCAPTCHA v3 — Site Key
   ➜ Get your keys at: https://www.google.com/recaptcha/admin/create
     • Choose "reCAPTCHA v3"
     • Add your domains (insurops.tech + localhost)
     • Put the SITE key here, SECRET key in .env (RECAPTCHA_SECRET)
═══════════════════════════════════════════ */
const RECAPTCHA_SITE_KEY = '6LccIgotAAAAAAsKbZ8tvGvjkw_2BsZ-zgudK6Mf';

/* Load reCAPTCHA v3 script dynamically (works on all pages without touching HTML) */
(function loadRecaptcha() {
  if (!RECAPTCHA_SITE_KEY || RECAPTCHA_SITE_KEY.startsWith('YOUR_')) return;
  const s = document.createElement('script');
  s.src   = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
  s.async = true;
  document.head.appendChild(s);
})();

/* Get a reCAPTCHA v3 token (resolves '' if reCAPTCHA not loaded) */
function getRecaptchaToken(action) {
  return new Promise(resolve => {
    if (!window.grecaptcha || !RECAPTCHA_SITE_KEY || RECAPTCHA_SITE_KEY.startsWith('YOUR_')) {
      resolve(''); return;
    }
    grecaptcha.ready(() => {
      grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve).catch(() => resolve(''));
    });
  });
}

/* ─────────────────────────────────────────
   Count-up animation
───────────────────────────────────────── */
function runCountUp(el) {
  const target   = parseFloat(el.dataset.countTo);
  const suffix   = el.dataset.countSuffix  || '';
  const prefix   = el.dataset.countPrefix  || '';
  const useComma = el.dataset.countComma   === 'true';
  const decimals = el.dataset.countDecimal ? parseInt(el.dataset.countDecimal, 10) : 0;
  const duration = 1600;
  const startTs  = performance.now();

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function tick(now) {
    const progress = Math.min((now - startTs) / duration, 1);
    const raw      = easeOut(progress) * target;
    let display;
    if (decimals > 0) {
      display = raw.toFixed(decimals);
    } else {
      const rounded = Math.round(raw);
      display = useComma ? rounded.toLocaleString() : String(rounded);
    }
    el.textContent = prefix + display + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Hero trust metrics — fire after fade-in delay (~0.68s in CSS)
const heroCountEls = document.querySelectorAll('.hero-trust [data-count-to]');
if (heroCountEls.length) {
  setTimeout(() => heroCountEls.forEach(runCountUp), 750);
}

// Dashboard mockup numbers — fire after mockup slides in (~1.2s)
const mockCountEls = document.querySelectorAll('.hero-mockup [data-count-to]');
if (mockCountEls.length) {
  setTimeout(() => mockCountEls.forEach(runCountUp), 1200);
}

// Bar chart grow-in — bars start at 0, animate up with stagger
const bars = document.querySelectorAll('.mock-bar[data-h]');
if (bars.length) {
  bars.forEach(b => { b.style.height = '0'; });
  setTimeout(() => {
    bars.forEach((b, i) => {
      setTimeout(() => { b.style.height = b.dataset.h; }, i * 55);
    });
  }, 1050);
}

/* ─────────────────────────────────────────
   Mobile nav burger
───────────────────────────────────────── */
const burger = document.getElementById('nav-burger');
const navEl  = document.querySelector('.nav');
if (burger && navEl) {
  burger.addEventListener('click', () => navEl.classList.toggle('open'));
  document.querySelectorAll('.nav-link').forEach(link =>
    link.addEventListener('click', () => navEl.classList.remove('open'))
  );
  document.addEventListener('click', e => {
    if (navEl.classList.contains('open') && !navEl.contains(e.target))
      navEl.classList.remove('open');
  });
}

/* ─────────────────────────────────────────
   Scroll fade-in
───────────────────────────────────────── */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fade-up').forEach(el => io.observe(el));

/* ─────────────────────────────────────────
   Nav scroll effect
───────────────────────────────────────── */
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.style.background = window.scrollY > 20
    ? 'rgba(6, 14, 30, 0.97)'
    : 'rgba(6, 14, 30, 0.92)';
}, { passive: true });

/* ─────────────────────────────────────────
   Modal helpers
───────────────────────────────────────── */
function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});
document.querySelectorAll('[data-modal-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modalClose));
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(o => closeModal(o.id));
  }
});

/* ─────────────────────────────────────────
   Form helpers
───────────────────────────────────────── */
function collectForm(formEl) {
  const data = {};
  new FormData(formEl).forEach((v, k) => { data[k] = v.trim(); });
  return data;
}

function validateForm(formEl) {
  let ok = true;
  formEl.querySelectorAll('[required]').forEach(el => {
    el.style.borderColor = '';
    if (!el.value.trim()) { el.style.borderColor = '#EF4444'; ok = false; }
  });
  return ok;
}

/* Show inline error message below the form footer */
function showFormError(formEl, message) {
  // Remove any existing error
  const old = formEl.querySelector('.form-api-error');
  if (old) old.remove();

  const p = document.createElement('p');
  p.className   = 'form-api-error';
  p.textContent = message;
  p.style.cssText = [
    'color:#EF4444', 'font-size:0.84rem', 'margin-top:10px',
    'padding:10px 14px', 'background:#FEF2F2', 'border:1px solid #FECACA',
    'border-radius:8px', 'line-height:1.5'
  ].join(';');
  formEl.querySelector('.form-footer').insertAdjacentElement('afterend', p);
}

/* ─────────────────────────────────────────
   Core SMTP form submit handler
   type: 'demo' | 'partner'
───────────────────────────────────────── */
async function handleFormSubmit(formEl, type) {
  if (!validateForm(formEl)) return;

  const btn      = formEl.querySelector('[type="submit"]');
  const origText = btn.textContent;
  btn.disabled   = true;
  btn.textContent = 'Sending…';

  // Clear any previous error
  const old = formEl.querySelector('.form-api-error');
  if (old) old.remove();

  try {
    // reCAPTCHA v3 token (invisible — no user interaction needed)
    const recaptchaToken = await getRecaptchaToken('submit_' + type);

    const payload = {
      type,
      recaptchaToken,
      ...collectForm(formEl)
    };

    const res    = await fetch('/api/send.php', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.ok) {
      // Success — show success panel (existing HTML state classes)
      const formPanel    = document.getElementById(`${type}-form`);
      const successPanel = document.getElementById(`${type}-success`);
      if (formPanel)    formPanel.classList.add('hide');
      if (successPanel) successPanel.classList.add('show');
    } else {
      throw new Error(result.error || 'Submission failed. Please try again.');
    }
  } catch (err) {
    btn.disabled    = false;
    btn.textContent = origText;
    showFormError(formEl, err.message || 'Something went wrong. Please try again.');
  }
}

/* ─────────────────────────────────────────
   Wire up forms
───────────────────────────────────────── */
const formDemo = document.getElementById('form-demo');
if (formDemo) {
  formDemo.addEventListener('submit', function (e) {
    e.preventDefault();
    handleFormSubmit(this, 'demo');
  });
}

const formPartner = document.getElementById('form-partner');
if (formPartner) {
  formPartner.addEventListener('submit', function (e) {
    e.preventDefault();
    handleFormSubmit(this, 'partner');
  });
}
