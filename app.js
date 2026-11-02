/* Mind Gym — offline meditation + brain training. Zero downloads: device TTS + pure-JS games. */
const $ = (id) => document.getElementById(id);

/* ================= TTS ================= */
let voices = [], voiceIdx = 0, ttsRate = 0.95;
function loadVoices() {
  voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  const pick = $('voicePick'); pick.innerHTML = '';
  voices.forEach((v, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = v.name + ' (' + v.lang + ')'; pick.appendChild(o);
  });
  const d = voices.findIndex((v) => v.default); if (d >= 0) { pick.value = d; voiceIdx = d; }
  pick.onchange = () => { voiceIdx = +pick.value; };
}
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
$('rateIn').oninput = (e) => { ttsRate = parseFloat(e.target.value) || 0.95; };

function speak(text, rate) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices[voiceIdx]; if (v) u.voice = v;
    u.rate = rate || ttsRate;
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(); } };
    u.onend = fin; u.onerror = fin;
    setTimeout(fin, Math.max(3000, (text.length * 95) / (rate || ttsRate) + 2500)); // fallback if onend never fires
    try { speechSynthesis.speak(u); } catch (e) { fin(); }
  });
}
function stopTTS() { try { speechSynthesis.cancel(); } catch (e) {} }

/* soft phase-change tone (WebAudio, offline) */
let actx = null;
function tone(freq) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, actx.currentTime + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.6);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + 0.7);
  } catch (e) {}
}

/* ================= progress store ================= */
const SKEY = 'mindgym.v1';
const store = {
  d: (() => { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } })(),
  save() { try { localStorage.setItem(SKEY, JSON.stringify(this.d)); } catch (e) {} },
  day() { return new Date().toISOString().slice(0, 10); },
  dayRec() { const k = this.day(); this.d.days = this.d.days || {}; this.d.days[k] = this.d.days[k] || { med: 0, games: 0 }; return this.d.days[k]; },
  addMed(min) { this.dayRec().med += min; this.save(); refreshHeader(); },
  addGame() { this.dayRec().games += 1; this.save(); refreshHeader(); },
  best(k, v, lower) {
    this.d.bests = this.d.bests || {};
    const cur = this.d.bests[k];
    if (cur == null || (lower ? v < cur : v > cur)) { this.d.bests[k] = v; this.save(); return true; }
    return false;
  },
  streak() {
    const days = this.d.days || {}; let s = 0; const d = new Date();
    if (!days[d.toISOString().slice(0, 10)]) d.setDate(d.getDate() - 1); // streak alive if yesterday active
    while (days[d.toISOString().slice(0, 10)]) { s++; d.setDate(d.getDate() - 1); }
    return s;
  },
};
function refreshHeader() { const s = store.streak(); $('streakN').textContent = s; }
refreshHeader();

/* ================= tabs ================= */
document.querySelectorAll('#tabs button').forEach((b) => {
  b.onclick = () => {
    stopMeditation(); gameToken++;
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.remove('on'));
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    $('tab-' + b.dataset.tab).classList.add('on');
    if (b.dataset.tab === 'progress') renderProgress();
  };
});

