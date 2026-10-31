// ShartFox Designs — the silly bits
// Wrapped in its own scope: main.js already declares top-level `toggle`.
(() => {
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const POOPS = ['\u{1F4A9}', '\u{1F4A9}', '\u{1F4A9}', '\u{1F9FB}', '\u{1F6BD}'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);

// --- "Social" links: every click goes somewhere poop-related, never the same place twice in a row
const POOP_LINKS = [
  'https://en.wikipedia.org/wiki/Feces',
  'https://en.wikipedia.org/wiki/Flatulence',
  'https://en.wikipedia.org/wiki/Pile_of_Poo_emoji',
  'https://en.wikipedia.org/wiki/Bristol_stool_scale',
  'https://en.wikipedia.org/wiki/Le_P%C3%A9tomane',
  'https://en.wikipedia.org/wiki/Whoopee_cushion',
  'https://en.wikipedia.org/wiki/Dung_beetle',
  'https://en.wikipedia.org/wiki/Coprolite',
  'https://en.wikipedia.org/wiki/Toilet_paper',
  'https://en.wikipedia.org/wiki/Flush_toilet',
  'https://en.wikipedia.org/wiki/Mr._Hankey,_the_Christmas_Poo',
  'https://en.wikipedia.org/wiki/Cow_dung',
];
document.querySelectorAll('a.poop-link').forEach(a => {
  const reroll = () => {
    let next;
    do { next = pick(POOP_LINKS); } while (next === a.href);
    a.href = next;
  };
  reroll();
  // the default navigation reads href after this runs, so each click lands somewhere new
  a.addEventListener('click', reroll);
});

// --- Audio. Sound is on by default; browsers only let it start after your first click or keypress.
let soundOn = true;
try { soundOn = localStorage.getItem('shart-sound') !== 'off'; } catch {}
let ctx, master, musicBus, noiseBuf;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = soundOn ? 1 : 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.3;
    musicBus.connect(master);
    // two seconds of brown-ish noise, reused by every fart
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 3.5; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const shaperCurves = {};
function shaperCurve(k) {
  if (shaperCurves[k]) return shaperCurves[k];
  const c = new Float32Array(1024);
  for (let i = 0; i < c.length; i++) { const x = i / 512 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
  return (shaperCurves[k] = c);
}

// A synthesized fart. Every option is randomized when left out, so no two are alike.
function fart(o = {}) {
  if (!o.force && !soundOn) return;
  const c = audio();
  if (!c) return;
  const t = o.when ?? c.currentTime;
  const dur = o.dur ?? rand(0.25, 0.85);
  const base = o.pitch ?? rand(55, 130);
  const vol = o.vol ?? rand(0.35, 0.6);

  const noise = c.createBufferSource();
  noise.buffer = noiseBuf; noise.loop = true;
  const noiseGain = c.createGain(); noiseGain.gain.value = o.noise ?? rand(0.6, 1.1);

  // buzzing tone whose pitch wanders around and sags at the end
  const osc = c.createOscillator(); osc.type = 'sawtooth';
  const steps = Math.max(8, Math.round(dur * 24));
  const pitch = new Float32Array(steps);
  let p = base;
  for (let i = 0; i < steps; i++) {
    p = Math.min(base * 1.8, Math.max(base * 0.55, p * rand(0.9, 1.1)));
    pitch[i] = p * (1 - 0.35 * i / steps);
  }
  osc.frequency.setValueCurveAtTime(pitch, t, dur);
  const toneGain = c.createGain(); toneGain.gain.value = 0.45;

  // the flap: wobbles both pitch and loudness
  const flap = c.createOscillator(); flap.frequency.value = o.flutter ?? rand(14, 34);
  const flapPitch = c.createGain(); flapPitch.gain.value = base * 0.35;
  const flapAmp = c.createGain(); flapAmp.gain.value = 0.4;
  const trem = c.createGain(); trem.gain.value = 0.6;
  flap.connect(flapPitch).connect(osc.frequency);
  flap.connect(flapAmp).connect(trem.gain);

  const filter = c.createBiquadFilter(); filter.type = 'lowpass';
  filter.frequency.value = o.lowpass ?? rand(320, 720); filter.Q.value = 5;
  const shaper = c.createWaveShaper(); shaper.curve = shaperCurve(o.drive ?? 2);

  const amp = c.createGain();
  if (o.ampCurve) {
    amp.gain.value = 0.0001;
    amp.gain.setValueCurveAtTime(Float32Array.from(o.ampCurve, v => Math.max(0.0001, v * vol)), t, dur);
  } else {
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(vol, t + 0.025);
    amp.gain.exponentialRampToValueAtTime(vol * 0.6, t + dur * 0.7);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  noise.connect(noiseGain).connect(filter);
  osc.connect(toneGain).connect(filter);
  filter.connect(shaper).connect(trem).connect(amp).connect(o.dest || master);
  [noise, osc, flap].forEach(n => { n.start(t, n === noise ? Math.random() : 0); n.stop(t + dur + 0.05); });
}

// The Flush button's grand finale: long, loud and deliberately ignores the mute button.
function megaFart() {
  const c = audio();
  if (!c) return 0;
  const loud = c.createGain(); loud.gain.value = 1.4;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
  loud.connect(comp).connect(c.destination);

  const t = c.currentTime + 0.05, dur = 8;
  // loudness curve: quick swell, big body, random sputters, then a dying wheeze
  const n = 320, curve = new Array(n);
  let sputter = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    if (sputter > 0) sputter--; else if (Math.random() < 0.025 && x > 0.15) sputter = 2 + Math.floor(Math.random() * 5);
    const swell = Math.min(1, x * 14);
    const fade = x > 0.82 ? Math.max(0, (1 - x) / 0.18) : 1;
    curve[i] = swell * fade * (0.8 + 0.2 * Math.sin(x * 40)) * (sputter ? 0.12 : 1);
  }
  fart({ force: true, when: t, dur, pitch: 72, vol: 1, dest: loud, ampCurve: curve, flutter: 21, drive: 7, lowpass: 950, noise: 1.2 });
  // extra bubbly layers on top
  for (let k = 0; k < 8; k++) {
    fart({ force: true, when: t + rand(0.3, dur - 1.2), dur: rand(0.4, 1.1), pitch: rand(40, 70), vol: 0.9, dest: loud, drive: 5 });
  }
  // ...and the little squeaks at the end
  [0, 0.4, 0.75, 1.3].forEach((d, i) => {
    fart({ force: true, when: t + dur + 0.2 + d, dur: 0.22 - i * 0.03, pitch: 170 + i * 55, vol: 0.8, dest: loud, lowpass: 1400 });
  });
  return dur + 1.6;
}

// --- Background music: an oompah band where the tuba is a fart
const BEAT = 60 / 116 / 2; // one eighth note at 116 bpm
const note = n => 261.63 * Math.pow(2, n / 12); // semitones from middle C
const BARS = [ // [tuba root, chord] per bar, C F G C
  { root: -24, chord: [0, 4, 7] },
  { root: -19, chord: [0, 5, 9] },
  { root: -17, chord: [-1, 2, 7] },
  { root: -24, chord: [0, 4, 7] },
];
const MELODY = [ // kazoo, one entry per eighth, null = rest
  12, null, 16, null, 19, 19, 16, null,
  17, null, 21, null, 17, 16, 14, null,
  14, 14, 19, null, 17, 14, 11, null,
  12, 16, 12, 7, 12, null, null, null,
];

function tone(freq, t, len, { type = 'square', vol = 0.1, vib = 0, vibRate = 6, lowpass = 1800 } = {}) {
  const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
  const lfo = ctx.createOscillator(); lfo.frequency.value = vibRate;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = freq * vib;
  lfo.connect(lfoGain).connect(osc.frequency);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(f).connect(g).connect(musicBus);
  [osc, lfo].forEach(n => { n.start(t); n.stop(t + len + 0.02); });
}

function playStep(step, t) {
  const bar = BARS[Math.floor(step / 8)], beat = step % 8;
  // fart tuba on 1 and 3
  if (beat === 0) fart({ when: t, dur: BEAT * 1.7, pitch: note(bar.root), vol: 0.5, dest: musicBus, flutter: 24, lowpass: 500 });
  if (beat === 4) fart({ when: t, dur: BEAT * 1.7, pitch: note(bar.root + 7), vol: 0.5, dest: musicBus, flutter: 24, lowpass: 500 });
  // "pah" chords on the off-beats
  if (beat === 2 || beat === 6) bar.chord.forEach(n => tone(note(n), t, BEAT * 0.6, { vol: 0.045, lowpass: 1400 }));
  // kazoo melody
  const m = MELODY[step];
  if (m != null) tone(note(m), t, BEAT * 0.95, { type: 'sawtooth', vol: 0.07, vib: 0.02, vibRate: 7, lowpass: 2600 });
  // fart drum fills
  if (beat === 7 || (step >= 29 && Math.random() < 0.7)) {
    fart({ when: t, dur: rand(0.08, 0.16), pitch: rand(80, 140), vol: 0.55, dest: musicBus, lowpass: 900 });
  }
}

let musicOn = false, nextTime = 0, step = 0, timer = 0;
function startMusic() {
  if (musicOn || !soundOn || !audio()) return;
  musicOn = true;
  nextTime = ctx.currentTime + 0.1;
  timer = setInterval(() => {
    if (nextTime < ctx.currentTime - 0.1) nextTime = ctx.currentTime + 0.05; // don't burst after a stall
    while (nextTime < ctx.currentTime + 0.25) {
      playStep(step, nextTime);
      nextTime += BEAT;
      step = (step + 1) % MELODY.length;
    }
  }, 60);
  toggle.classList.add('playing');
}
function stopMusic() {
  musicOn = false;
  clearInterval(timer);
  toggle.classList.remove('playing');
}

// --- Sound toggle (bottom right)
const toggle = document.createElement('button');
toggle.className = 'sound-toggle';
const paintToggle = () => {
  toggle.textContent = soundOn ? '\u{1F50A}' : '\u{1F507}';
  toggle.setAttribute('aria-label', soundOn ? 'Turn fart sounds and music off' : 'Turn fart sounds and music on');
  toggle.title = toggle.getAttribute('aria-label');
};
paintToggle();
toggle.addEventListener('click', e => {
  e.stopPropagation();
  soundOn = !soundOn;
  try { localStorage.setItem('shart-sound', soundOn ? 'on' : 'off'); } catch {}
  paintToggle();
  if (audio()) master.gain.setTargetAtTime(soundOn ? 1 : 0, ctx.currentTime, 0.02);
  if (soundOn) { fart(); startMusic(); } else stopMusic();
});
document.body.append(toggle);

// First click or key unlocks audio and starts the band
const unlock = () => { if (soundOn) startMusic(); };
document.addEventListener('pointerdown', unlock);
document.addEventListener('keydown', unlock);

// Pause the band while the tab is hidden; the title begs you to come back
const realTitle = document.title;
document.addEventListener('visibilitychange', () => {
  document.title = document.hidden ? '\u{1F4A9} Hold it in... come back!' : realTitle;
  if (document.hidden) { if (musicOn) { stopMusic(); musicOn = 'paused'; } }
  else if (musicOn === 'paused') { musicOn = false; startMusic(); }
});

// --- Click anywhere: a poop pops out and someone lets one rip
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
const flushBtn = document.querySelector('#flush-btn');
document.addEventListener('click', e => {
  if (e.target === toggle || (flushBtn && e.target.closest('#flush-btn'))) return;
  if (!reduceMotion) plop(e.clientX, e.clientY);
  fart();
});

// Typing toots
let lastKey = 0;
document.addEventListener('keydown', e => {
  if (e.repeat || performance.now() - lastKey < 90) return;
  lastKey = performance.now();
  fart({ dur: rand(0.07, 0.15), pitch: rand(140, 260), vol: 0.3, lowpass: 1500 });
});

// Hovering buttons and links makes them squeak
let lastHover = 0;
document.addEventListener('pointerover', e => {
  if (!ctx || !e.target.closest('.btn, .nav a, .gallery button, .logo, .lb-prev, .lb-next')) return;
  if (performance.now() - lastHover < 250) return;
  lastHover = performance.now();
  fart({ dur: rand(0.1, 0.2), pitch: rand(180, 300), vol: 0.22, lowpass: 1800, flutter: rand(30, 45) });
});

// Scrolling occasionally squeezes one out
let lastScroll = 0;
window.addEventListener('scroll', () => {
  if (!ctx || performance.now() - lastScroll < 1200) return;
  lastScroll = performance.now();
  if (Math.random() < 0.35) fart({ vol: 0.35 });
}, { passive: true });

// ...and every so often, out of nowhere
(function ambush() {
  setTimeout(() => {
    if (ctx && !document.hidden) fart({ dur: rand(0.5, 1.4), vol: rand(0.3, 0.55) });
    ambush();
  }, rand(10000, 25000));
})();

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

// --- Contact form is OUT OF ORDER. The Flush button still works... sort of.
function gasAttack(x, y, secs) {
  const haze = document.createElement('div');
  haze.className = 'gas-haze';
  const text = document.createElement('div');
  text.className = 'gas-text';
  text.textContent = 'PFFFRRRRRT';
  text.setAttribute('aria-hidden', 'true');
  document.body.append(haze, text);
  requestAnimationFrame(() => haze.classList.add('on'));

  let clouds = 0;
  const puff = reduceMotion ? 0 : setInterval(() => {
    if (clouds > 70) return;
    const el = document.createElement('div');
    el.className = 'gas';
    const size = rand(90, 220);
    el.style.width = el.style.height = size + 'px';
    el.style.left = x + rand(-50, 50) + 'px';
    el.style.top = y + rand(-25, 25) + 'px';
    el.style.setProperty('--dx', rand(-innerWidth * 0.6, innerWidth * 0.6) + 'px');
    el.style.setProperty('--dy', rand(-innerHeight * 0.9, innerHeight * 0.15) + 'px');
    el.style.setProperty('--s', rand(3, 7).toFixed(2));
    el.style.setProperty('--t', rand(3, 5.5).toFixed(2) + 's');
    document.body.append(el);
    clouds++;
    el.addEventListener('animationend', () => { el.remove(); clouds--; });
  }, 80);

  setTimeout(() => {
    clearInterval(puff);
    text.remove();
    haze.classList.remove('on');
    setTimeout(() => haze.remove(), 1500);
  }, secs * 1000);
}

if (flushBtn) {
  const status = document.querySelector('.form-status');
  flushBtn.addEventListener('click', () => {
    if (flushBtn.disabled) return;
    const secs = megaFart() || 6;
    const r = flushBtn.getBoundingClientRect();
    gasAttack(r.left + r.width / 2, r.top + r.height / 2, secs);
    flushBtn.disabled = true;
    flushBtn.classList.add('flushing');
    status.textContent = '\u{1F6BD} *PFFFFFFRRRRRRRRRRRRT* This toilet is OUT OF ORDER. Nothing was sent. Please evacuate the area.';
    setTimeout(() => {
      flushBtn.disabled = false;
      flushBtn.classList.remove('flushing');
      status.textContent = 'Out of order. Maintenance has been notified. (They are not coming.)';
    }, secs * 1000);
  });
}
})();
