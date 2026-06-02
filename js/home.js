/* ── Region pricing toggle ── */
const prices = {
  'Africa':        { starter: 79,    professional: 249,   enterprise: null },
  'India':         { starter: 9999,  professional: 34999, enterprise: null },
  'Rest of World': { starter: 149,   professional: 499,   enterprise: null },
};
const symbols = { 'Africa': '$', 'India': '₹', 'Rest of World': '$' };

function applyPricing(region) {
  const p = prices[region];
  const sym = symbols[region];
  const keys = ['starter', 'professional', 'enterprise'];
  document.querySelectorAll('.pricing-card').forEach((card, i) => {
    const val = p[keys[i]];
    if (val === null) return;
    card.querySelector('.pc-sym').textContent = sym;
    card.querySelector('.pc-val').textContent = val.toLocaleString();
  });
}

const regionBtns = document.querySelectorAll('.region-btn');
const activeBtn  = document.querySelector('.region-btn.active');
if (activeBtn) applyPricing(activeBtn.textContent.trim());

regionBtns.forEach(btn => btn.addEventListener('click', () => {
  regionBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyPricing(btn.textContent.trim());
}));

/* ── Mock bar cursor ── */
document.querySelectorAll('.mock-bar').forEach(bar => {
  bar.style.cursor = 'default';
});
