(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const hoverable = matchMedia('(hover: hover) and (pointer: fine)');
const store = { get(k) { try { return sessionStorage.getItem(k) } catch { return null } }, set(k, v) { try { sessionStorage.setItem(k, v) } catch {} } };
const header = $('.header');

/* ---- Journeys panel (desktop) ---------------------------------------------------------------- */
const trigger = $('.journeys-trigger'), panel = $('#journeys-panel');
let openTimer, closeTimer, openedAt = 0;
const isOpen = () => panel?.classList.contains('is-open');
function openPanel(focusFirst) {
  clearTimeout(closeTimer);
  if (!isOpen()) openedAt = Date.now();
  panel.classList.add('is-open'); header.classList.add('panel-open'); header.classList.remove('is-hidden');
  trigger.setAttribute('aria-expanded', 'true');
  if (focusFirst) $('a', panel)?.focus();
}
function closePanel(returnFocus) {
  clearTimeout(openTimer);
  if (!isOpen()) return;
  panel.classList.remove('is-open'); header.classList.remove('panel-open');
  trigger.setAttribute('aria-expanded', 'false');
  if (returnFocus) trigger.focus();
}
if (trigger && panel) {
  trigger.addEventListener('click', e => {
    const keyboard = e.detail === 0;
    if (isOpen() && (keyboard || Date.now() - openedAt > 450)) closePanel();
    else openPanel(keyboard);
  });
  trigger.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); openPanel(true) } });
  [trigger, panel].forEach(el => {
    el.addEventListener('pointerenter', () => { if (!hoverable.matches) return; clearTimeout(closeTimer); openTimer = setTimeout(() => openPanel(false), 160) });
    el.addEventListener('pointerleave', () => { if (!hoverable.matches) return; clearTimeout(openTimer); closeTimer = setTimeout(() => closePanel(false), 380) });
  });
  panel.addEventListener('focusout', e => { if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== trigger) closePanel() });
  document.addEventListener('click', e => { if (!panel.contains(e.target) && !trigger.contains(e.target)) closePanel() });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) closePanel(panel.contains(document.activeElement) || document.activeElement === trigger) });
}

/* ---- Mobile menu ----------------------------------------------------------------------------- */
const menu = $('#mobile-menu'), menuButton = $('.menu-toggle');
function closeMenu() {
  if (!menu?.open) return;
  if (reduced.matches) return menu.close();
  menu.classList.add('is-closing');
  setTimeout(() => { menu.close(); menu.classList.remove('is-closing') }, 320);
}
if (menu && menuButton) {
  menuButton.addEventListener('click', () => { menu.showModal(); menuButton.setAttribute('aria-expanded', 'true') });
  $('.close-menu', menu)?.addEventListener('click', closeMenu);
  menu.addEventListener('close', () => { menuButton.setAttribute('aria-expanded', 'false'); menuButton.focus({ preventScroll: true }) });
  menu.addEventListener('click', e => { if (e.target.closest('a')) menu.close() });
  matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) menu.close() });
}

/* ---- Scroll: header, parallax, back-to-top, booking bar -------------------------------------- */
const toTop = $('.to-top'), bar = $('.booking-bar'), bookingPanel = $('#booking');
const parallax = $$('[data-parallax]');
let lastY = scrollY, ticking = false;
function onScroll() {
  ticking = false;
  const y = scrollY, vh = innerHeight;
  header.classList.toggle('is-scrolled', y > 40);
  const hold = isOpen() || header.matches(':focus-within') || menu?.open;
  if (y < 140 || hold) { header.classList.remove('is-hidden'); lastY = y }
  else if (Math.abs(y - lastY) > 10) { header.classList.toggle('is-hidden', y > lastY); lastY = y }
  if (y > lastY + 10) closePanel();
  toTop?.classList.toggle('is-visible', y > vh * 1.2);
  if (bar) {
    const r = bookingPanel?.getBoundingClientRect();
    const panelInView = r && r.top < vh && r.bottom > 0 && getComputedStyle(bookingPanel).position !== 'sticky';
    bar.classList.toggle('is-visible', y > vh * .5 && !panelInView);
  }
  if (!reduced.matches && y < vh * 1.1) parallax.forEach(el => {
    const f = parseFloat(el.dataset.parallax);
    el.style.transform = `translate3d(0, ${(y * f).toFixed(1)}px, 0)`;
    if (f < 0) el.style.opacity = Math.max(0, 1 - y / (vh * .75)).toFixed(3);
  });
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll) } }, { passive: true });
addEventListener('resize', onScroll, { passive: true });
onScroll();
toTop?.addEventListener('click', () => {
  scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
  $('.brand', header)?.focus({ preventScroll: true });
});