/* ================= meditation sessions ================= */
const SESSIONS = [
  {
    id: 'focus', name: 'Focus Reset', desc: '5 min · sharpen attention before work', min: 5,
    steps: [
      { say: 'Sit comfortably with your back straight but not stiff. Rest your hands on your legs. Gently close your eyes.', pause: 8 },
      { say: 'Take a deep breath in through your nose, filling your belly.', pause: 2 },
      { say: 'And a long, slow breath out through your mouth, letting your shoulders drop.', pause: 6 },
      { breathe: { in: 4, hold: 2, out: 6, cycles: 4 } },
      { say: 'Now let your breathing return to its natural rhythm. Simply notice each breath as it comes and goes. When your mind wanders, and it will, gently bring your attention back to the breath, without judging yourself.', pause: 45 },
      { say: 'Notice the quiet pause between breaths. Rest in that stillness.', pause: 30 },
      { say: 'Begin to return. Wiggle your fingers and toes. When you are ready, open your eyes, carrying this steadiness into your next task.' },
    ],
  },
  {
    id: 'calm', name: 'Deep Calm', desc: '10 min · full body unwind', min: 10,
    steps: [
      { say: 'Lie down or settle back in your chair. Let your whole body be supported. Close your eyes.', pause: 8 },
      { say: 'Take three slow breaths. In through the nose.', pause: 3, say2: 'Out through the mouth, releasing tension.' , pause2: 6 },
      { breathe: { in: 4, hold: 4, out: 6, cycles: 3 } },
      { say: 'Bring your attention to your feet. Notice any tightness there, and let it soften with your next exhale.', pause: 20 },
      { say: 'Move up to your legs, your hips, your belly. With each exhale, let these areas grow heavy and still.', pause: 25 },
      { say: 'Now your chest, your shoulders, your hands. Unclench your jaw. Soften the space between your eyebrows.', pause: 25 },
      { say: 'Feel your whole body resting. Nothing to do, nowhere to be. Just breathe.', pause: 60 },
      { say: 'Take one more deep breath in.', pause: 3 },
      { say: 'And release. Slowly bring movement back to your body. Open your eyes when you are ready.' },
    ],
  },
  {
    id: 'sleep', name: 'Sleep Wind-Down', desc: '8 min · drift off', min: 8,
    steps: [
      { say: 'Lie comfortably in bed, on your back if you can. Close your eyes.', pause: 8 },
      { breathe: { in: 4, hold: 7, out: 8, cycles: 4 } },
      { say: 'With each exhale, feel yourself sinking a little deeper into the mattress.', pause: 20 },
      { say: 'Tense your toes for five seconds, then release. Notice the wave of relaxation.', pause: 15 },
      { say: 'Now tense your whole legs, hold, and release.', pause: 15 },
      { say: 'Scrunch your shoulders up to your ears, hold, and let them drop.', pause: 15 },
      { say: 'Your body is done for today. Let your thoughts drift past like clouds. There is nothing left to solve tonight.', pause: 60 },
      { say: 'Breathe slowly. Sleep is coming. Good night.', pause: 20 },
    ],
  },
  {
    id: 'stress', name: 'Stress Reset', desc: '5 min · box breathing to downshift', min: 5,
    steps: [
      { say: 'Whatever just happened can wait five minutes. Sit back, unclench your jaw, drop your shoulders.', pause: 6 },
      { say: 'We will breathe in a box: four counts in, four hold, four out, four hold. Follow the circle.', pause: 4 },
      { breathe: { in: 4, hold: 4, out: 4, cycles: 6, holdAfter: 4 } },
      { say: 'Notice your heart rate slowing. That is your nervous system downshifting. You are safe.', pause: 15 },
      { breathe: { in: 4, hold: 4, out: 6, cycles: 3 } },
      { say: 'Carry this slower rhythm with you. Open your eyes when ready.' },
    ],
  },
];

let medRun = null;
function csleep(ms, run) {
  return new Promise((res) => {
    const step = 250; let e = 0;
    const tick = () => { if (run.cancelled || e >= ms) return res(); e += step; setTimeout(tick, step); };
    tick();
  });
}
function renderSessions() {
  $('sessList').innerHTML = SESSIONS.map((s) =>
    `<div class="sess"><div><b>${s.name}</b><div class="mut">${s.desc}</div></div><button class="btn sm" data-sess="${s.id}">Start</button></div>`
  ).join('');
  $('sessList').querySelectorAll('[data-sess]').forEach((b) => {
    b.onclick = () => startMeditation(SESSIONS.find((s) => s.id === b.dataset.sess));
  });
}
function startMeditation(sess) {
  stopMeditation();
  const run = { cancelled: false, t0: Date.now() }; medRun = run;
  $('sessList').hidden = true; $('player').hidden = false;
  $('plTitle').textContent = sess.name;
  runSession(sess, run);
}
function stopMeditation() {
  if (medRun) medRun.cancelled = true;
  medRun = null; stopTTS();
  $('sessList').hidden = false; $('player').hidden = true;
  $('breathWrap').hidden = true;
}
$('plStop').onclick = stopMeditation;

