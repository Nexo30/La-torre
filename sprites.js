// Pixel-art sprites drawn procedurally on 16x16 offscreen canvases (scaled up with
// nearest-neighbour when rendered). Palette matches the purple dusk tower look.
import { CLASSES } from './data.js';

const SKIN = '#f2c9a0', EYE = '#141020', BOOT = '#1d1510', BELT = '#2a1f14';
const cache = {};

function make(key, draw) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  draw(R);
  cache[key] = c;
  return c;
}

function drawHero(R, classId, gender, mutation = null) {
  const look = CLASSES[classId].look;
  const skin = mutation === 'goblin' ? '#55c94d' : mutation === 'beast' ? '#9ca4ad' : '#f2c9a0';
  const female = gender === 'mujer';
  const hair = female ? look.hairF : look.hairM;
  if (female) { R(3, 2, 2, 8, hair); R(11, 2, 2, 8, hair); }
  // head
  R(5, 3, 6, 4, skin);
  R(4, 1, 8, 2, hair);
  R(5, 3, 6, 1, hair);
  if (female) { R(4, 3, 1, 5, hair); R(11, 3, 1, 5, hair); }
  else { R(4, 3, 1, 2, hair); R(11, 3, 1, 2, hair); }
  R(6, 5, 1, 2, EYE); R(9, 5, 1, 2, EYE);
  R(7, 7, 2, 1, skin);
  // torso and arms
  R(5, 8, 6, 4, look.armor);
  R(4, 8, 8, 1, look.dark);
  R(5, 11, 6, 1, BELT);
  R(3, 9, 2, 3, look.armor); R(11, 9, 2, 3, look.armor);
  R(3, 12, 2, 1, skin); R(11, 12, 2, 1, skin);
  // legs
  if (female) {
    R(4, 12, 8, 2, look.armor);
    R(5, 14, 2, 1, skin); R(9, 14, 2, 1, skin);
  } else {
    R(5, 12, 2, 3, look.dark); R(9, 12, 2, 3, look.dark);
  }
  R(5, 15, 2, 1, BOOT); R(9, 15, 2, 1, BOOT);
  // class gear
  switch (classId) {
    case 'guerrero':
      R(4, 1, 8, 3, look.armor); R(5, 3, 6, 1, look.dark); R(7, 0, 2, 1, look.accent);
      R(0, 8, 3, 5, look.accent); R(1, 9, 1, 3, '#f0d070');
      R(13, 2, 1, 9, '#e4ebf3'); R(12, 11, 3, 1, '#c9a24a'); R(13, 12, 1, 2, '#6b4a2b');
      break;
    case 'maga':
      R(6, 0, 4, 1, look.armor); R(5, 1, 6, 1, look.armor); R(4, 2, 8, 1, look.dark);
      R(14, 3, 1, 12, '#7a5230'); R(13, 1, 3, 2, look.accent); R(14, 1, 1, 1, '#ffffff');
      break;
    case 'arquero':
      R(4, 1, 8, 2, look.armor); R(10, 0, 1, 2, look.accent);
      R(1, 2, 1, 12, '#8a5a2a'); R(0, 2, 1, 1, '#8a5a2a'); R(0, 13, 1, 1, '#8a5a2a');
      R(2, 2, 1, 12, '#e8e8e8');
      break;
    case 'asesino':
      R(4, 1, 8, 2, look.dark); R(4, 3, 1, 3, look.dark); R(11, 3, 1, 3, look.dark);
      R(5, 7, 6, 1, look.accent); R(10, 8, 1, 3, look.accent);
      R(2, 10, 1, 4, '#cfd6e0'); R(13, 10, 1, 4, '#cfd6e0');
      break;
  }
}

export function heroCanvas(classId, gender, mutation = null) {
  return make(`h:${classId}:${gender}:${mutation || 'normal'}`, R => drawHero(R, classId, gender, mutation));
}

