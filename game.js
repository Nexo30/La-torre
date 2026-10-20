// Turn-based rules. Every player action that succeeds costs one turn, then enemies act.
import {
  COLS, ROWS, MAX_FLOOR, VISION, POTION_HEAL, MAX_POTIONS,
  FLOOR, WALL, STAIRS, CLASSES, GENDERS, ENEMY_TYPES,
} from './data.js';

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const cheb = (x1, y1, x2, y2) => Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
const inB = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const center = r => ({ x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) });
const grid2d = v => Array.from({ length: ROWS }, () => Array(COLS).fill(v));

export function createRun(classId, gender) {
  const c = CLASSES[classId];
  const g = GENDERS[gender];
  const maxHp = c.hp + g.hpBonus;
  const maxMp = c.mp + g.mpBonus;
  const run = {
    classId, gender, floor: 0, turn: 0, over: false, won: false, boss: false,
    hero: { x: 0, y: 0, hp: maxHp, maxHp, mp: maxMp, maxMp, atk: c.atk, def: c.def, potions: 2, flash: 0, stealthTurns: 0, stealthCooldown: 0 },
    grid: [], explored: [], visible: [], torches: new Set(), rooms: [],
    enemies: [], chests: [], npcs: [], mutation: null, dialog: null, visualEffects: [], log: [], fx: [],
  };
  addLog(run, 'Subes a la torre. Cada acción cuesta un turno.');
  nextFloor(run);
  return run;
}

function addLog(run, msg) {
  run.log.push(msg);
  if (run.log.length > 30) run.log.shift();
}

function ready(run) { return !run.over && !run.won; }

// ---------- floor generation ----------

function carve(grid, a, b) {
  for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) grid[a.y][x] = FLOOR;
  for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) grid[y][b.x] = FLOOR;
}

function buildFloor() {
  const grid = grid2d(WALL);
  const rooms = [];
  for (let tries = 0; tries < 500 && rooms.length < 8; tries++) {
    const w = rand(3, 5), h = rand(3, 4);
    const x = rand(1, COLS - w - 1), y = rand(1, ROWS - h - 1);
    if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
    const room = { x, y, w, h };
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j][i] = FLOOR;
    if (rooms.length) carve(grid, center(rooms[rooms.length - 1]), center(room));
    rooms.push(room);
  }
  const torches = new Set();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (grid[y][x] !== WALL || Math.random() > 0.12) continue;
    const nearFloor = DIRS4.some(([dx, dy]) => inB(x + dx, y + dy) && grid[y + dy][x + dx] === FLOOR);
    if (nearFloor) torches.add(`${x},${y}`);
  }
  return { grid, rooms, torches };
}

function freeCell(run, room, taken) {
  for (let i = 0; i < 20; i++) {
    const x = rand(room.x, room.x + room.w - 1), y = rand(room.y, room.y + room.h - 1);
    if (run.grid[y][x] !== FLOOR || taken(x, y)) continue;
    return { x, y };
  }
  return null;
}

function makeEnemy(key, x, y, floor) {
  const t = ENEMY_TYPES[key];
  const scale = t.boss ? 1 : 1 + (floor - 1) * 0.1;
  const hp = Math.round(t.hp * scale);
  return {
    type: key, name: t.name, x, y, hp, maxHp: hp,
    atk: t.boss ? t.atk : t.atk + Math.floor((floor - 1) / 3), def: t.def,
    speed: t.speed || 1, range: t.range || 0, boss: !!t.boss, flash: 0, aware: false,
  };
}

function pickEnemyType(floor) {
  const pool = Object.keys(ENEMY_TYPES).filter(k => !ENEMY_TYPES[k].boss && ENEMY_TYPES[k].minFloor <= floor);
  const total = pool.reduce((s, k) => s + ENEMY_TYPES[k].weight, 0);
  let r = Math.random() * total;
  for (const k of pool) { r -= ENEMY_TYPES[k].weight; if (r <= 0) return k; }
  return pool[0];
}