async function phase(label, secs, scale, run) {
  $('breathWrap').hidden = false;
  $('breathLabel').textContent = label;
  const c = $('breathCircle');
  c.style.transitionDuration = secs + 's';
  c.style.transform = 'scale(' + scale + ')';
  tone(label.startsWith('Breathe in') ? 520 : label.startsWith('Hold') ? 660 : 392);
  await csleep(secs * 1000, run);
}
async function breathing(cfg, run) {
  $('breathWrap').hidden = false;
  for (let i = 0; i < cfg.cycles && !run.cancelled; i++) {
    $('plStep').textContent = 'Breathing · round ' + (i + 1) + ' of ' + cfg.cycles;
    await phase('Breathe in', cfg.in, 1.35, run); if (run.cancelled) break;
    if (cfg.hold) { await phase('Hold', cfg.hold, 1.35, run); if (run.cancelled) break; }
    await phase('Breathe out', cfg.out, 1.0, run); if (run.cancelled) break;
    if (cfg.holdAfter) { await phase('Hold', cfg.holdAfter, 1.0, run); }
  }
  $('breathWrap').hidden = true;
}
async function runSession(sess, run) {
  const total = sess.steps.length;
  for (let i = 0; i < total && !run.cancelled; i++) {
    const st = sess.steps[i];
    $('plBar').style.width = Math.round((i / total) * 100) + '%';
    if (st.say) { $('plStep').textContent = 'Listening… (' + (i + 1) + '/' + total + ')'; await speak(st.say); }
    if (run.cancelled) break;
    if (st.say2) { await speak(st.say2); }
    if (run.cancelled) break;
    if (st.pause) { $('plStep').textContent = 'Quiet · ' + st.pause + 's (' + (i + 1) + '/' + total + ')'; await csleep(st.pause * 1000, run); }
    if (st.pause2) { $('plStep').textContent = 'Quiet · ' + st.pause2 + 's (' + (i + 1) + '/' + total + ')'; await csleep(st.pause2 * 1000, run); }
    if (st.breathe) await breathing(st.breathe, run);
  }
  if (!run.cancelled) {
    $('plBar').style.width = '100%';
    $('plStep').textContent = '✓ Complete — ' + sess.min + ' minutes. Well done.';
    tone(660); setTimeout(() => tone(880), 350);
    const mins = Math.max(1, Math.round((Date.now() - run.t0) / 60000));
    store.addMed(Math.min(mins, sess.min));
  }
  setTimeout(() => { if (medRun === run) stopMeditation(); }, 4000);
}
renderSessions();

/* ================= games ================= */
let gameToken = 0;
const area = () => $('gameArea');
function gameHTML(html) { gameToken++; area().innerHTML = html; return gameToken; }
const gsleep = (ms, tok) => new Promise((res) => {
  const step = 120; let e = 0;
  const tick = () => { if (tok !== gameToken || e >= ms) return res(tok !== gameToken); e += step; setTimeout(tick, step); };
  tick();
});
document.querySelectorAll('.game').forEach((b) => { b.onclick = () => GAMES[b.dataset.g](); });

/* ---- N-Back ---- */
async function gNBack() {
  const tok = gameHTML(`
    <div class="card center"><h3>N-Back · <span id="nbN"></span></h3>
    <p class="mut small">Tap MATCH when the lit square is in the same spot as <b id="nbNb"></b> step(s) ago.</p>
    <div class="ggrid" id="nbGrid"></div>
    <div class="row center"><button class="btn" id="nbMatch">MATCH</button></div>
    <p class="score" id="nbStat"></p><p class="mut small" id="nbMsg"></p></div>`);
  const grid = $('nbGrid');
  for (let i = 0; i < 9; i++) { const d = document.createElement('div'); d.className = 'cell'; grid.appendChild(d); }
  const cells = [...grid.children];
  const lit = (i) => { cells.forEach((c) => c.classList.remove('lit')); if (i != null) cells[i].classList.add('lit'); };
  let n = store.d.bests?.nback || 1;
  $('nbMatch').onclick = () => { if (cur !== null && trialOpen) { responded = true; if (isMatchNow) hits++; else fa++; flash(cur === null); } };
  let cur = null, trialOpen = false, isMatchNow = false, responded = false, hits = 0, miss = 0, fa = 0;
  const flash = (good) => {};
  while (true) {
    $('nbN').textContent = 'Level ' + n; $('nbNb').textContent = n;
    $('nbMsg').textContent = 'Watch the squares…';
    const trials = 20 + n;
    const seq = Array.from({ length: trials }, () => Math.floor(Math.random() * 9));
    hits = miss = fa = 0;
    for (let t = 0; t < trials; t++) {
      if (tok !== gameToken) return;
      cur = seq[t]; responded = false;
      isMatchNow = t >= n && seq[t] === seq[t - n];
      trialOpen = true; lit(cur);
      $('nbStat').innerHTML = `Trial ${t + 1}/${trials} · ✓ <b>${hits}</b> · ✗ ${miss + fa}`;
      if (await gsleep(1700, tok)) return;
      trialOpen = false; lit(null);
      if (isMatchNow && !responded) miss++;
      if (await gsleep(350, tok)) return;
    }
    const total = hits + miss;
    const acc = total ? hits / total : 0;
    store.addGame();
    const leveled = acc >= 0.8 && fa <= 3;
    if (leveled) { n++; store.best('nback', n); $('nbMsg').innerHTML = `✓ ${Math.round(acc * 100)}% — <b>level up! Now N=${n}.</b> Next round…`; }
    else { $('nbMsg').innerHTML = `${Math.round(acc * 100)}% hits, ${fa} false alarms — replaying N=${n}.`; }
    if (await gsleep(2200, tok)) return;
  }
}

