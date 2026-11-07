import { retroInfo } from "./catalog.js";
import { JeuArcade } from "../jeux/base.js";
let current = null;
export async function ouvrirRetro(id, { onClose = () => {} } = {}) {
  if (current) current();
  const info = retroInfo(id);
  if (!info) throw Error("Jeu inconnu : " + id);
  if (!document.querySelector("link[data-retro]")) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("../../css/retro.css", import.meta.url);
    css.dataset.retro = "";
    document.head.append(css);
  }
  const focus = document.activeElement,
    overflow = document.body.style.overflow,
    abort = new AbortController();
  let game,
    frame,
    closed = false,
    last = performance.now(),
    down = null;
  const root = document.createElement("section");
  root.className = "retro-root";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", info.title);
  root.innerHTML = `<header class="retro-toolbar"><button data-retro-close>← Musée</button><h2>${info.title}<small>${info.year} · Reconstitution jouable</small></h2><button data-retro-restart>Recommencer</button><button data-retro-pause>Pause</button><button class="retro-sound" data-retro-sound>Son : activé</button></header><div class="retro-stage"><p class="retro-loading">Chargement du jeu…</p></div><footer class="retro-footer"><button class="retro-start" data-retro-start>Jouer</button><p>${info.controls}</p><p class="retro-status" role="status">${info.description}</p><div class="retro-touch">${[
    ["ArrowLeft", "◀"],
    ["ArrowUp", "▲"],
    ["ArrowDown", "▼"],
    ["ArrowRight", "▶"],
    ["Space", "A"],
    ["KeyX", "B"],
    ["KeyQ", "Q"],
    ["KeyE", "E"],
  ]
    .map(
      ([code, label]) =>
        `<button data-retro-key="${code}" aria-label="Commande ${code}">${label}</button>`,
    )
    .join(
      "",
    )}</div><p class="retro-notice">Reconstitution courte du musée · P : pause · Échap : retour au musée</p></footer>`;
  document.body.append(root);
  document.body.style.overflow = "hidden";
  const listen = (node, type, fn, opts = {}) =>
    node.addEventListener(type, fn, { ...opts, signal: abort.signal });
  function close() {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(frame);
    abort.abort();
    game?.dispose?.();
    game?.touches.clear();
    root.remove();
    document.body.style.overflow = overflow;
    if (current === close) current = null;
    focus?.focus({ preventScroll: true });
    onClose();
  }
  current = close;
  listen(root.querySelector("[data-retro-close]"), "click", close);
  const controls = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Space",
    "Enter",
    "KeyP",
    "KeyX",
    "KeyZ",
    "KeyC",
    "KeyQ",
    "KeyE",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ShiftLeft",
    "ShiftRight",
  ]);
  listen(
    window,
    "keydown",
    (e) => {
      if (e.code === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
        return;
      }
      if (!controls.has(e.code)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) game?.appuyer(e.code);
    },
    { capture: true },
  );
  listen(
    window,
    "keyup",
    (e) => {
      if (controls.has(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        game?.relacher(e.code);
      }
    },
    { capture: true },
  );
  listen(window, "blur", () => {
    game?.touches.clear();
    if (game?.etat === "jeu") game.basculerPause();
  });
  listen(document, "visibilitychange", () => {
    if (document.hidden && game?.etat === "jeu") game.basculerPause();
  });
  const start = () => {
    if (!game) return;
    game.lancer();
    root.querySelector("canvas").focus();
    root.querySelector("[data-retro-start]").textContent = "Nouvelle partie";
  };
  listen(root.querySelector("[data-retro-start]"), "click", start);
  listen(root.querySelector("[data-retro-restart]"), "click", start);
  listen(root.querySelector("[data-retro-pause]"), "click", () => game?.basculerPause());
  listen(root.querySelector("[data-retro-sound]"), "click", (e) => {
    JeuArcade.muet = !JeuArcade.muet;
    e.currentTarget.textContent = JeuArcade.muet ? "Son : coupé" : "Son : activé";
  });
  for (const button of root.querySelectorAll("[data-retro-key]")) {
    listen(button, "pointerdown", (e) => {
      e.preventDefault();
      button.setPointerCapture?.(e.pointerId);
      game?.appuyer(button.dataset.retroKey);
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      listen(button, event, () => game?.relacher(button.dataset.retroKey));
  }
  try {
    const module = await import(`./${info.module}.js`);
    if (closed) return;
    const canvas = document.createElement("canvas");
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", `Écran du jeu ${info.title}`);
    root.querySelector(".retro-stage").replaceChildren(canvas);
    game = new module[info.engine](canvas, {
      id,
      title: info.title,
      nom: "retro-" + id,
      titre: info.title,
    });
    const point = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * 320,
        y: ((e.clientY - r.top) / r.height) * 240,
      };
    };
    listen(canvas, "pointerdown", (e) => {
      e.preventDefault();
      canvas.focus();
      canvas.setPointerCapture?.(e.pointerId);
      if (game.etat !== "jeu") {
        game.appuyer("Space");
        game.relacher("Space");
        down = null;
        return;
      }
      down = point(e);
      game.pointeur?.(down.x, down.y, true);
    });
    listen(canvas, "pointermove", (e) => {
      const p = point(e);
      game.pointeur?.(p.x, p.y, !!down);
    });
    listen(canvas, "pointerup", (e) => {
      const p = point(e);
      if (down) {
        if (Math.hypot(p.x - down.x, p.y - down.y) < 12) game.toucher?.(p.x, p.y);
        else game.direction?.(Math.sign(p.x - down.x), Math.sign(p.y - down.y));
      }
      down = null;
      game.pointeurFin?.();
    });
    listen(canvas, "pointercancel", () => {
      down = null;
      game.pointeurFin?.();
    });
    root.querySelector("[data-retro-close]").focus();
    last = performance.now();
    const loop = (now) => {
      if (closed) return;
      const elapsed = (now - last) / 1000;
      if (!document.hidden && elapsed >= 1 / 60 - 0.001) {
        last = now;
        game.etape(Math.min(0.05, elapsed));
      } else if (document.hidden) last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return { game, close, root };
  } catch (error) {
    if (closed) return;
    console.error(error);
    root.querySelector(".retro-stage").textContent =
      "Le jeu n’a pas pu démarrer. Rechargez la page puis réessayez.";
    root.querySelector(".retro-status").textContent = error.message;
  }
}