/* ---- Journeys open now: hide past dates, highlight the next one ----------------------------- */
const today = new Date(); today.setHours(0, 0, 0, 0);
const startOf = li => li.dataset.start ? new Date(li.dataset.start + 'T00:00:00') : null;
$$('.now-card').forEach(card => {
  const dates = $$('.now-date', card);
  const upcoming = dates.filter(li => !startOf(li) || startOf(li) >= today);
  if (!upcoming.length) return;
  dates.forEach(li => li.classList.toggle('is-past', !upcoming.includes(li)));
  const next = upcoming.find(startOf), countdown = $('.now-countdown', card);
  if (!next || !countdown) return;
  next.classList.add('is-next');
  const days = Math.round((startOf(next) - today) / 864e5);
  countdown.textContent = days === 0 ? 'Begins today' : days === 1 ? 'Begins tomorrow' : `Next departure in ${days} days`;
  countdown.hidden = false;
});

/* ---- Gentle reveals -------------------------------------------------------------------------- */
const reveals = $$('[data-reveal]');
if ('IntersectionObserver' in window && !reduced.matches) {
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    io.unobserve(el);
    el.classList.add('is-visible');
    const settle = ev => {
      if (ev.target !== el || ev.propertyName !== 'transform') return;
      el.removeEventListener('transitionend', settle);
      el.removeAttribute('data-reveal'); el.classList.remove('is-visible'); el.style.removeProperty('--d');
    };
    el.addEventListener('transitionend', settle);
  }), { rootMargin: '0px 0px -6% 0px', threshold: .01 });
  reveals.forEach(el => io.observe(el));
} else reveals.forEach(el => el.removeAttribute('data-reveal'));

/* ---- Falling leaves: three depths, each leaf falls, sways and turns on its own rhythm --------- */
const leaves = $('.leaves-layer');
function growLeaves() {
  if (!leaves) return;
  leaves.textContent = '';
  if (reduced.matches) return;
  const base = +leaves.dataset.leaves || 6;
  const count = innerWidth < 720 ? Math.ceil(base * .6) : base;
  const xs = [6, 84, 29, 67, 15, 93, 47, 58, 37, 76];
  const tints = ['saturate(1)', 'hue-rotate(-16deg) saturate(1.15)', 'sepia(.3) hue-rotate(-8deg) saturate(1.3)', 'hue-rotate(14deg) saturate(.9) brightness(1.05)'];
  for (let i = 0; i < count; i++) {
    const depth = (i * 7) % 3; // 0 far, 1 middle, 2 near
    const leaf = document.createElement('span'), sway = document.createElement('span'), spin = document.createElement('span');
    leaf.className = 'leaf'; sway.className = 'leaf-sway'; spin.className = 'leaf-spin';
    leaf.style.cssText = `--x:${xs[i % xs.length]}%;--dur:${[36, 29, 23][depth] + (i % 4) * 3}s;--delay:${-((i * 5.3) % 30).toFixed(1)}s;--drift:${(i % 2 ? 1 : -1) * (40 + (i * 23) % 90)}px`;
    sway.style.cssText = `--sway:${(3.4 + (i % 4) * .7).toFixed(1)}s;--amp:${16 + depth * 12}px`;
    spin.style.cssText = `--size:${[17, 25, 34][depth] + (i % 3) * 3}px;--spin:${(2.8 + (i % 3) * .9).toFixed(1)}s;--o:${[.42, .62, .82][depth]};--tint:${tints[i % 4]}${depth === 0 ? ' blur(.8px)' : ''}`;
    sway.appendChild(spin); leaf.appendChild(sway); leaves.appendChild(leaf);
  }
}
growLeaves();
reduced.addEventListener('change', growLeaves);

