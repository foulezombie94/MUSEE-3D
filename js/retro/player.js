import { retroInfo } from "./catalog.js";
import { JeuArcade } from "../jeux/base.js";
import {
  consoleDuJeu,
  habillage,
  dessinerDemarrage,
  SONS_DEMARRAGE,
  tailleEcran,
} from "./consoles.js";
let current = null;

/** Joue une petite suite de notes : [fréquence, début, durée, forme, volume] */
function jouerNotes(notes) {
  if (JeuArcade.muet || !notes) return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ac.currentTime + 0.05;
    let fin = 0;
    notes.forEach(([f, debut, duree, forme = "square", volume = 0.06]) => {
      const o = ac.createOscillator(),
        gain = ac.createGain();
      o.type = forme;
      o.frequency.value = f;
      gain.gain.setValueAtTime(0, t0 + debut);
      gain.gain.linearRampToValueAtTime(volume, t0 + debut + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + debut + duree);
      o.connect(gain).connect(ac.destination);
      o.start(t0 + debut);
      o.stop(t0 + debut + duree + 0.05);
      fin = Math.max(fin, debut + duree);
    });
    setTimeout(() => ac.close(), (fin + 1) * 1000);
  } catch (e) {
    /* pas de son disponible */
  }
}
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
  // Jeu d'une console exposée : télé de l'époque autour de l'écran et vraie manette
  const cons = consoleDuJeu(id);
  if (cons) {
    root.classList.add("console-theme", "console-" + cons.id);
    root.querySelector(".retro-stage").innerHTML = habillage(cons);
    root.querySelector("h2").innerHTML = `${cons.nom}<small>${cons.annee} · ${info.title} · Reconstitution jouable</small>`;
  }
  const marquer = (code, oui) =>
    root
      .querySelectorAll(`[data-retro-key="${code}"]`)
      .forEach((b) => b.classList.toggle("appuye", oui));
  const demarrage = { actif: false, t: 0, g: null, canvas: null };
  function finirDemarrage() {
    if (!demarrage.actif) return;
    demarrage.actif = false;
    demarrage.canvas.classList.add("fini");
    setTimeout(() => demarrage.canvas.remove(), 500);
  }
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
      if (demarrage.actif) {
        // Une touche pendant le démarrage le passe, sans agir sur le jeu
        if (!e.repeat) finirDemarrage();
        return;
      }
      marquer(e.code, true);
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
        marquer(e.code, false);
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
      if (demarrage.actif) {
        finirDemarrage();
        return;
      }
      button.classList.add("appuye");
      game?.appuyer(button.dataset.retroKey);
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      listen(button, event, () => {
        button.classList.remove("appuye");
        game?.relacher(button.dataset.retroKey);
      });
  }
  try {
    const module = await import(`./${info.module}.js`);
    if (closed) return;
    const canvas = document.createElement("canvas");
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", `Écran du jeu ${info.title}`);
    const image = root.querySelector(".console-image");
    (image || root.querySelector(".retro-stage")).replaceChildren(canvas);
    game = new module[info.engine](canvas, {
      id,
      title: info.title,
      nom: "retro-" + id,
      titre: info.title,
    });
    if (cons) {
      // Allumage : la télé s'allume, puis la console démarre
      const [lw, lh] = tailleEcran(cons.id);
      demarrage.canvas = document.createElement("canvas");
      demarrage.canvas.className = "console-boot";
      demarrage.canvas.width = lw * 2;
      demarrage.canvas.height = lh * 2;
      demarrage.g = demarrage.canvas.getContext("2d");
      demarrage.g.scale(2, 2);
      demarrage.actif = true;
      demarrage.t = 0;
      image.append(demarrage.canvas);
      image.classList.add("allumage");
      listen(demarrage.canvas, "pointerdown", (e) => {
        e.preventDefault();
        finirDemarrage();
      });
      dessinerDemarrage(cons.id, demarrage.g, lw, lh, 0);
      jouerNotes(SONS_DEMARRAGE[cons.id]);
    }
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
        if (demarrage.actif) {
          demarrage.t += Math.min(0.05, elapsed);
          const [lw, lh] = tailleEcran(cons.id);
          dessinerDemarrage(cons.id, demarrage.g, lw, lh, demarrage.t);
          if (demarrage.t >= cons.duree) finirDemarrage();
        }
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
