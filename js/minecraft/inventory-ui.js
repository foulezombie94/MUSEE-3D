import * as THREE from "../lib/three.module.min.js";
import { Inventory, RECIPES, stackLimit } from "./inventory.js";
import { ITEMS } from "./lifecycle.js";
import { BLOCKS } from "./terrain.js";
import { ASSET, ATLAS_WIDTH, ATLAS_HEIGHT } from "./vanilla-textures.js";
export class InventoryUI {
  constructor(game, saved, oldBar, oldTool) {
    this.g = game;
    this.model = new Inventory(saved);
    this.lastTotals = { ...game.inventory };
    this.overflow = [];
    this.itemTextures = new Map();
    this.x = innerWidth / 2;
    this.y = innerHeight / 2;
    this.personal = false;
    if (!saved) {
      for (const [id, n] of Object.entries(game.inventory)) {
        if (!n) continue;
        const item = BLOCKS[id] ? Number(id) : id,
          rest = this.model.add(item, n);
        if (rest) this.overflow.push({ id: item, count: rest });
      }
      if (oldTool) this.model.add(oldTool === 2 ? "stone_pickaxe" : "wooden_pickaxe", 1);
      if (game.mode === "creative")
        oldBar.forEach((id, i) => {
          if (!this.model.slots[i]) this.model.slots[i] = { id, count: 64 };
        });
    }
    this.commit();
  }
  name(id) {
    return BLOCKS[id]?.name ?? ITEMS[id]?.name ?? "";
  }
  icon(id) {
    return BLOCKS[id] ? this.g.atlas.icon(id) : ASSET + "item/" + ITEMS[id].texture + ".png";
  }
  stack(s, area, index, cls = "mc-slot") {
    return `<button class="${cls}" data-inv-area="${area}" data-inv-index="${index}" aria-label="${area === "grid" ? "Fabrication" : "Case"} ${index + 1}${s ? " : " + this.name(s.id) + " × " + s.count : " vide"}" ${s ? `data-item-name="${this.name(s.id)}"` : ""}>${s ? `<img src="${this.icon(s.id)}" alt="" draggable="false">${s.count > 1 ? `<small>${s.count}</small>` : ""}` : ""}</button>`;
  }
  commit() {
    const g = this.g,
      totals = this.model.totals();
    for (const id of new Set([...Object.keys(g.inventory), ...Object.keys(totals)]))
      g.inventory[id] = totals[id] ?? 0;
    this.lastTotals = { ...g.inventory };
    g.bar = this.model.slots.slice(0, 9).map((s) => s?.id ?? 0);
    g.tool = ITEMS[g.bar[g.selected]]?.pickTier ?? 0;
  }
  syncExternal() {
    const g = this.g;
    for (const [id, n] of Object.entries(g.inventory)) {
      const difference = n - (this.lastTotals[id] ?? 0),
        item = BLOCKS[id] ? Number(id) : id;
      if (difference > 0) {
        const left = this.model.add(item, difference);
        if (left) this.overflow.push({ id: item, count: left });
      } else if (difference < 0) this.model.remove(item, -difference);
    }
    this.commit();
    if (g.effects && this.overflow.length) for (const s of this.overflow.splice(0)) this.spill(s);
  }
  spill(s) {
    const g = this.g;
    for (let n = s.count; n > 0; n -= 64)
      g.effects.spawn(s.id, Math.min(64, n), g.pos.x, g.pos.y + 0.6, g.pos.z);
  }
  returnInputs() {
    for (const s of this.model.returnInputs()) this.spill(s);
    this.commit();
    this.floating();
  }
  open(bench = false) {
    this.syncExternal();
    this.returnInputs();
    this.model.size = bench ? 3 : 2;
    this.model.grid = Array(this.model.size ** 2).fill(null);
    this.g.atWorkbench = bench;
    this.g.state = "inventory";
    this.g.unlock();
    this.render();
    this.g.el('[data-action="close-inventory"]').focus({ preventScroll: true });
  }
  result() {
    return this.model.result();
  }
  craft(shift = false) {
    if (this.model.craft(shift)) {
      this.commit();
      this.g.sound("craft");
      this.g.refreshHUD();
      this.render();
      return true;
    }
    return false;
  }
  fill(i) {
    const r = RECIPES[i];
    if (r && this.model.fillRecipe(r)) {
      this.commit();
      this.render();
      this.g.refreshHUD();
    }
  }
  hotbar() {
    const g = this.g;
    g.el(".mc-hotbar").innerHTML = this.model.slots
      .slice(0, 9)
      .map(
        (s, i) =>
          `<button class="mc-slot" data-slot="${i}" aria-label="${i + 1} : ${s ? this.name(s.id) : "vide"}" aria-pressed="${i === g.selected}">${s ? `<img src="${this.icon(s.id)}" alt="">${s.count > 1 && g.mode !== "creative" ? `<small>${s.count}</small>` : ""}` : ""}</button>`,
      )
      .join("");
    g.el(".mc-item-name").textContent = this.name(this.model.slots[g.selected]?.id);
  }
  held() {
    const g = this.g,
      s = this.model.slots[g.selected],
      b = BLOCKS[s?.id];
    g.held.visible = !!b;
    g.pickaxe.visible = false;
    g.arm.visible = !s;
    g.handAnimation.select(s?.id ?? null);
    g.updateHandPose();
    if (!g.flatItem) {
      g.flatItem = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.34),
        new THREE.MeshLambertMaterial({
          transparent: true,
          alphaTest: 0.5,
          side: THREE.DoubleSide,
        }),
      );
      g.flatItem.position.set(-0.03, 0.09, -0.05);
      g.flatItem.rotation.y = 0.2;
      g.hand.add(g.flatItem);
    }
    g.flatItem.visible = !!s && !b;
    if (!s) return;
    if (!b) {
      if (!this.itemTextures.has(s.id)) {
        const t = new THREE.TextureLoader().load(this.icon(s.id));
        t.magFilter = t.minFilter = THREE.NearestFilter;
        t.colorSpace = THREE.SRGBColorSpace;
        this.itemTextures.set(s.id, t);
      }
      g.flatItem.material.map = this.itemTextures.get(s.id);
      g.flatItem.material.needsUpdate = true;
      return;
    }
    const uv = g.held.geometry.attributes.uv;
    for (let f = 0; f < 6; f++) {
      const t = f === 2 ? b.tile : f === 3 ? (b.bottom ?? b.tile) : (b.side ?? b.tile);
      for (let j = 0; j < 4; j++) {
        const p = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ][j];
        uv.setXY(
          f * 4 + j,
          ((t % 8) * 16 + 0.05 + p[0] * 15.9) / ATLAS_WIDTH,
          1 - (Math.floor(t / 8) * 16 + 0.05 + p[1] * 15.9) / ATLAS_HEIGHT,
        );
      }
    }
    uv.needsUpdate = true;
  }
  floating() {
    const g = this.g;
    if (!this.cursor) {
      this.cursor = document.createElement("div");
      this.cursor.className = "mc-held-stack";
      g.root.append(this.cursor);
      this.tooltip = document.createElement("div");
      this.tooltip.className = "mc-inv-tooltip";
      g.root.append(this.tooltip);
    }
    const s = this.model.cursor;
    this.cursor.hidden = !s;
    this.cursor.innerHTML = s
      ? `<img src="${this.icon(s.id)}" alt="">${s.count > 1 ? `<small>${s.count}</small>` : ""}`
      : "";
    this.cursor.style.left = this.x + "px";
    this.cursor.style.top = this.y + "px";
    this.tooltip.hidden = !!s || !this.hoverName || g.state !== "inventory";
    if (!this.tooltip.hidden) {
      this.tooltip.textContent = this.hoverName;
      this.tooltip.style.left = Math.min(innerWidth - 220, this.x + 15) + "px";
      this.tooltip.style.top = Math.max(0, this.y - 30) + "px";
    }
  }
  render() {
    const g = this.g,
      palette = g.mode === "creative" && !this.personal && !g.atWorkbench,
      bench = !!g.atWorkbench;
    g.overlay.hidden = false;
    g.overlay.setAttribute("aria-label", bench ? "Établi de fabrication" : "Inventaire");
    const categories = [
      ["all", "Blocs de construction", 8],
      ["nature", "Blocs naturels", 1],
      ["color", "Blocs colorés", 42],
      ["decoration", "Décoration", 21],
      ["tools", "Outils", "stone_pickaxe"],
    ];
    let entries = Object.keys(BLOCKS)
      .map(Number)
      .filter((id) => ![10, 13].includes(id));
    if (g.category === "nature")
      entries = entries.filter((id) => [1, 2, 4, 5, 6, 23, 24, 44, 53].includes(id));
    else if (g.category === "color") entries = entries.filter((id) => id >= 28 && id <= 43);
    else if (g.category === "decoration")
      entries = entries.filter((id) => ![1, 2, 3, 4, 5, 6, 11, 12, 13].includes(id));
    if (g.category === "tools") entries = Object.keys(ITEMS);
    const result = this.model.result(),
      rStack = result ? { id: result.out, count: result.count } : null;
    g.overlay.innerHTML = `<div class="mc-card mc-inventory-card ${palette ? "" : "mc-survival-inventory"} ${bench ? "mc-workbench-inventory" : ""} ${g.recipeBook && !palette ? "mc-book-open" : ""}">
   ${palette ? `<div class="mc-inv-tabs">${categories.map(([id, name, icon]) => `<button data-category="${id}" aria-label="${name}" title="${name}" aria-pressed="${g.category === id}"><img src="${this.icon(icon)}" alt=""></button>`).join("")}<button data-action="personal-inventory" title="Inventaire et fabrication" aria-label="Inventaire et fabrication"><img src="${ASSET}entity/steve_preview.png" alt=""></button></div>` : ""}
   <div class="mc-inv-heading">${palette ? (categories.find((c) => c[0] === g.category)?.[1] ?? "Blocs") : bench ? "Fabrication" : "Fabrication"}</div><button class="mc-inv-close" data-action="close-inventory" aria-label="Fermer l’inventaire">×</button>
   <div class="mc-inv-grid">${
     palette
       ? Array.from({ length: Math.max(45, entries.length) }, (_, i) =>
           entries[i]
             ? `<button class="mc-slot" data-palette="${entries[i]}" data-item-name="${this.name(entries[i])}" aria-label="${this.name(entries[i])}"><img src="${this.icon(entries[i])}" alt="" draggable="false"></button>`
             : '<span class="mc-slot"></span>',
         ).join("")
       : this.model.slots
           .slice(9)
           .map((s, i) => this.stack(s, "slots", i + 9))
           .join("")
   }</div>
   <div class="mc-inventory-bar">${this.model.slots
     .slice(0, 9)
     .map((s, i) => this.stack(s, "slots", i))
     .join("")}</div>
   ${palette ? '<div class="mc-scrollbar"><i></i></div>' : `${!bench ? `<img class="mc-player-preview" src="${ASSET}entity/steve_preview.png" alt="Steve">` : ""}<div class="mc-craft-grid">${this.model.grid.map((s, i) => this.stack(s, "grid", i, "mc-craft-cell")).join("")}</div><button class="mc-craft-cell mc-craft-output" data-craft-result aria-label="${rStack ? "Fabriquer : " + this.name(rStack.id) + " × " + rStack.count : "Résultat de fabrication vide"}">${rStack ? `<img src="${this.icon(rStack.id)}" alt="">${rStack.count > 1 ? `<small>${rStack.count}</small>` : ""}` : ""}</button><button class="mc-recipe-toggle" data-action="recipes">Recettes</button>${g.mode === "creative" ? '<button class="mc-palette-back" data-action="palette-inventory">Blocs créatifs</button>' : ""}${g.recipeBook ? `<div class="mc-recipe-panel"><h3>Livre de recettes</h3>${RECIPES.map((r, i) => (r.pattern.length <= this.model.size && r.pattern[0].length <= this.model.size ? `<button class="mc-recipe-entry" data-recipe="${i}" title="${r.name}" aria-label="Placer les ingrédients : ${r.name}"><img src="${this.icon(r.out)}" alt=""><span>${r.name}</span></button>` : "")).join("")}</div>` : ""}`}
   <div class="mc-inv-tip">Clic : prendre / poser · Clic droit : moitié / un objet<br>Maj + clic : transfert rapide · Glisser : répartir · 1–9 : échanger<br>E / Échap : fermer</div></div>`;
    this.floating();
  }
  changed() {
    this.commit();
    this.g.refreshHUD();
    this.render();
  }
  bind() {
    const g = this.g,
      root = g.root;
    const target = (e) => {
      const b = e.target.closest?.("[data-inv-area]");
      return b ? { area: b.dataset.invArea, index: Number(b.dataset.invIndex), element: b } : null;
    };
    g.listen(
      root,
      "click",
      (e) => {
        if (
          g.state === "inventory" &&
          e.target.closest("[data-inv-area],[data-palette],[data-craft-result]")
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
    g.listen(root, "contextmenu", (e) => {
      if (g.state === "inventory") e.preventDefault();
    });
    g.listen(root, "pointerdown", (e) => {
      if (g.state !== "inventory" || (e.button > 1 && e.button !== 2)) return;
      this.x = e.clientX;
      this.y = e.clientY;
      const button = e.target.closest("button");
      if (button?.dataset.action === "personal-inventory") {
        this.personal = true;
        this.render();
        return;
      }
      if (button?.dataset.action === "palette-inventory") {
        this.personal = false;
        this.render();
        return;
      }
      if (e.target.closest("[data-craft-result]")) {
        e.preventDefault();
        this.craft(e.shiftKey);
        return;
      }
      const palette = e.target.closest("[data-palette]");
      if (palette) {
        e.preventDefault();
        const raw = palette.dataset.palette,
          id = BLOCKS[raw] ? Number(raw) : raw,
          count = stackLimit(id);
        if (e.shiftKey)
          this.model.add(
            id,
            count,
            Array.from({ length: 9 }, (_, i) => i),
          );
        else this.model.cursor = { id, count: e.button === 2 ? 1 : count };
        this.changed();
        return;
      }
      const t = target(e);
      if (!t) return;
      e.preventDefault();
      const key = t.area + ":" + t.index,
        now = performance.now();
      if (
        e.button === 0 &&
        this.lastButton === 0 &&
        this.lastKey === key &&
        now - this.lastClick < 250 &&
        this.model.cursor
      ) {
        this.model.collect(t.area, t.index);
        this.lastClick = 0;
        this.changed();
        return;
      }
      this.lastKey = key;
      this.lastClick = now;
      this.lastButton = e.button;
      if (e.shiftKey) {
        this.model.click(t.area, t.index, false, true);
        this.changed();
        return;
      }
      this.drag = {
        start: t,
        targets: [t],
        right: e.button === 2,
        x: e.clientX,
        y: e.clientY,
        moved: false,
        picked: !this.model.cursor,
      };
      if (this.drag.picked) {
        this.model.click(t.area, t.index, e.button === 2);
        this.changed();
      }
    });
    g.listen(root, "pointermove", (e) => {
      if (g.state !== "inventory") return;
      this.x = e.clientX;
      this.y = e.clientY;
      const t = target(e);
      this.hover = t;
      this.hoverName = e.target.closest?.("[data-item-name]")?.dataset.itemName ?? "";
      if (this.drag && Math.hypot(e.clientX - this.drag.x, e.clientY - this.drag.y) > 6) {
        this.drag.moved = true;
        if (t && !this.drag.targets.some((v) => v.area === t.area && v.index === t.index)) {
          this.drag.targets.push(t);
          t.element.classList.add("mc-slot-drag");
        }
      }
      this.floating();
    });
    g.listen(window, "pointerup", (e) => {
      if (!this.drag) return;
      const d = this.drag;
      this.drag = null;
      if (g.state !== "inventory") return;
      const t = target(e);
      if (d.moved) {
        if (d.picked) {
          if (t && (t.area !== d.start.area || t.index !== d.start.index))
            this.model.click(t.area, t.index, false);
        } else this.model.distribute(d.targets, d.right);
      } else if (!d.picked) this.model.click(d.start.area, d.start.index, d.right);
      this.changed();
    });
    g.listen(window, "pointercancel", () => {
      this.drag = null;
    });
    g.listen(
      window,
      "keydown",
      (e) => {
        if (g.state === "inventory" && /^Digit[1-9]$/.test(e.code) && this.hover) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.model.swapHotbar(this.hover.area, this.hover.index, Number(e.code.slice(-1)) - 1);
          this.changed();
        }
      },
      { capture: true },
    );
  }
  dispose() {
    this.cursor?.remove();
    this.tooltip?.remove();
    for (const t of this.itemTextures.values()) t.dispose();
  }
}
