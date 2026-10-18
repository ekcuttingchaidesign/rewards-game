// Tiny chiptune synth: every sound is generated with WebAudio (no audio files, all original).
(function () {
  let ctx = null, master, sfx, mus, lp, noiseBuf;
  let enabled = true;
  let musicOn = false, musicStep = 0, nextTime = 0, timer = null;

  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const hz = (n) => {
    const m = /^([A-G]#?)(\d)$/.exec(n);
    return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
  };

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
      master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ctx.destination);
      lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.connect(master);
      sfx = ctx.createGain(); sfx.gain.value = 0.55; sfx.connect(lp);
      mus = ctx.createGain(); mus.gain.value = 0; mus.connect(lp);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(o) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.t || 0), dur = o.dur || 0.1, vol = o.vol || 0.2;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || dur));
    if (o.f3) osc.frequency.exponentialRampToValueAtTime(o.f3, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.dest || sfx);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(o) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.t || 0), dur = o.dur || 0.08;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    f.Q.value = o.q || 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfx);
    src.start(t); src.stop(t + dur + 0.02);
  }

  const arp = (notes, step, o) => notes.forEach((n, i) => tone(Object.assign({}, o, { f: hz(n), t: (o.t || 0) + i * step })));

  const SFX = {
    start() { arp(['C5', 'G5', 'C6'], 0.07, { type: 'square', dur: 0.12, vol: 0.09 }); noise({ filter: 'bandpass', f: 500, f2: 2600, dur: 0.32, vol: 0.12, q: 1.2 }); },
    whoosh() { noise({ filter: 'bandpass', f: 400, f2: 2400, dur: 0.3, vol: 0.12, q: 1.4 }); },
    jump() { tone({ type: 'square', f: 250, f2: 640, dur: 0.16, vol: 0.09 }); tone({ type: 'triangle', f: 125, f2: 320, dur: 0.16, vol: 0.18 }); },
    hop() { tone({ type: 'square', f: 320, f2: 560, dur: 0.1, vol: 0.07 }); },
    bump() { tone({ type: 'triangle', f: 150, f2: 60, dur: 0.14, vol: 0.45 }); noise({ f: 900, dur: 0.07, vol: 0.25 }); },
    land() { noise({ f: 420, dur: 0.06, vol: 0.18 }); },
    coin() { tone({ type: 'square', f: hz('E6'), dur: 0.07, vol: 0.06 }); tone({ type: 'square', f: hz('B6'), t: 0.06, dur: 0.22, vol: 0.06 }); },
    pop() { noise({ filter: 'highpass', f: 1800, dur: 0.09, vol: 0.22 }); tone({ type: 'sine', f: 700, f2: 1900, dur: 0.07, vol: 0.18 }); },
    reveal() {
      arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.045, { type: 'square', dur: 0.14, vol: 0.06 });
      arp(['C4', 'G4', 'C5'], 0.09, { type: 'triangle', dur: 0.2, vol: 0.16 });
      tone({ type: 'sine', f: hz('C7'), t: 0.28, dur: 0.5, vol: 0.05 });
      tone({ type: 'sine', f: hz('G7'), t: 0.34, dur: 0.45, vol: 0.03 });
    },
    collect() { tone({ type: 'sine', f: hz('G6'), dur: 0.22, vol: 0.12 }); tone({ type: 'sine', f: hz('C7'), t: 0.07, dur: 0.32, vol: 0.1 }); },
    boing() { tone({ type: 'triangle', f: 160, f2: 620, f3: 420, slide: 0.12, dur: 0.32, vol: 0.3 }); tone({ type: 'square', f: 320, f2: 1240, slide: 0.12, dur: 0.18, vol: 0.04 }); },
    slide() { tone({ type: 'square', f: 1100, f2: 260, dur: 0.75, vol: 0.04 }); },
    firework() { noise({ f: 2600, f2: 300, dur: 0.45, vol: 0.16 }); tone({ type: 'sine', f: 90, f2: 45, dur: 0.25, vol: 0.25 }); },
    fanfare() {
      const m = [['G4', 0], ['C5', 0.1], ['E5', 0.2], ['G5', 0.3], ['E5', 0.45], ['G5', 0.55]];
      m.forEach(([n, t]) => tone({ type: 'square', f: hz(n), t, dur: 0.12, vol: 0.07 }));
      tone({ type: 'square', f: hz('C6'), t: 0.7, dur: 0.75, vol: 0.07 });
      tone({ type: 'square', f: hz('E6'), t: 0.7, dur: 0.75, vol: 0.035 });
      [['C3', 0], ['G3', 0.3], ['C4', 0.7]].forEach(([n, t]) => tone({ type: 'triangle', f: hz(n), t, dur: t > 0.5 ? 0.8 : 0.25, vol: 0.2 }));
    },
    tick() { tone({ type: 'sine', f: 1250, dur: 0.05, vol: 0.08 }); },
    tap() { tone({ type: 'sine', f: 900, f2: 1300, dur: 0.05, vol: 0.06 }); },
  };

  // Background loop: original 4-bar tune, 150 BPM in 8ths.
  const MEL = 'E5 - G5 A5 G5 - E5 C5 D5 - E5 G5 E5 - D5 - C5 - E5 G5 A5 - C6 A5 G5 - E5 D5 E5 - - -'.split(' ');
  const BASS = 'C3 G3 C3 G3 G2 D3 G2 D3 A2 E3 F2 C3 G2 D3 G2 B2'.split(' ');
  const STEP = 0.2;
  function schedule() {
    while (nextTime < ctx.currentTime + 0.25) {
      const i = musicStep % 32, t = nextTime - ctx.currentTime;
      if (MEL[i] !== '-') tone({ type: 'square', f: hz(MEL[i]), t, dur: 0.17, vol: 0.05, dest: mus });
      if (i % 2 === 0) tone({ type: 'triangle', f: hz(BASS[i / 2]), t, dur: 0.34, vol: 0.16, dest: mus });
      if (i % 2 === 1) noise({ filter: 'highpass', f: 6000, t, dur: 0.03, vol: 0.05, dest: mus });
      nextTime += STEP; musicStep++;
    }
  }
  function music(on) {
    if (!ctx || on === musicOn) return;
    musicOn = on;
    const now = ctx.currentTime;
    mus.gain.cancelScheduledValues(now);
    mus.gain.setValueAtTime(mus.gain.value, now);
    if (on) {
      musicStep = 0; nextTime = now + 0.05;
      mus.gain.linearRampToValueAtTime(0.55, now + 0.4);
      schedule(); timer = setInterval(schedule, 60);
    } else {
      mus.gain.linearRampToValueAtTime(0, now + 0.35);
      setTimeout(() => { if (!musicOn) { clearInterval(timer); timer = null; } }, 400);
    }
  }

  function setEnabled(on) {
    enabled = on;
    if (ctx) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.03);
  }

  window.Sound = {
    unlock, music, setEnabled,
    get enabled() { return enabled; },
    play(name) { if (ctx && enabled && SFX[name]) SFX[name](); },
  };
})();
