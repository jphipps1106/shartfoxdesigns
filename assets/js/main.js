// SharpFox Designs — site behaviour (no dependencies)

// Opened straight from disk (file://)? Folder links like "portfolio/" would show a file listing,
// so point them at the folder's index.html. On a real web host the clean URLs are left alone.
if (location.protocol === 'file:') {
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (/^(\.{1,2}\/)*([\w-]+\/)*$/.test(href) && !/^[a-z]+:/i.test(href)) a.setAttribute('href', href + 'index.html');
  });
}

// Header shrinks once you scroll
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('shrink', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Mobile menu
const toggle = document.querySelector('.menu-toggle');
toggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  toggle.setAttribute('aria-expanded', open);
});

// Gallery lightbox
const items = [...document.querySelectorAll('.gallery button')];
if (items.length) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.innerHTML = `
    <img alt="">
    <button class="lb-close" aria-label="Close">&times;</button>
    <button class="lb-prev" aria-label="Previous">&lsaquo;</button>
    <button class="lb-next" aria-label="Next">&rsaquo;</button>
    <div class="lb-count"></div>`;
  document.body.append(lb);
  const img = lb.querySelector('img');
  const count = lb.querySelector('.lb-count');
  let group = [], i = 0, opener = null;

  const show = () => {
    const b = group[i];
    img.src = b.dataset.full;
    img.alt = b.querySelector('img').alt;
    count.textContent = `${i + 1} / ${group.length}`;
  };
  const open = b => {
    opener = b;
    group = [...b.closest('.gallery').querySelectorAll('button')];
    i = group.indexOf(b);
    show();
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    lb.querySelector('.lb-close').focus();
  };
  const close = () => {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    img.removeAttribute('src');
    opener && opener.focus();
  };
  const step = d => { i = (i + d + group.length) % group.length; show(); };

  items.forEach(b => b.addEventListener('click', () => open(b)));
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => step(-1));
  lb.querySelector('.lb-next').addEventListener('click', () => step(1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  let x0 = null;
  lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    x0 = null;
  });
}

// Contact form — posts to Formspree (see README). Falls back to a message until it is set up.
const form = document.querySelector('#contact-form');
if (form) {
  const status = form.querySelector('.form-status');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.action.includes('YOUR_FORM_ID')) {
      status.textContent = 'The contact form isn’t connected yet. Please reach out on Instagram or Facebook.';
      return;
    }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    status.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      status.textContent = 'Thank you! I’ll get back to you soon.';
    } catch {
      status.textContent = 'Something went wrong. Please try again, or message me on Instagram.';
    } finally {
      btn.disabled = false;
    }
  });
}