export function nextFloor(run) {
  run.floor++;
  run.boss = run.floor === MAX_FLOOR;
  const built = buildFloor();
  run.grid = built.grid;
  run.rooms = built.rooms;
  run.torches = built.torches;
  run.explored = grid2d(false);
  run.visible = grid2d(false);
  const start = center(run.rooms[0]);
  const exit = center(run.rooms[run.rooms.length - 1]);
  run.hero.x = start.x;
  run.hero.y = start.y;
  if (!run.boss) run.grid[exit.y][exit.x] = STAIRS;

  run.chests = [];
  run.npcs = [];
  if (!run.mutation && run.rooms.length > 2) {
    const npcRoom = run.rooms[rand(1, run.rooms.length - 2)];
    const npcPos = freeCell(run, npcRoom, (x, y) => (x === start.x && y === start.y) || (x === exit.x && y === exit.y));
    if (npcPos) run.npcs.push({ ...npcPos, used: false });
  }
  for (let i = 1; i < run.rooms.length - 1; i++) {
    if (Math.random() < 0.45) {
      const p = freeCell(run, run.rooms[i], () => false);
      if (p && !run.npcs.some(n => n.x === p.x && n.y === p.y)) run.chests.push({ x: p.x, y: p.y, open: false });
    }
  }

  run.enemies = [];
  const occupied = (x, y) => (x === start.x && y === start.y) || (x === exit.x && y === exit.y && !run.boss) ||
    run.enemies.some(e => e.x === x && e.y === y) || run.chests.some(c => c.x === x && c.y === y) || run.npcs.some(n => n.x === x && n.y === y);
  if (run.boss) run.enemies.push(makeEnemy('guardian', exit.x, exit.y, run.floor));
  const count = run.boss ? 2 : 1 + Math.floor(run.floor * 0.35);
  for (let i = 0; i < count; i++) {
    const room = run.rooms[rand(1, run.rooms.length - 1)];
    const p = freeCell(run, room, (x, y) => occupied(x, y) || cheb(x, y, start.x, start.y) <= 4);
    if (p) run.enemies.push(makeEnemy(pickEnemyType(run.floor), p.x, p.y, run.floor));
  }
  updateVision(run);
  addLog(run, run.boss ? 'Piso 10: el Guardián de la torre te espera.' : `Piso ${run.floor}. Explora con cuidado.`);
}

// ---------- queries ----------

export function enemyAt(run, x, y) {
  return run.enemies.find(e => e.x === x && e.y === y) || null;
}

function chestAt(run, x, y) {
  return run.chests.find(c => c.x === x && c.y === y) || null;
}

export function lineClear(run, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (let guard = 0; guard < 100; guard++) {
    if (x === x1 && y === y1) return true;
    if (!(x === x0 && y === y0) && run.grid[y][x] === WALL) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return false;
}

export function updateVision(run) {
  const hx = run.hero.x, hy = run.hero.y;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) run.visible[y][x] = false;
  for (let dy = -VISION; dy <= VISION; dy++) for (let dx = -VISION; dx <= VISION; dx++) {
    const x = hx + dx, y = hy + dy;
    if (!inB(x, y) || Math.max(Math.abs(dx), Math.abs(dy)) > VISION) continue;
    if (lineClear(run, hx, hy, x, y)) {
      run.visible[y][x] = true;
      run.explored[y][x] = true;
    }
  }
}

// Can the hero hit this enemy right now (range and line of sight)?
export function canHit(run, e) {
  const h = run.hero, r = CLASSES[run.classId].range;
  const dx = e.x - h.x, dy = e.y - h.y, d = Math.max(Math.abs(dx), Math.abs(dy));
  if (d === 0 || d > r) return false;
  if (r === 1) return true;
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return false;
  return lineClear(run, h.x, h.y, e.x, e.y);
}

function nearestAttackable(run) {
  const list = run.enemies.filter(e => run.visible[e.y][e.x] && canHit(run, e));
  const h = run.hero;
  list.sort((a, b) => cheb(a.x, a.y, h.x, h.y) - cheb(b.x, b.y, h.x, h.y));
  return list[0] || null;
}

