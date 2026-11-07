/* ============================================================
   CONTINUE ? — Script de la page Salle d'arcade
   On choisit un jeu dans la liste ; il se lance dans la borne.
   ============================================================ */
import { BORNES, commandesTexte } from "./expositions.js";
import { urlIllustration } from "./illustrations.js";
import { creerJeu } from "./jeux/index.js";
import { brancherJeu } from "./jeux/base.js";

const $ = (id) => document.getElementById(id);
await document.fonts.load("12px Silkscreen").catch(() => {});

let jeu = null,
  arreter = null;

/** Lit le meilleur score enregistré pour un jeu */
const record = (id) => {
  try {
    return Number(localStorage.getItem("continue-record-" + id)) || 0;
  } catch (e) {
    return 0;
  }
};

/* Liste des jeux */
BORNES.forEach((b) => {
  const li = document.createElement("li");
  li.innerHTML = `<button class="jeu" type="button"><img alt=""><span class="infos"><strong></strong><span class="inspiration"></span><span class="record"></span></span></button>`;
  const bouton = li.querySelector("button");
  bouton.dataset.id = b.id;
  bouton.style.setProperty("--teinte", b.couleur);
  li.querySelector("img").src = urlIllustration(b.id, 2);
  li.querySelector("strong").textContent = b.nom.toUpperCase();
  li.querySelector(".inspiration").textContent = b.inspiration;
  bouton.addEventListener("click", () => choisir(b.id));
  $("jeux").append(li);
});

function majRecords() {
  document.querySelectorAll(".jeu").forEach((b) => {
    b.querySelector(".record").textContent =
      `RECORD ${String(record(b.dataset.id)).padStart(5, "0")}`;
  });
}

/** Lance le jeu choisi dans la borne */
function choisir(id) {
  const infos = BORNES.find((b) => b.id === id) || BORNES[0];
  if (arreter) arreter();
  const ecran = $("ecran");
  ecran.innerHTML = "";
  const canvas = document.createElement("canvas");
  ecran.append(canvas);
  jeu = creerJeu(infos.id, canvas);
  arreter = brancherJeu(jeu, canvas);

  $("borne").style.setProperty("--teinte", infos.couleur);
  ecran.style.setProperty("--teinte", infos.couleur);
  $("fronton").textContent = infos.nom.toUpperCase();
  $("regle-titre").textContent = infos.nom;
  $("regle-texte").textContent = infos.regle;
  $("regle-commandes").textContent = commandesTexte(infos);
  $("regle-musee").href = `musee.html#jouer-${infos.id}`;
  document
    .querySelectorAll(".jeu")
    .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === infos.id)));
  majRecords();
}

/* Manette tactile : chaque bouton appuie ou relâche une touche du jeu */
document.querySelectorAll("#manette [data-code]").forEach((bouton) => {
  const code = bouton.dataset.code;
  bouton.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (jeu) jeu.appuyer(code);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((t) =>
    bouton.addEventListener(t, () => {
      if (jeu) jeu.relacher(code);
    }),
  );
});

// Les records changent à la fin d'une partie : on rafraîchit la liste de temps en temps
setInterval(majRecords, 1500);

// Un lien du type arcade.html#serpent choisit directement le jeu
choisir(location.hash.slice(1));
addEventListener("hashchange", () => choisir(location.hash.slice(1)));
