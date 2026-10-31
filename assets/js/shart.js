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

// --- Audio: real fart recordings (from the terminalfart package, Apache-2.0; credited on /credits/).
// Sound is on by default; browsers only let it start after your first click or keypress.
const AUDIO_BASE = new URL('../audio/', document.currentScript.src);
const SAMPLES = ['dry', 'needs-you', 'success', 'toot', 'wet', 'poop-toot', 'done-long', 'hellacious'];
const CLICK_FARTS = ['dry', 'needs-you', 'success', 'toot', 'wet', 'poop-toot', 'wet', 'toot'];
let soundOn = true;
try { soundOn = localStorage.getItem('shart-sound') !== 'off'; } catch {}
let ctx, master, musicBus, loading;
const samples = {}; // name -> { buf, onset }

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
    musicBus.gain.value = 0.15;
    musicBus.connect(master);
    load();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function load() {
  return loading || (loading = Promise.all(SAMPLES.map(async name => {
    try {
      const res = await fetch(new URL(name + '.mp3', AUDIO_BASE));
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      // skip any silence at the start so the fart lands right on the click
      const d = buf.getChannelData(0);
      let i = 0;
      while (i < d.length && Math.abs(d[i]) < 0.03) i++;
      samples[name] = { buf, onset: Math.max(0, i / buf.sampleRate - 0.01) };
    } catch {}
  })));
}

// Play a recording. Options: rate (speed/pitch), vol, when, dur (cut short with a fade), dest, force (ignore mute)
function play(name, o = {}) {
  if (!o.force && !soundOn) return;
  const c = audio();
  if (!c) return;
  const s = samples[name];
  if (!s) { // not decoded yet: play it as soon as it is, unless it was meant for a precise beat
    if (o.when == null) load().then(() => samples[name] && play(name, o));
    return;
  }
  const t = Math.max(o.when ?? 0, c.currentTime);
  const rate = o.rate ?? 1, vol = o.vol ?? 1;
  const src = c.createBufferSource();
  src.buffer = s.buf;
  src.playbackRate.value = rate;
  const full = (s.buf.duration - s.onset) / rate;
  const dur = Math.min(o.dur ?? full, full);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  if (dur < full) {
    g.gain.setValueAtTime(vol, t + Math.max(0, dur - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
  }
  src.connect(g).connect(o.dest || master);
  src.start(t, s.onset);
  src.stop(t + dur + 0.02);
}

// A random fart, never quite the same twice
const fart = (o = {}) => play(pick(CLICK_FARTS), { rate: rand(0.85, 1.25), vol: rand(0.75, 1), dur: 2.4, ...o });

// The Flush button's grand finale: two long farts back to back, pushed through a limiter so it's
// as loud as it can go. Deliberately ignores the mute button. Returns how long it lasts, in seconds.
const MEGA_SECS = 13.5;
function megaFart() {
  const c = audio();
  if (!c) return 0;
  const go = () => {
    const loud = c.createGain();
    loud.gain.value = 4;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.1;
    loud.connect(limiter).connect(c.destination);
    const t = c.currentTime + 0.05, f = { force: true, dest: loud };
    play('done-long', { ...f, when: t });
    play('poop-toot', { ...f, when: t + 1.2, rate: 0.8, vol: 0.6 });
    play('hellacious', { ...f, when: t + 3.5, rate: 0.9 });
    // ...and the little squeaks at the end
    play('toot', { ...f, when: t + 11.9, rate: 1.6 });
    play('wet', { ...f, when: t + 12.4, rate: 1.4 });
    play('toot', { ...f, when: t + 13, rate: 2.2 });
  };
  if (SAMPLES.every(n => samples[n])) go(); else load().then(go);
  return MEGA_SECS;
}

// --- Background music: an oompah band where the tuba and the melody are real farts
const BEAT = 60 / 116 / 2; // one eighth note at 116 bpm
const semis = n => Math.pow(2, n / 12);
const BARS = [ // [tuba root, chord] per bar, C F G C (semitones from middle C)
  { root: -24, chord: [0, 4, 7] },
  { root: -19, chord: [0, 5, 9] },
  { root: -17, chord: [-1, 2, 7] },
  { root: -24, chord: [0, 4, 7] },
];
const MELODY = [ // one entry per eighth, null = rest
  12, null, 16, null, 19, 19, 16, null,
  17, null, 21, null, 17, 16, 14, null,
  14, 14, 19, null, 17, 14, 11, null,
  12, 16, 12, 7, 12, null, null, null,
];

// a short square-wave "pah" to hold the chords together
function tone(freq, t, len, vol) {
  const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(f).connect(g).connect(musicBus);
  osc.start(t); osc.stop(t + len + 0.02);
}

function playStep(step, t) {
  const bar = BARS[Math.floor(step / 8)], beat = step % 8;
  const m = { when: t, dest: musicBus };
  // fart tuba on 1 and 3: the "wet" one, slowed down to each bass note
  if (beat === 0) play('wet', { ...m, rate: 0.7 * semis(bar.root + 24), dur: BEAT * 1.8, vol: 1 });
  if (beat === 4) play('wet', { ...m, rate: 0.7 * semis(bar.root + 31), dur: BEAT * 1.8, vol: 1 });
  // "pah" chords on the off-beats
  if (beat === 2 || beat === 6) bar.chord.forEach(n => tone(261.63 * semis(n), t, BEAT * 0.6, 0.03));
  // the tune, tooted
  const n = MELODY[step];
  if (n != null) play('toot', { ...m, rate: 0.9 * semis(n - 12), dur: BEAT * 1.1, vol: 0.9 });
  // drum fills
  if (beat === 7 || (step >= 29 && Math.random() < 0.7)) {
    play(pick(['dry', 'needs-you', 'success']), { ...m, rate: rand(1.1, 1.6), dur: rand(0.12, 0.2), vol: 0.8 });
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
  play(pick(['toot', 'wet']), { rate: rand(1.4, 2), dur: 0.2, vol: 0.6 });
});

// Hovering buttons and links makes them squeak
let lastHover = 0;
document.addEventListener('pointerover', e => {
  if (!ctx || !e.target.closest('.btn, .nav a, .gallery button, .logo, .lb-prev, .lb-next')) return;
  if (performance.now() - lastHover < 250) return;
  lastHover = performance.now();
  play('toot', { rate: rand(1.8, 2.5), dur: 0.25, vol: 0.45 });
});

// Scrolling occasionally squeezes one out
let lastScroll = 0;
window.addEventListener('scroll', () => {
  if (!ctx || performance.now() - lastScroll < 1200) return;
  lastScroll = performance.now();
  if (Math.random() < 0.35) fart({ vol: 0.6 });
}, { passive: true });

// ...and every so often, out of nowhere
(function ambush() {
  setTimeout(() => {
    if (ctx && !document.hidden) play(pick(['poop-toot', 'success', 'needs-you', 'dry']), { vol: rand(0.6, 0.9) });
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
