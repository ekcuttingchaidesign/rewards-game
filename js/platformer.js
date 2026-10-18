// Game 1, Platformer: the hero runs right and collects the 3 rewards (block bump, pipe stomp, mushroom bounce).
// World items use x = centre, alt = height above the grass, in design points.
(function () {
  const S = window.Shell;
  if (S.gameId !== 'platformer') return;
  const { $, IMG, RM, wait, tw, clamp, rand, buzz, imgTag, view, game, scene } = S;

  const H_IDLE = 540;          // section height; the sheet overlaps the last 28pt
  const GROUND = 65;           // grass top, measured up from the section bottom
  const WORLD_END = 1385;
  const SLOT_IDLE = [{ x: 117.5, y: 241.5, s: 49 / 48 }, { x: 183, y: 266, s: 1 }, { x: 262, y: 242, s: 1 }];
  const BLOCK = { x: 182.5, alt: 143 };
  const PIPE = { x: 640, top: 84 };
  const MUSH = { x: 880, top: 50 };
  const PLAT = { x: 1000, top: 215 };
  const POLE = { x: 1200, h: 250 };
  const STAND = [118, 578, 828];   // where the hero waits before each action

  const cam = { x: 0, follow: true };
  const shake = { x: 0, y: 0 };
  const groundY = () => view.H - GROUND;
  const toScreen = (x, alt) => ({ x: x - cam.x + shake.x, y: groundY() - alt + shake.y });

  let world, ground, titleL, cloudsL, orbs, block, blockImg, pipe, mush, flag, pills, coins, heroWrap, hero, H;

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
  function build() {
    scene.innerHTML = `<div id="clouds" class="layer"></div>
      <div id="title" class="layer">
        <img class="airtel" src="${IMG}airtel_wordmark.svg" alt="airtel" draggable="false">
        <div class="rewards-title">${imgTag('rewards_title.png')}<div class="shine"></div></div>
        <p class="ready">Ready to claim</p>
      </div>
      <div id="ground"></div>
      <div id="world"></div>`;
    world = $('#world'); ground = $('#ground'); titleL = $('#title'); cloudsL = $('#clouds');

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
    orbs = [
      add(world, 'orb', BLOCK.x, 148, 40, 40, orbHTML),
      add(world, 'orb', PIPE.x, 40, 44, 44, orbHTML),
      add(world, 'orb', PLAT.x, 262, 44, 44, orbHTML),
    ];
    block = add(world, 'block', BLOCK.x, BLOCK.alt, 47, 41, imgTag('qblock_airtel.png') + '<div class="glint"></div>');
    blockImg = block.querySelector('img');
    pipe = add(world, 'pipe', PIPE.x, -7, 84, 91, imgTag('pipe.png'));
    mush = add(world, 'mush', MUSH.x, -5, 60, 57, imgTag('mushroom.png'));
    add(world, 'plat', PLAT.x, PLAT.top - 44, 130, 45, imgTag('brick.png'));
    add(world, 'pole', POLE.x, 0, 6, POLE.h);
    add(world, 'finial', POLE.x, POLE.h - 6, 20, 20, imgTag('coin.png'));
    add(world, 'pole-base', POLE.x, -2, 26, 14);
    flag = add(world, 'flag', POLE.x + 31, 0, 56, 38, `<div class="cloth"><img src="${IMG}airtel_wordmark.svg" alt="" draggable="false"></div>`);

    pills = [
      add(world, 'pill', 188, 86, 122, 23, S.pillHTML('Tap to reveal')),
      add(world, 'pill', 598, 196, 122, 23, S.pillHTML('Tap to jump')),
      add(world, 'pill', 848, 126, 122, 23, S.pillHTML('Tap to bounce')),
    ];

    // coins: a trail on the ground pointing right, plus a few placed exactly on later jump arcs
    const coinSpots = [[292, 34], [324, 34], [356, 34]];
    [0.3, 0.5, 0.7].forEach((t) => { const p = arcAt(PIPE.x, PIPE.top, 716, 0, 150, t); coinSpots.push([p.x, p.alt + 36]); });
    [0.35, 0.65].forEach((t) => { const p = arcAt(PLAT.x, PLAT.top, POLE.x - 10, 168, 285, t); coinSpots.push([p.x, p.alt + 36]); });
    coins = coinSpots.map(([x, a]) => ({ x, a, el: add(world, 'coin', x, a - 11, 22, 22, imgTag('coin.png')), got: false }));

    heroWrap = document.createElement('div');
    heroWrap.className = 'hero';
    world.appendChild(heroWrap);
    hero = Hero.create(heroWrap);
    H = hero.s;
    Object.assign(H, { x: STAND[0], _px: STAND[0] });
    gsap.set(orbs[0], { opacity: 0 });
    gsap.set(pills.slice(1), { opacity: 0 });
  }

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
  function dust(x, alt, n = 6) {
    const p = toScreen(x, alt);
    for (let i = 0; i < n; i++) {
      const d = S.particle('fx-dust', p.x + rand(-8, 8), p.y - 2);
      const dir = i % 2 ? 1 : -1;
      gsap.to(d, { x: `+=${dir * rand(10, 24)}`, y: `-=${rand(4, 12)}`, scale: rand(0.4, 1.2), opacity: 0, duration: rand(0.3, 0.45), ease: 'power2.out', onComplete: S.kill(d) });
    }
  }
  function grabCoin(c) {
    c.got = true;
    Sound.play('coin');
    gsap.to(c.el, { y: -38, opacity: 0, duration: 0.42, ease: 'power2.out' });
    const p = toScreen(c.x, c.a + 8);
    S.addCoins(1, p.x, p.y);
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

  // ---------------------------------------------------------------- game flow
  let state = 'attract';      // attract | busy | wait | finale | collected
  let station = 0, queuedAt = -1e9, hintT = 0, wiggleT = 0, attractT = 0;

  function wiggle(k) {
    if (k === 0) {
      gsap.timeline().to(blockImg, { y: -6, duration: 0.09, ease: 'power2.out' }).to(blockImg, { y: 0, duration: 0.35, ease: 'bounce.out' });
      const p = toScreen(BLOCK.x, BLOCK.alt + 20);
      S.sparkleAt(p.x + rand(-30, 30), p.y + rand(-18, 6));
    } else if (k === 1) {
      gsap.fromTo(orbs[1], { rotation: -14 }, { rotation: 0, duration: 0.7, ease: 'elastic.out(1.2, 0.3)' });
    } else {
      gsap.timeline().to(mush, { scaleY: 0.86, scaleX: 1.1, duration: 0.1, transformOrigin: '50% 100%' }).to(mush, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
      const p = toScreen(PLAT.x, 285);
      S.sparkleAt(p.x + rand(-26, 26), p.y + rand(-20, 20));
    }
  }
  function stopHints() { clearTimeout(hintT); clearInterval(wiggleT); }
  function arrive(k) {
    state = 'wait';
    station = k;
    // a tap made just before arriving counts (forgiving input buffer)
    if (performance.now() - queuedAt < 450) { queuedAt = -1e9; setTimeout(() => act(k), 140); return; }
    stopHints();
    hintT = setTimeout(() => S.showPill(pills[k]), 900);
    wiggleT = setInterval(() => wiggle(k), 2300);
    setTimeout(() => state === 'wait' && station === k && wiggle(k), 500);
  }
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
      const sp = S.slotPos(Math.floor(rand(0, 3)));
      S.sparkleAt(sp.x + rand(-26, 26), sp.y + rand(-26, 22));
      if (Math.random() < 0.35 && H.mode === 'idle') { H.mode = 'lookUp'; setTimeout(() => { if (H.mode === 'lookUp') H.mode = 'idle'; }, 1100); }
    }, 1500);
    // the pipe's reward peeks out now and then
    gsap.timeline({ repeat: -1, repeatDelay: 1.6, id: 'peek' })
      .to(orbs[1], { y: -52, duration: 0.5, ease: 'back.out(1.6)' })
      .to(orbs[1], { y: 0, duration: 0.4, ease: 'power2.in' }, '+=0.8');
  }

  async function startGame() {
    state = 'busy';
    stopHints();
    game.classList.add('playing');
    S.hidePill(pills[0]);
    Sound.play('start');
    Sound.music(true);
    buzz(10);
    $('#app').scrollTo({ top: 0, behavior: 'smooth' });
    S.setHeight(S.expandedHeight(H_IDLE, 700), 0.65);
    S.moveSlots(S.SLOT_HUD);
    await actBlock();
  }

  async function actBlock() {
    state = 'busy';
    stopHints();
    S.hidePill(pills[0]);
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
    for (let i = 0; i < 4; i++) setTimeout(() => S.sparkleAt(top.x + rand(-24, 24), top.y + rand(-10, 4)), i * 50);
    block.classList.add('used');
    const orb = orbs[0];
    gsap.set(orb, { opacity: 1 });
    gsap.fromTo(orb, { y: 0, scale: 0.5 }, { y: -58, scale: 1, duration: 0.42, ease: 'back.out(2)', delay: 0.05 });
    await wait(80);
    tw(H, { alt: 0, duration: 0.3, ease: 'power2.in' }).then(() => land());
    await wait(470);
    const p = toScreen(BLOCK.x, 148 + 58 + 20);
    gsap.set(orb, { opacity: 0 });
    const done = S.reveal(0, p.x, p.y);
    await wait(650);
    await runTo(STAND[1]);
    gsap.getById('peek') && gsap.getById('peek').kill();
    gsap.to(orbs[1], { y: -62, duration: 0.55, ease: 'back.out(1.8)' });
    await done;
    arrive(1);
  }

  async function actPipe() {
    state = 'busy';
    stopHints();
    S.hidePill(pills[1]);
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
        revealed = S.reveal(1, p.x, p.y);
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
    stopHints();
    S.hidePill(pills[2]);
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
        revealed = S.reveal(2, p.x, p.y);
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
    S.fireworks(3, null, groundY() - 220);
    await wait(650);
    state = 'finale';
    S.showFinale(clamp(Math.round((groundY() - 268) / 2) + 18, 100, 400));
  }

  // ---------------------------------------------------------------- collected / replay
  function toCollected() {
    state = 'collected';
    stopHints();
    game.classList.remove('playing');
    gsap.killTweensOf(H);
    Object.assign(H, { x: STAND[0], alt: 0, sx: 1, sy: 1, face: 1, mode: 'idle' });
    H._px = H.x; H._palt = 0;
    cam.x = 0;
    block.classList.add('used');
    orbs.forEach((o) => gsap.set(o, { opacity: 0 }));
    const p = pills[0];
    p.querySelector('span').textContent = 'Play again';
    p.classList.add('button');
    gsap.set(p, { scale: 1, opacity: 1, y: 0 });
  }
  function reset() {
    gsap.killTweensOf([...orbs, blockImg, flag, ...pills, mush, pipe, H]);
    block.classList.remove('used');
    orbs.forEach((o, i) => gsap.set(o, { opacity: i === 0 ? 0 : 1, y: 0, scale: 1, rotation: 0 }));
    gsap.set(flag, { y: 0 });
    coins.forEach((c) => { c.got = false; gsap.set(c.el, { y: 0, opacity: 1 }); });
    const p = pills[0];
    p.querySelector('span').textContent = 'Tap to reveal';
    p.classList.remove('button');
    gsap.set(pills, { opacity: 0, scale: 1, y: 0 });
    gsap.set(p, { opacity: 1 });
    Object.assign(H, { x: STAND[0], alt: 0, mode: 'idle', face: 1, sx: 1, sy: 1 });
    startAttract();
  }

  // ---------------------------------------------------------------- input
  function onTap() {
    if (state === 'attract') return startGame();
    if (state === 'wait') { stopHints(); return act(station); }
    if (state === 'busy') { queuedAt = performance.now(); return; }
    if (state === 'collected' && H.mode === 'idle' && H.alt === 0) {
      // nothing left to collect: the hero just celebrates
      Sound.play('hop');
      H.mode = 'cheer';
      gsap.timeline().to(H, { alt: 34, duration: 0.22, ease: 'power2.out' }).to(H, { alt: 0, duration: 0.24, ease: 'power2.in', onComplete: () => land(true) });
      S.slots.forEach((s, i) => gsap.fromTo(s.inner, { y: 0 }, { y: -10, duration: 0.16, delay: i * 0.06, yoyo: true, repeat: 1, ease: 'power2.out' }));
    }
  }

  S.boot({
    H_IDLE,
    page: [{ src: 'page_top.jpg', h: 855 }, { src: 'page_bottom.jpg', h: 582 }],
    teaserIcon: 'qblock_airtel.png',
    slotRest: (i) => SLOT_IDLE[i],
    build,
    start(done) {
      startAttract();
      if (done) state = 'collected';
      requestAnimationFrame((t) => { last = t; frame(t); });
    },
    toCollected, reset, onTap,
    onPointerDown: onTap,
    isPlaying: () => state === 'busy' || state === 'wait',
  });
  window.__arq = { get state() { return state; }, get station() { return station; }, hero: H, coins, cam };
})();
