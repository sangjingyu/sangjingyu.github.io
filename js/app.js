/* ══════════════════════════════════════════
   ✦ Mystic Tarot — Main Script
   ══════════════════════════════════════════ */

// ═══════ GLOBAL STATE ═══════
let D = [];          // full 78-card deck data
let SP = {};         // spread definitions
let curSp = 'three'; // current spread key
let st = 'idle';     // idle | shuf | spread | sel | done
let deck = [];       // shuffled deck for current reading
let sel = [];        // selected cards [{card, cc, pos}]
let cCards = [];     // canvas card objects
let imgCache = {};   // loaded image cache

const cv = document.getElementById('tarotCanvas');
const cx = cv.getContext('2d');
let CW, CH, backCv;
let floatRAF = 0, floatT = 0;

// ═══════ DATA LOADING ═══════
async function loadData() {
  try {
    const [deckRes, spreadRes] = await Promise.all([
      fetch('data/deck.json'),
      fetch('data/spreads.json')
    ]);
    const deckData = await deckRes.json();
    const spreadData = await spreadRes.json();

    // Build full image URLs from baseUrl + relative path
    D = deckData.cards.map(c => ({
      ...c,
      img: deckData.baseUrl + c.img
    }));

    SP = spreadData;

    // Initialize app after data is loaded
    initApp();
  } catch (err) {
    console.error('데이터 로딩 실패:', err);
    document.getElementById('stxt').textContent = '⚠️ 데이터 로딩 실패. 새로고침 해주세요.';
  }
}

function initApp() {
  initSettings();
  resize();
  startIdleAnimation();
  floatRAF = requestAnimationFrame(floatLoop);
}

// ═══════ IDLE ANIMATION ═══════
// Mystical orbiting cards on the canvas before the user shuffles
let idleCards = [];
const IDLE_COUNT = 18;

function startIdleAnimation() {
  if (st !== 'idle') return;
  if (D.length === 0) return;
  const w = cv.clientWidth, h = cv.clientHeight;

  const picked = shuf(D).slice(0, IDLE_COUNT);

  idleCards = [];
  for (let i = 0; i < IDLE_COUNT; i++) {
    const ic = {
      idx: i,
      baseAngle: (i / IDLE_COUNT) * Math.PI * 2,
      orbitSpeed: 0.2 + (i % 4) * 0.03,
      rx: w * (0.22 + (i % 3) * 0.07),
      ry: h * (0.14 + (i % 3) * 0.025),
      sc: 0.55 + (i % 3) * 0.08,
      cardData: picked[i],
      fImg: null
    };
    idleCards.push(ic);
    loadImg(picked[i].img).then(img => { ic.fImg = img; });
  }
  cCards = [];
}

function renderIdleCards(t) {
  if (st !== 'idle' || idleCards.length === 0) return;
  const w = cv.clientWidth, h = cv.clientHeight;
  if (w < 10 || h < 10) return; // canvas not visible
  const centerX = w / 2, centerY = h / 2;

  // Compute z for each card and split into behind / in-front of crystal ball
  const cardsWithZ = idleCards.map(ic => {
    const angle = t * ic.orbitSpeed + ic.baseAngle;
    const z = Math.sin(angle);
    return { ic, angle, z };
  });
  cardsWithZ.sort((a, b) => a.z - b.z);

  const behindCards = cardsWithZ.filter(c => c.z <= 0);
  const frontCards = cardsWithZ.filter(c => c.z > 0);

  // Helper: draw one idle card
  function drawIdleCard({ ic, angle, z }) {
    const depthScale = 0.75 + (z + 1) * 0.2;
    const depthAlpha = 0.2 + (z + 1) * 0.35;
    const x = centerX + Math.cos(angle) * ic.rx;
    const y = centerY + Math.sin(angle) * ic.ry * 0.5;
    const cardAng = Math.cos(angle) * 12;
    const sc = ic.sc * depthScale;
    const facing = Math.cos(angle);
    const showFront = facing > 0.05 && ic.fImg;
    const flipScaleX = Math.abs(facing) * 0.55 + 0.45;

    cx.save();
    cx.globalAlpha = depthAlpha;
    cx.translate(x, y);
    cx.rotate(cardAng * Math.PI / 180);
    cx.scale(sc * flipScaleX, sc);

    // Enhanced shadow
    const shadowStr = 0.15 + (z + 1) * 0.2;
    cx.shadowColor = `rgba(0,0,0,${shadowStr})`;
    cx.shadowBlur = 10 + (z + 1) * 8;
    cx.shadowOffsetY = 5 + (z + 1) * 5;

    if (showFront) {
      cx.beginPath(); cx.roundRect(-CW / 2, -CH / 2, CW, CH, 5); cx.clip();
      // Enable image smoothing for clarity
      cx.imageSmoothingEnabled = true;
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(ic.fImg, -CW / 2, -CH / 2, CW, CH);
      // Gold border — stronger on front-facing cards
      cx.shadowColor = 'transparent';
      cx.strokeStyle = `rgba(212,168,67,${0.25 + facing * 0.35})`;
      cx.lineWidth = 2;
      cx.beginPath(); cx.roundRect(-CW / 2, -CH / 2, CW, CH, 5); cx.stroke();
    } else {
      cx.drawImage(backCv, -CW / 2, -CH / 2, CW, CH);
    }

    // Glow on nearest cards
    if (z > 0.2) {
      cx.shadowColor = 'transparent';
      cx.strokeStyle = `rgba(212,168,67,${(z - 0.2) * 0.2})`;
      cx.lineWidth = 1.5;
      cx.beginPath(); cx.roundRect(-CW / 2, -CH / 2, CW, CH, 5); cx.stroke();
    }
    cx.restore();
  }

  // 1) Draw cards BEHIND the crystal ball
  behindCards.forEach(drawIdleCard);

  // 2) Draw crystal ball at the 3D pivot center
  drawCrystalBall(t, centerX, centerY, w, h);

  // 3) Draw cards IN FRONT of the crystal ball
  frontCards.forEach(drawIdleCard);
}

