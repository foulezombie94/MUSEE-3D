// Monde voxel déterministe. Les changements seuls sont sauvegardés.
export const SIZE = 16,
  HEIGHT = 64,
  SEA = 11;
export const B = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  LOG: 4,
  LEAF: 5,
  SAND: 6,
  PLANK: 7,
  BRICK: 8,
  GLASS: 9,
  WATER: 10,
  COAL: 11,
  IRON: 12,
  BEDROCK: 13,
  WORKBENCH: 14,
  LAMP: 15,
};
export const BLOCKS = {
  1: {
    name: "Herbe",
    tile: 0,
    side: 1,
    bottom: 2,
    hardness: 0.6,
    miningTool: "shovel",
    harvestTier: 0,
  },
  2: { name: "Terre", tile: 2, hardness: 0.5, miningTool: "shovel", harvestTier: 0 },
  3: { name: "Pierre", tile: 3, hardness: 1.5, miningTool: "pickaxe", harvestTier: 1 },
  4: { name: "Bûche de chêne", tile: 5, side: 4, hardness: 2, miningTool: "axe", harvestTier: 0 },
  5: { name: "Feuilles", tile: 6, hardness: 0.2, miningTool: "hoe", harvestTier: 0 },
  6: { name: "Sable", tile: 7, hardness: 0.5, miningTool: "shovel", harvestTier: 0 },
  7: { name: "Planches de chêne", tile: 8, hardness: 2, miningTool: "axe", harvestTier: 0 },
  8: { name: "Briques", tile: 9, hardness: 2, miningTool: "pickaxe", harvestTier: 1 },
  9: { name: "Verre", tile: 10, hardness: 0.3, miningTool: null, harvestTier: 0 },
  10: { name: "Eau", tile: 11, hardness: 100, miningTool: null, harvestTier: 0 },
  11: { name: "Minerai de charbon", tile: 12, hardness: 3, miningTool: "pickaxe", harvestTier: 1 },
  12: { name: "Minerai de fer", tile: 13, hardness: 3, miningTool: "pickaxe", harvestTier: 2 },
  13: { name: "Roche mère", tile: 14, hardness: Infinity, miningTool: null, harvestTier: 0 },
  14: { name: "Établi", tile: 15, side: 16, hardness: 2.5, miningTool: "axe", harvestTier: 0 },
  15: { name: "Pierre lumineuse", tile: 17, hardness: 0.3, miningTool: null, harvestTier: 0 },
  16: { name: "Pierres", tile: 18, hardness: 2, miningTool: "pickaxe", harvestTier: 1 },
  17: { name: "Obsidienne", tile: 19, hardness: 50, miningTool: "pickaxe", harvestTier: 4 },
  18: { name: "Bloc de diamant", tile: 20, hardness: 5, miningTool: "pickaxe", harvestTier: 3 },
  19: { name: "Bloc d’or", tile: 21, hardness: 3, miningTool: "pickaxe", harvestTier: 3 },
  20: { name: "Bloc de fer", tile: 22, hardness: 5, miningTool: "pickaxe", harvestTier: 2 },
  21: { name: "Bibliothèque", tile: 8, side: 23, hardness: 1.5, miningTool: "axe", harvestTier: 0 },
  22: {
    name: "TNT",
    tile: 24,
    side: 25,
    bottom: 26,
    hardness: 0,
    miningTool: null,
    harvestTier: 0,
  },
  23: { name: "Bloc de neige", tile: 27, hardness: 0.2, miningTool: "shovel", harvestTier: 1 },
  24: { name: "Gravier", tile: 28, hardness: 0.6, miningTool: "shovel", harvestTier: 0 },
  25: { name: "Pierre taillée", tile: 29, hardness: 1.5, miningTool: "pickaxe", harvestTier: 1 },
  26: { name: "Pierres moussues", tile: 30, hardness: 2, miningTool: "pickaxe", harvestTier: 1 },
  27: { name: "Éponge", tile: 31, hardness: 0.6, miningTool: "hoe", harvestTier: 0 },
  28: { name: "Laine blanche", tile: 32, hardness: 0.8, miningTool: null, harvestTier: 0 },
  29: { name: "Laine orange", tile: 33, hardness: 0.8, miningTool: null, harvestTier: 0 },
  30: { name: "Laine magenta", tile: 34, hardness: 0.8, miningTool: null, harvestTier: 0 },
  31: { name: "Laine bleu clair", tile: 35, hardness: 0.8, miningTool: null, harvestTier: 0 },
  32: { name: "Laine jaune", tile: 36, hardness: 0.8, miningTool: null, harvestTier: 0 },
  33: { name: "Laine vert clair", tile: 37, hardness: 0.8, miningTool: null, harvestTier: 0 },
  34: { name: "Laine rose", tile: 38, hardness: 0.8, miningTool: null, harvestTier: 0 },
  35: { name: "Laine grise", tile: 39, hardness: 0.8, miningTool: null, harvestTier: 0 },
  36: { name: "Laine gris clair", tile: 40, hardness: 0.8, miningTool: null, harvestTier: 0 },
  37: { name: "Laine cyan", tile: 41, hardness: 0.8, miningTool: null, harvestTier: 0 },
  38: { name: "Laine violette", tile: 42, hardness: 0.8, miningTool: null, harvestTier: 0 },
  39: { name: "Laine bleue", tile: 43, hardness: 0.8, miningTool: null, harvestTier: 0 },
  40: { name: "Laine marron", tile: 44, hardness: 0.8, miningTool: null, harvestTier: 0 },
  41: { name: "Laine verte", tile: 45, hardness: 0.8, miningTool: null, harvestTier: 0 },
  42: { name: "Laine rouge", tile: 46, hardness: 0.8, miningTool: null, harvestTier: 0 },
  43: { name: "Laine noire", tile: 47, hardness: 0.8, miningTool: null, harvestTier: 0 },
  44: {
    name: "Bûche de bouleau",
    tile: 49,
    side: 48,
    hardness: 2,
    miningTool: "axe",
    harvestTier: 0,
  },
  45: { name: "Planches de bouleau", tile: 50, hardness: 2, miningTool: "axe", harvestTier: 0 },
  46: { name: "Netherrack", tile: 51, hardness: 0.4, miningTool: "pickaxe", harvestTier: 1 },
  47: { name: "Minerai de diamant", tile: 52, hardness: 3, miningTool: "pickaxe", harvestTier: 3 },
  48: { name: "Minerai d’or", tile: 53, hardness: 3, miningTool: "pickaxe", harvestTier: 3 },
  49: { name: "Minerai d’émeraude", tile: 54, hardness: 3, miningTool: "pickaxe", harvestTier: 3 },
  50: { name: "Minerai de redstone", tile: 55, hardness: 3, miningTool: "pickaxe", harvestTier: 3 },
  51: { name: "Bloc de redstone", tile: 56, hardness: 5, miningTool: "pickaxe", harvestTier: 1 },
  52: { name: "Bloc d’émeraude", tile: 57, hardness: 5, miningTool: "pickaxe", harvestTier: 3 },
  53: {
    name: "Citrouille sculptée",
    tile: 58,
    side: 59,
    front: 60,
    hardness: 1,
    miningTool: "axe",
    harvestTier: 0,
  },
  54: { name: "Pierre sculptée", tile: 61, hardness: 1.5, miningTool: "pickaxe", harvestTier: 1 },
  55: { name: "Grès", tile: 62, side: 63, hardness: 0.8, miningTool: "pickaxe", harvestTier: 1 },
  56: {
    name: "Fourneau",
    tile: 64,
    side: 65,
    front: 66,
    hardness: 3.5,
    miningTool: "pickaxe",
    harvestTier: 1,
  },
  58: { name: "Bloc de charbon", tile: 67, hardness: 5, miningTool: "pickaxe", harvestTier: 1 },
};
export const solid = (id) => id !== B.AIR && id !== B.WATER;
export const transparent = (id) =>
  id === B.AIR || id === B.WATER || id === B.GLASS || id === B.LEAF;