/* ---- Opening film: plays once per visit, then rests on the final still ----------------------- */
const video = $('#forest-video');
const showStill = () => {
  if (!video) return;
  video.pause(); video.removeAttribute('autoplay'); video.poster = '/aranya-site/assets/forest-still.jpg';
  video.querySelector('source')?.remove(); video.removeAttribute('src'); video.load();
};
if (video) {
  video.muted = true;
  if (store.get('aranya-opening-seen') || reduced.matches) { if (video.querySelector('source')) showStill() }
  else video.play().catch(() => {});
  video.addEventListener('ended', () => store.set('aranya-opening-seen', '1'));
  reduced.addEventListener('change', () => { if (reduced.matches) showStill() });
}

/* ---- Forest sound: off by default, fades in to 65%, remembered for this visit ---------------- */
const audio = $('#forest-audio'), soundButton = $('#sound-toggle');
let soundOn = false, fadeFrame;
function fadeTo(target, ms, done) {
  cancelAnimationFrame(fadeFrame);
  const from = audio.volume, start = performance.now();
  const step = now => {
    const k = Math.min(1, (now - start) / ms), eased = .5 - Math.cos(Math.PI * k) / 2;
    audio.volume = from + (target - from) * eased;
    if (k < 1) fadeFrame = requestAnimationFrame(step); else done?.();
  };
  fadeFrame = requestAnimationFrame(step);
}
function syncSound(note) {
  soundButton.setAttribute('aria-pressed', String(soundOn));
  soundButton.setAttribute('aria-label', soundOn ? 'Mute forest sounds' : 'Play calming forest sounds');
  $('.sound-label', soundButton).textContent = note || (soundOn ? 'Sound on' : 'Sound');
}
async function startSound() {
  try {
    audio.muted = false; audio.volume = 0;
    await audio.play();
    soundOn = true; store.set('aranya-sound', 'on'); syncSound();
    fadeTo(.65, 2200);
    return true;
  } catch { soundOn = false; syncSound(); return false }
}
function stopSound() {
  soundOn = false; store.set('aranya-sound', 'off'); syncSound();
  fadeTo(0, 1000, () => { if (!soundOn) audio.pause() });
}
if (audio && soundButton) {
  soundButton.addEventListener('click', () => soundOn ? stopSound() : startSound());
  if (store.get('aranya-sound') === 'on') startSound().then(ok => {
    if (ok) return;
    const resume = e => {
      if (e.target.closest?.('#sound-toggle')) return;
      removeEventListener('pointerdown', resume); removeEventListener('keydown', resume);
      if (store.get('aranya-sound') === 'on') startSound();
    };
    addEventListener('pointerdown', resume); addEventListener('keydown', resume);
  });
}

document.addEventListener('visibilitychange', () => {
  leaves?.classList.toggle('is-paused', document.hidden);
  if (document.hidden) { video?.pause(); if (soundOn) audio.pause() }
  else {
    if (video?.querySelector('source') && !video.ended && !reduced.matches) video.play().catch(() => {});
    if (soundOn) audio.play().catch(() => { soundOn = false; syncSound() });
  }
});

/* ---- Enquiry form, journey preselect, sharing ------------------------------------------------ */
const form = $('#enquiry-form');
form?.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const subject = 'Journey enquiry: ' + data.get('journey');
  const body = 'Namaste,\n\nMy name is ' + data.get('name') + '.\nI am interested in: ' + data.get('journey') + '.\nTravellers: ' + data.get('group') + '\nPreferred dates: ' + data.get('dates') + '\n\n' + data.get('message') + '\n\nWarm regards,\n' + data.get('name');
  location.href = 'mailto:omjaysrihari@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  $('#form-status').textContent = 'Your email app will open with your enquiry. Review it there before sending.';
});
if (form) {
  const wanted = new URLSearchParams(location.search).get('journey');
  const select = form.querySelector('[name="journey"]');
  if (wanted && [...select.options].some(o => o.value === wanted)) select.value = wanted;
}
$('#share-article')?.addEventListener('click', async () => {
  const status = $('#share-status');
  try {
    if (navigator.share) await navigator.share({ title: 'Finding Your Inner Stillness', url: location.href });
    else { await navigator.clipboard.writeText(location.href); status.textContent = 'Article link copied.' }
  } catch (e) { if (e.name !== 'AbortError') status.textContent = 'You can copy this page’s address to share the reflection.' }
});
})();
