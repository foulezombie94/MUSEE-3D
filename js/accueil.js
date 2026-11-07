/* ============================================================
   CONTINUE ? — Script de la page d'accueil
   1. La borne de démonstration
   2. Les cartes des quatre salles
   3. La frise chronologique
   ============================================================ */
import { SALLES, EXPOSITIONS, salleDe } from "./expositions.js";
import { urlIllustration } from "./illustrations.js";
import { creerJeu } from "./jeux/index.js";

/* ---------- 1. Borne de démonstration : l'ordinateur joue seul ---------- */
await document.fonts.load("12px Silkscreen").catch(() => {});
const demo = creerJeu("labyrinthe", document.getElementById("demo"), { demo: true });
let precedent = performance.now();
(function boucle(maintenant = performance.now()) {
  demo.etape((maintenant - precedent) / 1000);
  precedent = maintenant;
  requestAnimationFrame(boucle);
})();

/* ---------- 2. Les quatre salles ---------- */
const conteneurSalles = document.getElementById("salles");
SALLES.forEach((salle) => {
  const expos = EXPOSITIONS.filter((e) => e.salle === salle.id);
  const carte = document.createElement("a");
  carte.className = "salle";
  carte.href = `musee.html#${expos[0].id}`;
  carte.style.setProperty("--teinte", salle.couleur);
  carte.innerHTML = `
    <span class="numero"></span>
    <h3></h3>
    <p></p>
    <div class="vignettes"></div>
    <span class="lien">Se téléporter dans la salle →</span>`;
  carte.querySelector(".numero").textContent = `SALLE ${salle.numero} · ${salle.periode}`;
  carte.querySelector("h3").textContent = salle.nom;
  carte.querySelector("p").textContent = salle.intro;
  expos.slice(0, 3).forEach((e) => {
    const img = document.createElement("img");
    img.src = urlIllustration(e.id, 2);
    img.alt = e.titre;
    carte.querySelector(".vignettes").append(img);
  });
  conteneurSalles.append(carte);
});

/* ---------- 3. Frise chronologique ----------
   Les points sont placés à leur vraie date ; les étiquettes sont réparties
   régulièrement, au-dessus et au-dessous, et reliées à leur point par un trait. */
const DEBUT = 1955,
  FIN = 2014;
const position = (annee) => ((annee - DEBUT) / (FIN - DEBUT)) * 100;
const frise = document.getElementById("frise");
const traits = document.getElementById("frise-traits");
const PAR_RANGEE = Math.ceil(EXPOSITIONS.length / 2);

for (let annee = 1960; annee <= 2010; annee += 10) {
  const li = document.createElement("li");
  li.className = "decennie";
  li.style.left = position(annee) + "%";
  li.textContent = annee;
  li.setAttribute("aria-hidden", "true");
  frise.append(li);
}

[...EXPOSITIONS]
  .sort((a, b) => a.annee - b.annee)
  .forEach((e, rang) => {
    const couleur = salleDe(e).couleur;
    const enHaut = rang % 2 === 0;
    const xPoint = position(e.annee);
    const xEtiquette = ((Math.floor(rang / 2) + 0.5) / PAR_RANGEE) * 100;

    const point = document.createElement("li");
    point.className = "point";
    point.style.left = xPoint + "%";
    point.style.setProperty("--teinte", couleur);
    point.setAttribute("aria-hidden", "true");
    frise.append(point);

    const trait = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const yEtiquette = enHaut ? 32 : 68,
      yCoude = enHaut ? 42 : 58;
    trait.setAttribute("d", `M${xPoint * 10} 50 V${yCoude} L${xEtiquette * 10} ${yEtiquette}`);
    trait.setAttribute("stroke", couleur);
    traits.append(trait);

    const li = document.createElement("li");
    li.className = "repere " + (enHaut ? "haut" : "bas");
    li.style.left = xEtiquette + "%";
    li.style.setProperty("--teinte", couleur);
    const lien = document.createElement("a");
    lien.href = `expositions.html#${e.id}`;
    lien.innerHTML = `<img alt=""><span class="annee"></span><span class="nom"></span>`;
    lien.querySelector("img").src = urlIllustration(e.id, 1);
    lien.querySelector(".annee").textContent = e.annee;
    lien.querySelector(".nom").textContent = e.titre;
    li.append(lien);
    frise.append(li);
  });
