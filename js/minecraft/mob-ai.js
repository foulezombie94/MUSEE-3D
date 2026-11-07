import { B, HEIGHT, solid, hash } from "./terrain.js";
export const MOB_SIZE = {
  pig: { radius: 0.45, height: 1.05 },
  sheep: { radius: 0.45, height: 1.4 },
  zombie: { radius: 0.3, height: 2 },
};
const EPS = 0.00001;
export function mobBounds(m, p = m.pos) {
  const s = MOB_SIZE[m.kind];
  return {
    minX: p.x - s.radius,
    maxX: p.x + s.radius,
    minY: p.y,
    maxY: p.y + s.height,
    minZ: p.z - s.radius,
    maxZ: p.z + s.radius,
  };
}
export function mobCollides(world, m, p = m.pos) {
  const b = mobBounds(m, p);
  for (let x = Math.floor(b.minX + EPS); x <= Math.floor(b.maxX - EPS); x++)
    for (let z = Math.floor(b.minZ + EPS); z <= Math.floor(b.maxZ - EPS); z++)
      for (let y = Math.floor(b.minY + EPS); y <= Math.floor(b.maxY - EPS); y++)
        if (solid(world.get(x, y, z))) return true;
  return false;
}
export function standHeight(world, m, x, z, nearY) {
  for (
    let y = Math.min(HEIGHT - 3, Math.floor(nearY + 0.05) + 1);
    y >= Math.max(1, Math.floor(nearY + 0.05) - 2);
    y--
  ) {
    if (
      solid(world.get(x, y - 1, z)) &&
      world.get(x, y, z) !== B.WATER &&
      !mobCollides(world, m, { x, y, z })
    )
      return y;
  }
  return null;
}
function axisMove(world, m, axis, d) {
  if (!d) return true;
  const start = m.pos[axis];
  m.pos[axis] = start + d;
  if (!mobCollides(world, m)) return true;
  let low = 0,
    high = 1;
  for (let i = 0; i < 12; i++) {
    const t = (low + high) / 2;
    m.pos[axis] = start + d * t;
    if (mobCollides(world, m)) high = t;
    else low = t;
  }
  m.pos[axis] = start + d * low;
  return false;
}
// La marche et le recul passent par le même balayage du volume. Aucun déplacement instantané.
export function moveMob(world, m, dt, vx = 0, vz = 0) {
  const steps = Math.max(
      1,
      Math.ceil(dt / 0.008),
      Math.ceil(((Math.abs(vx + m.kx) + Math.abs(vz + m.kz)) * dt) / 0.06),
    ),
    h = dt / steps;
  let blocked = false;
  for (let i = 0; i < steps; i++) {
    m.vy = Math.max(-28, m.vy - 24 * h);
    if (!axisMove(world, m, "x", (vx + m.kx) * h)) {
      m.kx = 0;
      blocked = true;
    }
    if (!axisMove(world, m, "z", (vz + m.kz) * h)) {
      m.kz = 0;
      blocked = true;
    }
    const falling = m.vy < 0;
    m.grounded = false;
    if (!axisMove(world, m, "y", m.vy * h)) {
      m.grounded = falling;
      m.vy = 0;
    }
    m.kx *= Math.exp(-7 * h);
    m.kz *= Math.exp(-7 * h);
  }
  return blocked;
}
export function initMob(kind, pos, seed = 0) {
  return {
    kind,
    pos,
    seed,
    angle: hash(seed, 3) * Math.PI * 2,
    clock: 0,
    hp: kind === "pig" ? 10 : kind === "sheep" ? 8 : 20,
    attack: 0,
    vy: 0,
    kx: 0,
    kz: 0,
    grounded: false,
    panic: 0,
    hurtTime: 0,
    decision: 0,
    route: [],
    idle: 0,
    walk: 0,
  };
}
// A* borné, avec marche d'un bloc, chute de deux blocs maximum et hauteur de tête libre.
export function findMobPath(world, m, target, budget = 220) {
  const start = { x: Math.floor(m.pos.x), y: Math.round(m.pos.y), z: Math.floor(m.pos.z) },
    tx = Math.floor(target.x),
    tz = Math.floor(target.z);
  const key = (n) => `${n.x},${n.y},${n.z}`,
    heur = (n) => Math.abs(n.x - tx) + Math.abs(n.z - tz);
  const first = { ...start, g: 0, h: heur(start), prev: null },
    open = [first],
    cost = new Map([[key(first), 0]]);
  let best = first;
  for (let step = 0; open.length && step < budget; step++) {
    let at = 0;
    for (let i = 1; i < open.length; i++)
      if (open[i].g + open[i].h < open[at].g + open[at].h) at = i;
    const n = open.splice(at, 1)[0];
    if (n.h < best.h) best = n;
    if (n.h === 0) {
      best = n;
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = n.x + dx,
        z = n.z + dz;
      if (Math.abs(x - start.x) > 12 || Math.abs(z - start.z) > 12) continue;
      const y = standHeight(world, m, x + 0.5, z + 0.5, n.y);
      if (y === null) continue;
      // Vérifier le passage à mi-chemin empêche les raccourcis à travers un coin.
      if (
        mobCollides(world, m, {
          x: n.x + 0.5 + dx * 0.5,
          y: Math.max(n.y, y),
          z: n.z + 0.5 + dz * 0.5,
        })
      )
        continue;
      const g = n.g + 1 + Math.abs(y - n.y) * 0.35,
        node = { x, y, z, g, h: Math.abs(x - tx) + Math.abs(z - tz), prev: n },
        k = key(node);
      if (g >= (cost.get(k) ?? Infinity)) continue;
      cost.set(k, g);
      open.push(node);
    }
  }
  const path = [];
  for (let n = best; n.prev; n = n.prev) path.push({ x: n.x + 0.5, y: n.y, z: n.z + 0.5 });
  return path.reverse();
}
export function damageMob(m, attacker, damage = 1) {
  if (m.hurtTime > 0 || m.hp <= 0) return false;
  m.hp = Math.max(0, m.hp - damage);
  m.hurtTime = 0.45;
  m.panic = m.kind === "zombie" ? 0 : 5;
  m.decision = 0;
  m.route = [];
  m.idle = 0;
  let dx = m.pos.x - attacker.x,
    dz = m.pos.z - attacker.z,
    len = Math.hypot(dx, dz);
  if (len < 0.01) {
    dx = 0;
    dz = 1;
    len = 1;
  }
  m.kx = (dx / len) * 4.8;
  m.kz = (dz / len) * 4.8;
  m.vy = Math.max(m.vy, 4.2);
  m.threat = { x: attacker.x, z: attacker.z };
  return true;
}
export function rayMob(origin, dir, m, reach = 3.1) {
  const b = mobBounds(m);
  let min = 0,
    max = reach;
  for (const a of ["x", "y", "z"]) {
    const low = b["min" + a.toUpperCase()],
      high = b["max" + a.toUpperCase()];
    if (Math.abs(dir[a]) < 1e-9) {
      if (origin[a] < low || origin[a] > high) return null;
      continue;
    }
    let t1 = (low - origin[a]) / dir[a],
      t2 = (high - origin[a]) / dir[a];
    if (t1 > t2) [t1, t2] = [t2, t1];
    min = Math.max(min, t1);
    max = Math.min(max, t2);
    if (min > max) return null;
  }
  return min;
}
export function tickMob(world, m, player, dt) {
  m.clock += dt;
  m.attack -= dt;
  m.hurtTime = Math.max(0, m.hurtTime - dt);
  m.panic = Math.max(0, m.panic - dt);
  m.decision -= dt;
  m.idle = Math.max(0, m.idle - dt);
  const zombie = m.kind === "zombie",
    distance = Math.hypot(player.x - m.pos.x, player.z - m.pos.z);
  if (m.decision <= 0) {
    m.decision = zombie ? 0.8 : m.panic > 0 ? 0.65 : 2 + hash(m.seed, Math.floor(m.clock), 915) * 2;
    let goal;
    if (zombie && distance < 35) goal = player;
    else if (m.panic > 0) {
      const t = m.threat ?? player,
        dx = m.pos.x - t.x,
        dz = m.pos.z - t.z,
        l = Math.hypot(dx, dz) || 1;
      goal = {
        x: m.pos.x + (dx / l) * 8 + (hash(m.seed, Math.floor(m.clock), 811) - 0.5) * 4,
        z: m.pos.z + (dz / l) * 8 + (hash(m.seed, Math.floor(m.clock), 812) - 0.5) * 4,
      };
    } else if (hash(m.seed, Math.floor(m.clock), 713) < 0.35) {
      m.idle = 1.5 + hash(m.seed, 8) * 2;
      m.route = [];
    } else
      goal = {
        x: m.pos.x + (hash(m.seed, Math.floor(m.clock), 714) - 0.5) * 12,
        z: m.pos.z + (hash(m.seed, Math.floor(m.clock), 715) - 0.5) * 12,
      };
    if (goal) m.route = findMobPath(world, m, goal);
  }
  let vx = 0,
    vz = 0;
  const next = m.route[0];
  if (next && m.idle <= 0) {
    const dx = next.x - m.pos.x,
      dz = next.z - m.pos.z,
      l = Math.hypot(dx, dz);
    if (l < 0.015 && Math.abs(next.y - m.pos.y) < 0.2) m.route.shift();
    else {
      // Le terrain peut avoir changé depuis le calcul du chemin.
      if (mobCollides(world, m, next) || standHeight(world, m, next.x, next.z, next.y) === null) {
        m.route = [];
        m.decision = 0;
      } else {
        const speed = Math.min(zombie ? 1.35 : m.panic > 0 ? 2.9 : 0.85, l / Math.max(dt, 0.001));
        vx = (dx / (l || 1)) * speed;
        vz = (dz / (l || 1)) * speed;
        if (next.y > m.pos.y + 0.35 && l < 1.25 && m.grounded) m.vy = 8;
        const wanted = Math.atan2(-dx, -dz),
          delta = Math.atan2(Math.sin(wanted - m.angle), Math.cos(wanted - m.angle));
        m.angle += delta * Math.min(1, dt * 9);
      }
    }
  }
  const oldX = m.pos.x,
    oldZ = m.pos.z,
    blocked = moveMob(world, m, dt, vx, vz);
  if (blocked && m.grounded && (!next || next.y <= m.pos.y + 0.35)) {
    m.route = [];
    m.decision = Math.min(m.decision, 0.15);
  }
  const walked = Math.hypot(m.pos.x - oldX, m.pos.z - oldZ);
  m.walk += walked * 7;
  return { moving: walked > dt * 0.05, distance };
}