/* ---- Stroop ---- */
async function gStroop() {
  const tok = gameHTML(`
    <div class="card center"><h3>Stroop · 30 seconds</h3>
    <p class="mut small">Tap the button matching the <b>ink color</b> — not the word.</p>
    <div class="stroopword" id="stW">READY</div>
    <div class="cbtns" id="stB"></div>
    <p class="score" id="stS"></p></div>`);
  const COLORS = [['RED', '#e74c3c'], ['BLUE', '#3498db'], ['GREEN', '#2ecc71'], ['YELLOW', '#f1c40f']];
  const btnBox = $('stB');
  const btns = COLORS.map(([name, hex]) => {
    const b = document.createElement('button'); b.className = 'cbtn'; b.textContent = name;
    b.style.borderColor = hex; btnBox.appendChild(b); return { name, el: b };
  });
  let correct = 0, wrong = 0, ink = null, live = true;
  const next = () => {
    const word = COLORS[Math.floor(Math.random() * 4)];
    do { ink = COLORS[Math.floor(Math.random() * 4)]; } while (ink[0] === word[0]);
    const w = $('stW'); w.textContent = word[0]; w.style.color = ink[1];
  };
  btns.forEach(({ name, el }) => {
    el.onclick = () => {
      if (!live || tok !== gameToken) return;
      if (name === ink[0]) { correct++; tone(660); } else { wrong++; tone(220); }
      $('stS').innerHTML = `✓ <b>${correct}</b> · ✗ ${wrong}`;
      next();
    };
  });
  next();
  for (let s = 30; s > 0; s--) {
    $('stS').innerHTML = `✓ <b>${correct}</b> · ✗ ${wrong} · ${s}s`;
    if (await gsleep(1000, tok)) return;
  }
  live = false;
  store.addGame(); store.best('stroop', correct);
  $('stW').textContent = 'DONE'; $('stW').style.color = 'var(--ink)';
  $('stS').innerHTML = `Final: ✓ <b>${correct}</b> · ✗ ${wrong}` + (store.d.bests?.stroop === correct ? ' — <b>new best!</b>' : '');
}

/* ---- Reaction ---- */
async function gReact() {
  const tok = gameHTML(`
    <div class="card center"><h3>Reaction · 5 rounds</h3>
    <p class="mut small">Tap the moment it turns green. Too soon = foul.</p>
    <button class="bigbtn" id="rxB">Tap to start</button>
    <p class="score" id="rxS"></p></div>`);
  const b = $('rxB'), times = [];
  let state = 'idle', t0 = 0;
  const setR = (txt, cls) => { b.textContent = txt; b.className = 'bigbtn ' + cls; };
  b.onclick = async () => {
    if (tok !== gameToken) return;
    if (state === 'idle') {
      if (times.length >= 5) return finish();
      state = 'wait'; setR('Wait for green…', 'wait');
      const delay = 1500 + Math.random() * 2500;
      const bad = await gsleep(delay, tok); if (bad) return;
      if (state !== 'wait' || tok !== gameToken) return;
      state = 'go'; setR('TAP!', 'go'); t0 = performance.now(); tone(880);
    } else if (state === 'wait') {
      state = 'idle'; setR('Too soon! Tap to retry round.', '');
    } else if (state === 'go') {
      const ms = Math.round(performance.now() - t0);
      times.push(ms); state = 'idle';
      setR(ms + ' ms — tap for next', '');
      $('rxS').innerHTML = `Rounds: ${times.map((t) => `<b>${t}</b>`).join(' · ')} ms`;
      if (times.length >= 5) finish();
    }
  };
  const finish = () => {
    const avg = Math.round(times.reduce((a, x) => a + x, 0) / times.length);
    store.addGame(); const nb = store.best('react', avg, true);
    setR('Done', '');
    $('rxS').innerHTML = `Average: <b>${avg} ms</b>` + (nb ? ' — <b>new best!</b>' : ` (best ${store.d.bests.react} ms)`);
  };
  setR('Tap to start', '');
}

