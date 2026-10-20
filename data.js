// Static game data: board size, classes, enemies, tile ids.

export const COLS = 15;
export const ROWS = 21;
export const MAX_FLOOR = 10;
export const VISION = 5;
export const POTION_HEAL = 12;
export const MAX_POTIONS = 5;

export const FLOOR = 0;
export const WALL = 1;
export const STAIRS = 2;

// Each class has a look (palette used by sprites.js), a basic attack range,
// a crit chance and one active skill that costs MP and one turn.
export const CLASSES = {
  guerrero: {
    name: 'Guerrero',
    tag: 'Fuerza y resistencia',
    hp: 30, mp: 10, atk: 6, def: 3, range: 1, crit: 0,
    skill: { name: 'Giro de acero', cost: 3, desc: 'Golpea a todos los enemigos adyacentes.' },
    look: { armor: '#9aa6b8', dark: '#4d5566', accent: '#c0392b', hairM: '#5b3b22', hairF: '#d9dde6' },
  },
  maga: {
    name: 'Maga',
    tag: 'Poder y control',
    hp: 20, mp: 20, atk: 4, def: 1, range: 1, crit: 0,
    skill: { name: 'Bola de fuego', cost: 5, desc: 'Lanza fuego al enemigo más cercano (rango 4) con daño en área.' },
    look: { armor: '#6a3fa3', dark: '#3f2366', accent: '#4fd8ff', hairM: '#1b1b2a', hairF: '#c8b8ff' },
  },
  arquero: {
    name: 'Arquero',
    tag: 'Precisión y agilidad',
    hp: 22, mp: 12, atk: 5, def: 2, range: 3, crit: 0,
    skill: { name: 'Flecha perforante', cost: 3, desc: 'Dispara en línea recta y atraviesa a todos los enemigos.' },
    look: { armor: '#3c8c4a', dark: '#23542c', accent: '#e6c35c', hairM: '#8a5a2a', hairF: '#e6c35c' },
  },
  asesino: {
    name: 'Asesino',
    tag: 'Velocidad y sigilo',
    hp: 18, mp: 12, atk: 7, def: 1, range: 1, crit: 0.25,
    skill: { name: 'Sombra mortal', cost: 4, desc: 'Aparece junto al enemigo más cercano y lo golpea con x2.5 de daño.' },
    look: { armor: '#2e2e3e', dark: '#1a1a26', accent: '#b452e8', hairM: '#2b1a3a', hairF: '#8a3fc0' },
  },
};

export const GENDERS = {
  hombre: { label: 'Hombre', hpBonus: 2, mpBonus: 0 },
  mujer: { label: 'Mujer', hpBonus: 0, mpBonus: 3 },
};

// speed = tiles per turn, range = ranged attack distance, minFloor = first floor it appears.
export const ENEMY_TYPES = {
  goblin:    { name: 'Goblin', hp: 6, atk: 3, def: 0, minFloor: 1, weight: 5 },
  lobo:      { name: 'Lobo', hp: 7, atk: 4, def: 0, minFloor: 1, weight: 3, speed: 2 },
  esqueleto: { name: 'Esqueleto', hp: 9, atk: 4, def: 1, minFloor: 2, weight: 4 },
  mago:      { name: 'Mago oscuro', hp: 8, atk: 5, def: 0, minFloor: 3, weight: 3, range: 3 },
  caballero: { name: 'Caballero espectral', hp: 14, atk: 6, def: 2, minFloor: 4, weight: 3 },
  guardian:  { name: 'Guardián de la torre', hp: 36, atk: 6, def: 1, boss: true },
};
