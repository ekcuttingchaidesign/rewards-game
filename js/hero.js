// The hero: a low-poly red ninja drawn in SVG and posed procedurally every frame.
// Coordinates: feet at (0,0), up is negative y. Angles are degrees, "forward" positive.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const C = {
    main: '#E8232B', light: '#FF5A5E', dark: '#B3121B',
    back: '#BC1520', backDark: '#8E0D15',
    white: '#FFFFFF', shade: '#DADDE5', eye: '#2A1013',
  };

  const POSES = {
    idle:    { hipF: 4,  kneeF: 6,  hipB: -5,  kneeB: 8,  shF: 10,  elF: 30, shB: -12, elB: 30, lean: 2,   head: 0,   bob: 0 },
    lookUp:  { hipF: 4,  kneeF: 6,  hipB: -5,  kneeB: 8,  shF: 18,  elF: 40, shB: -12, elB: 30, lean: -3,  head: -20, bob: 0 },
    crouch:  { hipF: 38, kneeF: 70, hipB: 22,  kneeB: 70, shF: -25, elF: 50, shB: -35, elB: 50, lean: 16,  head: 6,   bob: -6 },
    jump:    { hipF: 60, kneeF: 85, hipB: -18, kneeB: 55, shF: 150, elF: 8,  shB: -45, elB: 45, lean: 4,   head: -8,  bob: 0 },
    fall:    { hipF: 28, kneeF: 30, hipB: -12, kneeB: 40, shF: 115, elF: 25, shB: 75,  elB: 35, lean: 2,   head: 4,   bob: 0 },
    brake:   { hipF: 34, kneeF: 12, hipB: -28, kneeB: 34, shF: 45,  elF: 30, shB: -55, elB: 30, lean: -12, head: -4,  bob: -2 },
    pole:    { hipF: 45, kneeF: 75, hipB: 28,  kneeB: 85, shF: 150, elF: 45, shB: 138, elB: 55, lean: 0,   head: -6,  bob: 0 },
    victory: { hipF: 12, kneeF: 8,  hipB: -14, kneeB: 10, shF: 95, elF: 70, shB: -95, elB: -60, lean: -5,  head: -12, bob: 0 },
    cheer:   { hipF: 40, kneeF: 70, hipB: -10, kneeB: 60, shF: 135, elF: 0,  shB: -140, elB: -6, lean: -4,  head: -14, bob: 0 },
  };
  const KEYS = Object.keys(POSES.idle);
  const SCALE = 1.1;   // hero is ~73pt tall on screen

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const poly = (pts, fill, parent) => el('polygon', { points: pts, fill }, parent);

  function buildLeg(parent, back) {
    const m = back ? C.back : C.main, d = back ? C.backDark : C.dark, l = back ? C.back : C.light;
    const hip = el('g', {}, parent);
    poly('-4.8,-1 4.8,-1 4,11 -3.8,11', m, hip);
    poly('0,-1 4.8,-1 4,11 0.5,11', l, hip);
    const knee = el('g', {}, hip);
    poly('-3.8,0 4,0 3.4,10 -3.2,10', m, knee);
    poly('-3.8,0 -0.5,0 -0.4,10 -3.2,10', d, knee);
    poly('-3.4,8.6 5.4,8.4 7.6,11.6 6.8,12.6 -3.4,12.6', d, knee);      // boot
    poly('-1,8.6 5.4,8.4 7.6,11.6 2,11.4', m, knee);
    return { hip, knee };
  }

  function buildArm(parent, back) {
    const m = back ? C.back : C.main, d = back ? C.backDark : C.dark, l = back ? C.back : C.light;
    const sh = el('g', {}, parent);
    poly('-3.4,-1.5 3.4,-1.5 2.8,9 -2.7,9', m, sh);
    poly('0,-1.5 3.4,-1.5 2.8,9 0.4,9', l, sh);
    const elb = el('g', { transform: 'translate(0,9)' }, sh);
    const fore = el('g', {}, elb);
    poly('-2.4,-0.5 2.4,-0.5 2.1,8 -2.0,8', m, fore);
    poly('-2.4,-0.5 -0.3,-0.5 -0.2,8 -2.0,8', d, fore);
    poly('-3,7.4 0.2,6.6 3.2,7.6 3,11 0,12.4 -3,11', d, fore);         // mitten
    poly('0.2,6.6 3.2,7.6 3,11 0.4,11.6', m, fore);
    return { sh, fore };
  }

  function create(container) {
    const svg = el('svg', { viewBox: '-46 -86 92 90', width: 92, height: 90, class: 'hero-svg', 'aria-hidden': 'true' });
    const root = el('g', {}, svg);
    const tailsBack = el('g', {}, root);
    const tail2 = el('path', { fill: C.shade }, tailsBack);
    const tail1 = el('path', { fill: C.white }, tailsBack);
    const legB = buildLeg(root, true);
    const upperB = el('g', {}, root);              // back arm, rotates with the torso lean
    const armB = buildArm(upperB, true);
    const legF = buildLeg(root, false);
    const upper = el('g', {}, root);
    // torso
    poly('-7.4,1 7.4,1 8.4,-11 5.2,-17 -5.2,-17 -8.4,-11', C.main, upper);
    poly('0,1 7.4,1 8.4,-11 5.2,-17 0.5,-17', C.light, upper);
    poly('-7.4,1 -2,1 -3,-9 -8.4,-11', C.dark, upper);
    poly('-5,-2 5,-2 4.6,0.6 -5,0.6', C.dark, upper);                  // belt
    // scarf band
    poly('-6.6,-19.5 6.8,-19.5 7.6,-15 -6.8,-14.6', C.white, upper);
    poly('-6.6,-19.5 -1,-19.5 -1.4,-14.8 -6.8,-14.6', C.shade, upper);
    // head
    const head = el('g', {}, upper);
    const hood = 'M-10.5,-26 C-12.5,-38 -4,-44.5 4.5,-43.5 C12.5,-42.5 15.5,-35.5 14.6,-28 C13.6,-20.5 7.5,-17.6 0.5,-17.6 C-6,-17.6 -9.6,-21 -10.5,-26 Z';
    el('path', { d: hood, fill: C.main }, head);
    el('path', { d: 'M-10.5,-26 C-12.5,-38 -4,-44.5 4.5,-43.5 L-1,-31 Z', fill: C.light }, head);
    el('path', { d: 'M-10.5,-26 L-1,-31 L0.5,-17.6 C-6,-17.6 -9.6,-21 -10.5,-26 Z', fill: C.dark }, head);
    poly('-7.8,-37 -18.5,-42.5 -10.6,-30.5', C.main, head);            // hood point
    poly('-7.8,-37 -18.5,-42.5 -11.5,-36', C.light, head);
    // face mask
    el('path', { d: 'M3,-35.5 C9,-37.5 14.6,-33.5 14.4,-27.8 C14.2,-22.4 10,-20.2 6,-21 C1.8,-21.8 0.2,-26 0.6,-29.6 C0.9,-32.2 1.6,-34.8 3,-35.5 Z', fill: C.white }, head);
    el('path', { d: 'M3,-35.5 C1.6,-34.8 0.9,-32.2 0.6,-29.6 C0.2,-26 1.8,-21.8 6,-21 C3.6,-24 3,-29 3,-35.5 Z', fill: C.shade }, head);
    const eyes = el('g', {}, head);
    el('ellipse', { cx: 7.3, cy: -29.2, rx: 1.15, ry: 1.9, fill: C.eye }, eyes);
    el('ellipse', { cx: 11.6, cy: -29.2, rx: 1.05, ry: 1.85, fill: C.eye }, eyes);
    const armF = buildArm(upper, false);
    container.appendChild(svg);

    const s = {
      x: 0, alt: 0, sx: 1, sy: 1, face: 1,
      mode: 'idle', phase: 0, vx: 0, valt: 0,
      _px: 0, _palt: 0, _t: 0, _blink: 2.5, _tail: { x: -0.4, y: 1 },
      pose: Object.assign({}, POSES.idle),
    };

    function target() {
      if (s.mode === 'run') {
        const a = Math.sin(s.phase), b = Math.cos(s.phase);
        return {
          hipF: 42 * a, kneeF: 14 + 72 * Math.max(0, b),
          hipB: -42 * a, kneeB: 14 + 72 * Math.max(0, -b),
          shF: 18 - 50 * a, elF: 80, shB: 18 + 50 * a, elB: 80,
          lean: 15, head: -2, bob: -1.6 * Math.abs(b) + 0.6,
        };
      }
      if (s.mode === 'air') return s.valt > 20 ? POSES.jump : POSES.fall;
      const p = POSES[s.mode] || POSES.idle;
      if (s.mode === 'idle') return Object.assign({}, p, { bob: Math.sin(s._t * 2.2) * 0.6, shF: p.shF + Math.sin(s._t * 2.2) * 3 });
      if (s.mode === 'victory') return Object.assign({}, p, { shF: p.shF + Math.sin(s._t * 9) * 10, shB: p.shB - Math.sin(s._t * 9) * 10 });
      return p;
    }

    function tailPath(len, phaseOff, width, dirx, diry, speed) {
      const N = 7, ox = -5.5, oy = -17;
      const nx = -diry, ny = dirx;                  // perpendicular
      const amp = 1 + Math.min(1, speed / 200) * 2.6;
      const L = [], R = [];
      for (let i = 0; i <= N; i++) {
        const f = i / N, d = f * len;
        const w = Math.sin(s._t * (6 + speed / 40) - i * 0.95 + phaseOff) * amp * f;
        const px = ox + dirx * d + nx * w, py = oy + diry * d + ny * w + f * f * 2;
        const hw = width * (1 - f * 0.55);
        L.push([px + nx * hw, py + ny * hw]); R.push([px - nx * hw, py - ny * hw]);
      }
      const pts = L.concat(R.reverse());
      return 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';
    }

    function update(dt) {
      if (dt <= 0) return;
      s._t += dt;
      const vx = (s.x - s._px) / dt, valt = (s.alt - s._palt) / dt;
      s.vx += (vx - s.vx) * Math.min(1, dt * 14);
      s.valt += (valt - s.valt) * Math.min(1, dt * 14);
      s._px = s.x; s._palt = s.alt;
      if (s.mode === 'run') s.phase += dt * Math.max(10, Math.abs(s.vx) * 0.085);

      const t = target(), k = s.mode === 'run' ? 1 - Math.exp(-dt * 30) : 1 - Math.exp(-dt * 16);
      for (const key of KEYS) s.pose[key] += (t[key] - s.pose[key]) * k;
      const p = s.pose;

      // blink
      s._blink -= dt;
      let eyeS = 1;
      if (s._blink < 0.12) eyeS = Math.abs(s._blink - 0.06) / 0.06;
      if (s._blink < 0) s._blink = 2.2 + Math.random() * 2.4;
      eyes.setAttribute('transform', `translate(0,-29.2) scale(1,${Math.max(0.12, eyeS).toFixed(2)}) translate(0,29.2)`);

      root.setAttribute('transform', `translate(0,${p.bob.toFixed(2)}) scale(${(s.face * s.sx * SCALE).toFixed(3)},${(s.sy * SCALE).toFixed(3)})`);
      const hip = 'translate(0,-22)';
      legF.hip.setAttribute('transform', `${hip} rotate(${(-p.hipF).toFixed(1)})`);
      legF.knee.setAttribute('transform', `translate(0,11) rotate(${p.kneeF.toFixed(1)})`);
      legB.hip.setAttribute('transform', `${hip} rotate(${(-p.hipB).toFixed(1)})`);
      legB.knee.setAttribute('transform', `translate(0,11) rotate(${p.kneeB.toFixed(1)})`);
      const up = `translate(0,-22) rotate(${p.lean.toFixed(1)})`;
      upper.setAttribute('transform', up);
      upperB.setAttribute('transform', up);
      head.setAttribute('transform', `translate(0,-19) rotate(${p.head.toFixed(1)}) translate(0,19)`);
      armF.sh.setAttribute('transform', `translate(0,-14.5) rotate(${(-p.shF).toFixed(1)})`);
      armF.fore.setAttribute('transform', `rotate(${(-p.elF).toFixed(1)})`);
      armB.sh.setAttribute('transform', `translate(1,-14.5) rotate(${(-p.shB).toFixed(1)})`);
      armB.fore.setAttribute('transform', `rotate(${(-p.elB).toFixed(1)})`);

      // scarf tails stream against the direction of travel and droop with gravity
      const breeze = Math.sin(s._t * 1.3) * 0.12;
      let dx = -s.vx * s.face / 230 - 0.95, dy = s.valt / 230 + 0.55 + breeze;
      if (s.mode === 'pole') { dx = -0.3; dy = -0.6; }
      const m = Math.hypot(dx, dy) || 1;
      s._tail.x += (dx / m - s._tail.x) * Math.min(1, dt * 7);
      s._tail.y += (dy / m - s._tail.y) * Math.min(1, dt * 7);
      const sp = Math.hypot(s.vx, s.valt);
      tailsBack.setAttribute('transform', up);
      tail1.setAttribute('d', tailPath(34, 0, 3.4, s._tail.x, s._tail.y, sp));
      tail2.setAttribute('d', tailPath(26, 1.7, 2.8, s._tail.x * 0.95, s._tail.y * 1.05 + 0.12, sp));
    }

    return { svg, s, update };
  }

  window.Hero = { create, POSES };
})();
