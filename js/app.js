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
  floatRAF = requestAnimationFrame(floatLoop);
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
  // unique floating phase per card
  const ph = c.idx * 1.7 + c.idx * c.idx * .3;
  const floatY = Math.sin(t * 1.2 + ph) * 4 + Math.sin(t * 0.7 + ph * 1.3) * 2.5;
  const floatX = Math.cos(t * 0.8 + ph * .9) * 1.5;
  const floatAng = Math.sin(t * 0.5 + ph * 1.1) * 0.8;
  const floatSc = 1 + Math.sin(t * 0.9 + ph) * 0.008;
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
  document.getElementById('mainBtn').disabled = true;
  document.getElementById('stxt').textContent = '셔플 중...';
  deck = shuf(D.map(c => ({ ...c, isReversed: Math.random() < .4 })));
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
    document.getElementById('stxt').textContent = '운명을 읽는 중...';
    cCards.forEach(c => { if (!c.flip) { c.dis = true; c.a = .12; } });
    unlisten();
    st = 'done';
    setTimeout(showResult, 1000);
  }
}

// ═══════ RESULT & AI ═══════
function showResult() {
  const sp = SP[curSp];
  const ov = document.getElementById('rov');
  const bd = document.getElementById('rovB');
  document.getElementById('rovT').textContent = '✦ ' + sp.name + ' 해석 ✦';

  let h = '<div class="rcrow">';
  sel.forEach(s => {
    const rv = s.card.isReversed;
    h += `<div class="rcm">
      <img src="${s.card.img}" style="${rv ? 'transform:rotate(180deg)' : ''}">
      <div class="p">${s.pos}</div>
      <div class="n">${s.card.name}</div>
      <div class="d" style="color:${rv ? '#e85454' : '#7be854'}">${rv ? '역방향' : '정방향'}</div>
    </div>`;
  });
  h += '</div>';

  const q = document.getElementById('qInput').value.trim();
  const ak = localStorage.getItem('gemini_api_key');

  if (!ak) {
    h += `<div class="aw">⚠️ Gemini API 키가 설정되지 않았습니다.<br>
      <a href="#" onclick="closeResult();showPage('settings');return false">설정 페이지</a>에서 API 키를 입력해주세요.</div>`;
    h += buildFallback();
  } else {
    h += '<div class="ail" id="aiL">AI가 타로를 해석하고 있습니다</div>';
  }

  bd.innerHTML = h;
  ov.classList.add('show');

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
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + ak,
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
function restart() { closeResult(); resetTarot(); }

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
  sel = [];
  updateDots();
  document.getElementById('stxt').textContent = '카드를 셔플하세요';
  const btn = document.getElementById('mainBtn');
  btn.disabled = false;
  btn.style.display = '';
}

// ═══════ WINDOW EVENTS ═══════
window.addEventListener('resize', () => { resize(); });

// ═══════ START ═══════
loadData();
