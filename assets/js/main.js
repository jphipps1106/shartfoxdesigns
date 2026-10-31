// SharpFox Designs — site behaviour (no dependencies)
// initPage() sets up the current page's header, menu and gallery. shart.js calls it again after it
// swaps in a new page without reloading (so the music keeps playing).

// Header shrinks once you scroll
const onScroll = () => {
  const header = document.querySelector('.site-header');
  if (header) header.classList.toggle('shrink', window.scrollY > 40);
};
window.addEventListener('scroll', onScroll, { passive: true });

// Gallery lightbox: one shared overlay, pointed at whichever gallery opened it
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
const lbImg = lb.querySelector('img');
const lbCount = lb.querySelector('.lb-count');
let group = [], gi = 0, opener = null;

const show = () => {
  const b = group[gi];
  lbImg.src = b.dataset.full;
  lbImg.alt = b.querySelector('img').alt;
  lbCount.textContent = `${gi + 1} / ${group.length}`;
};
const openLb = b => {
  opener = b;
  group = [...b.closest('.gallery').querySelectorAll('button')];
  gi = group.indexOf(b);
  show();
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  lb.querySelector('.lb-close').focus();
};
const closeLb = () => {
  if (!lb.classList.contains('open')) return;
  lb.classList.remove('open');
  document.body.style.overflow = '';
  lbImg.removeAttribute('src');
  opener && opener.isConnected && opener.focus();
};
const step = d => { gi = (gi + d + group.length) % group.length; show(); };

lb.querySelector('.lb-close').addEventListener('click', closeLb);
lb.querySelector('.lb-prev').addEventListener('click', () => step(-1));
lb.querySelector('.lb-next').addEventListener('click', () => step(1));
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
document.addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLb();
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

function initPage() {
  // Opened straight from disk (file://)? Folder links like "portfolio/" would show a file listing,
  // so point them at the folder's index.html. On a real web host the clean URLs are left alone.
  if (location.protocol === 'file:') {
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (/^(\.{1,2}\/)*([\w-]+\/)*$/.test(href) && !/^[a-z]+:/i.test(href)) a.setAttribute('href', href + 'index.html');
    });
  }

  closeLb();
  document.body.classList.remove('menu-open');
  onScroll();

  // Mobile menu
  const toggle = document.querySelector('.menu-toggle');
  if (toggle) toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', open);
  });

  document.querySelectorAll('.gallery button').forEach(b => b.addEventListener('click', () => openLb(b)));
}
initPage();

// Contact form: permanently out of order (see shart.js for what the Flush button does now).