export const key = (x, z) => `${x},${z}`;
export const index = (x, y, z) => x + SIZE * (z + SIZE * y);
const mod = (n, d) => ((n % d) + d) % d;
const lerp = (a, b, t) => a + (b - a) * t;
export function hash(x, z, seed = 41723) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, z, scale, seed) {
  x /= scale;
  z /= scale;
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = x - ix,
    fz = z - iz;
  const u = fx * fx * (3 - 2 * fx),
    v = fz * fz * (3 - 2 * fz);
  return lerp(
    lerp(hash(ix, iz, seed), hash(ix + 1, iz, seed), u),
    lerp(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), u),
    v,
  );
}
export class VoxelWorld {
  constructor(seed = 41723, edits = []) {
    this.seed = seed;
    this.chunks = new Map();
    this.edits = new Map();
    this.editsByChunk = new Map();
    for (const [p, id] of edits) {
      if (!/^[-\d]+,\d+,[-\d]+$/.test(p) || !Number.isInteger(id) || (id !== 0 && !BLOCKS[id]))
        continue;
      const [x, y, z] = p.split(",").map(Number);
      if (y > 0 && y < HEIGHT && Math.abs(x) < 1e6 && Math.abs(z) < 1e6) this.remember(x, y, z, id);
    }
  }
  height(x, z) {
    const n = noise(x, z, 75, this.seed),
      detail = noise(x, z, 23, this.seed + 3);
    return Math.floor(6 + n * 20 + detail * 7 + noise(x, z, 8, this.seed + 9) * 2);
  }
  generate(cx, cz) {
    const k = key(cx, cz);
    if (this.chunks.has(k)) return this.chunks.get(k);
    const data = new Uint8Array(SIZE * SIZE * HEIGHT);
    const put = (x, y, z, id, airOnly = false) => {
      x -= cx * SIZE;
      z -= cz * SIZE;
      if (x < 0 || x >= SIZE || z < 0 || z >= SIZE || y < 1 || y >= HEIGHT) return;
      const i = index(x, y, z);
      if (!airOnly || data[i] === 0) data[i] = id;
    };
    for (let x = 0; x < SIZE; x++)
      for (let z = 0; z < SIZE; z++) {
        const wx = cx * SIZE + x,
          wz = cz * SIZE + z,
          h = this.height(wx, wz);
        for (let y = 0; y <= Math.max(SEA, h); y++) {
          let id;
          if (y === 0) id = B.BEDROCK;
          else if (y > h) id = B.WATER;
          else if (h <= SEA + 1 && y >= h - 2) id = B.SAND;
          else if (y === h) id = B.GRASS;
          else if (y > h - 4) id = B.DIRT;
          else {
            const ore = hash(wx + y * 131, wz - y * 67, this.seed);
            id = ore < 0.045 ? B.COAL : ore < 0.068 && y < 17 ? B.IRON : B.STONE;
            // Des galeries continues sous les collines ; le fond reste solide.
            if (
              y > 3 &&
              y < h - 5 &&
              Math.abs(Math.sin(wx * 0.13) + Math.cos(wz * 0.16) + Math.sin(y * 0.41)) < 0.12
            )
              id = B.AIR;
          }
          data[index(x, y, z)] = id;
        }
      }
    // Arbres ancrés dans une grille globale : les feuillages traversent les limites de chunks.
    for (
      let gx = Math.floor((cx * SIZE - 3) / 7);
      gx <= Math.floor((cx * SIZE + SIZE + 2) / 7);
      gx++
    ) {
      for (
        let gz = Math.floor((cz * SIZE - 3) / 7);
        gz <= Math.floor((cz * SIZE + SIZE + 2) / 7);
        gz++
      ) {
        if (hash(gx, gz, this.seed + 13) > 0.48) continue;
        const tx = gx * 7 + Math.floor(hash(gx, gz, this.seed + 14) * 4),
          tz = gz * 7 + Math.floor(hash(gx, gz, this.seed + 15) * 4);
        const ground = this.height(tx, tz);
        if (ground <= SEA + 2 || Math.abs(this.height(tx + 2, tz) - ground) > 2) continue;
        const top = ground + 5 + Math.floor(hash(gx, gz, this.seed + 16) * 2);
        for (let y = top - 2; y <= top + 1; y++)
          for (let dx = -2; dx <= 2; dx++)
            for (let dz = -2; dz <= 2; dz++) {
              if (y === top + 1 && (Math.abs(dx) > 1 || Math.abs(dz) > 1)) continue;
              if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && hash(tx + dx, tz + dz, y) > 0.4)
                continue;
              put(tx + dx, y, tz + dz, B.LEAF, true);
            }
        for (let y = ground + 1; y <= top; y++) put(tx, y, tz, B.LOG);
      }
    }
    const edits = this.editsByChunk.get(k);
    if (edits) for (const [i, id] of edits) data[i] = id;
    const c = { cx, cz, data, mesh: null, water: null, dirty: true };
    this.chunks.set(k, c);
    return c;
  }
  get(x, y, z) {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (y < 0) return B.BEDROCK;
    if (y >= HEIGHT) return B.AIR;
    return this.generate(Math.floor(x / SIZE), Math.floor(z / SIZE)).data[
      index(mod(x, SIZE), y, mod(z, SIZE))
    ];
  }
  remember(x, y, z, id) {
    this.edits.set(`${x},${y},${z}`, id);
    const k = key(Math.floor(x / SIZE), Math.floor(z / SIZE));
    if (!this.editsByChunk.has(k)) this.editsByChunk.set(k, new Map());
    this.editsByChunk.get(k).set(index(mod(x, SIZE), y, mod(z, SIZE)), id);
  }
  set(x, y, z, id) {
    if (
      ![x, y, z, id].every(Number.isInteger) ||
      y <= 0 ||
      y >= HEIGHT ||
      (id !== 0 && !BLOCKS[id])
    )
      return false;
    const c = this.generate(Math.floor(x / SIZE), Math.floor(z / SIZE));
    if (c.data[index(mod(x, SIZE), y, mod(z, SIZE))] === id) return false;
    c.data[index(mod(x, SIZE), y, mod(z, SIZE))] = id;
    c.dirty = true;
    this.remember(x, y, z, id);
    for (const [dx, dz] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const n = this.chunks.get(key(Math.floor((x + dx) / SIZE), Math.floor((z + dz) / SIZE)));
      if (n) n.dirty = true;
    }
    this.onChange?.(x, y, z, id);
    return true;
  }
  // Parcours exact des cellules traversées, sans dépendre du maillage graphique.
  raycast(origin, direction, reach = 6) {
    const pos = [origin.x, origin.y, origin.z],
      dir = [direction.x, direction.y, direction.z];
    const cell = pos.map(Math.floor),
      step = dir.map((v) => Math.sign(v));
    const delta = dir.map((v) => (v === 0 ? Infinity : Math.abs(1 / v)));
    const max = dir.map((v, a) =>
      v === 0 ? Infinity : (v > 0 ? cell[a] + 1 - pos[a] : pos[a] - cell[a]) / Math.abs(v),
    );
    let distance = 0,
      normal = [0, 0, 0];
    for (let i = 0; i < 160 && distance <= reach; i++) {
      const id = this.get(...cell);
      if (solid(id))
        return {
          x: cell[0],
          y: cell[1],
          z: cell[2],
          id,
          distance,
          normal: { x: normal[0], y: normal[1], z: normal[2] },
        };
      const a = max[0] < max[1] ? (max[0] < max[2] ? 0 : 2) : max[1] < max[2] ? 1 : 2;
      distance = max[a];
      cell[a] += step[a];
      max[a] += delta[a];
      normal = [0, 0, 0];
      normal[a] = -step[a];
    }
    return null;
  }
  collides(p, radius = 0.29, height = 1.8) {
    for (let x = Math.floor(p.x - radius); x <= Math.floor(p.x + radius); x++)
      for (let z = Math.floor(p.z - radius); z <= Math.floor(p.z + radius); z++)
        for (let y = Math.floor(p.y + 0.001); y <= Math.floor(p.y + height - 0.001); y++)
          if (solid(this.get(x, y, z))) return true;
    return false;
  }
  spawn() {
    for (let r = 0; r < 80; r++)
      for (let x = -r; x <= r; x++) {
        const z = 8 + r,
          y = this.height(x, z) + 1.01;
        if (y > SEA + 3 && !this.collides({ x: x + 0.5, y, z: z + 0.5 }))
          return { x: x + 0.5, y, z: z + 0.5 };
      }
    return { x: 0.5, y: 45, z: 8.5 };
  }
}
