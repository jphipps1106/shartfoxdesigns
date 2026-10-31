// ShartFox Designs — the silly bits
// Wrapped in its own scope: main.js already declares top-level `toggle` and `form`.
(() => {
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const POOPS = ['\u{1F4A9}', '\u{1F4A9}', '\u{1F4A9}', '\u{1F9FB}', '\u{1F6BD}'];
const pick = a => a[Math.floor(Math.random() * a.length)];

// --- Sound: a synthesized "pfffft". Off by default, toggled with the toilet button (remembered per browser).
let soundOn = false;
try { soundOn = localStorage.getItem('shart-sound') === 'on'; } catch {}
let ctx;
function fart() {
  if (!soundOn) return;
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime, dur = 0.35 + Math.random() * 0.45;
  // brown-ish noise
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 3.5; }
  const noise = ctx.createBufferSource(); noise.buffer = buf;
  // a low buzzing tone, flapping in pitch
  const osc = ctx.createOscillator(); osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(70 + Math.random() * 40, now);
  osc.frequency.exponentialRampToValueAtTime(40 + Math.random() * 20, now + dur);
  const flap = ctx.createOscillator(); flap.frequency.value = 18 + Math.random() * 14;
  const flapGain = ctx.createGain(); flapGain.gain.value = 25;
  flap.connect(flapGain).connect(osc.frequency);
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 420; filter.Q.value = 6;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  const toneMix = ctx.createGain(); toneMix.gain.value = 0.35;
  noise.connect(filter); osc.connect(toneMix).connect(filter);
  filter.connect(amp).connect(ctx.destination);
  [noise, osc, flap].forEach(n => { n.start(now); n.stop(now + dur); });
}

const toggle = document.createElement('button');
toggle.className = 'sound-toggle';
const paintToggle = () => {
  toggle.textContent = soundOn ? '\u{1F50A}' : '\u{1F507}';
  toggle.setAttribute('aria-label', soundOn ? 'Turn fart sounds off' : 'Turn fart sounds on');
  toggle.title = toggle.getAttribute('aria-label');
};
paintToggle();
toggle.addEventListener('click', e => {
  e.stopPropagation();
  soundOn = !soundOn;
  try { localStorage.setItem('shart-sound', soundOn ? 'on' : 'off'); } catch {}
  paintToggle();
  fart();
});
document.body.append(toggle);

// --- Click anywhere: a poop pops out
function plop(x, y) {
  const el = document.createElement('span');
  el.className = 'poop click';
  el.textContent = pick(POOPS);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.fontSize = 26 + Math.random() * 22 + 'px';
  el.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
  el.style.setProperty('--r', (Math.random() * 60 - 30) + 'deg');
  document.body.append(el);
  el.addEventListener('animationend', () => el.remove());
}
document.addEventListener('click', e => {
  if (e.target === toggle) return;
  if (!reduceMotion) plop(e.clientX, e.clientY);
  if (e.target.closest('.btn, .nav a, .gallery button, .logo')) fart();
});

// --- Gentle poop rain
if (!reduceMotion) {
  const rain = () => {
    if (document.hidden || document.querySelectorAll('.poop.rain').length > 8) return;
    const el = document.createElement('span');
    el.className = 'poop rain';
    el.textContent = pick(POOPS);
    el.style.left = Math.random() * 96 + 'vw';
    el.style.fontSize = 18 + Math.random() * 26 + 'px';
    el.style.animationDuration = 6 + Math.random() * 6 + 's';
    el.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    document.body.append(el);
    el.addEventListener('animationend', () => el.remove());
  };
  setInterval(rain, 1400);
}

// --- Tab title changes when you leave
const realTitle = document.title;
document.addEventListener('visibilitychange', () => {
  document.title = document.hidden ? '\u{1F4A9} Hold it in... come back!' : realTitle;
});

// --- Contact form: a parody shouldn't send anything anywhere
const form = document.querySelector('#contact-form');
if (form) {
  // Capture on document so this runs before main.js's handler on the form
  document.addEventListener('submit', e => {
    if (e.target !== form) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    form.querySelector('.form-status').textContent = '\u{1F6BD} *FLUSH* Your message has been sent... down the drain. (This is a parody site. Nothing was sent.)';
    form.reset();
  }, true);
}
})();
