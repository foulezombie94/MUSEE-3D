/* ============================================================
   CONTINUE ? — Script de la page Expositions
   1. Filtres (recherche et salle)
   2. Affichage du catalogue, regroupé par salle
   3. Fiche plein écran
   ============================================================ */
import { SALLES, EXPOSITIONS, salleDe, correspond } from "./expositions.js";
import { urlIllustration } from "./illustrations.js";

const $ = (id) => document.getElementById(id);
const etat = { recherche: "", salle: "toutes", liste: [], ouverte: -1 };

/* ---------- 1. Filtres ---------- */
[{ id: "toutes", nom: "Toutes les salles", couleur: "#3cf2c8" }, ...SALLES].forEach((s) => {
  const b = document.createElement("button");
  b.className = "puce";
  b.textContent = s.numero ? `${s.numero} · ${s.nom}` : s.nom;
  b.style.setProperty("--teinte", s.couleur);
  b.setAttribute("aria-pressed", String(s.id === etat.salle));
  b.addEventListener("click", () => {
    etat.salle = s.id;
    document
      .querySelectorAll(".puce")
      .forEach((p) => p.setAttribute("aria-pressed", String(p === b)));
    afficher();
  });
  $("puces").append(b);
});
$("recherche").addEventListener("input", (e) => {
  etat.recherche = e.target.value.trim();
  afficher();
});

/* ---------- 2. Catalogue ---------- */
function afficher() {
  etat.liste = EXPOSITIONS.filter(
    (e) => (etat.salle === "toutes" || e.salle === etat.salle) && correspond(e, etat.recherche),
  );
  $("compteur").textContent =
    `${etat.liste.length} exposition${etat.liste.length > 1 ? "s" : ""} sur ${EXPOSITIONS.length}`;
  $("vide").hidden = etat.liste.length > 0;

  const catalogue = $("catalogue");
  catalogue.innerHTML = "";
  SALLES.forEach((salle) => {
    const expos = etat.liste.filter((e) => e.salle === salle.id);
    if (!expos.length) return;
    const groupe = document.createElement("section");
    groupe.className = "groupe";
    groupe.style.setProperty("--teinte", salle.couleur);
    groupe.innerHTML = `<div class="groupe-tete"><span class="etiquette"></span><h2></h2><p></p></div><ul class="grille"></ul>`;
    groupe.querySelector(".etiquette").textContent = `Salle ${salle.numero} · ${salle.periode}`;
    groupe.querySelector("h2").textContent = salle.nom;
    groupe.querySelector("p").textContent = salle.intro;

    expos.forEach((e, rang) => {
      const li = document.createElement("li");
      li.style.animationDelay = `${rang * 40}ms`;
      li.innerHTML = `
        <button class="carte" type="button">
          <span class="ecran"><img alt="" loading="lazy"></span>
          <span class="legende"><span class="annee"></span><strong></strong><span></span></span>
        </button>`;
      li.querySelector(".ecran").style.setProperty("--teinte", salle.couleur);
      li.querySelector("img").src = urlIllustration(e.id, 4);
      li.querySelector("img").alt = `Illustration en pixel art : ${e.titre}`;
      li.querySelector(".annee").textContent = e.date.toUpperCase();
      li.querySelector("strong").textContent = e.titre;
      li.querySelector(".legende span:last-child").textContent = `${e.createur} · ${e.support}`;
      li.querySelector("button").addEventListener("click", () => ouvrir(e.id));
      groupe.querySelector(".grille").append(li);
    });
    catalogue.append(groupe);
  });
}

/* ---------- 3. Fiche plein écran ---------- */
let derniereFocalisation = null;
function ouvrir(id) {
  const e = EXPOSITIONS.find((x) => x.id === id);
  if (!e) return;
  if (!etat.liste.includes(e)) etat.liste = [...EXPOSITIONS];
  etat.ouverte = etat.liste.indexOf(e);
  if ($("visionneuse").hidden) derniereFocalisation = document.activeElement;
  const salle = salleDe(e);
  $("v-ecran").style.setProperty("--teinte", salle.couleur);
  $("v-img").src = urlIllustration(e.id, 8);
  $("v-img").alt = `Illustration en pixel art : ${e.titre}`;
  $("v-salle").textContent = `Salle ${salle.numero} · ${salle.nom}`;
  $("v-salle").style.color = salle.couleur;
  $("v-titre").textContent = e.titre;
  $("v-date").textContent = e.date;
  $("v-createur").textContent = e.createur;
  $("v-lieu").textContent = e.lieu;
  $("v-support").textContent = e.support;
  $("v-texte").textContent = e.texte;
  $("v-3d").href = `musee.html#${e.id}`;
  $("visionneuse").hidden = false;
  document.body.style.overflow = "hidden";
  $("v-fermer").focus({ preventScroll: true });
}
function fermer() {
  $("visionneuse").hidden = true;
  document.body.style.overflow = "";
  if (derniereFocalisation) derniereFocalisation.focus({ preventScroll: true });
}
const voisine = (sens) => {
  const n = etat.liste.length;
  ouvrir(etat.liste[(etat.ouverte + sens + n) % n].id);
};
$("v-fermer").addEventListener("click", fermer);
$("v-prec").addEventListener("click", () => voisine(-1));
$("v-suiv").addEventListener("click", () => voisine(1));
addEventListener("keydown", (e) => {
  if ($("visionneuse").hidden) return;
  if (e.key === "Escape") fermer();
  if (e.key === "ArrowLeft") voisine(-1);
  if (e.key === "ArrowRight") voisine(1);
});

/* Ouverture directe avec un lien du type expositions.html#tetris */
const ouvrirDepuisAdresse = () => {
  const id = location.hash.slice(1);
  if (id) ouvrir(id);
};
addEventListener("hashchange", ouvrirDepuisAdresse);

afficher();
ouvrirDepuisAdresse();
