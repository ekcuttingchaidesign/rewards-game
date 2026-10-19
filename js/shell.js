// Shared shell for every mini game: rewards data, tray, reveal FX, finale card, rewards list,
// layout (phone frame on desktop) and presenter controls. A game registers itself with Shell.boot(game).
(function () {
  const $ = (s) => document.querySelector(s);
  const IMG = 'assets/img/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- data
  const REWARDS = {
    netflix: { name: 'Netflix', tag: 'NETFLIX', logo: 'logo_netflix.png', title: 'Netflix Mobile', sub: 'With your ₹399 plan', short: '3 months', date: 'Till 18 Jan' },
    hotstar: { name: 'JioHotstar', tag: 'JIOHOTSTAR', logo: 'logo_hotstar.png', title: 'JioHotstar Mobile', sub: 'With your ₹399 plan', short: '3 months', date: 'Till 18 Jan' },
    google: { name: 'Google One', tag: 'GOOGLE ONE', logo: 'logo_google.png', title: 'Google One · 100 GB', sub: 'Cloud storage for 6 months', short: '100 GB', date: 'Till 18 Apr' },
    adobe: { name: 'Adobe Express', tag: 'ADOBE EXPRESS', logo: 'logo_adobe.png', title: 'Adobe Express', sub: 'Premium, free for 12 months', short: '12 months', date: 'Till 18 Oct' },
  };
  const PROFILES = {
    1: ['google', 'adobe', 'netflix'],
    2: ['hotstar', 'adobe', 'google'],
    3: ['netflix', 'hotstar', 'adobe'],
  };
  const GAMES = { platformer: 'Platformer', claw: 'Claw machine' };

  const store = {
    get(k) { try { return localStorage.getItem('arq:' + k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem('arq:' + k) : localStorage.setItem('arq:' + k, v); } catch (e) { /* private mode */ } },
  };
  const params = new URLSearchParams(location.search);
  const pick = (val, saved, table, fallback) => (table[val] ? val : (table[saved] ? saved : fallback));
  const profileId = pick(params.get('p'), store.get('profile'), PROFILES, '1');
  const gameId = pick(params.get('g'), store.get('game'), GAMES, 'platformer');
  store.set('profile', profileId);
  store.set('game', gameId);
  const rewards = PROFILES[profileId].map((k) => REWARDS[k]);
  const doneKey = 'done:' + gameId + ':' + profileId;

  // ---------------------------------------------------------------- helpers
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tw = (t, v) => new Promise((r) => gsap.to(t, Object.assign({}, v, { onComplete: r })));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* unsupported */ } };
  const imgTag = (name, cls) => `<img ${cls ? `class="${cls}" ` : ''}src="${IMG}${name}" alt="" draggable="false">`;

  const game = $('#game'), scene = $('#scene'), fx = $('#fx'), hud = $('#hud'), tray = $('#tray'), finaleL = $('#finale');
  const view = { H: 540 };
  let G = null;   // the active game module

  function setHeight(h, dur) {
    return tw(view, { H: h, duration: dur, ease: 'power3.inOut', onUpdate: () => { game.style.height = view.H + 'px'; } });
  }
  function pageZoom() { return parseFloat(getComputedStyle($('#page')).zoom) || 1; }
  function expandedHeight(min, max) {
    const visible = $('#app').clientHeight / pageZoom();
    return clamp(Math.round(visible - 88), min, max);
  }

  // ---------------------------------------------------------------- FX
  function particle(cls, x, y, css, parent) {
    const d = document.createElement('div');
    d.className = cls;
    if (css) Object.assign(d.style, css);
    (parent || fx).appendChild(d);
    gsap.set(d, { x, y });
    return d;
  }
  const kill = (d) => () => d.remove();
  function burst(sx, sy, big) {
    const ring = particle('fx-ring', sx, sy);
    gsap.fromTo(ring, { scale: 0.3, opacity: 1 }, { scale: big ? 5.5 : 3.5, opacity: 0, duration: 0.5, ease: 'power2.out', onComplete: kill(ring) });
    const colors = ['#ffd23f', '#ff5a5f', '#ffffff', '#7ad1ff', '#ff9f1c'];
    const n = big ? 16 : 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2), r = rand(34, big ? 78 : 56);
      const d = particle('fx-sq', sx, sy, { background: colors[i % colors.length] });
      gsap.to(d, { x: sx + Math.cos(a) * r, y: sy + Math.sin(a) * r, rotation: rand(-180, 180), duration: rand(0.45, 0.65), ease: 'power3.out' });
      gsap.to(d, { opacity: 0, scale: 0.4, duration: 0.25, delay: 0.35, onComplete: kill(d) });
    }
    for (let i = 0; i < (big ? 5 : 3); i++) {
      const a = rand(0, Math.PI * 2), r = rand(40, 70);
      const s = particle('fx-star', sx, sy);
      gsap.fromTo(s, { scale: 0.2 }, { x: sx + Math.cos(a) * r, y: sy + Math.sin(a) * r, scale: rand(0.7, 1.1), rotation: rand(-90, 90), duration: 0.6, ease: 'power3.out' });
      gsap.to(s, { opacity: 0, duration: 0.3, delay: 0.45, onComplete: kill(s) });
    }
  }
  function sparkleAt(sx, sy) {
    const s = particle('fx-star', sx, sy);
    gsap.fromTo(s, { scale: 0, rotation: -40 }, { scale: rand(0.5, 0.85), rotation: 40, duration: 0.35, ease: 'back.out(3)', yoyo: true, repeat: 1, onComplete: kill(s) });
  }
  function fireworks(n, parent, yMax) {
    const colors = ['#ffd23f', '#ff5a5f', '#ffffff', '#7ad1ff', '#b8f36b', '#ff9f1c'];
    for (let k = 0; k < n; k++) {
      setTimeout(() => {
        const cx = rand(60, 315), cy = rand(110, Math.max(150, yMax || view.H - 280));
        Sound.play('firework');
        const m = RM ? 8 : 18;
        for (let i = 0; i < m; i++) {
          const a = (i / m) * Math.PI * 2, r = rand(38, 62);
          const d = particle('fx-sq', cx, cy, { background: colors[(i + k) % colors.length], zIndex: 1 }, parent);
          gsap.to(d, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, duration: 0.6, ease: 'power3.out' });
          gsap.to(d, { y: `+=${rand(18, 30)}`, opacity: 0, duration: 0.6, delay: 0.55, ease: 'power1.in', onComplete: kill(d) });
        }
      }, k * 420);
    }
  }
  function confetti() {
    const colors = ['#e40000', '#ffd23f', '#7ad1ff', '#ffffff', '#ff9f1c', '#b8f36b'];
    const n = RM ? 12 : 44;
    for (let i = 0; i < n; i++) {
      const d = particle('confetti', rand(0, 375), rand(-60, -10), { background: colors[i % colors.length], zIndex: 3 }, finaleL);
      gsap.to(d, { y: view.H + 30, x: `+=${rand(-50, 50)}`, rotation: rand(-540, 540), rotationX: rand(-360, 360), duration: rand(2, 3.2), delay: rand(0, 0.5), ease: 'power1.in', onComplete: kill(d) });
    }
  }

  let coinCount = 286;
  function addCoins(n, sx, sy) {
    coinCount += n;
    $('#coinCount').textContent = coinCount;
    gsap.fromTo('.coins img', { scale: 1.35, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.4, ease: 'back.out(3)' });
    if (sx != null) {
      const plus = particle('fx-plus', sx, sy);
      plus.textContent = '+' + n;
      gsap.to(plus, { y: sy - 34, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: kill(plus) });
    }
  }
  function resetCoins() { coinCount = 286; $('#coinCount').textContent = coinCount; }

  // ---------------------------------------------------------------- tray slots + reveal
  const SLOT_HUD = (i) => ({ x: 187 + (i - 1) * 40, y: 70, s: 0.72 });
  const slots = rewards.map((r) => {
    const el = document.createElement('div');
    el.className = 'slot';
    el.innerHTML = `<div class="in"><div class="bubble"><span class="q">?</span></div><img class="logo" src="${IMG}${r.logo}" alt="${r.name}" draggable="false"></div>`;
    tray.appendChild(el);
    return { el, inner: el.querySelector('.in') };
  });
  const placeSlots = (pos) => slots.forEach((s, i) => { const p = pos(i); gsap.set(s.el, { x: p.x, y: p.y, scale: p.s }); });
  const moveSlots = (pos, opts = {}) => slots.forEach((s, i) => {
    const p = pos(i);
    gsap.to(s.el, { x: p.x, y: p.y, scale: p.s, duration: opts.duration || 0.6, delay: i * (opts.stagger || 0.06), ease: opts.ease || 'power3.inOut' });
  });
  const slotPos = (i) => ({ x: gsap.getProperty(slots[i].el, 'x'), y: gsap.getProperty(slots[i].el, 'y') });

  function fillSlot(i, quiet) {
    const s = slots[i];
    s.el.classList.add('filled');
    if (quiet) return;
    Sound.play('collect');
    buzz(8);
    gsap.fromTo(s.inner, { scale: 1.6 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    const p = slotPos(i);
    const ring = particle('fx-ring', p.x, p.y);
    gsap.fromTo(ring, { scale: 0.8, opacity: 1 }, { scale: 2.6, opacity: 0, duration: 0.45, ease: 'power2.out', onComplete: kill(ring) });
    for (let k = 0; k < 3; k++) setTimeout(() => sparkleAt(p.x + rand(-22, 22), p.y + rand(-20, 20)), k * 90);
  }
  function flyToSlot(el, i) {
    const s = slots[i], from = { x: gsap.getProperty(el, 'x'), y: gsap.getProperty(el, 'y') };
    const to = slotPos(i);
    const ctrl = { x: (from.x + to.x) / 2 + (to.x - from.x) * 0.15, y: Math.min(from.y, to.y) - 80 };
    const o = { t: 0 }, s0 = gsap.getProperty(el, 'scale'), s1 = gsap.getProperty(s.el, 'scale');
    Sound.play('whoosh');
    return new Promise((resolve) => {
      gsap.to(o, {
        t: 1, duration: 0.6, ease: 'power2.inOut',
        onUpdate() {
          const t = o.t, u = 1 - t;
          gsap.set(el, { x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x, y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y, scale: s0 + (s1 - s0) * t, rotation: Math.sin(t * Math.PI) * -18 });
          if (Math.random() < 0.35) {
            const sp = particle('fx-star', gsap.getProperty(el, 'x') + rand(-8, 8), gsap.getProperty(el, 'y') + rand(-8, 8));
            gsap.fromTo(sp, { scale: 0.55 }, { scale: 0, opacity: 0.4, duration: 0.45, onComplete: kill(sp) });
          }
        },
        onComplete() { el.remove(); fillSlot(i); resolve(); },
      });
    });
  }
  // Burst + spinning logo + name tag, then the logo flies into tray slot i. Resolves once it lands.
  function reveal(i, sx, sy) {
    const r = rewards[i];
    Sound.play('pop');
    setTimeout(() => Sound.play('reveal'), 60);
    buzz(14);
    burst(sx, sy, true);
    const card = document.createElement('div');
    card.className = 'reveal';
    card.innerHTML = `<div class="rays"></div><div class="glow"></div><img src="${IMG}${r.logo}" alt="" draggable="false"><div class="label">${r.tag}</div>`;
    fx.appendChild(card);
    const logo = card.querySelector('img'), label = card.querySelector('.label');
    const rays = card.querySelector('.rays'), glow = card.querySelector('.glow');
    gsap.set(card, { x: sx, y: sy, scale: 0 });
    return new Promise((resolve) => {
      gsap.timeline()
        .to(card, { scale: 1.3, duration: 0.3, ease: 'back.out(2.4)' })
        .fromTo(logo, { rotationY: -540, transformPerspective: 300 }, { rotationY: 0, duration: 0.7, ease: 'power3.out' }, 0)
        .fromTo([rays, glow], { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, 0.05)
        .fromTo(label, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.2 }, 0.25)
        .to(card, { scale: 1.12, duration: 0.25, ease: 'power2.out' }, 0.32)
        .to([label, rays, glow], { opacity: 0, duration: 0.2 }, 0.98)
        .add(() => flyToSlot(card, i).then(resolve), 1.0);
    });
  }

  // ---------------------------------------------------------------- pills ("TAP TO …" hints)
  const pillHTML = (t) => `<div class="pulse"><div class="pill-bg"></div><img src="${IMG}tap_pill.svg" alt="" draggable="false"><span>${t}</span></div>`;
  function showPill(p) {
    gsap.killTweensOf(p);
    gsap.fromTo(p, { scale: 0.3, opacity: 0, y: 8 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2.2)' });
  }
  function hidePill(p) { gsap.killTweensOf(p); gsap.to(p, { scale: 0.6, opacity: 0, duration: 0.15 }); }

  // ---------------------------------------------------------------- finale card
  const CARD_LOGOS = [60, 150, 240];
  let fireT = 0;
  function showFinale(top) {
    game.classList.add('finale');
    finaleL.innerHTML = `<div class="veil"></div>
      <div class="finale-card" style="top:${top}px">
        <div class="card-bg"></div>
        <div class="ttl"><i></i>REWARDS UNLOCKED<i></i></div>
        <div class="sub">All 3 are now in your account</div>
        <div class="names">${rewards.map((r, i) => `<div class="nm" style="left:${CARD_LOGOS[i]}px"><b>${r.name}</b><small>${r.short}</small></div>`).join('')}</div>
        <button class="cta">See my rewards</button>
      </div>`;
    const veil = finaleL.querySelector('.veil'), card = finaleL.querySelector('.finale-card');
    gsap.to(veil, { opacity: 1, duration: 0.4 });
    gsap.fromTo(card, { scale: 0.6, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.8)' });
    gsap.from(card.querySelectorAll('.ttl, .sub'), { opacity: 0, y: 8, duration: 0.3, stagger: 0.08, delay: 0.25 });
    gsap.from(card.querySelectorAll('.nm'), { opacity: 0, y: 10, duration: 0.3, stagger: 0.1, delay: 0.75 });
    gsap.from(card.querySelector('.cta'), { opacity: 0, y: 12, duration: 0.35, delay: 1.05, ease: 'back.out(2)' });
    hud.style.zIndex = 10;   // the tray bubbles fly into the card
    slots.forEach((s, i) => {
      gsap.to(s.el, { x: 37.5 + CARD_LOGOS[i], y: top + 106, scale: 60 / 48, duration: 0.6, delay: 0.3 + i * 0.12, ease: 'back.out(1.6)', onComplete: () => Sound.play('tick') });
    });
    confetti();
    fireT = setInterval(() => fireworks(1, finaleL, top + 40), 1300);
    card.querySelector('.cta').addEventListener('click', (e) => { e.stopPropagation(); seeRewards(); }, { once: true });
  }

  async function seeRewards() {
    clearInterval(fireT);
    Sound.play('tap');
    const card = finaleL.querySelector('.finale-card'), veil = finaleL.querySelector('.veil');
    gsap.to(card, { scale: 0.92, opacity: 0, duration: 0.25, ease: 'power2.in' });
    gsap.to(veil, { opacity: 0, duration: 0.4 });
    await tw('#flash', { opacity: 0.85, duration: 0.2 });   // the flash hides the scene reset
    finaleL.innerHTML = '';
    G.toCollected();
    slots.forEach((s, i) => fillSlot(i, true));
    gsap.to('#flash', { opacity: 0, duration: 0.45 });
    moveSlots(G.slotRest, { duration: 0.7, stagger: 0.07, ease: 'back.out(1.4)' });
    await setHeight(G.H_IDLE, 0.6);
    hud.style.zIndex = '';
    game.classList.remove('finale', 'playing');
    store.set(doneKey, '1');
    const list = $('#rewardsList'), app = $('#app');
    const y = app.scrollTop + list.getBoundingClientRect().top - app.getBoundingClientRect().top - 120 * pageZoom();
    app.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    await wait(650);
    renderList(true, true);
  }

  async function replay() {
    Sound.play('tap');
    store.set(doneKey, null);
    await tw('#flash', { opacity: 0.85, duration: 0.18 });
    slots.forEach((s) => s.el.classList.remove('filled'));
    placeSlots(G.slotRest);
    resetCoins();
    G.reset();
    gsap.to('#flash', { opacity: 0, duration: 0.4 });
    renderList(false, false);
  }

  // ---------------------------------------------------------------- rewards list below the game
  const STATIC_ROWS = [
    { icon: 'icon_zomato.jpg', title: '20% off at Zomato', sub: 'Won on a scratch card', status: 'To use', date: 'By 31 Oct' },
    { icon: 'icon_virdas.jpg', title: 'Vir Das Live, Delhi', sub: 'You are in the draw', status: 'Result', date: '16 Oct', dark: true },
  ];
  function rowHTML(r, extra) {
    return `<div class="rw ${extra || ''}">
      <div class="ic ${r.round ? 'round' : ''}">${imgTag(r.icon)}</div>
      <div class="tx"><b>${r.title}${r.isNew ? '<span class="new">NEW</span>' : ''}</b><small>${r.sub}</small></div>
      <div class="st"><b class="${r.dark ? 'dark' : ''}">${r.status}</b><small>${r.date}</small></div>
      <div class="hl"></div></div>`;
  }
  function renderList(collected, animate) {
    const list = $('#rewardsList');
    const top = collected
      ? rewards.map((r) => rowHTML({ icon: r.logo, round: true, title: r.title, sub: r.sub, status: 'Active', date: r.date, isNew: true }, 'fresh'))
      : [rowHTML({ icon: G.teaserIcon, title: '3 rewards are waiting', sub: 'Play the game above to unlock', status: 'Play ↑', date: 'Takes 15 sec' }, 'teaser')];
    list.innerHTML = top.join('') + STATIC_ROWS.map((r) => rowHTML(r)).join('');
    const teaser = list.querySelector('.teaser');
    if (teaser) teaser.addEventListener('click', () => $('#app').scrollTo({ top: 0, behavior: 'smooth' }));
    if (animate) {
      list.querySelectorAll('.fresh').forEach((row, i) => {
        gsap.from(row, { height: 0, opacity: 0, duration: 0.45, delay: i * 0.16, ease: 'power3.out', onStart: () => Sound.play('tick') });
        gsap.fromTo(row.querySelector('.hl'), { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.3 + i * 0.16, yoyo: true, repeat: 1, repeatDelay: 0.5 });
        gsap.from(row.querySelector('.new'), { scale: 0, duration: 0.4, delay: 0.4 + i * 0.16, ease: 'back.out(3)' });
      });
    }
  }

  // ---------------------------------------------------------------- layout: phone frame on desktop, zoom on phones
  function layout() {
    const framed = innerWidth >= 760 && innerHeight >= 640;
    document.body.classList.toggle('framed', framed);
    if (framed) {
      $('#page').style.zoom = 1;
      $('#phone').style.zoom = Math.min(1, (innerHeight - 32) / 836);
    } else {
      $('#phone').style.zoom = 1;
      $('#page').style.zoom = Math.min($('#app').clientWidth / 375, 1.6);
    }
  }
  addEventListener('resize', layout);
  layout();

  // ---------------------------------------------------------------- sound + controls
  const soundBtn = $('.sound');
  function applySound(on) {
    Sound.setEnabled(on);
    soundBtn.classList.toggle('off', !on);
    soundBtn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    store.set('sound', on ? '1' : '0');
    document.querySelectorAll('[data-sound]').forEach((b) => { b.textContent = on ? 'Sound: on' : 'Sound: off'; });
  }
  soundBtn.addEventListener('click', (e) => { e.stopPropagation(); Sound.unlock(); applySound(!Sound.enabled); });
  $('.back').addEventListener('click', (e) => { e.stopPropagation(); gsap.fromTo('.back', { x: 0 }, { x: -4, duration: 0.08, yoyo: true, repeat: 3 }); });

  const go = (g, p) => { location.search = `?g=${g}&p=${p}`; };
  function switchHTML() {
    return Object.keys(GAMES).map((id) => `<button class="${id === gameId ? 'on' : ''}" data-game="${id}">${GAMES[id]}</button>`).join('');
  }
  const TAB_ICONS = {
    platformer: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M9.5 9.6a2.5 2.5 0 1 1 3.7 2.2c-.8.4-1.2.9-1.2 1.7v.3"/><circle cx="12" cy="16.7" r=".5" fill="currentColor"/>',
    claw: '<path d="M4 3.2h16M12 3.2v4.6"/><rect x="9.4" y="7.8" width="5.2" height="2.6" rx="1"/><path d="M10 10.4 5.8 14.6l2.4 4M14 10.4l4.2 4.2-2.4 4"/><circle cx="12" cy="18.3" r="2.4"/>',
  };
  function tabsHTML() {
    return '<div class="track">' + Object.keys(GAMES).map((id) => `<button class="${id === gameId ? 'on' : ''}" data-game="${id}" aria-current="${id === gameId}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TAB_ICONS[id]}</svg>${GAMES[id]}</button>`).join('') + '</div>';
  }
  function buildControls() {
    const html = `<h3>Game</h3><div class="seg">${switchHTML()}</div>
      <h3>Who is playing</h3>
      ${Object.keys(PROFILES).map((id) => `<button class="ctl-profile ${id === profileId ? 'on' : ''}" data-profile="${id}">
        <span class="logos">${PROFILES[id].map((k) => `<img src="${IMG}${REWARDS[k].logo}" alt="">`).join('')}</span>
        <span>${PROFILES[id].map((k) => REWARDS[k].name).join(', ')}</span></button>`).join('')}
      <div class="ctl-row"><button class="ctl-btn" data-reset>Reset game</button><button class="ctl-btn ghost" data-sound>Sound: on</button></div>`;
    document.querySelectorAll('[data-controls]').forEach((c) => { c.innerHTML = html; });
    $('#tabbar').innerHTML = tabsHTML();
    document.querySelectorAll('[data-game]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (b.dataset.game === gameId) return; document.querySelectorAll('#tabbar button').forEach((t) => t.classList.toggle('on', t === b)); go(b.dataset.game, profileId); }));
    document.querySelectorAll('[data-profile]').forEach((b) => b.addEventListener('click', () => go(gameId, b.dataset.profile)));
    document.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => {
      Object.keys(GAMES).forEach((g) => Object.keys(PROFILES).forEach((p) => store.set(`done:${g}:${p}`, null)));
      location.reload();
    }));
    document.querySelectorAll('[data-sound]').forEach((b) => b.addEventListener('click', () => { Sound.unlock(); applySound(!Sound.enabled); }));
  }
  buildControls();

  // long-press the coin pill (or press P) to open presenter controls on a phone
  const presenter = $('#presenter');
  let lpT = 0;
  const coinsEl = $('.coins');
  coinsEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); lpT = setTimeout(() => { presenter.hidden = false; buzz(15); }, 650); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => coinsEl.addEventListener(ev, () => clearTimeout(lpT)));
  coinsEl.addEventListener('contextmenu', (e) => e.preventDefault());
  presenter.addEventListener('click', (e) => { if (e.target === presenter || e.target.closest('.pr-close')) presenter.hidden = true; });

  try {
    const qr = qrcode(0, 'M');
    qr.addData(location.origin + location.pathname + `?g=${gameId}&p=${profileId}`);
    qr.make();
    $('#qr').innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  } catch (e) { /* QR lib missing: panel still works */ }

  // ---------------------------------------------------------------- input routing
  game.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    Sound.unlock();
    if (e.target.closest('button, .coins, .finale-card')) return;
    if (e.target.closest('.pill.button')) { replay(); return; }
    G.onPointerDown(e);
  });
  ['touchend', 'click'].forEach((ev) => document.addEventListener(ev, () => Sound.unlock(), { passive: true }));   // iOS unlocks audio here
  addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') presenter.hidden = !presenter.hidden;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); Sound.unlock(); G.onTap(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) Sound.music(false);
    else if (G.isPlaying()) Sound.music(true);
  });

  // ---------------------------------------------------------------- boot
  function boot(g) {
    G = g;
    view.H = g.H_IDLE;
    game.style.height = g.H_IDLE + 'px';
    game.classList.add('g-' + gameId);
    const [top, bottom] = g.page;
    $('#pageTop').src = IMG + top.src; $('#pageTop').height = top.h;
    $('#pageBottom').src = IMG + bottom.src; $('#pageBottom').height = bottom.h;
    applySound(store.get('sound') !== '0');
    g.build();
    placeSlots(g.slotRest);
    const done = !!store.get(doneKey);
    if (done) { g.toCollected(); slots.forEach((s, i) => fillSlot(i, true)); }
    renderList(done, false);
    g.start(done);
  }

  window.Shell = {
    $, IMG, RM, wait, tw, clamp, rand, buzz, imgTag,
    rewards, gameId, profileId, view, game, scene, fx, hud,
    setHeight, expandedHeight, particle, kill, burst, sparkleAt, fireworks, addCoins,
    slots, SLOT_HUD, moveSlots, slotPos, reveal, pillHTML, showPill, hidePill, showFinale, boot,
  };
})();