// ═══════ CRYSTAL BALL ═══════
function drawCrystalBall(t, cbX, cbY, w, h) {
  const cbR = Math.min(w, h) * 0.13;
  const pulse = Math.sin(t * 1.2) * 0.3 + 0.7;

  // Outer aura — warm gold
  cx.save();
  const auraGrd = cx.createRadialGradient(cbX, cbY, cbR * 0.3, cbX, cbY, cbR * 2.5);
  auraGrd.addColorStop(0, `rgba(212,168,67,${0.07 * pulse})`);
  auraGrd.addColorStop(0.5, `rgba(180,140,50,${0.03 * pulse})`);
  auraGrd.addColorStop(1, 'transparent');
  cx.fillStyle = auraGrd;
  cx.fillRect(0, 0, w, h);
  cx.restore();

  // Ball base / stand — dark bronze
  cx.save();
  cx.beginPath();
  cx.ellipse(cbX, cbY + cbR * 0.95, cbR * 0.45, cbR * 0.12, 0, 0, Math.PI * 2);
  cx.fillStyle = 'rgba(90,65,25,0.55)';
  cx.fill();
  cx.strokeStyle = 'rgba(212,168,67,0.25)';
  cx.lineWidth = 1;
  cx.stroke();
  cx.restore();

  // Ball body — glass sphere with gold-tinted interior
  cx.save();
  cx.beginPath();
  cx.arc(cbX, cbY, cbR, 0, Math.PI * 2);
  cx.clip();

  // Dark amber interior
  const ballGrd = cx.createRadialGradient(cbX - cbR * 0.2, cbY - cbR * 0.25, 0, cbX, cbY, cbR);
  ballGrd.addColorStop(0, 'rgba(50,35,10,0.85)');
  ballGrd.addColorStop(0.6, 'rgba(30,20,5,0.9)');
  ballGrd.addColorStop(1, 'rgba(15,10,2,0.95)');
  cx.fillStyle = ballGrd;
  cx.fillRect(cbX - cbR, cbY - cbR, cbR * 2, cbR * 2);

  // ── Swirling smoke particles — gold & amber ──
  for (let i = 0; i < 18; i++) {
    const smokeT = t * (0.4 + i * 0.03) + i * 2.7;
    const spiralR = cbR * (0.15 + (i % 5) * 0.12) * (0.6 + Math.sin(smokeT * 0.5) * 0.4);
    const sx = cbX + Math.cos(smokeT) * spiralR * (0.7 + Math.sin(i * 1.3 + t * 0.2) * 0.3);
    const sy = cbY + Math.sin(smokeT * 0.8 + i) * spiralR * 0.6 - Math.sin(t * 0.6 + i * 0.5) * cbR * 0.15;
    const smokeSize = cbR * (0.08 + Math.sin(smokeT * 1.2 + i * 3) * 0.05);
    const smokeAlpha = 0.06 + Math.sin(smokeT * 0.7 + i * 1.7) * 0.04;

    const sGrd = cx.createRadialGradient(sx, sy, 0, sx, sy, smokeSize);
    if (i % 3 === 0) {
      // Bright gold
      sGrd.addColorStop(0, `rgba(240,200,80,${smokeAlpha * 1.5})`);
      sGrd.addColorStop(1, 'transparent');
    } else if (i % 3 === 1) {
      // Deep amber
      sGrd.addColorStop(0, `rgba(180,130,40,${smokeAlpha * 1.3})`);
      sGrd.addColorStop(1, 'transparent');
    } else {
      // Warm honey
      sGrd.addColorStop(0, `rgba(220,170,60,${smokeAlpha * 1.2})`);
      sGrd.addColorStop(1, 'transparent');
    }
    cx.fillStyle = sGrd;
    cx.beginPath();
    cx.arc(sx, sy, smokeSize, 0, Math.PI * 2);
    cx.fill();
  }

  // ── Rising smoke tendrils — golden ──
  for (let i = 0; i < 6; i++) {
    const tendrilT = t * 0.5 + i * 1.05;
    const risePhase = (tendrilT % 4) / 4;
    const tx = cbX + Math.sin(tendrilT * 1.5 + i * 2) * cbR * 0.35;
    const ty = cbY + cbR * 0.3 - risePhase * cbR * 0.8;
    const tSize = cbR * (0.04 + risePhase * 0.08);
    const tAlpha = (1 - risePhase) * 0.1;

    const tGrd = cx.createRadialGradient(tx, ty, 0, tx, ty, tSize);
    tGrd.addColorStop(0, `rgba(230,185,70,${tAlpha})`);
    tGrd.addColorStop(1, 'transparent');
    cx.fillStyle = tGrd;
    cx.beginPath();
    cx.arc(tx, ty, tSize, 0, Math.PI * 2);
    cx.fill();
  }

  // ── Inner mystical glow — pulsing gold core ──
  const coreGrd = cx.createRadialGradient(cbX, cbY, 0, cbX, cbY, cbR * 0.5);
  coreGrd.addColorStop(0, `rgba(240,200,80,${0.05 + pulse * 0.04})`);
  coreGrd.addColorStop(0.5, `rgba(180,130,40,${0.03 + pulse * 0.02})`);
  coreGrd.addColorStop(1, 'transparent');
  cx.fillStyle = coreGrd;
  cx.fillRect(cbX - cbR, cbY - cbR, cbR * 2, cbR * 2);

  cx.restore(); // end clip

  // Glass sphere highlight / reflections
  cx.save();
  const hlGrd = cx.createRadialGradient(
    cbX - cbR * 0.3, cbY - cbR * 0.35, 0,
    cbX - cbR * 0.3, cbY - cbR * 0.35, cbR * 0.5
  );
  hlGrd.addColorStop(0, 'rgba(255,245,220,0.14)');
  hlGrd.addColorStop(0.5, 'rgba(255,240,200,0.04)');
  hlGrd.addColorStop(1, 'transparent');
  cx.fillStyle = hlGrd;
  cx.beginPath();
  cx.arc(cbX, cbY, cbR, 0, Math.PI * 2);
  cx.fill();

  // Edge rim light — warm gold
  cx.beginPath();
  cx.arc(cbX, cbY, Math.max(cbR - 0.5, 0.5), 0, Math.PI * 2);
  cx.strokeStyle = `rgba(220,180,80,${0.14 + pulse * 0.07})`;
  cx.lineWidth = 1.5;
  cx.stroke();

  // Outer ring glow — gold
  cx.beginPath();
  cx.arc(cbX, cbY, cbR + 2, 0, Math.PI * 2);
  cx.strokeStyle = `rgba(212,168,67,${0.07 + pulse * 0.04})`;
  cx.lineWidth = 1;
  cx.stroke();
  cx.restore();

  // ── Rising heat-haze shimmer above the ball ──
  const hazeCount = 24;
  const hazeMaxH = cbR * 5.5;
  for (let i = 0; i < hazeCount; i++) {
    const speed = 0.3 + (i % 5) * 0.07;
    const phase = t * speed + i * 1.31;
    const rise = (phase % 3.2) / 3.2;

    const wobbleFreq = 2.2 + (i % 4) * 0.7;
    const wobbleAmp = cbR * (0.3 + (i % 5) * 0.08);
    const hx = cbX + Math.sin(phase * wobbleFreq + i * 0.9) * wobbleAmp * (1 - rise * 0.3);

    const hy = cbY - cbR - rise * hazeMaxH;

    const life = rise;
    const sizeBase = cbR * (0.12 + (i % 4) * 0.05);
    const size = sizeBase * (0.6 + Math.sin(life * Math.PI) * 1.5);

    const fadeIn = Math.min(1, life * 3);
    const fadeOut = Math.max(0, 1 - (life - 0.4) * 1.6);
    const alpha = fadeIn * fadeOut * (0.18 + Math.sin(t * 3 + i * 2.1) * 0.06);

    if (alpha < 0.005 || size < 0.5) continue;

    cx.save();
    cx.globalAlpha = 1;

    const colorType = i % 5;
    let r, g, b;
    if (colorType === 0)      { r = 230; g = 70; b = 50; }    // bright red
    else if (colorType === 1) { r = 255; g = 130; b = 80; }   // orange-red
    else if (colorType === 2) { r = 255; g = 200; b = 140; }  // warm light
    else if (colorType === 3) { r = 180; g = 40; b = 40; }    // deep red
    else                      { r = 255; g = 160; b = 60; }   // amber

    const hGrd = cx.createRadialGradient(hx, hy, 0, hx, hy, size);
    hGrd.addColorStop(0, `rgba(${r},${g},${b},${alpha * 2.0})`);
    hGrd.addColorStop(0.35, `rgba(${r},${g},${b},${alpha * 0.9})`);
    hGrd.addColorStop(0.7, `rgba(${r},${g},${b},${alpha * 0.3})`);
    hGrd.addColorStop(1, 'transparent');
    cx.fillStyle = hGrd;

    cx.translate(hx, hy);
    cx.scale(1, 1.6);
    cx.beginPath();
    cx.arc(0, 0, size, 0, Math.PI * 2);
    cx.fill();
    cx.restore();
  }

  // ── Vertical shimmer streaks (light pillars) ──
  for (let i = 0; i < 8; i++) {
    const streakPhase = t * (0.22 + i * 0.05) + i * 1.9;
    const streakRise = (streakPhase % 3.5) / 3.5;
    const sx = cbX + Math.sin(streakPhase * 1.6 + i * 1.3) * cbR * 0.65;
    const sy = cbY - cbR - streakRise * hazeMaxH * 0.6;
    const streakH = cbR * (0.5 + Math.sin(streakPhase) * 0.25);
    const streakW = cbR * 0.035 + Math.sin(t * 2 + i) * cbR * 0.015;
    const streakAlpha = Math.sin(streakRise * Math.PI) * (0.1 + Math.sin(t * 2.5 + i * 3) * 0.04);

    if (streakAlpha < 0.005) continue;

    cx.save();
    const stGrd = cx.createLinearGradient(sx, sy + streakH / 2, sx, sy - streakH / 2);
    stGrd.addColorStop(0, 'transparent');
    stGrd.addColorStop(0.2, `rgba(230,90,50,${streakAlpha * 0.7})`);
    stGrd.addColorStop(0.5, `rgba(255,180,100,${streakAlpha * 1.8})`);
    stGrd.addColorStop(0.8, `rgba(230,90,50,${streakAlpha * 0.7})`);
    stGrd.addColorStop(1, 'transparent');
    cx.fillStyle = stGrd;
    cx.fillRect(sx - streakW, sy - streakH / 2, streakW * 2, streakH);
    cx.restore();
  }
}

