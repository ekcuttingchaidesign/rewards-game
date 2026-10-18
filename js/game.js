// Rewards Quest: one-tap mini game for the top of the Airtel Rewards page.
// All positions are in design points (375pt wide). World items use x = centre, alt = height above the grass.
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
  const store = {
    get(k) { try { return localStorage.getItem('arq:' + k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem('arq:' + k) : localStorage.setItem('arq:' + k, v); } catch (e) { /* private mode */ } },
  };
  const qp = new URLSearchParams(location.search).get('p');
  const profileId = PROFILES[qp] ? qp : (PROFILES[store.get('profile')] ? store.get('profile') : '1');
  store.set('profile', profileId);
  const rewards = PROFILES[profileId].map((k) => REWARDS[k]);

  // ---------------------------------------------------------------- layout constants
  const H_IDLE = 540;          // section height; the sheet overlaps the last 28pt
  const GROUND = 65;           // grass top, measured up from the section bottom
  const WORLD_END = 1385;
  const SLOT_IDLE = [{ x: 117.5, y: 241.5, s: 49 / 48 }, { x: 183, y: 266, s: 1 }, { x: 262, y: 242, s: 1 }];
  const SLOT_HUD = (i) => ({ x: 187 + (i - 1) * 40, y: 70, s: 0.72 });
  const BLOCK = { x: 182.5, alt: 143 };
  const PIPE = { x: 640, top: 84 };
  const MUSH = { x: 880, top: 50 };
  const PLAT = { x: 1000, top: 215 };
  const POLE = { x: 1200, h: 250 };
  const STAND = [118, 578, 828];   // where the hero waits before each action

  const game = $('#game'), world = $('#world'), fx = $('#fx'), ground = $('#ground');
  const titleL = $('#title'), cloudsL = $('#clouds'), tray = $('#tray'), finaleL = $('#finale'), hud = $('#hud');
  const view = { H: H_IDLE };
  const cam = { x: 0, follow: true };
  const shake = { x: 0, y: 0 };

  // ---------------------------------------------------------------- helpers
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tw = (t, v) => new Promise((r) => gsap.to(t, Object.assign({}, v, { onComplete: r })));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* unsupported */ } };
  const groundY = () => view.H - GROUND;
  const toScreen = (x, alt) => ({ x: x - cam.x + shake.x, y: groundY() - alt + shake.y });
  const imgTag = (name, cls) => `<img ${cls ? `class="${cls}" ` : ''}src="${IMG}${name}" alt="" draggable="false">`;

  function add(parent, cls, x, alt, w, h, html) {
    const d = document.createElement('div');
    d.className = cls;
    d.style.cssText = `left:${x - w / 2}px;bottom:${alt}px;width:${w}px;height:${h}px`;
    if (html) d.innerHTML = html;
    parent.appendChild(d);
    return d;
  }
  function arcAt(x0, a0, x1, a1, apex, t) {
    const c = 2 * apex - (a0 + a1) / 2;
    return { x: x0 + (x1 - x0) * t, alt: (1 - t) * (1 - t) * a0 + 2 * t * (1 - t) * c + t * t * a1 };
  }

  // ---------------------------------------------------------------- build the scene
  [[-21, 91, 97, 65, 0.7], [187, 56, 53, 35, 0.6], [300, 199, 138, 92, 0.6], [-112, 237, 196, 131, 0.6],
    [430, 120, 120, 80, 0.6], [560, 40, 90, 60, 0.65], [690, 170, 160, 107, 0.55], [840, 80, 110, 73, 0.6]]
    .forEach(([l, t, w, h, o], i) => {
      const c = document.createElement('div');
      c.className = 'cloud';
      c.style.cssText = `left:${l}px;top:${t}px;width:${w}px;height:${h}px;opacity:${o};animation-delay:${-i * 1.7}s`;
      cloudsL.appendChild(c);
    });

  add(world, 'deco', -26, 51, 160, 55, imgTag('brick.png'));
  add(world, 'deco', 186, 131, 186, 64, imgTag('brick.png'));
  add(world, 'deco', 414.5, 79, 185, 63, imgTag('brick.png'));
  add(world, 'deco', 350.5, -18, 129, 86, imgTag('bush.png'));
  add(world, 'deco', 760, -16, 108, 72, imgTag('bush.png'));
  add(world, 'deco', 1110, -18, 129, 86, imgTag('bush.png'));
  add(world, 'deco', 1330, -16, 100, 67, imgTag('bush.png'));

  const orbHTML = '<div class="bob"><div class="halo"></div><div class="bubble"><span class="q">?</span></div></div>';
  const orbs = [
    add(world, 'orb', BLOCK.x, 148, 40, 40, orbHTML),
    add(world, 'orb', PIPE.x, 40, 44, 44, orbHTML),
    add(world, 'orb', PLAT.x, 262, 44, 44, orbHTML),
  ];
  const block = add(world, 'block', BLOCK.x, BLOCK.alt, 47, 41, imgTag('qblock_airtel.png') + '<div class="glint"></div>');
  const blockImg = block.querySelector('img');
  const pipe = add(world, 'pipe', PIPE.x, -7, 84, 91, imgTag('pipe.png'));
  const mush = add(world, 'mush', MUSH.x, -5, 60, 57, imgTag('mushroom.png'));
  const plat = add(world, 'plat', PLAT.x, PLAT.top - 44, 130, 45, imgTag('brick.png'));
  add(world, 'pole', POLE.x, 0, 6, POLE.h);
  add(world, 'finial', POLE.x, POLE.h - 6, 20, 20, imgTag('coin.png'));
  add(world, 'pole-base', POLE.x, -2, 26, 14);
  const flag = add(world, 'flag', POLE.x + 31, 0, 56, 38, `<div class="cloth"><img src="${IMG}airtel_wordmark.svg" alt="" draggable="false"></div>`);

  const pillHTML = (t) => `<div class="pulse"><div class="pill-bg"></div><img src="${IMG}tap_pill.svg" alt="" draggable="false"><span>${t}</span></div>`;
  const pills = [
    add(world, 'pill', 188, 86, 122, 23, pillHTML('Tap to reveal')),
    add(world, 'pill', 598, 196, 122, 23, pillHTML('Tap to jump')),
    add(world, 'pill', 848, 126, 122, 23, pillHTML('Tap to bounce')),
  ];

  // coins: a trail on the ground pointing right, plus a few placed exactly on later jump arcs
  const coinSpots = [[292, 34], [324, 34], [356, 34]];
  [0.3, 0.5, 0.7].forEach((t) => { const p = arcAt(PIPE.x, PIPE.top, 716, 0, 150, t); coinSpots.push([p.x, p.alt + 36]); });
  [0.35, 0.65].forEach((t) => { const p = arcAt(PLAT.x, PLAT.top, POLE.x - 10, 168, 285, t); coinSpots.push([p.x, p.alt + 36]); });
  const coins = coinSpots.map(([x, a]) => ({ x, a, el: add(world, 'coin', x, a - 11, 22, 22, imgTag('coin.png')), got: false }));

  const heroWrap = document.createElement('div');
  heroWrap.className = 'hero';
  world.appendChild(heroWrap);
  const hero = Hero.create(heroWrap);
  const H = hero.s;

  // tray slots (the three "?" bubbles that become the progress tracker)
  const slots = rewards.map((r, i) => {
    const el = document.createElement('div');
    el.className = 'slot';
    el.innerHTML = `<div class="in"><div class="bubble"><span class="q">?</span></div><img class="logo" src="${IMG}${r.logo}" alt="${r.name}" draggable="false"></div>`;
    tray.appendChild(el);
    return { el, inner: el.querySelector('.in') };
  });
  const placeSlots = (pos) => slots.forEach((s, i) => { const p = pos(i); gsap.set(s.el, { x: p.x, y: p.y, scale: p.s }); });

  // ---------------------------------------------------------------- render loop
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    hero.update(dt);
    if (cam.follow) {
      const target = clamp(H.x - 150, 0, WORLD_END - 375);
      cam.x += (target - cam.x) * (1 - Math.exp(-dt * 5));
    }
    const cx = -cam.x + shake.x;
    world.style.transform = `translate3d(${cx.toFixed(2)}px,${shake.y.toFixed(2)}px,0)`;
    ground.style.backgroundPosition = `${cx.toFixed(2)}px ${shake.y.toFixed(2)}px, 0 ${(62 + shake.y).toFixed(2)}px`;
    titleL.style.transform = `translate3d(${(-cam.x * 0.85 + shake.x).toFixed(2)}px,${shake.y.toFixed(2)}px,0)`;
    cloudsL.style.transform = `translate3d(${(-cam.x * 0.35).toFixed(2)}px,0,0)`;
    heroWrap.style.transform = `translate3d(${(H.x - 46).toFixed(2)}px,${(-H.alt).toFixed(2)}px,0)`;
    for (const c of coins) {
      if (!c.got && Math.abs(c.x - H.x) < 16 && Math.abs(c.a - (H.alt + 36)) < 30) grabCoin(c);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- feedback
  function doShake(p) {
    if (RM) return;
    gsap.timeline()
      .to(shake, { x: rand(-p, p), y: -p, duration: 0.04 })
      .to(shake, { x: rand(-p, p) * 0.6, y: p * 0.5, duration: 0.05 })
      .to(shake, { x: 0, y: 0, duration: 0.12, ease: 'power2.out' });
  }
  function particle(cls, x, y, css, parent) {
    const d = document.createElement('div');
    d.className = cls;
    if (css) Object.assign(d.style, css);
    (parent || fx).appendChild(d);
    gsap.set(d, { x, y });
    return d;
  }
  const kill = (d) => () => d.remove();
  function dust(x, alt, n = 6) {
    const p = toScreen(x, alt);
    for (let i = 0; i < n; i++) {
      const d = particle('fx-dust', p.x + rand(-8, 8), p.y - 2);
      const dir = i % 2 ? 1 : -1;
      gsap.to(d, { x: `+=${dir * rand(10, 24)}`, y: `-=${rand(4, 12)}`, scale: rand(0.4, 1.2), opacity: 0, duration: rand(0.3, 0.45), ease: 'power2.out', onComplete: kill(d) });
    }
  }
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

  let coinCount = 286;
  function grabCoin(c) {
    c.got = true;
    Sound.play('coin');
    gsap.to(c.el, { y: -38, opacity: 0, duration: 0.42, ease: 'power2.out' });
    const p = toScreen(c.x, c.a + 8);
    const plus = particle('fx-plus', p.x, p.y);
    plus.textContent = '+1';
    gsap.to(plus, { y: p.y - 34, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: kill(plus) });
    coinCount += 1;
    $('#coinCount').textContent = coinCount;
    gsap.fromTo('.coins img', { scale: 1.35, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.4, ease: 'back.out(3)' });
  }

  // ---------------------------------------------------------------- hero moves
  async function runTo(x) {
    const d = Math.abs(x - H.x);
    if (d < 1) return;
    H.face = x > H.x ? 1 : -1;
    H.mode = 'run';
    await tw(H, { x, duration: Math.max(0.28, d / 245), ease: d > 140 ? 'power1.inOut' : 'sine.inOut' });
    H.mode = 'brake';
    if (d > 140) dust(H.x - 6, 0, 3);
    await wait(130);
    H.mode = 'idle';
    H.face = 1;
  }
  async function crouch() {
    H.mode = 'crouch';
    await tw(H, { sx: 1.12, sy: 0.84, duration: 0.07, ease: 'power2.out' });
    gsap.to(H, { sx: 0.9, sy: 1.14, duration: 0.12, ease: 'power2.out' });
    gsap.to(H, { sx: 1, sy: 1, duration: 0.3, delay: 0.12, ease: 'power2.out' });
  }
  function land(soft) {
    H.mode = 'idle';
    gsap.fromTo(H, { sx: soft ? 1.1 : 1.2, sy: soft ? 0.88 : 0.78 }, { sx: 1, sy: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)' });
    dust(H.x, H.alt);
    Sound.play('land');
  }
  // Projectile hop along a quadratic arc. `hit` = { x, alt, r, onHit } adds a hit-stop when the hero touches it.
  function arc(x1, a1, apex, dur, hit) {
    return new Promise((resolve) => {
      const x0 = H.x, a0 = H.alt, o = { t: 0 };
      H.mode = 'air';
      H.face = x1 >= x0 ? 1 : -1;
      let hitDone = !hit;
      const t = gsap.to(o, {
        t: 1, duration: dur, ease: 'none',
        onUpdate() {
          const p = arcAt(x0, a0, x1, a1, apex, o.t);
          H.x = p.x; H.alt = p.alt;
          if (!hitDone && (Math.hypot(H.x - hit.x, H.alt + 37 - hit.alt) < hit.r || o.t > 0.94)) {
            hitDone = true;
            t.pause();
            hit.onHit();
            setTimeout(() => t.resume(), 85);
          }
        },
        onComplete() { H.face = 1; resolve(); },
      });
    });
  }

  // ---------------------------------------------------------------- reward reveal + tray
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
  function flyToSlot(el, i) {
    const s = slots[i], from = { x: gsap.getProperty(el, 'x'), y: gsap.getProperty(el, 'y') };
    const to = { x: gsap.getProperty(s.el, 'x'), y: gsap.getProperty(s.el, 'y') };
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
  function fillSlot(i, quiet) {
    const s = slots[i];
    s.el.classList.add('filled');
    if (quiet) return;
    Sound.play('collect');
    buzz(8);
    gsap.fromTo(s.inner, { scale: 1.6 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    const p = { x: gsap.getProperty(s.el, 'x'), y: gsap.getProperty(s.el, 'y') };
    const ring = particle('fx-ring', p.x, p.y);
    gsap.fromTo(ring, { scale: 0.8, opacity: 1 }, { scale: 2.6, opacity: 0, duration: 0.45, ease: 'power2.out', onComplete: kill(ring) });
    for (let k = 0; k < 3; k++) setTimeout(() => sparkleAt(p.x + rand(-22, 22), p.y + rand(-20, 20)), k * 90);
  }

  // ---------------------------------------------------------------- game flow
  let state = 'attract';      // attract | busy | wait | finale | collected
  let queuedAt = -1e9, hintT = 0, wiggleT = 0, attractT = 0;

  function showPill(k) {
    const p = pills[k];
    gsap.killTweensOf(p);
    gsap.fromTo(p, { scale: 0.3, opacity: 0, y: 8 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2.2)' });
  }
  function hidePill(k) { gsap.killTweensOf(pills[k]); gsap.to(pills[k], { scale: 0.6, opacity: 0, duration: 0.15 }); }
  function wiggle(k) {
    if (k === 0) {
      gsap.timeline().to(blockImg, { y: -6, duration: 0.09, ease: 'power2.out' }).to(blockImg, { y: 0, duration: 0.35, ease: 'bounce.out' });
      const p = toScreen(BLOCK.x, BLOCK.alt + 20);
      sparkleAt(p.x + rand(-30, 30), p.y + rand(-18, 6));
    } else if (k === 1) {
      gsap.fromTo(orbs[1], { rotation: -14 }, { rotation: 0, duration: 0.7, ease: 'elastic.out(1.2, 0.3)' });
    } else {
      gsap.timeline().to(mush, { scaleY: 0.86, scaleX: 1.1, duration: 0.1, transformOrigin: '50% 100%' }).to(mush, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
      const p = toScreen(PLAT.x, 285);
      sparkleAt(p.x + rand(-26, 26), p.y + rand(-20, 20));
    }
  }
  function arrive(k) {
    state = 'wait';
    station = k;
    // a tap made just before arriving counts (forgiving input buffer)
    if (performance.now() - queuedAt < 450) { queuedAt = -1e9; setTimeout(() => act(k), 140); return; }
    clearTimeout(hintT); clearInterval(wiggleT);
    hintT = setTimeout(() => showPill(k), 900);
    wiggleT = setInterval(() => wiggle(k), 2300);
    setTimeout(() => state === 'wait' && station === k && wiggle(k), 500);
  }
  let station = 0;

  function act(k) {
    if (k === 0) return actBlock();
    if (k === 1) return actPipe();
    return actMushroom();
  }

  function startAttract() {
    state = 'attract';
    clearInterval(attractT);
    attractT = setInterval(() => {
      if (state !== 'attract' && state !== 'collected') return;
      if (state === 'attract') wiggle(0);
      const s = slots[Math.floor(rand(0, 3))];
      sparkleAt(gsap.getProperty(s.el, 'x') + rand(-26, 26), gsap.getProperty(s.el, 'y') + rand(-26, 22));
      if (Math.random() < 0.35 && H.mode === 'idle') { H.mode = 'lookUp'; setTimeout(() => { if (H.mode === 'lookUp') H.mode = 'idle'; }, 1100); }
    }, 1500);
    // the pipe's reward peeks out now and then
    gsap.timeline({ repeat: -1, repeatDelay: 1.6, id: 'peek' })
      .to(orbs[1], { y: -52, duration: 0.5, ease: 'back.out(1.6)' })
      .to(orbs[1], { y: 0, duration: 0.4, ease: 'power2.in' }, '+=0.8');
  }

  function expandedHeight() {
    const app = $('#app');
    const visible = app.clientHeight / (parseFloat(getComputedStyle($('#page')).zoom) || 1);
    return clamp(Math.round(visible - 88), H_IDLE, 700);
  }
  function setHeight(h, dur) {
    return tw(view, { H: h, duration: dur, ease: 'power3.inOut', onUpdate: () => { game.style.height = view.H + 'px'; } });
  }

  async function startGame() {
    state = 'busy';
    clearTimeout(hintT); clearInterval(wiggleT);
    game.classList.add('playing');
    hidePill(0);
    Sound.play('start');
    Sound.music(true);
    buzz(10);
    $('#app').scrollTo({ top: 0, behavior: 'smooth' });
    setHeight(expandedHeight(), 0.65);
    slots.forEach((s, i) => {
      const p = SLOT_HUD(i);
      gsap.to(s.el, { x: p.x, y: p.y, scale: p.s, duration: 0.6, delay: i * 0.06, ease: 'power3.inOut' });
    });
    await actBlock(true);
  }

  async function actBlock() {
    state = 'busy';
    clearTimeout(hintT); clearInterval(wiggleT);
    hidePill(0);
    await runTo(BLOCK.x);
    await crouch();
    Sound.play('jump');
    H.mode = 'air';
    await tw(H, { alt: BLOCK.alt - 71, duration: 0.24, ease: 'power2.out' });
    // impact
    Sound.play('bump');
    buzz(12);
    doShake(3);
    gsap.timeline().to(blockImg, { y: -11, duration: 0.08, ease: 'power2.out' }).to(blockImg, { y: 0, duration: 0.3, ease: 'bounce.out' });
    const top = toScreen(BLOCK.x, BLOCK.alt + 40);
    for (let i = 0; i < 4; i++) setTimeout(() => sparkleAt(top.x + rand(-24, 24), top.y + rand(-10, 4)), i * 50);
    block.classList.add('used');
    const orb = orbs[0];
    gsap.set(orb, { opacity: 1 });
    gsap.fromTo(orb, { y: 0, scale: 0.5 }, { y: -58, scale: 1, duration: 0.42, ease: 'back.out(2)', delay: 0.05 });
    await wait(80);
    tw(H, { alt: 0, duration: 0.3, ease: 'power2.in' }).then(() => land());
    await wait(470);
    const p = toScreen(BLOCK.x, 148 + 58 + 20);
    gsap.set(orb, { opacity: 0 });
    const done = reveal(0, p.x, p.y);
    await wait(650);
    await runTo(STAND[1]);
    gsap.getById('peek') && gsap.getById('peek').kill();
    gsap.to(orbs[1], { y: -62, duration: 0.55, ease: 'back.out(1.8)' });
    await done;
    arrive(1);
  }

  async function actPipe() {
    state = 'busy';
    clearTimeout(hintT); clearInterval(wiggleT);
    hidePill(1);
    await crouch();
    Sound.play('jump');
    const orb = orbs[1];
    let revealed;
    await arc(PIPE.x, PIPE.top, 178, 0.62, {
      x: PIPE.x, alt: 40 + 62 + 22, r: 40,
      onHit() {
        gsap.set(orb, { opacity: 0 });
        doShake(2);
        const p = toScreen(PIPE.x, 40 + 62 + 22);
        revealed = reveal(1, p.x, p.y);
      },
    });
    land(true);
    gsap.timeline().to(pipe, { scaleY: 0.9, scaleX: 1.06, duration: 0.08, transformOrigin: '50% 100%' }).to(pipe, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
    await wait(520);
    await crouch();
    Sound.play('hop');
    await arc(716, 0, 150, 0.6);
    land();
    await wait(120);
    await runTo(STAND[2]);
    await revealed;
    arrive(2);
  }

  async function actMushroom() {
    state = 'busy';
    clearTimeout(hintT); clearInterval(wiggleT);
    hidePill(2);
    await crouch();
    Sound.play('hop');
    await arc(MUSH.x, MUSH.top, 94, 0.36);
    // spring
    Sound.play('boing');
    buzz(10);
    H.mode = 'crouch';
    gsap.timeline().to(mush, { scaleY: 0.62, scaleX: 1.22, duration: 0.1, transformOrigin: '50% 100%', ease: 'power2.out' })
      .to(mush, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.3)' });
    gsap.to(H, { alt: MUSH.top - 18, sy: 0.72, sx: 1.2, duration: 0.1, ease: 'power2.out' });
    await wait(110);
    gsap.to(H, { sy: 1.25, sx: 0.85, duration: 0.12 });
    gsap.to(H, { sy: 1, sx: 1, duration: 0.4, delay: 0.2 });
    const orb = orbs[2];
    let revealed;
    await arc(PLAT.x, PLAT.top, 288, 0.82, {
      x: PLAT.x, alt: 262 + 22, r: 42,
      onHit() {
        gsap.set(orb, { opacity: 0 });
        doShake(3);
        const p = toScreen(PLAT.x, 262 + 22);
        revealed = reveal(2, p.x, p.y);
      },
    });
    land();
    await revealed;
    await finaleRun();
  }

  async function finaleRun() {
    await crouch();
    Sound.play('jump');
    await arc(POLE.x - 10, 168, 285, 0.7);
    // grab the pole and slide; the airtel flag rises
    H.mode = 'pole';
    H.x = POLE.x - 8;
    Sound.music(false);
    Sound.play('slide');
    buzz(10);
    gsap.to(flag, { y: -(POLE.h - 62), duration: 0.9, ease: 'power2.out' });
    await tw(H, { alt: 4, duration: 0.8, ease: 'power1.in' });
    await arc(POLE.x + 48, 0, 34, 0.32);
    land();
    H.mode = 'victory';
    gsap.to(H, { alt: 16, duration: 0.26, ease: 'power2.out', yoyo: true, repeat: -1, repeatDelay: 0.35, delay: 0.3 });
    Sound.play('fanfare');
    fireworks(3);
    await wait(650);
    showFinale();
  }

  function fireworks(n, parent) {
    const colors = ['#ffd23f', '#ff5a5f', '#ffffff', '#7ad1ff', '#b8f36b', '#ff9f1c'];
    for (let k = 0; k < n; k++) {
      setTimeout(() => {
        const cx = rand(60, 315), cy = rand(110, Math.max(150, groundY() - 220));
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

  // ---------------------------------------------------------------- finale card
  const CARD_LOGOS = [60, 150, 240];
  let fireT = 0;
  function showFinale() {
    state = 'finale';
    game.classList.add('finale');
    const top = clamp(Math.round((groundY() - 268) / 2) + 18, 100, 400);
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
    // the tray bubbles fly into the card
    hud.style.zIndex = 10;
    slots.forEach((s, i) => {
      gsap.to(s.el, {
        x: 37.5 + CARD_LOGOS[i], y: top + 106, scale: 60 / 48, duration: 0.6, delay: 0.3 + i * 0.12, ease: 'back.out(1.6)',
        onComplete: () => Sound.play('tick'),
      });
    });
    confetti();
    fireT = setInterval(() => fireworks(1, finaleL), 1300);
    card.querySelector('.cta').addEventListener('click', (e) => { e.stopPropagation(); seeRewards(); }, { once: true });
  }

  async function seeRewards() {
    state = 'busy';
    clearInterval(fireT);
    Sound.play('tap');
    const card = finaleL.querySelector('.finale-card'), veil = finaleL.querySelector('.veil');
    gsap.to(card, { scale: 0.92, opacity: 0, duration: 0.25, ease: 'power2.in' });
    gsap.to(veil, { opacity: 0, duration: 0.4 });
    // white flash hides the jump back to the start of the level
    await tw('#flash', { opacity: 0.85, duration: 0.2 });
    finaleL.innerHTML = '';
    toCollectedScene();
    gsap.to('#flash', { opacity: 0, duration: 0.45 });
    slots.forEach((s, i) => {
      const p = SLOT_IDLE[i];
      gsap.to(s.el, { x: p.x, y: p.y, scale: p.s, duration: 0.7, delay: i * 0.07, ease: 'back.out(1.4)' });
    });
    await setHeight(H_IDLE, 0.6);
    hud.style.zIndex = '';
    game.classList.remove('finale');
    state = 'collected';
    store.set('done:' + profileId, '1');
    const list = $('#rewardsList');
    const app = $('#app');
    const zoom = parseFloat(getComputedStyle($('#page')).zoom) || 1;
    const y = app.scrollTop + list.getBoundingClientRect().top - app.getBoundingClientRect().top - 120 * zoom;
    app.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    await wait(650);
    renderList(true, true);
  }

  function toCollectedScene() {
    game.classList.remove('playing');
    cam.follow = false;
    cam.x = 0;
    gsap.killTweensOf(H);
    Object.assign(H, { x: STAND[0], alt: 0, sx: 1, sy: 1, face: 1, mode: 'idle' });
    H._px = H.x; H._palt = 0;
    cam.follow = true;
    block.classList.add('used');
    orbs.forEach((o) => gsap.set(o, { opacity: 0 }));
    slots.forEach((s, i) => fillSlot(i, true));
    const p = pills[0];
    p.querySelector('span').textContent = 'Play again';
    p.classList.add('button');
    gsap.set(p, { scale: 1, opacity: 1, y: 0 });
  }

  async function replay() {
    Sound.play('tap');
    store.set('done:' + profileId, null);
    await tw('#flash', { opacity: 0.85, duration: 0.18 });
    resetWorld();
    gsap.to('#flash', { opacity: 0, duration: 0.4 });
    renderList(false, false);
    startAttract();
  }
  function resetWorld() {
    gsap.killTweensOf([...orbs, blockImg, flag, ...pills, mush, pipe]);
    block.classList.remove('used');
    orbs.forEach((o, i) => gsap.set(o, { opacity: i === 0 ? 0 : 1, y: 0, scale: 1, rotation: 0 }));
    gsap.set(flag, { y: 0 });
    coins.forEach((c) => { c.got = false; gsap.set(c.el, { y: 0, opacity: 1 }); });
    coinCount = 286;
    $('#coinCount').textContent = coinCount;
    slots.forEach((s) => s.el.classList.remove('filled'));
    placeSlots((i) => SLOT_IDLE[i]);
    const p = pills[0];
    p.querySelector('span').textContent = 'Tap to reveal';
    p.classList.remove('button');
    gsap.set(pills, { opacity: 0, scale: 1, y: 0 });
    gsap.set(p, { opacity: 1 });
    Object.assign(H, { x: STAND[0], alt: 0, mode: 'idle', face: 1, sx: 1, sy: 1 });
  }

  // ---------------------------------------------------------------- input
  function onTap() {
    Sound.unlock();
    if (state === 'attract') return startGame();
    if (state === 'wait') { clearTimeout(hintT); clearInterval(wiggleT); return act(station); }
    if (state === 'busy') { queuedAt = performance.now(); return; }
    if (state === 'collected' && H.mode === 'idle' && H.alt === 0) {
      // nothing left to collect: the hero just celebrates
      Sound.play('hop');
      H.mode = 'cheer';
      gsap.timeline().to(H, { alt: 34, duration: 0.22, ease: 'power2.out' }).to(H, { alt: 0, duration: 0.24, ease: 'power2.in', onComplete: () => land(true) });
      slots.forEach((s, i) => gsap.fromTo(s.inner, { y: 0 }, { y: -10, duration: 0.16, delay: i * 0.06, yoyo: true, repeat: 1, ease: 'power2.out' }));
    }
  }
  game.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    if (e.target.closest('button, .coins, .finale-card')) return;
    if (e.target.closest('.pill.button')) { replay(); return; }
    onTap();
  });
  // iOS unlocks WebAudio only on touchend/click
  ['touchend', 'click'].forEach((ev) => document.addEventListener(ev, () => Sound.unlock(), { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) Sound.music(false);
    else if (state === 'busy' || state === 'wait') Sound.music(true);
  });

  // sound toggle
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
      : [rowHTML({ icon: 'qblock_airtel.png', title: '3 rewards are waiting', sub: 'Play the game above to unlock', status: 'Play ↑', date: 'Takes 15 sec' }, 'teaser')];
    list.innerHTML = top.join('') + STATIC_ROWS.map((r) => rowHTML(r)).join('');
    const teaser = list.querySelector('.teaser');
    if (teaser) teaser.addEventListener('click', () => $('#app').scrollTo({ top: 0, behavior: 'smooth' }));
    if (animate) {
      const fresh = list.querySelectorAll('.fresh');
      fresh.forEach((row, i) => {
        gsap.from(row, { height: 0, opacity: 0, duration: 0.45, delay: i * 0.16, ease: 'power3.out', onStart: () => Sound.play('tick') });
        gsap.fromTo(row.querySelector('.hl'), { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.3 + i * 0.16, yoyo: true, repeat: 1, repeatDelay: 0.5 });
        gsap.from(row.querySelector('.new'), { scale: 0, duration: 0.4, delay: 0.4 + i * 0.16, ease: 'back.out(3)' });
      });
    }
  }

  // ---------------------------------------------------------------- shell: frame, zoom, presenter controls
  function layout() {
    const framed = innerWidth >= 760 && innerHeight >= 640;
    document.body.classList.toggle('framed', framed);
    const page = $('#page');
    if (framed) {
      page.style.zoom = 1;
      const s = Math.min(1, (innerHeight - 32) / 836);
      $('#phone').style.zoom = s;
    } else {
      $('#phone').style.zoom = 1;
      page.style.zoom = Math.min($('#app').clientWidth / 375, 1.6);
    }
  }
  addEventListener('resize', layout);
  layout();

  function buildControls() {
    const html = `<h3>Who is playing</h3>
      ${Object.keys(PROFILES).map((id) => `<button class="ctl-profile ${id === profileId ? 'on' : ''}" data-profile="${id}">
        <span class="logos">${PROFILES[id].map((k) => `<img src="${IMG}${REWARDS[k].logo}" alt="">`).join('')}</span>
        <span>${PROFILES[id].map((k) => REWARDS[k].name).join(', ')}</span></button>`).join('')}
      <div class="ctl-row"><button class="ctl-btn" data-reset>Reset game</button><button class="ctl-btn ghost" data-sound>Sound: on</button></div>`;
    document.querySelectorAll('[data-controls]').forEach((c) => {
      c.innerHTML = html;
      c.querySelectorAll('[data-profile]').forEach((b) => b.addEventListener('click', () => {
        store.set('profile', b.dataset.profile);
        location.search = '?p=' + b.dataset.profile;
      }));
      c.querySelector('[data-reset]').addEventListener('click', () => {
        Object.keys(PROFILES).forEach((id) => store.set('done:' + id, null));
        location.reload();
      });
      c.querySelector('[data-sound]').addEventListener('click', () => { Sound.unlock(); applySound(!Sound.enabled); });
    });
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
  addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') presenter.hidden = !presenter.hidden;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onTap(); }
  });

  // QR code to open this prototype on a phone
  try {
    const qr = qrcode(0, 'M');
    qr.addData(location.origin + location.pathname + '?p=' + profileId);
    qr.make();
    $('#qr').innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  } catch (e) { /* QR lib missing: panel still works */ }

  // ---------------------------------------------------------------- boot
  applySound(store.get('sound') !== '0');
  placeSlots((i) => SLOT_IDLE[i]);
  gsap.set(orbs[0], { opacity: 0 });
  gsap.set(pills.slice(1), { opacity: 0 });
  Object.assign(H, { x: STAND[0], _px: STAND[0] });
  if (store.get('done:' + profileId)) {
    toCollectedScene();
    state = 'collected';
    renderList(true, false);
    startAttract();
    state = 'collected';
  } else {
    renderList(false, false);
    startAttract();
  }
  window.__arq = { get state() { return state; }, get station() { return station; }, hero: H, coins, cam };
  requestAnimationFrame((t) => { last = t; frame(t); });
})();