function nearestVisibleWithin(run, r, needLine) {
  const h = run.hero;
  const list = run.enemies.filter(e => run.visible[e.y][e.x] && cheb(e.x, e.y, h.x, h.y) <= r &&
    (!needLine || lineClear(run, h.x, h.y, e.x, e.y)));
  list.sort((a, b) => cheb(a.x, a.y, h.x, h.y) - cheb(b.x, b.y, h.x, h.y));
  return list[0] || null;
}

// BFS over 4-neighbours. canEnter(x, y) decides intermediate tiles; the goal is always allowed.
function findPath(run, sx, sy, tx, ty, canEnter) {
  const key = (x, y) => y * COLS + x;
  const prev = new Map([[key(sx, sy), -1]]);
  const q = [[sx, sy]];
  let found = false;
  for (let qi = 0; qi < q.length && !found; qi++) {
    const [x, y] = q[qi];
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx, ny = y + dy;
      if (!inB(nx, ny) || prev.has(key(nx, ny)) || run.grid[ny][nx] === WALL) continue;
      const isGoal = nx === tx && ny === ty;
      if (!isGoal && !canEnter(nx, ny)) continue;
      prev.set(key(nx, ny), key(x, y));
      if (isGoal) { found = true; break; }
      q.push([nx, ny]);
    }
  }
  if (!found) return null;
  const path = [];
  let k = key(tx, ty);
  while (k !== key(sx, sy)) { path.push([k % COLS, Math.floor(k / COLS)]); k = prev.get(k); }
  return path.reverse();
}

// ---------- hero actions (each returns true if a turn was spent) ----------

export function tapTile(run, tx, ty) {
  if (!ready(run) || !inB(tx, ty)) return false;
  const h = run.hero;
  if (tx === h.x && ty === h.y) return false;
  const e = enemyAt(run, tx, ty);
  if (e && run.visible[ty][tx] && canHit(run, e)) return attackEnemy(run, e);
  if (run.grid[ty][tx] === WALL) { addLog(run, 'Es un muro.'); return false; }
  const path = findPath(run, h.x, h.y, tx, ty, (x, y) => !enemyAt(run, x, y));
  if (!path || !path.length) { addLog(run, 'No hay camino hasta ahí.'); return false; }
  const [nx, ny] = path[0];
  return moveHero(run, nx - h.x, ny - h.y);
}

function moveHero(run, dx, dy) {
  const h = run.hero, nx = h.x + dx, ny = h.y + dy;
  if (!inB(nx, ny) || run.grid[ny][nx] === WALL) { addLog(run, 'Hay un muro.'); return false; }
  const e = enemyAt(run, nx, ny);
  if (e) return attackEnemy(run, e);
  h.x = nx; h.y = ny;
  const chest = chestAt(run, nx, ny);
  if (chest && !chest.open) openChest(run, chest);
  const npc = run.npcs.find(n => n.x === nx && n.y === ny && !n.used);
  if (npc) { meetInjector(run, npc); return true; }
  if (run.grid[ny][nx] === STAIRS) return descend(run);
  endTurn(run);
  return true;
}