// ═══════ UTILITY ═══════
function shuf(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function gCS() {
  const s = getComputedStyle(document.documentElement);
  CW = parseFloat(s.getPropertyValue('--cw'));
  CH = parseFloat(s.getPropertyValue('--ch'));
}

// ═══════ CANVAS SETUP ═══════
function resize() {
  const wr = document.getElementById('canvasWrap');
  const dpr = window.devicePixelRatio || 1;
  cv.width = wr.clientWidth * dpr;
  cv.height = wr.clientHeight * dpr;
  cv.style.width = wr.clientWidth + 'px';
  cv.style.height = wr.clientHeight + 'px';
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gCS();
  makeBack();
}

function makeBack() {
  backCv = document.createElement('canvas');
  backCv.width = CW;
  backCv.height = CH;
  const x = backCv.getContext('2d');
  x.fillStyle = '#1a0f2e';
  x.beginPath(); x.roundRect(0, 0, CW, CH, 5); x.fill();
  x.strokeStyle = 'rgba(212,168,67,.3)';
  x.lineWidth = 1.5;
  x.beginPath(); x.roundRect(1, 1, CW - 2, CH - 2, 4); x.stroke();
  x.strokeStyle = 'rgba(212,168,67,.12)';
  x.lineWidth = 1;
  x.beginPath(); x.roundRect(5, 5, CW - 10, CH - 10, 3); x.stroke();
  // diamond pattern
  x.fillStyle = 'rgba(212,168,67,.04)';
  for (let i = 0; i < CW; i += 10) {
    for (let j = 0; j < CH; j += 10) {
      x.save(); x.translate(i + 5, j + 5); x.rotate(Math.PI / 4);
      x.fillRect(-2.5, -2.5, 5, 5); x.restore();
    }
  }
  // center symbol
  x.fillStyle = 'rgba(212,168,67,.25)';
  x.font = `${Math.floor(CW * .28)}px serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('✦', CW / 2, CH / 2);
}

function loadImg(src) {
  return new Promise(r => {
    if (imgCache[src]) return r(imgCache[src]);
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => { imgCache[src] = i; r(i); };
    i.onerror = () => r(null);
    i.src = src;
  });
}

// ═══════ FLOATING CARD RENDERING ═══════
function drawCard(c) {
  cx.save();
  const t = floatT;
  const ph = c.idx * 1.7 + c.idx * c.idx * .3;
  // Gentler floating during reveal
  const floatMul = (st === 'reveal' || st === 'done') ? 0.35 : 1;
  const floatY = (Math.sin(t * 1.2 + ph) * 4 + Math.sin(t * 0.7 + ph * 1.3) * 2.5) * floatMul;
  const floatX = Math.cos(t * 0.8 + ph * .9) * 1.5 * floatMul;
  const floatAng = Math.sin(t * 0.5 + ph * 1.1) * 0.8 * floatMul;
  const floatSc = 1 + Math.sin(t * 0.9 + ph) * 0.008 * floatMul;
  // dynamic shadow depth
  const shadowD = 8 + floatY * 0.6;
  const shadowB = 12 + Math.abs(floatY) * 1.2;

  cx.globalAlpha = c.a ?? 1;
  cx.translate(c.x + floatX, c.y + floatY);
  cx.rotate(((c.ang || 0) + floatAng) * Math.PI / 180);
  cx.scale((c.sc || 1) * floatSc, (c.sc || 1) * floatSc);

  cx.shadowColor = 'rgba(0,0,0,.4)';
  cx.shadowBlur = shadowB;
  cx.shadowOffsetY = shadowD;

  if (c.flip && c.fImg) {
    cx.beginPath(); cx.roundRect(-CW / 2, -CH / 2, CW, CH, 5); cx.clip();
    if (c.rev) {
      cx.save(); cx.rotate(Math.PI);
      cx.drawImage(c.fImg, -CW / 2, -CH / 2, CW, CH);
      cx.restore();
    } else {
      cx.drawImage(c.fImg, -CW / 2, -CH / 2, CW, CH);
    }
    // pulsing gold glow border
    cx.shadowColor = 'transparent';
    const glowA = .35 + Math.sin(t * 1.5 + ph) * .1;
    cx.strokeStyle = `rgba(212,168,67,${glowA})`;
    cx.lineWidth = 1.5;
    cx.beginPath(); cx.roundRect(-CW / 2, -CH / 2, CW, CH, 5); cx.stroke();
    // soft outer glow
    cx.shadowColor = `rgba(212,168,67,${.08 + Math.sin(t + ph) * .04})`;
    cx.shadowBlur = 18;
    cx.strokeStyle = 'transparent';
    cx.beginPath(); cx.roundRect(-CW / 2, -CH / 2, CW, CH, 5); cx.stroke();
  } else {
    cx.drawImage(backCv, -CW / 2, -CH / 2, CW, CH);
  }

  // hover glow
  if (c.hov && !c.flip) {
    cx.shadowColor = 'rgba(212,168,67,.15)'; cx.shadowBlur = 20;
    cx.strokeStyle = 'rgba(212,168,67,.55)'; cx.lineWidth = 1.5;
    cx.beginPath(); cx.roundRect(-CW / 2, -CH / 2, CW, CH, 5); cx.stroke();
    cx.fillStyle = 'rgba(212,168,67,.06)';
    cx.beginPath(); cx.roundRect(-CW / 2, -CH / 2, CW, CH, 5); cx.fill();
  }
  cx.restore();
}

function render() {
  const w = cv.clientWidth, h = cv.clientHeight;
  if (w < 10 || h < 10) return; // canvas not visible
  cx.clearRect(0, 0, w, h);
  const t = floatT;

  // starfield
  for (let i = 0; i < 50; i++) {
    const sx = (Math.sin(i * 127.1 + t * .08) * .5 + .5) * w;
    const sy = (Math.cos(i * 311.7 + t * .06) * .5 + .5) * h;
    const bright = .5 + Math.sin(i * 73.3 + t * 1.5) * .5;
    const sz = .4 + bright * 1.0;
    cx.fillStyle = `rgba(212,168,67,${.008 + bright * .018})`;
    cx.beginPath(); cx.arc(sx, sy, sz, 0, Math.PI * 2); cx.fill();
  }

  // subtle nebula mist
  const grd = cx.createRadialGradient(w / 2, h * .45, 0, w / 2, h * .45, w * .5);
  grd.addColorStop(0, `rgba(107,63,160,${.03 + Math.sin(t * .3) * .01})`);
  grd.addColorStop(1, 'transparent');
  cx.fillStyle = grd;
  cx.fillRect(0, 0, w, h);

  // Idle orbiting cards (before shuffle)
  renderIdleCards(t);

  cCards.forEach(drawCard);
}

// continuous floating animation loop
function floatLoop(now) {
  floatT = now * .001;
  render();
  floatRAF = requestAnimationFrame(floatLoop);
}

// ═══════ CARD ANIMATION ═══════
function animCards(cfgs, dur, done) {
  const s0 = cCards.map(c => ({
    x: c.x, y: c.y, ang: c.ang || 0, sc: c.sc || 1, a: c.a ?? 1
  }));
  const t0 = performance.now();
  let finished = false;
  (function tick(now) {
    if (finished) return;
    const el = now - t0;
    let allD = true;
    cCards.forEach((c, i) => {
      const cf = cfgs[i]; if (!cf) return;
      const lt = Math.max(0, el - (cf.dl || 0));
      const p = Math.min(1, lt / dur);
      const e = easeOut(p);
      if (p < 1) allD = false;
      const tg = cf.tg;
      c.x = lerp(s0[i].x, tg.x, e);
      c.y = lerp(s0[i].y, tg.y, e);
      c.ang = lerp(s0[i].ang, tg.ang ?? 0, e);
      c.sc = lerp(s0[i].sc, tg.sc ?? 1, e);
      c.a = lerp(s0[i].a, tg.a ?? 1, e);
    });
    if (!allD) requestAnimationFrame(tick);
    else { finished = true; if (done) done(); }
  })(t0);
}

// ═══════ SHUFFLE (MASH STYLE) ═══════
function startShuffle() {
  st = 'shuf';
  idleCards = []; // stop idle animation
  document.getElementById('mainBtn').disabled = true;
  document.getElementById('stxt').textContent = '셔플 중...';
  deck = shuf(D.map(c => ({ ...c, isReversed: Math.random() < .5 })));
  sel = [];
  updateDots();

  const w = cv.clientWidth, h = cv.clientHeight, N = 28;
  cCards = [];
  for (let i = 0; i < N; i++) {
    cCards.push({ x: w / 2, y: h / 2, ang: 0, sc: 1, a: 1, idx: i });
  }

  // scatter
  animCards(cCards.map((c, i) => ({
    tg: {
      x: w / 2 + (Math.random() - .5) * w * .6,
      y: h / 2 + (Math.random() - .5) * h * .45,
      ang: (Math.random() - .5) * 110
    },
    dl: i * 12
  })), 500, () => {
    let cy = 0;
    (function wash() {
      if (cy >= 3) { gather(); return; }
      animCards(cCards.map((c, i) => {
        const a = (cy * 120 + (i / N) * 360 + Math.random() * 35) * Math.PI / 180;
        const rr = 40 + Math.random() * Math.min(w, h) * .22;
        return {
          tg: {
            x: w / 2 + Math.cos(a) * rr,
            y: h / 2 + Math.sin(a) * rr,
            ang: (Math.random() - .5) * 140
          },
          dl: i * 4
        };
      }), 420, () => { cy++; wash(); });
    })();
  });

  function gather() {
    const w = cv.clientWidth, h = cv.clientHeight;
    animCards(cCards.map((c, i) => ({
      tg: {
        x: w / 2 + (Math.random() - .5) * 25,
        y: h / 2 + (Math.random() - .5) * 18,
        ang: (Math.random() - .5) * 8
      },
      dl: i * 6
    })), 350, () => {
      animCards(cCards.map((c, i) => ({
        tg: { x: w / 2, y: h / 2 - i * .7, ang: 0 },
        dl: 0
      })), 250, () => { setTimeout(spreadCards, 250); });
    });
  }
}

// ═══════ SPREAD (ARC FAN) ═══════
function spreadCards() {
  st = 'spread';
  const w = cv.clientWidth, h = cv.clientHeight, N = cCards.length;
  const totAng = 110, startA = -totAng / 2;
  const pivY = h * 1.08, rad = Math.min(h * .82, w * .46);

  animCards(cCards.map((c, i) => {
    const ad = startA + (totAng / (N - 1)) * i;
    const ar = (ad - 90) * Math.PI / 180;
    c._fa = ad;
    c._fx = w / 2 + Math.cos(ar) * rad;
    c._fy = pivY + Math.sin(ar) * rad;
    return { tg: { x: c._fx, y: c._fy, ang: ad, sc: 1, a: 1 }, dl: i * 18 };
  }), 550, () => {
    st = 'sel';
    document.getElementById('stxt').textContent = SP[curSp].positions[0] + ' 카드를 선택하세요';
    document.getElementById('mainBtn').style.display = 'none';
    listen();
  });
}

// ═══════ INTERACTION ═══════
function listen() {
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerdown', onDown);
}

function unlisten() {
  cv.removeEventListener('pointermove', onMove);
  cv.removeEventListener('pointerdown', onDown);
}

function hit(px, py) {
  for (let i = cCards.length - 1; i >= 0; i--) {
    const c = cCards[i];
    if (c.flip || c.dis) continue;
    // account for floating offset
    const ph = c.idx * 1.7 + c.idx * c.idx * .3;
    const fy = Math.sin(floatT * 1.2 + ph) * 4 + Math.sin(floatT * 0.7 + ph * 1.3) * 2.5;
    const fx = Math.cos(floatT * 0.8 + ph * .9) * 1.5;
    const dx = px - (c.x + fx), dy = py - (c.y + fy);
    const a = -(c.ang || 0) * Math.PI / 180;
    const rx = dx * Math.cos(a) - dy * Math.sin(a);
    const ry = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(rx) < CW / 2 + 4 && Math.abs(ry) < CH / 2 + 4) return i;
  }
  return -1;
}

function cpos(e) {
  const r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function onMove(e) {
  if (st !== 'sel') return;
  const { x, y } = cpos(e);
  const h = hit(x, y);
  cCards.forEach((c, i) => {
    if (c.flip || c.dis) return;
    if (i === h) {
      if (!c.hov) { c.hov = true; c._oy = c.y; c.y -= 8; c.sc = 1.08; }
    } else if (c.hov) {
      c.hov = false;
      if (c._oy !== undefined) { c.y = c._oy; c._oy = undefined; }
      c.sc = 1;
    }
  });
}

function onDown(e) {
  if (st !== 'sel') return;
  const { x, y } = cpos(e);
  const hi = hit(x, y);
  if (hi < 0) return;

  const sp = SP[curSp];
  const c = cCards[hi];
  const dc = deck[hi % deck.length];

  c.flip = true;
  c.rev = dc.isReversed;
  c.hov = false;
  if (c._oy !== undefined) { c.y = c._oy; c._oy = undefined; }
  c.sc = 1.08;

  loadImg(dc.img).then(img => { c.fImg = img; });

  sel.push({ card: dc, cc: c, pos: sp.positions[sel.length] });
  updateDots();

  if (sel.length < sp.count) {
    document.getElementById('stxt').textContent = sp.positions[sel.length] + ' 카드를 선택하세요';
  } else {
    document.getElementById('stxt').textContent = '';
    unlisten();
    st = 'done';
    setTimeout(revealSelectedCards, 400);
  }
}

// ═══════ REVEAL: fan layout on canvas ═══════
let revealLayout = null;

function calcRevealLayout(w, h, count) {
  // For many cards, use 2 rows
  const useRows = count > 5;
  const rows = useRows ? 2 : 1;
  const perRow = useRows ? Math.ceil(count / 2) : count;

  // Card scale — fit within canvas with margin
  const hMargin = 16;
  const vMargin = 8;
  const labelH = 36; // space for labels below each card
  const availW = w - hMargin * 2;
  const availH = h - vMargin * 2;

  // Scale to fit cards horizontally
  const gapRatio = 0.15; // gap as fraction of card width
  const scW = availW / (perRow * CW * (1 + gapRatio) - CW * gapRatio);
  // Scale to fit cards + labels vertically
  const scH = availH / (rows * (CH + labelH) + (rows - 1) * 8);
  const sc = Math.max(0.5, Math.min(1.6, Math.min(scW, scH)));

  const cardW = CW * sc;
  const cardH = CH * sc;
  const gap = cardW * gapRatio;
  const rowH = cardH + labelH;

  // Total height of all rows
  const totalH = rows * rowH + (rows - 1) * 6;
  const topY = (h - totalH) / 2 + cardH / 2 + vMargin / 2;

  const positions = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const rowCount = r === 0 ? perRow : count - perRow;
    if (rowCount <= 0) break;
    const rowW = rowCount * cardW + (rowCount - 1) * gap;
    const rowStartX = (w - rowW) / 2 + cardW / 2;
    const rowY = topY + r * (rowH + 6);

    for (let c = 0; c < rowCount; c++) {
      // Subtle fan tilt
      const t = rowCount === 1 ? 0.5 : c / (rowCount - 1);
      const angDeg = rowCount <= 1 ? 0 : (t - 0.5) * Math.min(rowCount * 3, 15);
      // Slight arc
      const arcOffset = Math.pow(t - 0.5, 2) * cardH * 0.06;

      positions.push({
        x: rowStartX + c * (cardW + gap),
        y: rowY + arcOffset,
        ang: angDeg,
        sc
      });
      idx++;
    }
  }
  return { positions, sc, rows };
}

function revealSelectedCards() {
  const count = sel.length;
  const fanCards = sel.map(s => s.cc);

  // 1) Hide header, question, ctrl — show result panel FIRST so canvas resizes
  document.getElementById('ctrlArea').style.display = 'none';
  document.querySelector('#pg-tarot .hdr').style.display = 'none';
  document.querySelector('#pg-tarot .qarea').style.display = 'none';

  const panel = document.getElementById('resultPanel');
  panel.classList.add('show');

  // Force reflow so canvas gets its new size
  resize();

  // 2) NOW calculate layout with the actual canvas dimensions
  const w = cv.clientWidth, h = cv.clientHeight;
  revealLayout = calcRevealLayout(w, h, count);
  const { positions } = revealLayout;

  // 3) Animate cards
  const cfgs = cCards.map(c => {
    const selIdx = fanCards.indexOf(c);
    if (selIdx >= 0) {
      const p = positions[selIdx];
      return { tg: { x: p.x, y: p.y, ang: p.ang, sc: p.sc, a: 1 }, dl: selIdx * 80 };
    } else {
      return { tg: { x: c.x, y: c.y - 20, ang: c.ang || 0, sc: 0.1, a: 0 }, dl: 0 };
    }
  });

  animCards(cfgs, 750, () => {
    st = 'reveal';
    showCanvasLabels();
  });

  // 4) Start loading AI result immediately
  showResultContent();
}

function showCanvasLabels() {
  let layer = document.getElementById('canvasLabels');
  if (layer) layer.remove();
  if (!revealLayout) return;

  const { positions, sc } = revealLayout;
  layer = document.createElement('div');
  layer.id = 'canvasLabels';
  layer.className = 'canvas-labels';
  document.getElementById('canvasWrap').appendChild(layer);

  sel.forEach((s, i) => {
    const p = positions[i];
    const top = p.y + (CH * sc) / 2 + 2;

    const lbl = document.createElement('div');
    lbl.className = 'clbl';
    lbl.style.left = p.x + 'px';
    lbl.style.top = top + 'px';

    const rv = s.card.isReversed;
    lbl.innerHTML = `
      <div class="clbl-pos">${s.pos}</div>
      <div class="clbl-name">${s.card.name}</div>
      <div class="clbl-dir" style="color:${rv ? '#e85454' : '#7be854'}">${rv ? '↻ 역방향' : '정방향'}</div>
    `;
    layer.appendChild(lbl);
  });
}

function showResultContent() {
  const sp = SP[curSp];
  const body = document.getElementById('rpBody');

  const q = document.getElementById('qInput').value.trim();
  const ak = localStorage.getItem('gemini_api_key');

  let html = `<div style="text-align:center;padding:4px 0 8px">
    <span style="font-family:'Cinzel',serif;font-size:.85rem;color:var(--gold);letter-spacing:.1em">✦ ${sp.name} 해석 ✦</span>
  </div>`;

  if (!ak) {
    html += `<div class="aw">⚠️ Gemini API 키가 설정되지 않았습니다.<br>
      <a href="#" onclick="closeResultAndReset();showPage('settings');return false">설정 페이지</a>에서 API 키를 입력해주세요.</div>`;
    html += buildFallback();
  } else {
    html += '<div class="ail" id="aiL">AI가 타로를 해석하고 있습니다</div>';
  }

  body.innerHTML = html;

  if (ak) callGeminiAI(ak, q);
  saveHistory(q);
}

function buildFallback() {
  let h = '<div class="air">';
  sel.forEach(s => {
    const rv = s.card.isReversed;
    h += `\n【${s.pos}】 ${s.card.name} (${rv ? '역방향' : '정방향'})\n`;
    h += `${rv ? s.card.reversed : s.card.meaning}\n`;
  });
  return h + '</div>';
}

async function callGeminiAI(ak, q) {
  const sp = SP[curSp];
  const ci = sel.map(s => {
    const rv = s.card.isReversed;
    return `- ${s.pos}: ${s.card.name} (${rv ? '역방향' : '정방향'}) — ${rv ? s.card.reversed : s.card.meaning}`;
  }).join('\n');

  const prompt = `당신은 전문 타로 리더입니다. 라이더-웨이트-스미스 덱을 사용한 ${sp.name}(${sp.nameEn}) 스프레드 리딩을 해석해주세요.

${q ? '질문: ' + q + '\n\n' : ''}선택된 카드:
${ci}

각 카드의 위치별 의미를 상세히 해석하고, 카드들 간의 관계와 전체적인 메시지를 종합해주세요.
한국어로 답변하되 카드 이름은 영문을 병기해주세요.`;

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + ak,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const el = document.getElementById('aiL');
    if (el) {
      if (txt) {
        el.outerHTML = '<div class="air">' + txt.replace(/\n/g, '<br>') + '</div>';
      } else {
        el.outerHTML = '<div class="aw">⚠️ AI 응답 오류. API 키를 확인해주세요.</div>' + buildFallback();
      }
    }
    // update history with AI response
    const hist = getHistory();
    if (hist.length) { hist[0].ai = txt || ''; }
    localStorage.setItem('tarot_hist', JSON.stringify(hist));
  } catch (e) {
    const el = document.getElementById('aiL');
    if (el) {
      el.outerHTML = '<div class="aw">⚠️ 연결 오류: ' + e.message + '</div>' + buildFallback();
    }
  }
}

function closeResult() { document.getElementById('rov').classList.remove('show'); }
function restart() {
  closeResult();
  closeResultPanel();
  // Reset state but don't start idle yet
  st = 'idle';
  unlisten();
  cCards = [];
  idleCards = [];
  sel = [];
  revealLayout = null;
  updateDots();
  document.getElementById('stxt').textContent = '카드를 셔플하세요';
  const btn = document.getElementById('mainBtn');
  btn.disabled = false;
  btn.style.display = '';
  // Switch to tarot page first (restores layout)
  showPage('tarot');
  // Now canvas has correct size — start idle animation
  startIdleAnimation();
}

function closeResultPanel() {
  document.getElementById('resultPanel').classList.remove('show');
  document.getElementById('rpBody').innerHTML = '';
  document.getElementById('ctrlArea').style.display = '';
  // Restore header & question
  const hdr = document.querySelector('#pg-tarot .hdr');
  if (hdr) hdr.style.display = '';
  const qa = document.querySelector('#pg-tarot .qarea');
  if (qa) qa.style.display = '';
  // Remove canvas labels
  const lbls = document.getElementById('canvasLabels');
  if (lbls) lbls.remove();
}

// Also reset when closing result after a completed reading
function closeResultAndReset() {
  document.getElementById('rov').classList.remove('show');
  closeResultPanel();
  if (st === 'done' || st === 'reveal') {
    st = 'idle';
    unlisten();
    cCards = [];
    idleCards = [];
    sel = [];
    revealLayout = null;
    updateDots();
    document.getElementById('stxt').textContent = '카드를 셔플하세요';
    const btn = document.getElementById('mainBtn');
    btn.disabled = false;
    btn.style.display = '';
    // Resize first, then start idle with correct dimensions
    resize();
    startIdleAnimation();
  }
}

// ═══════ HISTORY ═══════
function getHistory() {
  try { return JSON.parse(localStorage.getItem('tarot_hist') || '[]'); }
  catch { return []; }
}

function saveHistory(q) {
  const h = getHistory();
  h.unshift({
    dt: new Date().toISOString(),
    sp: curSp,
    spN: SP[curSp].name,
    q: q || '',
    cards: sel.map(s => ({
      name: s.card.name,
      id: s.card.id,
      pos: s.pos,
      rev: s.card.isReversed,
      m: s.card.isReversed ? s.card.reversed : s.card.meaning,
      img: s.card.img
    })),
    ai: ''
  });
  if (h.length > 50) h.length = 50;
  localStorage.setItem('tarot_hist', JSON.stringify(h));
}

function renderHistory() {
  const el = document.getElementById('hList');
  const h = getHistory();
  if (!h.length) {
    el.innerHTML = '<div class="hempty">아직 타로 내역이 없습니다.<br>첫 번째 리딩을 시작해보세요! ✦</div>';
    return;
  }
  el.innerHTML = h.map((it, i) => `
    <div class="hitem" onclick="viewHistory(${i})">
      <div class="htop">
        <span class="hsp">${it.spN}</span>
        <span class="hdate">${new Date(it.dt).toLocaleDateString('ko')} ${new Date(it.dt).toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="hq">${it.q || '(질문 없음)'}</div>
      <div class="hchips">${it.cards.map(c => '<span class="hchip">' + c.name + (c.rev ? ' ↓' : '') + '</span>').join('')}</div>
    </div>
  `).join('');
}

function viewHistory(i) {
  const h = getHistory();
  const it = h[i];
  if (!it) return;

  const ov = document.getElementById('rov');
  const bd = document.getElementById('rovB');
  document.getElementById('rovT').textContent = '✦ ' + it.spN + ' ✦';

  let html = '<div class="rcrow">';
  it.cards.forEach(c => {
    html += `<div class="rcm">
      <img src="${c.img}" style="${c.rev ? 'transform:rotate(180deg)' : ''}">
      <div class="p">${c.pos}</div>
      <div class="n">${c.name}</div>
      <div class="d" style="color:${c.rev ? '#e85454' : '#7be854'}">${c.rev ? '역방향' : '정방향'}</div>
    </div>`;
  });
  html += '</div>';
  if (it.q) html += `<div style="font-size:.78rem;color:var(--text2);margin:6px 0;font-style:italic">질문: ${it.q}</div>`;
  if (it.ai) {
    html += '<div class="air">' + it.ai.replace(/\n/g, '<br>') + '</div>';
  } else {
    html += '<div class="air">';
    it.cards.forEach(c => { html += `\n【${c.pos}】 ${c.name} (${c.rev ? '역방향' : '정방향'})\n${c.m}\n`; });
    html += '</div>';
  }

  bd.innerHTML = html;
  ov.classList.add('show');
}

// ═══════ SETTINGS ═══════
function initSettings() {
  document.getElementById('apiInput').value = localStorage.getItem('gemini_api_key') || '';
  curSp = localStorage.getItem('tarot_sp') || 'three';

  const g = document.getElementById('spGrid');
  g.innerHTML = Object.entries(SP).map(([k, v]) => `
    <div class="spopt${k === curSp ? ' act' : ''}" data-s="${k}" onclick="selectSpread('${k}')">
      <div class="sn">${v.name}</div>
      <div class="sc">${v.count}장</div>
    </div>
  `).join('');

  updateSpreadLabel();
}

function saveApiKey() {
  localStorage.setItem('gemini_api_key', document.getElementById('apiInput').value.trim());
  const m = document.getElementById('keySvd');
  m.classList.add('show');
  setTimeout(() => m.classList.remove('show'), 2000);
}

function selectSpread(k) {
  curSp = k;
  localStorage.setItem('tarot_sp', k);
  document.querySelectorAll('.spopt').forEach(e => e.classList.toggle('act', e.dataset.s === k));
  updateSpreadLabel();
  const m = document.getElementById('spSvd');
  m.classList.add('show');
  setTimeout(() => m.classList.remove('show'), 2000);
  if (st !== 'idle') resetTarot();
}

function updateSpreadLabel() {
  document.getElementById('spLabel').textContent = SP[curSp].name + ' (' + SP[curSp].count + '장)';
  updateDots();
}

function updateDots() {
  const sp = SP[curSp];
  const r = document.getElementById('dotRow');
  r.innerHTML = '';
  for (let i = 0; i < sp.count; i++) {
    const d = document.createElement('div');
    d.className = 'dot';
    if (i < sel.length) d.classList.add('on');
    r.appendChild(d);
  }
}

// ═══════ NAVIGATION ═══════
function showPage(n) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('pg-' + n).classList.add('active');
  document.querySelector('.nav-btn[data-p="' + n + '"]').classList.add('active');
  if (n === 'history') renderHistory();
  if (n === 'tarot') resize();
}

// ═══════ MAIN CONTROLS ═══════
function onMain() {
  if (st === 'idle') startShuffle();
}

function resetTarot() {
  st = 'idle';
  unlisten();
  cCards = [];
  idleCards = [];
  sel = [];
  revealLayout = null;
  closeResultPanel();
  updateDots();
  document.getElementById('stxt').textContent = '카드를 셔플하세요';
  const btn = document.getElementById('mainBtn');
  btn.disabled = false;
  btn.style.display = '';
  resize();
  startIdleAnimation();
}

// ═══════ WINDOW EVENTS ═══════
window.addEventListener('resize', () => { resize(); });

// ═══════ START ═══════
loadData();
