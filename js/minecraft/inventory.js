import { BLOCKS } from "./terrain.js";
import { ITEMS } from "./lifecycle.js";
export const validItem = (id) => !!BLOCKS[id] || !!ITEMS[id];
export const stackLimit = (id) => ITEMS[id]?.maxStack ?? 64;
const clone = (s) => (s ? { id: s.id, count: s.count } : null);
const clean = (s) =>
  s && validItem(s.id) && Number.isInteger(s.count) && s.count > 0
    ? { id: BLOCKS[s.id] ? Number(s.id) : s.id, count: Math.min(stackLimit(s.id), s.count) }
    : null;
export const RECIPES = [
  { name: "Planches de chêne", pattern: ["L"], key: { L: [4] }, out: 7, count: 4 },
  { name: "Planches de bouleau", pattern: ["L"], key: { L: [44] }, out: 45, count: 4 },
  { name: "Bâtons", pattern: ["P", "P"], key: { P: [7, 45] }, out: "sticks", count: 4 },
  { name: "Établi", pattern: ["PP", "PP"], key: { P: [7, 45] }, out: 14, count: 1 },
  {
    name: "Pioche en bois",
    pattern: ["PPP", " S ", " S "],
    key: { P: [7, 45], S: ["sticks"] },
    out: "wooden_pickaxe",
    count: 1,
  },
  {
    name: "Pioche en pierre",
    pattern: ["PPP", " S ", " S "],
    key: { P: [16], S: ["sticks"] },
    out: "stone_pickaxe",
    count: 1,
  },
  {
    name: "Épée en bois",
    pattern: ["P", "P", "S"],
    key: { P: [7, 45], S: ["sticks"] },
    out: "wooden_sword",
    count: 1,
  },
  {
    name: "Épée en pierre",
    pattern: ["P", "P", "S"],
    key: { P: [16], S: ["sticks"] },
    out: "stone_sword",
    count: 1,
  },
  {
    name: "Hache en bois",
    pattern: ["PP", "PS", " S"],
    key: { P: [7, 45], S: ["sticks"] },
    out: "wooden_axe",
    count: 1,
  },
  {
    name: "Hache en pierre",
    pattern: ["PP", "PS", " S"],
    key: { P: [16], S: ["sticks"] },
    out: "stone_axe",
    count: 1,
  },
  {
    name: "Pelle en bois",
    pattern: ["P", "S", "S"],
    key: { P: [7, 45], S: ["sticks"] },
    out: "wooden_shovel",
    count: 1,
  },
  {
    name: "Pelle en pierre",
    pattern: ["P", "S", "S"],
    key: { P: [16], S: ["sticks"] },
    out: "stone_shovel",
    count: 1,
  },
  {
    name: "Houe en bois",
    pattern: ["PP", " S", " S"],
    key: { P: [7, 45], S: ["sticks"] },
    out: "wooden_hoe",
    count: 1,
  },
  {
    name: "Houe en pierre",
    pattern: ["PP", " S", " S"],
    key: { P: [16], S: ["sticks"] },
    out: "stone_hoe",
    count: 1,
  },
  { name: "Fourneau", pattern: ["PPP", "P P", "PPP"], key: { P: [16] }, out: 56, count: 1 },
  { name: "Pierre taillée", pattern: ["PP", "PP"], key: { P: [3] }, out: 25, count: 4 },
  { name: "Laine blanche", pattern: ["SS", "SS"], key: { S: ["string"] }, out: 28, count: 1 },
  ...[
    ["coal", 58],
    ["diamond", 18],
    ["iron_ingot", 20],
    ["gold_ingot", 19],
    ["emerald", 52],
    ["redstone", 51],
  ].flatMap(([item, block]) => [
    {
      name: BLOCKS[block]?.name ?? "Bloc",
      pattern: ["PPP", "PPP", "PPP"],
      key: { P: [item] },
      out: block,
      count: 1,
    },
    { name: ITEMS[item]?.name ?? item, pattern: ["P"], key: { P: [block] }, out: item, count: 9 },
  ]),
];
export function matchRecipe(grid, size) {
  const used = grid
    .map((s, i) => (s ? { s, x: i % size, y: Math.floor(i / size), i } : null))
    .filter(Boolean);
  if (!used.length) return null;
  const left = Math.min(...used.map((c) => c.x)),
    top = Math.min(...used.map((c) => c.y)),
    w = Math.max(...used.map((c) => c.x)) - left + 1,
    h = Math.max(...used.map((c) => c.y)) - top + 1;
  for (const r of RECIPES) {
    if (r.pattern.length !== h || r.pattern[0].length !== w) continue;
    for (const mirror of [false, true]) {
      let ok = true;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const symbol = r.pattern[y][mirror ? w - x - 1 : x],
            slot = grid[(top + y) * size + left + x];
          if (symbol === " " ? !!slot : !slot || !r.key[symbol].includes(slot.id)) ok = false;
        }
      if (ok) return { ...r, used: used.map((c) => c.i) };
    }
  }
  return null;
}
export class Inventory {
  constructor(saved = null) {
    this.slots = Array(36).fill(null);
    this.grid = Array(4).fill(null);
    this.size = 2;
    this.cursor = null;
    if (saved) {
      this.slots = this.slots.map((_, i) => clean(saved.slots?.[i]));
      this.size = saved.size === 3 ? 3 : 2;
      this.grid = Array.from({ length: this.size ** 2 }, (_, i) => clean(saved.grid?.[i]));
      this.cursor = clean(saved.cursor);
    }
  }
  serialize() {
    return {
      slots: this.slots.map(clone),
      grid: this.grid.map(clone),
      size: this.size,
      cursor: clone(this.cursor),
    };
  }
  totals() {
    const out = {};
    for (const s of this.slots) if (s) out[s.id] = (out[s.id] ?? 0) + s.count;
    return out;
  }
  allTotals() {
    const out = this.totals();
    for (const s of [...this.grid, this.cursor]) if (s) out[s.id] = (out[s.id] ?? 0) + s.count;
    return out;
  }
  add(id, count, indices = Array.from({ length: 36 }, (_, i) => i)) {
    if (!validItem(id)) return count;
    for (const empty of [false, true])
      for (const i of indices) {
        if (count <= 0) break;
        let s = this.slots[i];
        if (empty ? !s : s?.id === id) {
          const n = Math.min(count, stackLimit(id) - (s?.count ?? 0));
          if (n > 0) {
            if (!s) this.slots[i] = s = { id, count: 0 };
            s.count += n;
            count -= n;
          }
        }
      }
    return count;
  }
  remove(id, count) {
    for (let i = 0; i < 36 && count > 0; i++) {
      const s = this.slots[i];
      if (s?.id === id) {
        const n = Math.min(s.count, count);
        s.count -= n;
        count -= n;
        if (!s.count) this.slots[i] = null;
      }
    }
    return count;
  }
  ref(area) {
    return area === "grid" ? this.grid : this.slots;
  }
  click(area, index, right = false, shift = false) {
    const a = this.ref(area);
    if (!Number.isInteger(index) || index < 0 || index >= a.length) return;
    let s = a[index];
    if (shift && s) {
      const targets =
        area === "grid"
          ? Array.from({ length: 36 }, (_, i) => i)
          : index < 9
            ? Array.from({ length: 27 }, (_, i) => i + 9)
            : Array.from({ length: 9 }, (_, i) => i);
      const remain = this.add(s.id, s.count, targets);
      s.count = remain;
      if (!remain) a[index] = null;
      return;
    }
    if (!this.cursor) {
      if (s) {
        const n = right ? Math.ceil(s.count / 2) : s.count;
        this.cursor = { id: s.id, count: n };
        s.count -= n;
        if (!s.count) a[index] = null;
      }
      return;
    }
    const held = this.cursor;
    if (!s || s.id === held.id) {
      const n = Math.min(right ? 1 : held.count, stackLimit(held.id) - (s?.count ?? 0));
      if (n) {
        if (!s) a[index] = s = { id: held.id, count: 0 };
        s.count += n;
        held.count -= n;
        if (!held.count) this.cursor = null;
      }
    } else {
      a[index] = held;
      this.cursor = s;
    }
  }
  distribute(targets, right = false) {
    if (!this.cursor || !targets.length) return;
    const unique = [...new Map(targets.map((t) => [t.area + ":" + t.index, t])).values()].filter(
      (t) => {
        const a = this.ref(t.area),
          s = a[t.index];
        return (
          t.index >= 0 &&
          t.index < a.length &&
          (!s || s.id === this.cursor.id) &&
          (!s || s.count < stackLimit(s.id))
        );
      },
    );
    if (!unique.length) return;
    const each = right ? 1 : Math.floor(this.cursor.count / unique.length);
    if (!each) return;
    for (const t of unique) {
      if (!this.cursor) break;
      const a = this.ref(t.area);
      let s = a[t.index];
      const n = Math.min(each, this.cursor.count, stackLimit(this.cursor.id) - (s?.count ?? 0));
      if (!s) a[t.index] = s = { id: this.cursor.id, count: 0 };
      s.count += n;
      this.cursor.count -= n;
      if (!this.cursor.count) this.cursor = null;
    }
  }
  collect(area, index) {
    const s = this.ref(area)[index];
    if (!this.cursor && s) this.click(area, index);
    if (!this.cursor) return;
    for (const a of [this.slots, this.grid])
      for (let i = 0; i < a.length; i++) {
        const s = a[i];
        if (s?.id !== this.cursor.id) continue;
        const n = Math.min(s.count, stackLimit(s.id) - this.cursor.count);
        s.count -= n;
        this.cursor.count += n;
        if (!s.count) a[i] = null;
      }
  }
  swapHotbar(area, index, hotbar) {
    const a = this.ref(area);
    if (index < 0 || index >= a.length) return;
    [a[index], this.slots[hotbar]] = [this.slots[hotbar], a[index]];
  }
  result() {
    return matchRecipe(this.grid, this.size);
  }
  craft(shift = false) {
    let made = 0;
    for (let i = 0; i < (shift ? 2304 : 1); i++) {
      const r = this.result();
      if (!r) break;
      const limit = stackLimit(r.out);
      if (shift) {
        const capacity = this.slots.reduce(
          (sum, s) => sum + (!s ? limit : s.id === r.out ? limit - s.count : 0),
          0,
        );
        if (capacity < r.count) break;
        this.add(r.out, r.count);
      } else {
        if (this.cursor && (this.cursor.id !== r.out || this.cursor.count + r.count > limit)) break;
        if (!this.cursor) this.cursor = { id: r.out, count: 0 };
        this.cursor.count += r.count;
      }
      for (const n of r.used) {
        const s = this.grid[n];
        if (--s.count === 0) this.grid[n] = null;
      }
      made++;
    }
    return made;
  }
  returnInputs() {
    const spills = [];
    for (const s of [...this.grid, this.cursor])
      if (s) {
        const left = this.add(s.id, s.count);
        if (left) spills.push({ id: s.id, count: left });
      }
    this.grid.fill(null);
    this.cursor = null;
    return spills;
  }
  fillRecipe(r) {
    if (r.pattern.length > this.size || r.pattern[0].length > this.size) return false;
    // Validation avant toute mutation : aucune perte si les ingrédients manquent.
    const pool = this.allTotals(),
      chosen = [];
    for (const row of r.pattern)
      for (const symbol of row) {
        if (symbol === " ") continue;
        const id = r.key[symbol].find((id) => pool[id] > 0);
        if (id === undefined) return false;
        pool[id]--;
        chosen.push(id);
      }
    const backup = this.serialize();
    if (this.returnInputs().length) {
      Object.assign(this, new Inventory(backup));
      return false;
    }
    let i = 0;
    for (let y = 0; y < r.pattern.length; y++)
      for (let x = 0; x < r.pattern[y].length; x++)
        if (r.pattern[y][x] !== " ") {
          const id = chosen[i++];
          this.remove(id, 1);
          this.grid[y * this.size + x] = { id, count: 1 };
        }
    return true;
  }
}