function meetInjector(run, npc) {
  npc.used = true;
  const h = run.hero, kind = ['goblin', 'dragon', 'beast'][rand(0, 2)];
  run.mutation = kind;
  if (kind === 'goblin') {
    h.atk = Math.max(1, h.atk - 2); h.stealthTurns = 0;
    addLog(run, 'Una sensación extraña se extiende bajo tu piel. Tus movimientos se sienten distintos. Algo en ti ha cambiado.');
  } else if (kind === 'dragon') {
    h.atk = Math.max(1, h.atk - 2); h.def = Math.max(0, h.def - 1);
    addLog(run, 'Una oleada de calor te recorre el cuerpo. Respiras con dificultad por un instante. Algo en ti ha cambiado.');
  } else {
    h.def += 4;
    addLog(run, 'Sientes que tu cuerpo se vuelve más pesado y resistente. Algo en ti ha cambiado.');
  }
  const mutationInfo = {
    goblin: { title: '¡Poder obtenido: Sigilo!', text: 'El inyector te sujeta con fuerza y te clava la aguja antes de que puedas reaccionar. El suero altera tu cuerpo: tu piel se vuelve verde y notas que puedes desaparecer entre las sombras. Has obtenido el poder Sigilo.' },
    dragon: { title: '¡Poder obtenido: Aliento de fuego!', text: 'El inyector te inmoviliza y te inyecta el suero a la fuerza. Un calor abrasador te atraviesa y sientes fuego ardiendo en tu interior. Has obtenido Aliento de fuego.' },
    beast: { title: '¡Poder obtenido: Aullido bestial!', text: 'El inyector te agarra y te inyecta el suero sin darte oportunidad de apartarte. Tu piel se vuelve gris y tu cuerpo se endurece; una fuerza salvaje despierta en tu pecho. Has obtenido Aullido bestial.' }
  };
  run.dialog = mutationInfo[kind];
  endTurn(run);
}

export function heroMutationSkill(run) {
  if (!ready(run) || !run.mutation) return false;
  const h = run.hero;
  if (run.mutation === 'goblin') {
    if (h.stealthCooldown > 0) { addLog(run, `Sigilo en recarga: ${h.stealthCooldown} turnos.`); return false; }
    h.stealthTurns = 5;
    h.stealthCooldown = 7;
    run.visualEffects.push({ type: 'stealth', x: h.x, y: h.y, started: Date.now(), duration: 1250 });
    addLog(run, 'Te fundes con las sombras. El sigilo dura 4 turnos y entra en recarga.'); endTurn(run); return true;
  }
  if (h.mp < 3) { addLog(run, 'Necesitas 3 MP para usar el poder de la sangre.'); return false; }
  h.mp -= 3;
  if (run.mutation === 'dragon') {
    const targets = run.enemies.filter(e => run.visible[e.y][e.x] && cheb(e.x,e.y,h.x,h.y) <= 4 && lineClear(run,h.x,h.y,e.x,e.y));
    if (!targets.length) { h.mp += 3; addLog(run, 'No hay enemigos visibles en rango para lanzar fuego.'); return false; }
    targets.sort((a,b)=>cheb(a.x,a.y,h.x,h.y)-cheb(b.x,b.y,h.x,h.y));
    const primary=targets[0], splash=targets.filter(e=>e!==primary && cheb(e.x,e.y,primary.x,primary.y)<=1);
    run.visualEffects.push({ type: 'fire', x: h.x, y: h.y, targetX: primary.x, targetY: primary.y, started: Date.now(), duration: 900 });
    hitEnemy(run,primary,2.2,false); splash.forEach(e=>hitEnemy(run,e,1.2,false)); addLog(run,'Lanzas fuego y abrasas el área.');
  } else {
    const targets=run.enemies.filter(e=>run.visible[e.y][e.x] && cheb(e.x,e.y,h.x,h.y)<=2);
    if (!targets.length) { h.mp += 3; addLog(run,'No hay enemigos lo bastante cerca para oír tu aullido.'); return false; }
    run.visualEffects.push({ type: 'howl', x: h.x, y: h.y, started: Date.now(), duration: 850 });
    targets.forEach(e=>hitEnemy(run,e,1.5,false)); addLog(run,'Tu aullido sacude a todos los enemigos cercanos.');
  }
  endTurn(run); return true;
}

export function heroAttack(run) {
  if (!ready(run)) return false;
  const t = nearestAttackable(run);
  if (!t) { addLog(run, 'Ningún enemigo al alcance.'); return false; }
  return attackEnemy(run, t);
}

function attackEnemy(run, e) {
  hitEnemy(run, e, 1, false);
  endTurn(run);
  return true;
}

