// Game 2, Claw machine: the claw patrols on its own. Tap to drop it straight down (or drag to aim, release to drop).
// The claw has to be lined up over a capsule. A miss costs nothing (+2 coins), and every miss widens the
// grab window and slows the claw; after 2 misses auto-aim kicks in, so nobody gets stuck.
// Coordinates: "ml" = machine-local points (the cabinet art is 443x411 at scale 1);
// the glass interior is a 173x198 box at ml (136, 146), and its own coords are ix/iy.
(function () {
  const S = window.Shell;
  if (S.gameId !== 'claw') return;
  const { $, IMG, RM, wait, tw, clamp, rand, buzz, imgTag, view, game, scene } = S;

  const H_IDLE = 414;                       // sheet top at 386
  const IN = { x: 136, y: 146, w: 173, h: 198 };
  const ORIGIN_X = 222;                     // zoom pivot, ml
  const CHUTE_X = 21;                       // ix
  const IDLE_L = 12;                        // rod length at rest
  const TOL = 9, NEAR = 16, SPEED = 58;     // grab half-width (ix), near-miss band, patrol speed (ix/s)
  const PATROL = [44, 162];                 // patrol range (ix)
  const CAPS = [{ x: 74, y: 158 }, { x: 110, y: 163 }, { x: 146, y: 156 }];
  const DOOR = { x: 168, y: 367 };          // ml
  const COLORS = [['#ff4d6d', '#c1002f'], ['#ffc23a', '#d27a00'], ['#8f6bff', '#4423c4']];

  let mach, interior, rig, rod, clawSvg, fingers, capsules, pill, doorFlap, dropBtn, marquee, pileItems, aimline;
  const pileTop = (ix) => 166 - 16 * Math.exp(-(((ix - 105) / 48) ** 2));
  const claw = { x: 105, L: IDLE_L, open: 0, sway: 0, jolt: 0 };   // jolt: brief extra drop of the rod
  const M = { s: 1 };                       // machine zoom

  const mlToScreen = (mx, my) => ({ x: -29 + ORIGIN_X + (mx - ORIGIN_X) * M.s, y: my * M.s });
  const inToScreen = (ix, iy) => mlToScreen(IN.x + ix, IN.y + iy);

  // tiny seeded RNG so the prize pile looks the same on every load
  let seed = 7;
  const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const sr = (a, b) => a + srand() * (b - a);

  // ---------------------------------------------------------------- build
  const CLAW_SVG = `<svg viewBox="-25 0 50 46" width="50" height="46" class="claw-svg" aria-hidden="true">
    <defs>
      <linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#8a5a12"/><stop offset=".35" stop-color="#ffe7a3"/><stop offset=".6" stop-color="#e3a832"/><stop offset="1" stop-color="#7a4a0c"/></linearGradient>
      <linearGradient id="goldV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#b9781a"/></linearGradient>
    </defs>
    <path class="f-mid" d="M-1.6,14 L1.6,14 L1.3,39 L0,42.5 L-1.3,39 Z" fill="#9a6418"/>
    <g class="f-left"><path d="M-4,15 C-12,18 -17,26 -15,35 C-14,40 -11,43 -6.5,44 L-5.6,41.2 C-9,39.6 -11,35.6 -11,31 C-11,25 -8,20 -2,17 Z" fill="url(#goldV)" stroke="#7a4a0c" stroke-width=".6"/></g>
    <g class="f-right"><path d="M4,15 C12,18 17,26 15,35 C14,40 11,43 6.5,44 L5.6,41.2 C9,39.6 11,35.6 11,31 C11,25 8,20 2,17 Z" fill="url(#goldV)" stroke="#7a4a0c" stroke-width=".6"/></g>
    <rect x="-8" y="0" width="16" height="11" rx="2" fill="url(#gold)"/>
    <rect x="-10" y="9.5" width="20" height="4.5" rx="1.6" fill="url(#gold)" stroke="#7a4a0c" stroke-width=".5"/>
    <circle cx="0" cy="16" r="3.4" fill="#ffe2a0" stroke="#7a4a0c" stroke-width=".6"/>
  </svg>`;

  // A thick gold coin with a bevelled rim and an embossed "?", seen tilted by T (1 = face-on).
  function coinURI(T) {
    const e = 1.5 + (1 - T) * 7, cy = 24 - e / 2, ry = 21 * T, ri = 16.5 * T;
    const q = `font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="21" text-anchor="middle" transform="translate(0 ${cy}) scale(1 ${T}) translate(0 ${-cy})"`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <defs>
        <linearGradient id="e" x1="0" x2="1"><stop offset="0" stop-color="#6b3a00"/><stop offset=".28" stop-color="#cf9012"/><stop offset=".52" stop-color="#ffd966"/><stop offset=".78" stop-color="#b47006"/><stop offset="1" stop-color="#6b3a00"/></linearGradient>
        <linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".45" stop-color="#e3a523"/><stop offset="1" stop-color="#8a5200"/></linearGradient>
        <radialGradient id="f" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#fff7cf"/><stop offset=".28" stop-color="#ffe07a"/><stop offset=".62" stop-color="#f1b12a"/><stop offset="1" stop-color="#b56f08"/></radialGradient>
        <radialGradient id="s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="24" cy="${cy + e}" rx="21" ry="${ry}" fill="url(#e)"/>
      <rect x="3" y="${cy}" width="42" height="${e}" fill="url(#e)"/>
      <ellipse cx="24" cy="${cy}" rx="21" ry="${ry}" fill="url(#r)"/>
      <ellipse cx="24" cy="${cy}" rx="16.5" ry="${ri}" fill="url(#f)" stroke="#a86504" stroke-opacity=".55" stroke-width=".9"/>
      <text x="23.2" y="${cy + 7.2}" fill="#fff4b8" ${q}>?</text>
      <text x="24" y="${cy + 8}" fill="#c27e0b" ${q}>?</text>
      <ellipse cx="16" cy="${cy - 9 * T}" rx="8" ry="${3.6 * T}" fill="url(#s)" transform="rotate(-24 16 ${cy - 9 * T})"/>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  const capsuleHTML = (c) => `<div class="cap-halo"></div>
    <div class="cap-bot"></div><div class="cap-top" style="--c1:${c[0]};--c2:${c[1]}"></div><div class="cap-band"></div>
    <span class="cap-q">?</span>`;

  function build() {
    scene.innerHTML = `<div class="claw-bg"></div>
      <div class="machine">
        ${imgTag('claw_cabinet.jpg', 'cabinet')}
        <div class="marquee">REWARDS</div>
        <div class="interior">
          <svg class="box" viewBox="0 0 173 198" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="wallBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d4318"/><stop offset=".55" stop-color="#5a1a0a"/><stop offset="1" stop-color="#3a0905"/></linearGradient>
              <linearGradient id="wallSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a1006"/><stop offset="1" stop-color="#6e2a0e"/></linearGradient>
              <linearGradient id="ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9772a"/><stop offset="1" stop-color="#94401a"/></linearGradient>
            </defs>
            <rect width="173" height="198" fill="url(#wallBack)"/>
            <polygon points="0,0 173,0 150,30 23,30" fill="url(#ceil)"/>
            <polygon points="0,0 23,30 23,150 0,198" fill="url(#wallSide)"/>
            <polygon points="173,0 150,30 150,150 173,198" fill="url(#wallSide)" transform="matrix(-1 0 0 1 323 0)" opacity=".001"/>
            <polygon points="173,0 150,30 150,150 173,198" fill="#4a1006"/>
            <polygon points="23,150 150,150 173,198 0,198" fill="#3a0905"/>
            <g stroke="#ffb46a" stroke-opacity=".35" stroke-width=".8" fill="none">
              <polyline points="0,0 23,30 150,30 173,0"/><polyline points="23,30 23,150 150,150 150,30"/>
              <line x1="23" y1="150" x2="0" y2="198"/><line x1="150" y1="150" x2="173" y2="198"/>
            </g>
          </svg>
          <div class="lamp l1"></div><div class="lamp l2"></div>
          <div class="rail"></div>
          <div class="pile"></div>
          <div class="sheen"></div>
          <div class="chute"><span>PRIZE</span></div>
          <div class="aimline"></div>
          <div class="rig"><div class="mount"></div><div class="rod"></div><div class="claw-wrap">${CLAW_SVG}</div></div>
          <div class="glass"></div>
        </div>
        <div class="door"><div class="flap"></div></div>
        <div class="drop-btn" role="button" aria-label="Drop the claw"><div class="cap"></div><span>DROP</span></div>
        <div class="pill claw-pill">${S.pillHTML('Tap to play')}</div>
      </div>`;
    mach = scene.querySelector('.machine');
    interior = scene.querySelector('.interior');
    rig = scene.querySelector('.rig');
    rod = scene.querySelector('.rod');
    clawSvg = scene.querySelector('.claw-wrap');
    fingers = { l: scene.querySelector('.f-left'), r: scene.querySelector('.f-right') };
    pill = scene.querySelector('.claw-pill');
    doorFlap = scene.querySelector('.flap');
    dropBtn = scene.querySelector('.drop-btn');
    marquee = scene.querySelector('.marquee');
    aimline = scene.querySelector('.aimline');

    // prize pile: chunky gold "?" coins, airtel coins, gold balls and gift boxes heaped towards the middle.
    // Back layers are darker for depth; coins lie tilted (squashed vertically) like they're resting in a heap.
    const pile = scene.querySelector('.pile');
    pileItems = [];
    const qCoins = [1, 0.78, 0.6].map(coinURI);
    const SHADE = [0.6, 0.76, 0.9, 1.04, 1.1];
    for (let layer = 0; layer < 5; layer++) {
      for (let ix = 40 + sr(0, 9); ix < 174; ix += sr(11, 16)) {
        const y = pileTop(ix) + layer * 8 + sr(-3, 3);
        const kind = srand();
        let w, cls, inner, tilt = 1;
        if (kind < 0.45) { w = sr(19, 25); cls = 'p-coin'; inner = `<img src="${qCoins[Math.floor(sr(0, 3))]}" alt="" draggable="false">`; }
        else if (kind < 0.68) { w = sr(18, 23); cls = 'p-coin'; inner = imgTag('coin.png'); tilt = sr(0.62, 1); }
        else if (kind < 0.84 && layer < 4) { w = sr(16, 21); cls = 'p-gift'; inner = '<i></i>'; }
        else { w = sr(9, 13); cls = 'p-ball'; inner = ''; }
        const el = document.createElement('div');
        el.className = 'p-item ' + cls;
        el.innerHTML = `<div class="in">${inner}</div>`;
        el.style.cssText = `left:${(ix - w / 2).toFixed(1)}px;top:${(y - w / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${w.toFixed(1)}px;z-index:${Math.round(y / 2)};--r:${sr(-30, 30).toFixed(0)}deg;--t:${tilt.toFixed(2)};--b:${SHADE[layer]}`;
        pile.appendChild(el);
        pileItems.push({ el, x: ix, y, w, layer, coin: cls === 'p-coin' });
      }
    }
    capsules = CAPS.map((c, i) => {
      const el = document.createElement('div');
      el.className = 'capsule';
      el.innerHTML = capsuleHTML(COLORS[i]);
      el.style.zIndex = 170;   // above the pile (z <= 100), below the claw (180)
      pile.appendChild(el);
      const o = { el, i, x: c.x, y: c.y, home: c, got: false, held: false, slip: 0, rot: rand(-14, 14) };
      placeCapsule(o);
      return o;
    });
  }

  function placeCapsule(c) {
    gsap.set(c.el, { x: c.x - 15, y: c.y - 15 + c.slip, rotation: c.rot });
  }

  // ---------------------------------------------------------------- render loop
  let last = performance.now(), patrolP = 0.5, patrolDir = 1;
  const press = { on: false, dragging: false, x0: 0, claw0: 0 };
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const idleish = state === 'attract' || state === 'wait' || state === 'collected';
    if (idleish && !press.on) {
      // constant-speed back-and-forth, so dropping on time is a (gentle) skill
      const span = PATROL[1] - PATROL[0];
      patrolP += patrolDir * (patrolSpeed() / span) * dt;
      if (patrolP > 1) { patrolP = 2 - patrolP; patrolDir = -1; }
      if (patrolP < 0) { patrolP = -patrolP; patrolDir = 1; }
      const target = PATROL[0] + span * patrolP;
      claw.x += (target - claw.x) * Math.min(1, dt * 10);
    }
    rig.style.transform = `translate3d(${claw.x.toFixed(2)}px,0,0)`;
    const L = claw.L + claw.jolt;
    rod.style.height = L.toFixed(1) + 'px';
    clawSvg.style.transform = `translate3d(0,${L.toFixed(1)}px,0) rotate(${claw.sway.toFixed(2)}deg)`;
    const a = -8 + claw.open * 30;
    fingers.l.setAttribute('transform', `rotate(${a.toFixed(1)} -4 15)`);
    fingers.r.setAttribute('transform', `rotate(${(-a).toFixed(1)} 4 15)`);
    // the held capsule rides in the claw
    for (const c of capsules) {
      if (c.held) {
        const r = (claw.sway * Math.PI) / 180;
        c.x = claw.x - Math.sin(r) * 30;
        c.y = 14 + L + Math.cos(r) * 30;
        c.rot = claw.sway * 0.8;
      }
      if (!c.got) placeCapsule(c);
    }
    // aim line from the claw straight down to the pile; it lights up when a capsule is in the grab window
    const aiming = state === 'wait';
    aimline.style.opacity = aiming ? '' : '0';
    if (aiming) {
      const tip = 14 + L + 44, n = nearest(), hit = assist() || (n && Math.abs(n.x - claw.x) <= tol());
      aimline.style.transform = `translate3d(${claw.x.toFixed(2)}px,${tip.toFixed(1)}px,0)`;
      aimline.style.height = Math.max(0, pileTop(claw.x) - 8 - tip).toFixed(1) + 'px';
      aimline.classList.toggle('on', !!hit);
      capsules.forEach((c) => c.el.classList.toggle('aim', !!hit && c === n));
    } else if (state !== 'busy') {
      capsules.forEach((c) => c.el.classList.remove('aim'));
    }
    requestAnimationFrame(frame);
  }
  function nearest() {
    let best = null, d = 1e9;
    for (const c of capsules) if (!c.got && Math.abs(c.x - claw.x) < d) { d = Math.abs(c.x - claw.x); best = c; }
    return best;
  }

  // ---------------------------------------------------------------- difficulty (eases off after every miss)
  let misses = 0;
  const tol = () => Math.min(24, TOL + 5 * misses);
  const assist = () => misses >= 2;
  const patrolSpeed = () => (state === 'attract' || state === 'collected' ? 34 : SPEED * Math.pow(0.8, misses));
  function pillText() { return misses === 0 ? 'Line up & drop' : assist() ? 'Auto-aim on' : 'Try again'; }

  // ---------------------------------------------------------------- feedback
  function word(text, ix, iy, good) {
    const p = inToScreen(ix, iy);
    const w = S.particle('fx-word' + (good ? ' good' : ''), p.x, p.y);
    w.textContent = text;
    gsap.timeline()
      .fromTo(w, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(3)' })
      .to(w, { y: p.y - 26, opacity: 0, duration: 0.6, ease: 'power1.in' }, '+=0.45')
      .add(() => w.remove());
  }
  function jigglePile(x) {
    let flips = 0;
    pileItems.filter((p) => Math.abs(p.x - x) < 34).sort((a, b) => b.layer - a.layer).forEach((p) => {
      const d = Math.abs(p.x - x);
      if (p.coin && flips < 3 && p.layer >= 2) {
        // a few coins flip and hop out of the way
        flips++;
        gsap.timeline()
          .to(p.el, { y: -rand(10, 18), x: (p.x < x ? -1 : 1) * rand(2, 6), rotationY: 180, duration: 0.22, ease: 'power2.out' })
          .to(p.el, { y: 0, x: 0, rotationY: 360, duration: 0.32, ease: 'bounce.out' })
          .set(p.el, { rotationY: 0 });
      } else {
        gsap.fromTo(p.el, { y: 0 }, { y: -rand(2, 6) * (1 - d / 34), duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' });
      }
    });
    if (!RM) {
      for (let i = 0; i < 3; i++) {
        const p = inToScreen(x + rand(-14, 14), 160);
        S.sparkleAt(p.x, p.y);
      }
    }
  }
  // little star glints that pop on random coins near the top of the heap
  function twinkle() {
    if (RM || document.hidden) return;
    const pool = pileItems.filter((p) => p.layer >= 2 && p.y < 186);
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (!p) return;
    const t = document.createElement('div');
    t.className = 'twinkle';
    t.style.left = (p.x + rand(-p.w / 3, p.w / 3)).toFixed(1) + 'px';
    t.style.top = (p.y - p.w / 3).toFixed(1) + 'px';
    pileItems[0].el.parentNode.appendChild(t);
    gsap.timeline().fromTo(t, { scale: 0, rotation: -30 }, { scale: rand(0.7, 1.15), rotation: 15, duration: 0.25, ease: 'back.out(3)' })
      .to(t, { scale: 0, rotation: 60, duration: 0.35, ease: 'power2.in' }).add(() => t.remove());
  }

  function pressButton() {
    gsap.timeline().to(dropBtn, { scaleY: 0.82, y: 2, duration: 0.06 }).to(dropBtn, { scaleY: 1, y: 0, duration: 0.3, ease: 'elastic.out(1, 0.4)' });
  }
  function zoomTo(s, dur) { return tw(M, { s, duration: dur, ease: 'power3.inOut', onUpdate: () => gsap.set(mach, { scale: M.s }) }); }

  // ---------------------------------------------------------------- game flow
  let state = 'attract';          // attract | wait | busy | finale | collected
  let collected = 0, hintT = 0;

  function stopHints() { clearTimeout(hintT); }
  function arrive() {
    state = 'wait';
    stopHints();
    pill.querySelector('span').textContent = pillText();
    hintT = setTimeout(() => S.showPill(pill), misses ? 300 : 900);
  }

  async function startGame() {
    state = 'wait';
    game.classList.add('playing');
    Sound.play('start');
    Sound.music(true);
    buzz(10);
    $('#app').scrollTo({ top: 0, behavior: 'smooth' });
    const H = S.expandedHeight(H_IDLE, 520);
    S.setHeight(H, 0.65);
    S.hidePill(pill);
    await zoomTo(clamp((H - 28 - 8) / 389, 1, 1.25), 0.7);
    if (state === 'wait') arrive();
  }

  async function drop() {
    if (state !== 'wait') return;
    state = 'busy';
    stopHints();
    S.hidePill(pill);
    pressButton();
    Sound.play('tap');
    buzz(8);
    const cap = nearest();
    const dx = Math.abs(cap.x - claw.x);
    const outcome = assist() || dx <= tol() ? 'grab' : dx <= tol() + NEAR ? 'near' : 'miss';
    capsules.forEach((c) => c.el.classList.remove('aim'));
    if (outcome !== 'grab') return missed(outcome, cap);
    const k = collected;
    // down (inside the grab window the claw self-centres on the way down)
    Sound.motor(true);
    gsap.to(claw, { open: 1, duration: 0.25 });
    await Promise.all([
      tw(claw, { x: cap.x, duration: 0.6, ease: 'power2.inOut' }),
      tw(claw, { L: cap.y - 44, duration: 0.85, ease: 'power1.in', delay: 0.08 }),
    ]);
    Sound.motor(false);
    jigglePile(cap.x);
    Sound.play('grab');
    word(assist() ? 'GOT IT!' : dx <= 3 ? 'PERFECT!' : 'NICE!', cap.x, cap.y - 34, true);
    misses = 0;
    await tw(claw, { open: 0, duration: 0.16, ease: 'power2.in' });
    cap.held = true;
    cap.el.classList.add('held');
    buzz(10);
    gsap.fromTo(cap.el, { scaleX: 1.12, scaleY: 0.9 }, { scaleX: 1, scaleY: 1, duration: 0.35, ease: 'elastic.out(1, 0.4)' });
    await wait(140);
    // up, with a little wobble of suspense
    Sound.motor(true);
    gsap.timeline().to(claw, { sway: 6, duration: 0.2 }).to(claw, { sway: -5, duration: 0.3 }).to(claw, { sway: 3, duration: 0.25 }).to(claw, { sway: 0, duration: 0.3 });
    setTimeout(() => { Sound.play('tick'); gsap.fromTo(claw, { jolt: 0 }, { jolt: 4, duration: 0.07, yoyo: true, repeat: 1 }); }, 430);
    await tw(claw, { L: IDLE_L, duration: 0.9, ease: 'power2.inOut' });
    // carry to the chute; the capsule swings with the inertia
    gsap.timeline().to(claw, { sway: -10, duration: 0.3, ease: 'power2.out' }).to(claw, { sway: 8, duration: 0.4, ease: 'power1.inOut' }).to(claw, { sway: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    await tw(claw, { x: CHUTE_X, duration: 0.8, ease: 'power2.inOut' });
    Sound.motor(false);
    await wait(140);
    // release into the chute
    gsap.to(claw, { open: 1, duration: 0.18 });
    Sound.play('drop');
    cap.held = false;
    cap.el.classList.remove('held');
    await tw(cap, { y: 240, rot: cap.rot + 90, duration: 0.34, ease: 'power2.in', onUpdate: () => placeCapsule(cap) });
    cap.got = true;
    gsap.set(cap.el, { opacity: 0 });
    Sound.play('clunk');
    buzz(12);
    gsap.timeline().to(doorFlap, { rotationX: -70, duration: 0.12, transformPerspective: 200 }).to(doorFlap, { rotationX: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    gsap.to(claw, { open: 0, x: 105, duration: 0.7, delay: 0.25, ease: 'power2.inOut' });
    // out of the prize door, up in front of the glass, and pop
    const from = mlToScreen(DOOR.x, DOOR.y), to = mlToScreen(ORIGIN_X, IN.y + 92);
    const ball = S.particle('capsule fx-capsule', from.x, from.y);
    ball.innerHTML = capsuleHTML(COLORS[cap.i]);
    const o = { t: 0 };
    gsap.set(ball, { scale: 0.5 * M.s });
    await tw(o, {
      t: 1, duration: 0.55, ease: 'power2.out',
      onUpdate() {
        const t = o.t, u = 1 - t, cy = Math.min(from.y, to.y) - 70;
        gsap.set(ball, { x: u * u * from.x + 2 * u * t * ((from.x + to.x) / 2) + t * t * to.x, y: u * u * from.y + 2 * u * t * cy + t * t * to.y, scale: (0.5 + t * 1.1) * M.s, rotation: t * 360 });
      },
    });
    gsap.to(ball.querySelector('.cap-top'), { y: -26, x: -14, rotation: -50, opacity: 0, duration: 0.45, ease: 'power2.out' });
    gsap.to(ball.querySelector('.cap-bot'), { y: 22, x: 10, rotation: 30, opacity: 0, duration: 0.45, ease: 'power2.in' });
    gsap.to(ball.querySelectorAll('.cap-band, .cap-q, .cap-halo'), { opacity: 0, duration: 0.15 });
    setTimeout(() => ball.remove(), 500);
    await S.reveal(k, to.x, to.y);
    collected++;
    if (collected === 3) return finale();
    arrive();
  }

  // A near miss catches the capsule's edge and it slips back out; a clean miss comes up empty (+2 coins).
  async function missed(outcome, cap) {
    const x = claw.x;
    Sound.motor(true);
    gsap.to(claw, { open: 1, duration: 0.25 });
    const depth = outcome === 'near' ? cap.y - 44 : pileTop(x) - 40;
    await tw(claw, { L: depth, duration: 0.85, ease: 'power1.in', delay: 0.08 });
    Sound.motor(false);
    jigglePile(x);
    Sound.play('grab');
    await tw(claw, { open: outcome === 'near' ? 0.35 : 0, duration: 0.16, ease: 'power2.in' });
    await wait(120);
    Sound.motor(true);
    if (outcome === 'near') {
      // lift the capsule a little by its edge, then it slips and bounces back into the pile
      const side = Math.sign(cap.x - x) || 1;
      const lift = tw(claw, { L: depth - 26, duration: 0.45, ease: 'power2.out' });
      gsap.to(cap, { y: cap.y - 22, rot: cap.rot + side * 25, duration: 0.4, ease: 'power2.out', onUpdate: () => placeCapsule(cap) });
      await lift;
      Sound.motor(false);
      Sound.play('tick');
      gsap.to(claw, { sway: -side * 8, duration: 0.12, yoyo: true, repeat: 1 });
      word('SO CLOSE!', cap.x, cap.y - 36);
      const homeX = clamp(cap.home.x + side * rand(2, 5), 60, 156);
      cap.home = { x: homeX, y: cap.home.y };
      await tw(cap, { x: homeX, y: cap.home.y, rot: rand(-14, 14), duration: 0.55, ease: 'bounce.out', onUpdate: () => placeCapsule(cap) });
      Sound.play('land');
      Sound.motor(true);
      await tw(claw, { L: IDLE_L, open: 0, duration: 0.6, ease: 'power2.inOut' });
    } else {
      const up = tw(claw, { L: IDLE_L, duration: 0.8, ease: 'power2.inOut' });
      gsap.timeline({ delay: 0.3 }).to(claw, { sway: 7, duration: 0.12 }).to(claw, { sway: -7, duration: 0.14 }).to(claw, { sway: 0, duration: 0.3, ease: 'elastic.out(1, 0.4)' });
      word('MISSED!', x, pileTop(x) - 40);
      const p = inToScreen(x, pileTop(x) - 10);
      setTimeout(() => { Sound.play('coin'); S.addCoins(2, p.x, p.y); }, 350);
      await up;
    }
    Sound.motor(false);
    buzz(6);
    misses++;
    arrive();
  }

  async function finale() {
    state = 'finale';
    Sound.music(false);
    Sound.play('fanfare');
    marquee.classList.add('lit');
    interior.classList.add('party');
    S.fireworks(3, null, 200);
    await wait(800);
    S.showFinale(clamp(Math.round((view.H - 28 - 268) / 2) + 10, 96, 300));
  }

  // ---------------------------------------------------------------- collected / replay
  function toCollected() {
    state = 'collected';
    stopHints();
    gsap.killTweensOf(M);
    M.s = 1;
    gsap.set(mach, { scale: 1 });
    marquee.classList.remove('lit');
    interior.classList.remove('party');
    capsules.forEach((c) => { c.got = true; c.held = false; gsap.set(c.el, { opacity: 0 }); });
    Object.assign(claw, { L: IDLE_L, open: 0, sway: 0 });
    pill.querySelector('span').textContent = 'Play again';
    pill.classList.add('button');
    gsap.set(pill, { scale: 1, opacity: 1, y: 0 });
  }
  function reset() {
    collected = 0;
    capsules.forEach((c) => {
      c.home = CAPS[c.i];
      Object.assign(c, { got: false, held: false, slip: 0, x: c.home.x, y: c.home.y });
      gsap.set(c.el, { opacity: 1 });
      placeCapsule(c);
    });
    misses = 0;
    pill.querySelector('span').textContent = 'Tap to play';
    pill.classList.remove('button');
    gsap.set(pill, { scale: 1, opacity: 1, y: 0 });
    state = 'attract';
  }

  // ---------------------------------------------------------------- input: tap to drop, or drag to aim and release
  function unitsPerPx() { return 375 / game.getBoundingClientRect().width / M.s; }
  function onPointerDown(e) {
    if (state === 'busy' || state === 'finale') return;   // no tap buffering: aiming matters here
    if (state === 'collected') {
      // nothing left: the claw does a happy little shimmy
      Sound.play('hop');
      gsap.timeline().to(claw, { open: 1, duration: 0.12 }).to(claw, { open: 0, duration: 0.12 }).to(claw, { open: 1, duration: 0.12 }).to(claw, { open: 0, duration: 0.2 });
      jigglePile(claw.x);
      return;
    }
    if (state === 'attract') { startGame(); return; }
    press.on = true; press.dragging = false; press.x0 = e.clientX; press.claw0 = claw.x;
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp, { once: true });
    addEventListener('pointercancel', onUp, { once: true });
  }
  function onMove(e) {
    const dx = e.clientX - press.x0;
    if (Math.abs(dx) > 4) press.dragging = true;
    if (press.dragging) {
      if (press.dragging === true && Math.abs(dx) > 4 && !press.moved) { press.moved = true; Sound.motor(true); }
      claw.x = clamp(press.claw0 + dx * unitsPerPx(), 44, 160);
    }
  }
  function onUp() {
    removeEventListener('pointermove', onMove);
    if (press.moved) Sound.motor(false);
    press.on = false; press.moved = false;
    drop();
  }
  function onTap() {
    if (state === 'attract') { startGame(); return; }
    if (state === 'wait') drop();
  }

  S.boot({
    H_IDLE,
    page: [{ src: 'claw_page_top.jpg', h: 818 }, { src: 'claw_page_bottom.jpg', h: 742 }],
    teaserIcon: 'coin.png',
    slotRest: (i) => S.SLOT_HUD(i),
    build,
    start(done) {
      if (!done) state = 'attract';
      requestAnimationFrame((t) => { last = t; frame(t); });
      setInterval(twinkle, 420);
      // the marquee flickers on like a real arcade sign
      gsap.fromTo(marquee, { opacity: 0.4 }, { opacity: 1, duration: 0.08, repeat: 5, yoyo: true, delay: 0.3 });
    },
    toCollected, reset, onTap, onPointerDown,
    isPlaying: () => state === 'busy' || state === 'wait',
  });
  window.__arq = { get state() { return state; }, get misses() { return misses; }, claw, capsules };
})();