const ENEMY_DRAW = {
  goblin(R) {
    R(4, 3, 8, 6, '#6fbf4a'); R(2, 4, 2, 2, '#6fbf4a'); R(12, 4, 2, 2, '#6fbf4a');
    R(6, 5, 1, 1, '#ff3333'); R(9, 5, 1, 1, '#ff3333'); R(7, 7, 2, 1, '#2a4a1a');
    R(5, 9, 6, 4, '#5a3b1e'); R(4, 12, 2, 3, '#4f8f3a'); R(12, 9, 1, 5, '#7a5230');
    R(5, 13, 2, 2, '#3f6f2a'); R(9, 13, 2, 2, '#3f6f2a');
  },
  esqueleto(R) {
    R(5, 2, 6, 5, '#e8e4d0'); R(6, 4, 2, 2, '#111'); R(9, 4, 2, 2, '#111');
    R(6, 7, 4, 1, '#bbb'); R(5, 9, 6, 4, '#cfc9b0'); R(6, 10, 4, 1, '#444');
    R(5, 13, 2, 3, '#d8d2bc'); R(9, 13, 2, 3, '#d8d2bc');
  },
  lobo(R) {
    R(3, 7, 10, 4, '#7d7d8a'); R(11, 5, 4, 4, '#8b8b98'); R(12, 3, 1, 2, '#8b8b98');
    R(14, 7, 2, 2, '#555'); R(12, 6, 1, 1, '#ff4040'); R(1, 5, 2, 1, '#7d7d8a'); R(2, 4, 1, 1, '#7d7d8a');
    R(4, 11, 1, 4, '#555'); R(6, 11, 1, 4, '#555'); R(10, 11, 1, 4, '#555'); R(12, 11, 1, 4, '#555');
  },
  mago(R) {
    R(4, 6, 8, 9, '#4b2a6b'); R(5, 2, 6, 5, '#3a1f55'); R(7, 0, 2, 2, '#3a1f55');
    R(6, 4, 4, 3, '#120a1c'); R(6, 5, 1, 1, '#ff50ff'); R(9, 5, 1, 1, '#ff50ff');
    R(13, 4, 1, 11, '#5a3a20'); R(12, 2, 3, 2, '#c04dff'); R(13, 2, 1, 1, '#ffffff');
  },
  caballero(R) {
    R(5, 1, 6, 5, '#7fd0ff'); R(6, 4, 4, 1, '#0a2a40'); R(7, 0, 2, 1, '#bfeaff');
    R(4, 7, 8, 6, '#5ab4f0'); R(3, 8, 1, 4, '#3d8fd0'); R(12, 8, 1, 4, '#3d8fd0');
    R(13, 2, 1, 10, '#dff6ff'); R(12, 11, 3, 1, '#8fd8ff');
    R(5, 13, 2, 2, '#3d8fd0'); R(9, 13, 2, 2, '#3d8fd0');
  },
  guardian(R) {
    R(3, 0, 2, 3, '#e6c35c'); R(11, 0, 2, 3, '#e6c35c');
    R(4, 2, 8, 6, '#6b2f8f'); R(5, 4, 2, 2, '#ff3d3d'); R(9, 4, 2, 2, '#ff3d3d');
    R(5, 8, 6, 1, '#f5f0d0');
    R(3, 9, 10, 4, '#3e1d5a'); R(3, 8, 10, 1, '#e6c35c'); R(7, 10, 2, 2, '#e6c35c');
    R(1, 9, 2, 4, '#6b2f8f'); R(13, 9, 2, 4, '#6b2f8f');
    R(4, 13, 3, 2, '#2a1240'); R(9, 13, 3, 2, '#2a1240');
  },
};

export function enemyCanvas(type) {
  return make(`e:${type}`, R => ENEMY_DRAW[type](R));
}

export function tileCanvas(name, variant = 0) {
  return make(`t:${name}:${variant}`, R => {
    if (name === 'floor') {
      R(0, 0, 16, 16, '#3a3150');
      R(0, 0, 16, 1, '#4a4166'); R(0, 0, 1, 16, '#4a4166');
      R(0, 15, 16, 1, '#2a2340'); R(15, 0, 1, 16, '#2a2340');
      if (variant === 0) R(3, 10, 2, 1, '#463d5e');
      if (variant === 1) { R(5, 6, 1, 1, '#2a2340'); R(6, 7, 2, 1, '#2a2340'); R(8, 8, 1, 1, '#2a2340'); }
      if (variant === 2) { R(10, 11, 2, 1, '#3f6b4a'); R(11, 12, 1, 1, '#3f6b4a'); }
    } else if (name === 'wall') {
      R(0, 0, 16, 16, '#1d1830');
      R(0, 0, 16, 1, '#4a3f66'); R(0, 15, 16, 1, '#0e0a18');
      R(0, 5, 16, 1, '#2c2644'); R(0, 10, 16, 1, '#2c2644');
      R(8, 0, 1, 5, '#2c2644'); R(4, 5, 1, 5, '#2c2644'); R(12, 5, 1, 5, '#2c2644');
      R(8, 10, 1, 5, '#2c2644'); R(4, 10, 1, 5, '#2c2644');
    } else if (name === 'torch') {
      R(0, 0, 16, 16, '#1d1830');
      R(0, 0, 16, 1, '#4a3f66'); R(0, 5, 16, 1, '#2c2644'); R(0, 10, 16, 1, '#2c2644');
      R(7, 9, 2, 4, '#6b4a2b');
    } else if (name === 'stairs') {
      R(0,0,16,16,'#3a3150'); R(2,13,12,2,'#4b3324'); R(3,11,10,2,'#6b4a32');
      R(4,9,8,2,'#8b6a48'); R(5,7,6,2,'#a78a65'); R(6,5,4,2,'#c0aa84'); R(7,3,2,2,'#d0bea0');
      R(2,15,12,1,'#2a1b13'); R(3,11,10,1,'#33251b');
    } else if (name === 'injector') {
      R(0,0,16,16,'#3a3150'); R(5,2,6,3,'#33251f'); R(4,5,8,5,'#5c6470');
      R(5,6,6,3,'#aeb8bf'); R(6,7,4,1,'#70e0b2'); R(3,9,3,4,'#33251f'); R(10,9,3,4,'#33251f');
      R(5,10,2,4,'#40302a'); R(9,10,2,4,'#40302a'); R(7,0,2,2,'#c6d2d8');
    } else if (name === 'chest') {
      R(0, 0, 16, 16, '#3a3150');
      R(3, 7, 10, 6, '#8a5a2a'); R(3, 6, 10, 2, '#a86f36'); R(3, 9, 10, 1, '#3a2412');
      R(7, 8, 2, 2, '#e6c35c');
    } else if (name === 'chestOpen') {
      R(0, 0, 16, 16, '#3a3150');
      R(3, 9, 10, 5, '#8a5a2a'); R(4, 7, 8, 2, '#120a05');
      R(3, 5, 10, 2, '#a86f36'); R(5, 7, 2, 1, '#e6c35c'); R(9, 7, 2, 1, '#e6c35c');
      R(3, 13, 10, 1, '#3a2412');
    }
  });
}
