import { B, BLOCKS, solid } from "./terrain.js";
export const ITEMS = {
  sticks: { name: "Bâton", texture: "stick" },
  apples: { name: "Pomme", texture: "apple", food: 4 },
  porkchop: { name: "Côtelette de porc crue", texture: "porkchop", food: 3 },
  mutton: { name: "Mouton cru", texture: "mutton", food: 2 },
  rotten_flesh: { name: "Chair putréfiée", texture: "rotten_flesh" },
  coal: { name: "Charbon", texture: "coal" },
  raw_iron: { name: "Fer brut", texture: "raw_iron" },
  raw_gold: { name: "Or brut", texture: "raw_gold" },
  diamond: { name: "Diamant", texture: "diamond" },
  emerald: { name: "Émeraude", texture: "emerald" },
  redstone: { name: "Poudre de redstone", texture: "redstone" },
};
Object.assign(ITEMS, {
  string: { name: "Ficelle", texture: "string" },
  iron_ingot: { name: "Lingot de fer", texture: "iron_ingot" },
  gold_ingot: { name: "Lingot d’or", texture: "gold_ingot" },
});
for (const [material, label, tier] of [
  ["wooden", "bois", 1],
  ["stone", "pierre", 2],
])
  for (const [type, name] of [
    ["pickaxe", "Pioche"],
    ["sword", "Épée"],
    ["axe", "Hache"],
    ["shovel", "Pelle"],
    ["hoe", "Houe"],
  ])
    ITEMS[material + "_" + type] = {
      name: name + " en " + label,
      texture: material + "_" + type,
      maxStack: 1,
      pickTier: type === "pickaxe" ? tier : 0,
      toolType: type,
      toolTier: tier,
      miningSpeed: tier === 2 ? 4 : 2,
      attack: type === "sword" ? tier + 3 : 1,
    };
// Java 1.20.4: hardness and harvest requirements are stored once, on BLOCKS.
// Reference: PrismarineJS/minecraft-data data/pc/1.20.4/blocks.json.
export function miningSpec(id, tool, mode, { underwater = false, grounded = true, heldItem } = {}) {
  const b = BLOCKS[id];
  if (!b || id === B.WATER || !Number.isFinite(b.hardness))
    return { seconds: Infinity, harvest: false, damage: 0 };
  if (mode === "creative") return { seconds: 0, harvest: false, damage: 1 };
  const item =
    heldItem === undefined
      ? tool > 0
        ? { toolType: "pickaxe", toolTier: tool, miningSpeed: tool === 2 ? 4 : 2 }
        : null
      : ITEMS[heldItem];
  const effective = !!item && item.toolType === b.miningTool;
  const harvest = !b.harvestTier || (effective && item.toolTier >= b.harvestTier);
  let speed = effective ? item.miningSpeed : 1;
  if (underwater) speed /= 5;
  if (!grounded) speed /= 5;
  const damage = b.hardness === 0 ? 1 : speed / b.hardness / (harvest ? 30 : 100);
  const ticks = damage >= 1 ? 0 : Math.ceil(1 / damage - 1e-9);
  return { seconds: ticks / 20, harvest, damage };
}
export function advanceMining(state, spec, dt) {
  if (state.mineTime === 0) {
    state.mineProgress = 0;
    state.mineTickTime = 0;
  }
  state.mineTime += dt;
  state.mineTickTime += dt;
  const ticks = Math.floor((state.mineTickTime + 1e-9) * 20);
  state.mineTickTime = Math.max(0, state.mineTickTime - ticks / 20);
  state.mineProgress = spec.damage >= 1 ? 1 : Math.min(1, state.mineProgress + ticks * spec.damage);
  return state.mineProgress + 1e-9 >= 1;
}
export function blockLoot(id, harvest, random = Math.random) {
  if (!harvest || [B.GLASS, B.BEDROCK, B.WATER].includes(id)) return [];
  if (id === B.LEAF) return random() < 0.005 ? [["apples", 1]] : [];
  const drops = {
    1: 2,
    3: 16,
    11: "coal",
    12: "raw_iron",
    47: "diamond",
    48: "raw_gold",
    49: "emerald",
    50: "redstone",
  };
  return [[drops[id] ?? id, id === 50 ? 4 + Math.floor(random() * 2) : 1]];
}
export function animalLoot(kind, random = Math.random) {
  return kind === "pig"
    ? [["porkchop", 1 + Math.floor(random() * 3)]]
    : kind === "sheep"
      ? [
          ["mutton", 1 + Math.floor(random() * 2)],
          [28, 1],
        ]
      : [["rotten_flesh", Math.floor(random() * 3)]];
}
export function deathRoll(seconds) {
  return (Math.min(1, Math.sqrt(Math.max(0, ((seconds * 20 - 1) / 20) * 1.6))) * Math.PI) / 2;
}
export function dropCollides(world, p, r = 0.125) {
  for (let x = Math.floor(p.x - r + 0.00001); x <= Math.floor(p.x + r - 0.00001); x++)
    for (let y = Math.floor(p.y - r + 0.00001); y <= Math.floor(p.y + r - 0.00001); y++)
      for (let z = Math.floor(p.z - r + 0.00001); z <= Math.floor(p.z + r - 0.00001); z++)
        if (solid(world.get(x, y, z))) return true;
  return false;
}
export function stepDrop(world, d, dt) {
  const steps = Math.max(
    1,
    Math.ceil(dt / 0.008),
    Math.ceil((Math.hypot(d.vx, d.vy, d.vz) * dt) / 0.08),
  );
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    d.vy = Math.max(-20, d.vy - 16 * h);
    for (const a of ["x", "z", "y"]) {
      const velocity = "v" + a,
        start = d[a],
        delta = d[velocity] * h;
      d[a] += delta;
      if (dropCollides(world, d)) {
        let lo = 0,
          hi = 1;
        for (let j = 0; j < 10; j++) {
          const t = (lo + hi) / 2;
          d[a] = start + delta * t;
          if (dropCollides(world, d)) hi = t;
          else lo = t;
        }
        d[a] = start + delta * lo;
        d[velocity] = a === "y" && Math.abs(d.vy) > 1 ? -d.vy * 0.25 : 0;
      }
    }
    d.vx *= Math.exp(-3 * h);
    d.vz *= Math.exp(-3 * h);
  }
  d.age += dt;
}
