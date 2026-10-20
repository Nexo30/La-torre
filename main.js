// Entry point: class select, board rendering, touch input and HUD.
import { createRun, tapTile, heroAttack, heroMutationSkill, usePotion, waitTurn, canHit } from './game.js';
import { CLASSES, GENDERS, COLS, ROWS, MAX_FLOOR, WALL, STAIRS } from './data.js';
import { heroCanvas, enemyCanvas, tileCanvas } from './sprites.js';

const $ = id => document.getElementById(id);
const canvas = $('board');
const ctx = canvas.getContext('2d');
const view = { W: 0, H: 0, T: 32, ox: 0, oy: 0 };
const sel = { classId: 'guerrero', gender: 'hombre' };
let run = null;
let floats = [];

// ---------- layout ----------

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.W = r.width;
  view.H = r.height;
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  view.T = Math.max(10, Math.floor(Math.min(r.width / COLS, r.height / ROWS)));
  view.ox = Math.floor((r.width - view.T * COLS) / 2);
  view.oy = Math.floor((r.height - view.T * ROWS) / 2);
}

// ---------- drawing ----------

function drawBoard(t) {
  const { T, ox, oy } = view;
  ctx.fillStyle = '#0d0a18';
  ctx.fillRect(0, 0, view.W, view.H);
  const hero = run.hero;

  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const px = ox + x * T, py = oy + y * T;
    if (!run.explored[y][x]) { ctx.fillStyle = '#07050e'; ctx.fillRect(px, py, T, T); continue; }
    const tile = run.grid[y][x];
    let img;
    if (tile === WALL) img = tileCanvas(run.torches.has(`${x},${y}`) ? 'torch' : 'wall');
    else if (tile === STAIRS) img = tileCanvas('stairs');
    else img = tileCanvas('floor', (x * 7 + y * 13) % 3);
    ctx.drawImage(img, px, py, T, T);
    const chest = run.chests.find(c => c.x === x && c.y === y);
    if (chest) ctx.drawImage(tileCanvas(chest.open ? 'chestOpen' : 'chest'), px, py, T, T);
    const vis = run.visible[y][x];
    if (!vis) { ctx.fillStyle = 'rgba(8, 6, 16, 0.55)'; ctx.fillRect(px, py, T, T); continue; }

    const npc = run.npcs.find(n => n.x === x && n.y === y);
    if (npc) ctx.drawImage(tileCanvas('injector'), px, py, T, T);
    const e = run.enemies.find(en => en.x === x && en.y === y);
    if (e) drawEnemy(e, px, py + Math.sin(t / 350 + x) * T * 0.04, T);
  }

  // torch flames (animated)
  for (const key of run.torches) {
    const [x, y] = key.split(',').map(Number);
    if (!run.explored[y][x]) continue;
    const cx = ox + x * T + T / 2, cy = oy + y * T + T * 0.45;
    const f = Math.sin(t / 120 + x * 1.3 + y * 0.7);
    ctx.fillStyle = 'rgba(255, 170, 60, 0.18)';
    ctx.beginPath(); ctx.arc(cx, cy, T * (0.7 + 0.08 * f), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(cx - T * 0.08, cy - T * 0.22 - f * T * 0.04, T * 0.16, T * 0.22);
    ctx.fillStyle = '#fff2b0';
    ctx.fillRect(cx - T * 0.04, cy - T * 0.12, T * 0.08, T * 0.12);
  }

  // hero
  const hx = ox + hero.x * T, hy = oy + hero.y * T + Math.sin(t / 260) * T * 0.04;
  ctx.drawImage(heroCanvas(run.classId, run.gender), hx, hy, T, T);
  if (run.mutation === 'goblin') { ctx.fillStyle='rgba(76,210,75,.62)'; ctx.fillRect(hx+T*.28,hy+T*.18,T*.44,T*.48); }
  if (run.mutation === 'beast') { ctx.fillStyle='rgba(165,169,174,.62)'; ctx.fillRect(hx+T*.28,hy+T*.18,T*.44,T*.48); }
  if (hero.flash > 0) { ctx.fillStyle = 'rgba(255, 60, 60, 0.35)'; ctx.fillRect(hx, hy, T, T); }
  ctx.strokeStyle = `rgba(127, 224, 255, ${0.5 + 0.4 * Math.sin(t / 200)})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(hx + 1, hy + 1, T - 2, T - 2);

  drawFloats(t);
}

function drawEnemy(e, px, py, T) {
  ctx.drawImage(enemyCanvas(e.type), px, py, T, T);
  if (e.flash > 0) { ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; ctx.fillRect(px, py, T, T); }
  const frac = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = '#2a0c0c';
  ctx.fillRect(px + T * 0.1, py + 1, T * 0.8, 3);
  ctx.fillStyle = '#ff4d4d';
  ctx.fillRect(px + T * 0.1, py + 1, T * 0.8 * frac, 3);
  if (canHit(run, e)) {
    ctx.strokeStyle = 'rgba(255, 90, 90, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, T - 2, T - 2);
  }
}

function drawFloats(t) {
  const T = view.T;
  floats = floats.filter(f => t - f.born < 700);
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(T * 0.42)}px ui-monospace, monospace`;
  for (const f of floats) {
    const age = (t - f.born) / 700;
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, view.ox + f.x * T + T / 2, view.oy + f.y * T + T * 0.3 - age * T * 0.8);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function frame(t) {
  if (run) {
    for (const f of run.fx) floats.push({ ...f, born: t });
    run.fx.length = 0;
    for (const e of run.enemies) if (e.flash > 0) e.flash--;
    if (run.hero.flash > 0) run.hero.flash--;
    drawBoard(t);
  }
  requestAnimationFrame(frame);
}

// ---------- HUD ----------

function refresh() {
  const h = run.hero, c = CLASSES[run.classId];
  $('floor-label').textContent = `Piso ${run.floor}/${MAX_FLOOR}`;
  $('class-label').textContent = `${c.name} · ${GENDERS[run.gender].label}`;
  $('hp-fill').style.width = `${Math.max(0, h.hp / h.maxHp) * 100}%`;
  $('mp-fill').style.width = `${Math.max(0, h.mp / h.maxMp) * 100}%`;
  $('hp-text').textContent = `${Math.max(0, h.hp)}/${h.maxHp}`;
  $('mp-text').textContent = `${h.mp}/${h.maxMp}`;
  $('stat-label').textContent = `ATK ${h.atk} · DEF ${h.def}` + (run.mutation ? ` · ${{goblin:'Goblin',dragon:'Dragón',beast:'Bestia'}[run.mutation]}` : '');
  $('btn-potion').innerHTML = `Poción<small>x${h.potions}</small>`;
  const powerNames={goblin:'Sigilo',dragon:'Fuego (3 MP)',beast:'Aullido (3 MP)'};
  $('btn-mutation').textContent=run.mutation?powerNames[run.mutation]:'Poder';
  $('actions').classList.toggle('grid-cols-4',!!run.mutation); $('actions').classList.toggle('grid-cols-3',!run.mutation);
  $('btn-mutation').classList.toggle('hidden',!run.mutation); $('btn-mutation').disabled=!run.mutation||(run.mutation!=='goblin'&&h.mp<3);
  $('btn-potion').disabled = h.potions <= 0;
  const log = $('log');
  log.innerHTML = '';
  for (const line of run.log.slice(-2)) {
    const p = document.createElement('div');
    p.textContent = line;
    log.appendChild(p);
  }
}

function act(fn) {
  if (!run || run.over || run.won) return;
  fn();
  refresh();
  if (run.dialog) showDialog();
  if (run.won) showEnd(true);
  else if (run.over) showEnd(false);
}

function showDialog(){if(!run.dialog)return;$('dialog-title').textContent=run.dialog.title;$('dialog-text').textContent=run.dialog.text;$('dialog-screen').classList.remove('hidden');}
function closeDialog(){run.dialog=null;$('dialog-screen').classList.add('hidden');refresh();if(run.won)showEnd(true);else if(run.over)showEnd(false);}

function showEnd(won) {
  $('end-title').textContent = won ? '¡Conquistaste la torre!' : 'Caíste';
  $('end-text').textContent = won
    ? `Llegaste a la cima de los 10 pisos como ${CLASSES[run.classId].name}.`
    : `Tu aventura terminó en el piso ${run.floor} de 10.`;
  $('retry-btn').textContent = won ? 'Jugar otra vez' : 'Reintentar';
  $('end-screen').classList.remove('hidden');
}

// ---------- class select ----------

function renderClassList() {
  const list = $('class-list');
  list.innerHTML = '';
  for (const [id, c] of Object.entries(CLASSES)) {
    const card = document.createElement('button');
    card.className = 'class-card' + (sel.classId === id ? ' on' : '');
    card.innerHTML = `<div class="name">${c.name}</div>` +
      `<div class="tag">${c.tag}</div>` +
      `<div class="skill">${c.skill.name}: ${c.skill.desc}</div>` +
      `<div class="stats">HP ${c.hp} · MP ${c.mp} · ATK ${c.atk} · DEF ${c.def}</div>` +
      `<div class="portraits"></div>`;
    const wrap = card.querySelector('.portraits');
    for (const g of Object.keys(GENDERS)) {
      const cv = document.createElement('canvas');
      cv.width = 16; cv.height = 16;
      cv.getContext('2d').drawImage(heroCanvas(id, g), 0, 0);
      if (sel.gender !== g) cv.className = 'dim';
      wrap.appendChild(cv);
    }
    card.addEventListener('click', () => { sel.classId = id; renderClassList(); });
    list.appendChild(card);
  }
  for (const g of Object.keys(GENDERS)) {
    $(`g-${g}`).classList.toggle('on', sel.gender === g);
  }
}

function showStart() {
  renderClassList();
  $('start-screen').classList.remove('hidden');
  $('end-screen').classList.add('hidden');
}

function startRun() {
  run = createRun(sel.classId, sel.gender);
  floats = [];
  $('start-screen').classList.add('hidden'); $('end-screen').classList.add('hidden'); $('dialog-screen').classList.add('hidden');
  resize();
  refresh();
}

// ---------- wiring ----------

canvas.addEventListener('pointerdown', e => {
  if (!run || run.over || run.won || (run.dialog && !$('dialog-screen').classList.contains('hidden'))) return;
  const r = canvas.getBoundingClientRect();
  const tx = Math.floor((e.clientX - r.left - view.ox) / view.T);
  const ty = Math.floor((e.clientY - r.top - view.oy) / view.T);
  act(() => tapTile(run, tx, ty));
});

$('btn-attack').addEventListener('click', () => act(() => heroAttack(run)));
$('btn-mutation').addEventListener('click', () => act(() => heroMutationSkill(run)));
$('dialog-close').addEventListener('click', closeDialog);
$('btn-potion').addEventListener('click', () => act(() => usePotion(run)));
$('btn-wait').addEventListener('click', () => act(() => waitTurn(run)));
$('start-btn').addEventListener('click', startRun);
$('retry-btn').addEventListener('click', startRun);
$('menu-end-btn').addEventListener('click', showStart);
$('g-hombre').addEventListener('click', () => { sel.gender = 'hombre'; renderClassList(); });
$('g-mujer').addEventListener('click', () => { sel.gender = 'mujer'; renderClassList(); });
// The board shrinks/grows when the log text wraps, so recompute the grid layout on every size change.
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas.parentElement);
window.addEventListener('resize', resize);

resize();
showStart();
requestAnimationFrame(frame);