function hitEnemy(run, e, mult, forceCrit) {
  const c = CLASSES[run.classId];
  let dmg = Math.round(Math.max(1, run.hero.atk + rand(0, 2) - e.def) * mult);
  const crit = forceCrit || Math.random() < c.crit;
  if (crit) dmg *= 2;
  e.hp -= dmg;
  e.flash = 4;
  e.aware = true;
  run.fx.push({ x: e.x, y: e.y, text: `-${dmg}${crit ? '!' : ''}`, color: crit ? '#ffd34d' : '#ffffff' });
  addLog(run, `Golpeas a ${e.name} por ${dmg}${crit ? ' (crítico)' : ''}.`);
  if (e.hp <= 0) killEnemy(run, e);
}

function killEnemy(run, e) {
  run.enemies = run.enemies.filter(x => x !== e);
  addLog(run, `${e.name} cae.`);
  if (e.boss) {
    run.grid[e.y][e.x] = STAIRS;
    addLog(run, 'El Guardián se desploma. Las escaleras de la cima se revelan.');
  }
}

export function heroSkill(run) {
  if (!ready(run)) return false;
  const c = CLASSES[run.classId], h = run.hero;
  if (h.mp < c.skill.cost) { addLog(run, 'No tienes maná suficiente.'); return false; }
  let done = false;
  if (run.classId === 'guerrero') {
    const list = run.enemies.filter(e => run.visible[e.y][e.x] && cheb(e.x, e.y, h.x, h.y) === 1);
    if (list.length) { h.mp -= c.skill.cost; list.forEach(e => hitEnemy(run, e, 1, false)); done = true; }
  } else if (run.classId === 'maga') {
    const t = nearestVisibleWithin(run, 4, true);
    if (t) {
      h.mp -= c.skill.cost;
      const splash = run.enemies.filter(e => e !== t && cheb(e.x, e.y, t.x, t.y) === 1);
      hitEnemy(run, t, 2.5, false);
      splash.forEach(e => hitEnemy(run, e, 1.2, false));
      done = true;
    }
  } else if (run.classId === 'arquero') {
    let best = [];
    for (const [dx, dy] of DIRS4) {
      const list = [];
      let x = h.x, y = h.y;
      for (let s = 1; s <= 6; s++) {
        x += dx; y += dy;
        if (!inB(x, y) || run.grid[y][x] === WALL) break;
        const e = enemyAt(run, x, y);
        if (e && run.visible[y][x]) list.push(e);
      }
      if (list.length > best.length) best = list;
    }
    if (best.length) { h.mp -= c.skill.cost; best.forEach(e => hitEnemy(run, e, 1.2, false)); done = true; }
  } else if (run.classId === 'asesino') {
    const t = nearestVisibleWithin(run, 4, false);
    const spot = t && adjacentSpot(run, t);
    if (spot) {
      h.mp -= c.skill.cost;
      h.x = spot.x; h.y = spot.y;
      hitEnemy(run, t, 2.5, true);
      done = true;
    } else if (t) addLog(run, 'No hay sitio para aparecer junto a él.');
  }
  if (!done) { addLog(run, 'No hay enemigos al alcance de tu habilidad.'); return false; }
  endTurn(run);
  return true;
}

function adjacentSpot(run, t) {
  const h = run.hero;
  const spots = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = t.x + dx, y = t.y + dy;
    if ((dx || dy) && inB(x, y) && run.grid[y][x] !== WALL && !enemyAt(run, x, y)) spots.push({ x, y });
  }
  spots.sort((a, b) => cheb(a.x, a.y, h.x, h.y) - cheb(b.x, b.y, h.x, h.y));
  return spots[0] || null;
}

export function usePotion(run) {
  if (!ready(run)) return false;
  const h = run.hero;
  if (h.potions <= 0) { addLog(run, 'No te quedan pociones.'); return false; }
  if (h.hp >= h.maxHp) { addLog(run, 'Tu vida ya está completa.'); return false; }
  h.potions--;
  const heal = Math.min(POTION_HEAL, h.maxHp - h.hp);
  h.hp += heal;
  run.fx.push({ x: h.x, y: h.y, text: `+${heal}`, color: '#7CFF9B' });
  addLog(run, `Bebes una poción (+${heal} vida).`);
  endTurn(run);
  return true;
}