/* ---- Sequence ---- */
async function gSeq() {
  const tok = gameHTML(`
    <div class="card center"><h3>Sequence memory</h3>
    <p class="mut small">Watch, then repeat the pattern.</p>
    <div class="ggrid" id="sqG"></div>
    <p class="score" id="sqS">Tap Start</p>
    <div class="row center"><button class="btn sm" id="sqGo">Start</button></div></div>`);
  const grid = $('sqG');
  for (let i = 0; i < 9; i++) { const d = document.createElement('div'); d.className = 'cell'; grid.appendChild(d); }
  const cells = [...grid.children];
  const lit = (i, ms) => new Promise((res) => {
    cells[i].classList.add('lit'); tone(440 + i * 40);
    setTimeout(() => { cells[i].classList.remove('lit'); res(); }, ms);
  });
  let seq = [], input = [], accepting = false, level = 0;
  cells.forEach((c, i) => {
    c.onclick = () => {
      if (!accepting || tok !== gameToken) return;
      lit(i, 200);
      input.push(i);
      const k = input.length - 1;
      if (input[k] !== seq[k]) return over();
      if (input.length === seq.length) { accepting = false; levelUp(); }
    };
  });
  const over = () => {
    accepting = false;
    store.addGame(); const nb = store.best('seq', level);
    $('sqS').innerHTML = `Game over — length <b>${level}</b>` + (nb ? ' — <b>new best!</b>' : '');
    $('sqGo').hidden = false;
  };
  const levelUp = async () => {
    level++; seq.push(Math.floor(Math.random() * 9));
    $('sqS').innerHTML = `Level <b>${level}</b> — watch…`;
    store.best('seq', level);
    await gsleep(700, tok);
    for (const i of seq) { if (tok !== gameToken) return; await lit(i, 500); if (await gsleep(220, tok)) return; }
    if (tok !== gameToken) return;
    input = []; accepting = true;
    $('sqS').innerHTML = `Level <b>${level}</b> — your turn`;
  };
  $('sqGo').onclick = () => { $('sqGo').hidden = true; seq = []; level = 0; levelUp(); };
}

const GAMES = { nback: gNBack, stroop: gStroop, react: gReact, seq: gSeq };

/* ================= progress tab ================= */
function renderProgress() {
  const d = store.d, days = d.days || {}, bests = d.bests || {};
  let min = 0, games = 0;
  Object.values(days).forEach((x) => { min += x.med || 0; games += x.games || 0; });
  $('stMin').textContent = min; $('stGames').textContent = games; $('stStreak').textContent = store.streak();
  $('bN').textContent = bests.nback ?? '–';
  $('bS').textContent = bests.stroop ?? '–';
  $('bR').textContent = bests.react != null ? bests.react + 'ms' : '–';
  $('bQ').textContent = bests.seq ?? '–';
  const bars = $('weekBars'); bars.innerHTML = '';
  const names = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  let max = 1;
  const vals = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const k = dt.toISOString().slice(0, 10);
    const v = (days[k]?.med || 0) + (days[k]?.games || 0);
    vals.push({ v, label: i === 0 ? 'today' : names[dt.getDay()] });
    max = Math.max(max, v);
  }
  vals.forEach(({ v, label }) => {
    const b = document.createElement('div');
    b.className = 'bar'; b.style.height = Math.max(4, Math.round((v / max) * 90)) + 'px';
    b.innerHTML = `<span>${label}</span>`; b.title = v + ' activities';
    bars.appendChild(b);
  });
}