export function waitTurn(run) {
  if (!ready(run)) return false;
  addLog(run, 'Esperas y observas.');
  endTurn(run);
  return true;
}

function openChest(run, c) {
  c.open = true;
  const h = run.hero, r = Math.random();
  if (r < 0.5 && h.potions < MAX_POTIONS) {
    h.potions++;
    addLog(run, 'Cofre: encuentras una poción.');
  } else if (r < 0.8) {
    if (Math.random() < 0.5) { h.atk++; addLog(run, 'Cofre: tu arma mejora (+1 ataque).'); }
    else { h.def++; addLog(run, 'Cofre: tu armadura mejora (+1 defensa).'); }
  } else {
    h.mp = Math.min(h.maxMp, h.mp + 4);
    addLog(run, 'Cofre: recuperas 4 de maná.');
  }
}

function descend(run) {
  if (run.floor >= MAX_FLOOR) {
    run.won = true;
    addLog(run, '¡Has conquistado la torre!');
    return true;
  }
  const h = run.hero;
  const heal = Math.ceil(h.maxHp * 0.5);
  h.maxHp += 2;
  h.hp = Math.min(h.maxHp, h.hp + heal + 2);
  addLog(run, `Subes al piso ${run.floor + 1}. Recuperas ${heal + 2} de vida y ganas +2 de vida máxima.`);
  nextFloor(run);
  return true;
}

// ---------- enemy phase ----------

function endTurn(run) {
  run.turn++;
  const h = run.hero;
  h.mp = Math.min(h.maxMp, h.mp + 1);
  updateVision(run);
  if (h.stealthTurns > 0) h.stealthTurns--;
  if (h.stealthCooldown > 0) h.stealthCooldown--;
  for (const e of [...run.enemies]) {
    if (h.hp <= 0) break;
    if (!run.enemies.includes(e)) continue;
    if (h.stealthTurns > 0 && cheb(e.x,e.y,h.x,h.y)>1) continue;
    if (!e.aware) {
      const detectRange = run.mutation === 'goblin' ? 2 : VISION;
      if (cheb(e.x,e.y,h.x,h.y)<=detectRange && run.visible[e.y][e.x]) e.aware = true;
      else { wander(run, e); continue; }
    }
    for (let s = 0; s < e.speed; s++) {
      if (!enemyAct(run, e)) break;
    }
  }
  if (h.hp <= 0) {
    run.over = true;
    addLog(run, 'Tu aventura termina aquí...');
  }
}

function enemyAct(run, e) {
  const h = run.hero;
  const d = cheb(e.x, e.y, h.x, h.y);
  if (e.range && d > 1 && d <= e.range && lineClear(run, e.x, e.y, h.x, h.y) && Math.random() < 0.6) {
    enemyHit(run, e, `${e.name} lanza un rayo oscuro`);
    return false;
  }
  if (d <= 1) { enemyHit(run, e, `${e.name} te golpea`); return false; }
  const path = findPath(run, e.x, e.y, h.x, h.y, (x, y) => !enemyAt(run, x, y));
  if (path && path.length > 1) { [e.x, e.y] = path[0]; return true; }
  return false;
}

function enemyHit(run, e, verb) {
  const h = run.hero;
  const dmg = Math.max(1, e.atk + rand(0, 1) - h.def);
  h.hp -= dmg;
  h.flash = 4;
  run.fx.push({ x: h.x, y: h.y, text: `-${dmg}`, color: '#ff6b6b' });
  addLog(run, `${verb} por ${dmg}.`);
}

function wander(run, e) {
  if (Math.random() > 0.4) return;
  const [dx, dy] = DIRS4[rand(0, 3)];
  const nx = e.x + dx, ny = e.y + dy;
  if (!inB(nx, ny) || run.grid[ny][nx] === WALL || enemyAt(run, nx, ny)) return;
  if (nx === run.hero.x && ny === run.hero.y) return;
  e.x = nx; e.y = ny;
}
