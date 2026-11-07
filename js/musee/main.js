/* ============================================================
   CONTINUE ? — Visite 3D : programme principal
   1. Moteur 3D, effet néon et construction du musée
   2. Interface : départ, indications, fiche, recherche
   3. Bornes jouables
   4. Visite guidée et plan
   5. Boucle d'animation
   ============================================================ */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  SALLES,
  EXPOSITIONS,
  BORNES,
  salleDe,
  correspond,
  borne as infosBorne,
  commandesTexte,
} from "../expositions.js";
import { urlIllustration } from "../illustrations.js";
import { JeuArcade, brancherCommandes, versCanvas, LARGEUR, HAUTEUR } from "../jeux/base.js";
import { PLAN, salleEn, debutSalle } from "./plan.js";
import { construireBatiment } from "./batiment.js";
import { installerExpositions, installerBornes } from "./vitrines.js";
import { installerConsoles } from "./consoles.js";
import { imagesTrouvees } from "./images-officielles.js";
import { infoConsole } from "../retro/consoles.js";
import { creerControles } from "./controles.js";
import { ouvrirMinecraft } from "../minecraft/game.js";
import { GRAPHICS, readGraphics, renderRatio } from "../minecraft/graphics.js";

import { RETRO, retroInfo } from "../retro/catalog.js";
import { ouvrirRetro } from "../retro/player.js";

const $ = (id) => document.getElementById(id);
const mobile = matchMedia("(pointer: coarse)").matches;
const economique = readGraphics() === "low";
const mouvementReduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.body.classList.toggle("tactile", mobile);

const etapeChargement = (texte, pourcent) => {
  $("texte-chargement").textContent = texte;
  $("barre-chargement").style.width = pourcent + "%";
};

/* ---------- 1. Moteur 3D ---------- */
etapeChargement("Chargement des polices…", 10);
// Les enseignes sont dessinées avec les polices du site : on attend qu'elles soient prêtes
await Promise.race([
  Promise.all(
    ["700 40px Silkscreen", "600 60px 'Chakra Petch'", "30px Figtree"].map((p) =>
      document.fonts.load(p),
    ),
  ),
  new Promise((r) => setTimeout(r, 3000)),
]).catch(() => {});

const canvas = $("scene");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !mobile && !economique,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(
  renderRatio(GRAPHICS[readGraphics()], innerWidth, innerHeight, devicePixelRatio),
);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0a0d);
scene.fog = new THREE.Fog(0x0b0a0d, 30, 90);
const camera = new THREE.PerspectiveCamera(mobile ? 74 : 68, innerWidth / innerHeight, 0.05, 160);
camera.rotation.order = "YXZ";

// Effet de halo autour des néons (désactivé sur téléphone pour garder de la fluidité)
let composer = null,
  halo = null;
if (!mobile && !economique) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    (halo = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.4, 1.0)),
  );
  composer.addPass(new OutputPass());
}

etapeChargement("Construction des salles…", 35);
const animerBatiment = construireBatiment(scene, renderer, { mobile: mobile || economique });
etapeChargement("Accrochage des expositions…", 65);
const expositions = installerExpositions(scene, renderer);
etapeChargement("Branchement des bornes…", 85);
const arcade = installerBornes(scene, renderer);
etapeChargement("Installation des consoles…", 93);
const consoles = installerConsoles(scene, renderer, expositions.emplacements);
const cibles = [...expositions.cibles, ...arcade.cibles, ...consoles.cibles];
etapeChargement("Prêt à jouer.", 100);
["entrer", "entrer-visite", "entrer-jeux"].forEach((id) => {
  $(id).disabled = false;
});

/* État de l'interface */
const ui = {
  entre: false,
  fiche: false,
  panneau: false,
  aide: false,
  partie: false,
  minecraft: false,
  retro: false,
  visite: false,
  vise: null,
  ficheIndex: 0,
  salle: -1,
};
const occupe = () => ui.fiche || ui.panneau || ui.aide || ui.partie || ui.minecraft || ui.retro;

const controles = creerControles({
  canvas,
  joystick: $("joystick"),
  estTactile: mobile,
  mouvementReduit,
  rappels: {
    clic: quandClic,
    bouge: () => {
      if (ui.visite) arreterVisite();
    },
    verrou: () => majIndice(),
  },
});
const joueur = controles.joueur;
const majControles = () => controles.activer(ui.entre && !occupe());

/* Rayon de visée : quel écran se trouve sous un point de l'écran ? */
const rayon = new THREE.Raycaster();
const point = new THREE.Vector2();
function lancerRayon(x, y) {
  point.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  rayon.setFromCamera(point, camera);
}
function viser(x, y) {
  lancerRayon(x, y);
  const touche = rayon.intersectObjects(cibles)[0];
  return touche && touche.distance < 9 ? touche.object.userData : null;
}
function activer(cible) {
  if (!cible) return;
  if (cible.type === "console") jouerConsole(cible.id);
  else if (cible.type === "expo" && EXPOSITIONS[cible.index].id === "minecraft") jouerMinecraft();
  else if (cible.type === "expo" && EXPOSITIONS[cible.index].retro)
    jouerReconstitution(EXPOSITIONS[cible.index].retro);
  else if (cible.type === "expo") ouvrirFiche(cible.index);
  else jouer(cible.id);
}
function quandClic(x, y) {
  if (controles.etat.verrouille) {
    activer(ui.vise);
    return;
  }
  const cible = viser(x, y);
  if (cible) activer(cible);
  else controles.verrouiller();
}

/* ---------- 2. Interface ---------- */
if (mobile) {
  $("aide-commandes").innerHTML =
    "<span>Joystick <b>marcher</b></span><span>Glisser <b>regarder</b></span><span>Toucher un écran <b>lire</b> ou <b>jouer</b></span>";
}

/* Petites notifications en haut de l'écran */
function notifier(texte, couleur = "#3cf2c8") {
  const el = document.createElement("div");
  el.className = "toast";
  el.style.setProperty("--teinte", couleur);
  el.textContent = texte;
  $("toasts").append(el);
  setTimeout(() => el.classList.add("sortie"), 2600);
  setTimeout(() => el.remove(), 3000);
}

// Arrivée depuis un lien du type musee.html#pong ou musee.html#raquettes
const demande = decodeURIComponent(location.hash.slice(1)).replace(/^jouer-/, "");
const expoDemandee = EXPOSITIONS.findIndex((e) => e.id === demande);
const borneDemandee = BORNES.findIndex((b) => b.id === demande);
if (expoDemandee >= 0) $("entrer").textContent = `Aller à : ${EXPOSITIONS[expoDemandee].titre}`;
if (borneDemandee >= 0) $("entrer").textContent = `Jouer à : ${BORNES[borneDemandee].nom}`;

function entrer() {
  if (ui.entre) return;
  ui.entre = true;
  $("accueil").classList.add("cache");
  ["hud-haut", "plan-bouton", "indice"].forEach((id) => {
    $(id).hidden = false;
  });
  $("viseur").hidden = mobile;
  $("joystick").hidden = !mobile;
  joueur.pos.set(0, PLAN.YEUX, PLAN.Z_ENTREE - 2);
  joueur.lacet = 0;
  joueur.tangage = 0;
  majControles();
  majIndice();
}
$("entrer").addEventListener("click", () => {
  entrer();
  if (expoDemandee >= 0) controles.volerVers(expositions.emplacements[expoDemandee]);
  else if (borneDemandee >= 0) jouer(BORNES[borneDemandee].id);
  else controles.verrouiller();
});
$("entrer-visite").addEventListener("click", () => {
  entrer();
  demarrerVisite();
});
$("entrer-jeux").addEventListener("click", () => {
  entrer();
  ouvrirPanneau("jeux");
});

function nomCible(c) {
  if (c.type === "console") return `${infoConsole(c.id).nom} (${infoConsole(c.id).annee})`;
  return c.type === "expo" ? EXPOSITIONS[c.index].titre : infosBorne(c.id).nom;
}
function majIndice() {
  const el = $("indice");
  if (!ui.entre || ui.visite || occupe()) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.classList.toggle("actif", !!ui.vise);
  if (ui.vise) {
    const verbe = mobile
      ? "Touchez"
      : controles.etat.verrouille
        ? "Cliquez"
        : "Cliquez sur l'écran";
    const jouable =
      ui.vise.type === "borne" ||
      ui.vise.type === "console" ||
      (ui.vise.type === "expo" &&
        (EXPOSITIONS[ui.vise.index].id === "minecraft" || EXPOSITIONS[ui.vise.index].retro));
    el.innerHTML = jouable
      ? `${verbe}${mobile ? "" : " ou E"} pour jouer à <em></em>`
      : `${verbe} pour lire : <em></em>`;
    el.querySelector("em").textContent = nomCible(ui.vise);
  } else if (mobile) {
    el.textContent = "Joystick pour marcher · glissez pour regarder";
  } else {
    el.textContent = controles.etat.verrouille
      ? "ZQSD pour marcher · Maj pour courir · Échap pour libérer la souris"
      : "Cliquez dans la salle pour piloter avec la souris";
  }
}

/** Affiche le nom de la salle où se trouve le visiteur */
function majSalle() {
  const n = salleEn(joueur.pos.z);
  if (n === ui.salle) return;
  ui.salle = n;
  const s = SALLES[n];
  $("salle-actuelle").innerHTML = `<span class="num"></span><span class="nom"></span>`;
  $("salle-actuelle").querySelector(".num").textContent = `SALLE ${s.numero}`;
  $("salle-actuelle").querySelector(".nom").textContent = s.nom;
  $("salle-actuelle").style.setProperty("--teinte", s.couleur);
}

/** Ouvre ou ferme un calque (fiche, panneau, aide) */
function montrer(id, oui) {
  $(id).classList.toggle("ouvert", oui);
  $(id).setAttribute("aria-hidden", String(!oui));
}

/* --- Fiche d'une exposition --- */
function ouvrirFiche(i) {
  const e = EXPOSITIONS[i],
    salle = salleDe(e);
  ui.ficheIndex = i;
  ui.fiche = true;
  controles.liberer();
  majControles();
  $("fiche-img").src = imagesTrouvees.get(e.id) || urlIllustration(e.id, 8);
  $("fiche-img").alt = `Illustration en pixel art : ${e.titre}`;
  $("fiche-ecran").style.setProperty("--teinte", salle.couleur);
  $("fiche-salle").textContent = `Salle ${salle.numero} · ${salle.nom}`;
  $("fiche-salle").style.color = salle.couleur;
  $("fiche-titre").textContent = e.titre;
  $("fiche-date").textContent = e.date;
  $("fiche-createur").textContent = e.createur;
  $("fiche-lieu").textContent = e.lieu;
  $("fiche-support").textContent = e.support;
  $("fiche-texte").textContent = e.texte;
  // Lien vers la borne jouable qui s'en inspire
  const reconstitution = e.retro && retroInfo(e.retro);
  const jeu = reconstitution
    ? { id: reconstitution.id, nom: reconstitution.title, couleur: salle.couleur }
    : e.id === "minecraft"
      ? { id: "minecraft", nom: "Minecraft · monde jouable", couleur: "#8fc65b" }
      : e.jeu && infosBorne(e.jeu);
  $("fiche-jouer").hidden = !jeu;
  if (jeu) {
    $("fiche-jouer").style.setProperty("--teinte", jeu.couleur);
    $("fiche-jouer").innerHTML =
      `<img alt=""><span><small>Jouable dans le musée</small><strong></strong></span><span class="fleche">Jouer →</span>`;
    $("fiche-jouer").querySelector("img").src = urlIllustration(jeu.id, 2);
    $("fiche-jouer").querySelector("strong").textContent = jeu.nom;
    $("fiche-jouer").dataset.id = jeu.id;
    $("fiche-jouer").dataset.retro = reconstitution ? "true" : "false";
  }
  montrer("fiche", true);
  majIndice();
  $("fermer-fiche").focus({ preventScroll: true });
}
function fermerFiche() {
  if (!ui.fiche) return;
  ui.fiche = false;
  montrer("fiche", false);
  majControles();
  majIndice();
}
const ficheVoisine = (sens) =>
  ouvrirFiche((ui.ficheIndex + sens + EXPOSITIONS.length) % EXPOSITIONS.length);
$("fermer-fiche").addEventListener("click", fermerFiche);
$("fiche-prec").addEventListener("click", () => ficheVoisine(-1));
$("fiche-suiv").addEventListener("click", () => ficheVoisine(1));
$("fiche-aller").addEventListener("click", () => {
  fermerFiche();
  arreterVisite();
  controles.volerVers(expositions.emplacements[ui.ficheIndex]);
});
$("fiche-jouer").addEventListener("click", () => {
  fermerFiche();
  const id = $("fiche-jouer").dataset.id;
  id === "minecraft"
    ? jouerMinecraft()
    : $("fiche-jouer").dataset.retro === "true"
      ? jouerReconstitution(id)
      : jouer(id);
});

/* --- Consoles du centre des salles 3 et 4 ---
   La caméra s'approche de la télé, puis la console s'allume. */
let consoleEnApproche = null;
function jouerConsole(id) {
  const poste = consoles.postes.find((p) => p.info.id === id);
  if (!poste || !ui.entre || ui.retro) return;
  arreterVisite();
  fermerPanneau();
  fermerFiche();
  fermerAide();
  if (ui.partie) quitterPartie(false);
  controles.liberer();
  controles.volerVers(poste.jeu);
  consoleEnApproche = { poste, depuis: performance.now() };
  majIndice();
}
/** Appelé à chaque image : lance le jeu une fois la caméra arrivée devant la télé */
function suivreApproche() {
  if (!consoleEnApproche) return;
  const { poste, depuis } = consoleEnApproche;
  if (controles.enVol() && performance.now() - depuis < 6000) return;
  consoleEnApproche = null;
  jouerReconstitution(poste.info.jeu, poste);
}

async function jouerReconstitution(id, poste = null) {
  if (!ui.entre || ui.retro) return;
  arreterVisite();
  fermerPanneau();
  fermerFiche();
  fermerAide();
  if (ui.partie) quitterPartie(false);
  controles.liberer();
  controles.etat.vol = null;
  ui.retro = true;
  majControles();
  majIndice();
  await ouvrirRetro(id, {
    onClose: () => {
      ui.retro = false;
      ui.vise = null;
      horloge.getDelta();
      // Devant une console, on se relève et on recule d'un pas
      if (poste) controles.volerVers(poste.emplacement, true);
      majControles();
      majIndice();
    },
  });
}

// Le tableau de la salle 4 est le point d'entrée. Le visiteur garde sa position.
function jouerMinecraft() {
  if (!ui.entre || ui.minecraft) return;
  arreterVisite();
  fermerPanneau();
  fermerFiche();
  fermerAide();
  controles.liberer();
  // Annule seulement le trajet automatique en cours ; aucune téléportation du visiteur.
  controles.etat.vol = null;
  ui.minecraft = true;
  majControles();
  majIndice();
  const retour = ({ saved } = {}) => {
    ui.minecraft = false;
    ui.vise = null;
    horloge.getDelta();
    majControles();
    majIndice();
    if (saved === true)
      notifier("Retour devant le tableau Minecraft. Votre monde est sauvegardé.", "#8fc65b");
    else if (saved === false)
      notifier("Retour au musée. La sauvegarde locale est indisponible.", "#ffb23e");
  };
  try {
    ouvrirMinecraft({ onClose: retour });
  } catch (erreur) {
    console.error("Lancement du monde Minecraft", erreur);
    retour();
    notifier("Impossible de lancer le monde 3D. Vérifiez que WebGL est disponible.", "#ffb23e");
  }
}

/* --- Panneau : expositions et bornes --- */
let salleChoisie = "toutes";
[{ id: "toutes", nom: "Toutes", couleur: "#3cf2c8" }, ...SALLES].forEach((s) => {
  const b = document.createElement("button");
  b.className = "puce";
  b.textContent = s.numero ? `Salle ${s.numero}` : s.nom;
  b.title = s.numero ? s.nom : "Toutes les salles";
  b.style.setProperty("--teinte", s.couleur);
  b.setAttribute("aria-pressed", String(s.id === salleChoisie));
  b.addEventListener("click", () => {
    salleChoisie = s.id;
    document
      .querySelectorAll(".puce")
      .forEach((p) => p.setAttribute("aria-pressed", String(p === b)));
    afficherResultats();
  });
  $("puces-salles").append(b);
});
function afficherResultats() {
  const requete = $("champ-recherche").value.trim();
  const liste = EXPOSITIONS.map((e, i) => ({ e, i })).filter(
    ({ e }) => (salleChoisie === "toutes" || e.salle === salleChoisie) && correspond(e, requete),
  );
  $("nb-resultats").textContent = `${liste.length} exposition${liste.length > 1 ? "s" : ""}`;
  const ul = $("resultats");
  ul.innerHTML = "";
  if (!liste.length) {
    ul.innerHTML = `<li class="vide">Aucun résultat. Essayez « Nintendo », « 1980 » ou « arcade ».</li>`;
    return;
  }
  liste.forEach(({ e, i }) => {
    const salle = salleDe(e);
    const li = document.createElement("li");
    li.innerHTML = `<button class="resultat" type="button"><img alt=""><span class="infos"><span class="salle"></span><strong></strong><span class="detail"></span></span></button>`;
    li.querySelector("img").src = urlIllustration(e.id, 2);
    li.querySelector(".salle").textContent = `SALLE ${salle.numero}${e.jeu ? " · JOUABLE" : ""}`;
    li.querySelector(".salle").style.color = salle.couleur;
    li.querySelector("strong").textContent = e.titre;
    li.querySelector(".detail").textContent = `${e.date} · ${e.support}`;
    li.querySelector("button").addEventListener("click", () => {
      fermerPanneau();
      arreterVisite();
      controles.volerVers(expositions.emplacements[i]);
    });
    ul.append(li);
  });
}
const lireRecord = (id) => {
  try {
    return Number(localStorage.getItem("continue-record-" + id)) || 0;
  } catch (e) {
    return 0;
  }
};
function afficherJeux() {
  const ul = $("liste-jeux");
  ul.innerHTML = "";
  BORNES.forEach((b) => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="resultat jeu" type="button"><img alt=""><span class="infos"><span class="salle"></span><strong></strong><span class="detail"></span></span><span class="jouer">Jouer</span></button>`;
    const bouton = li.querySelector("button");
    bouton.style.setProperty("--teinte", b.couleur);
    li.querySelector("img").src = urlIllustration(b.id, 2);
    li.querySelector(".salle").textContent = `RECORD ${String(lireRecord(b.id)).padStart(5, "0")}`;
    li.querySelector("strong").textContent = b.nom;
    li.querySelector(".detail").textContent = b.inspiration;
    bouton.addEventListener("click", () => {
      fermerPanneau();
      jouer(b.id);
    });
    ul.append(li);
  });
  RETRO.forEach((info) => {
    const li = document.createElement("li");
    const bouton = document.createElement("button");
    bouton.className = "resultat jeu";
    bouton.type = "button";
    const expo = EXPOSITIONS.find((e) => e.retro === info.id);
    const img = document.createElement("img");
    img.alt = "";
    img.src = urlIllustration(expo?.id ?? info.id, 2);
    const span = document.createElement("span");
    span.className = "infos";
    const date = document.createElement("span");
    date.className = "salle";
    date.textContent = info.year + " · RECONSTITUTION JOUABLE";
    const titre = document.createElement("strong");
    titre.textContent = info.title;
    const detail = document.createElement("span");
    detail.className = "detail";
    detail.textContent = info.description;
    span.append(date, titre, detail);
    bouton.append(img, span);
    bouton.addEventListener("click", () => jouerReconstitution(info.id));
    li.append(bouton);
    ul.append(li);
  });
  const minecraft = document.createElement("li");
  minecraft.innerHTML = `<button class="resultat jeu" type="button"><img alt=""><span class="infos"><span class="salle">SALLE 4 · TABLEAU JOUABLE</span><strong>Minecraft</strong><span class="detail">Explorer · miner · construire · sauvegarder</span></span><span class="jouer">Y aller</span></button>`;
  minecraft.querySelector("img").src = urlIllustration("minecraft", 2);
  minecraft.querySelector("button").style.setProperty("--teinte", "#8fc65b");
  minecraft.querySelector("button").addEventListener("click", () => {
    fermerPanneau();
    arreterVisite();
    controles.volerVers(
      expositions.emplacements[EXPOSITIONS.findIndex((e) => e.id === "minecraft")],
    );
    notifier("Approchez du tableau Minecraft, puis cliquez ou appuyez sur E.", "#8fc65b");
  });
  ul.append(minecraft);
}
function choisirOnglet(nom) {
  document
    .querySelectorAll(".onglet")
    .forEach((o) => o.setAttribute("aria-selected", String(o.dataset.onglet === nom)));
  $("vue-expos").hidden = nom !== "expos";
  $("vue-jeux").hidden = nom !== "jeux";
  if (nom === "jeux") afficherJeux();
  else afficherResultats();
}
document
  .querySelectorAll(".onglet")
  .forEach((o) => o.addEventListener("click", () => choisirOnglet(o.dataset.onglet)));
function ouvrirPanneau(onglet = "expos") {
  if (ui.partie) return;
  ui.panneau = true;
  controles.liberer();
  majControles();
  choisirOnglet(onglet);
  montrer("panneau", true);
  majIndice();
  if (onglet === "expos" && !mobile)
    setTimeout(() => $("champ-recherche").focus({ preventScroll: true }), 60);
}
function fermerPanneau() {
  if (!ui.panneau) return;
  ui.panneau = false;
  montrer("panneau", false);
  $("champ-recherche").blur();
  majControles();
  majIndice();
}
$("btn-recherche").addEventListener("click", () =>
  ui.panneau ? fermerPanneau() : ouvrirPanneau("expos"),
);
$("btn-jeux").addEventListener("click", () =>
  ui.panneau ? fermerPanneau() : ouvrirPanneau("jeux"),
);
$("fermer-panneau").addEventListener("click", fermerPanneau);
$("champ-recherche").addEventListener("input", afficherResultats);

/* --- Aide --- */
function ouvrirAide() {
  ui.aide = true;
  controles.liberer();
  majControles();
  montrer("aide", true);
  majIndice();
}
function fermerAide() {
  if (!ui.aide) return;
  ui.aide = false;
  montrer("aide", false);
  majControles();
  majIndice();
}
$("btn-aide").addEventListener("click", ouvrirAide);
$("fermer-aide").addEventListener("click", fermerAide);
$("aide").addEventListener("click", (e) => {
  if (e.target === $("aide")) fermerAide();
});

/* ---------- 3. Bornes jouables, directement dans le musée ----------
   La caméra vient se placer face à l'écran de la borne ; la partie
   de démonstration laisse la place à une vraie partie, affichée sur
   l'écran 3D. Le clavier, la souris et le doigt sont branchés sur le jeu.
   Option : agrandir le même jeu en plein écran. */
const partie = { borne: null, debrancher: null, pleinEcran: false };

arcade.bornes.forEach((b) => {
  b.jeu.surFin = (score, nouveau) => {
    if (nouveau) notifier(`Nouveau record sur ${b.infos.nom} : ${score} points !`, b.infos.couleur);
  };
});

/** Position de la caméra pour que l'écran de la borne remplisse la vue */
function poseJeu(b) {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2),
    aspect = innerWidth / innerHeight;
  const remplissageH = mobile ? 0.56 : 0.74,
    remplissageL = mobile ? 0.94 : 0.86;
  const d = Math.max(0.6 / (2 * t * remplissageH), 0.8 / (2 * t * aspect * remplissageL));
  return {
    vue: b.centreEcran.clone().addScaledVector(b.normale, d),
    approche: b.emplacement.vue,
    lacet: b.lacet,
    tangage: -0.08,
  };
}
/** Sur téléphone, l'écran du jeu est remonté pour laisser la place à la manette */
function cadrer() {
  if (ui.partie && mobile && !partie.pleinEcran)
    camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.19, innerWidth, innerHeight);
  else camera.clearViewOffset();
}

/** Coordonnées dans l'écran du jeu à partir d'un clic sur la scène 3D */
function versEcran3D(e) {
  if (!partie.borne || controles.enVol()) return null;
  lancerRayon(e.clientX, e.clientY);
  const touche = rayon.intersectObject(partie.borne.ecran)[0];
  return touche ? { x: touche.uv.x * LARGEUR, y: (1 - touche.uv.y) * HAUTEUR } : null;
}

function brancher() {
  if (partie.debrancher) partie.debrancher();
  const jeu = partie.borne.jeu;
  partie.debrancher = partie.pleinEcran
    ? brancherCommandes(jeu, jeu.canvas, versCanvas(jeu.canvas))
    : brancherCommandes(jeu, canvas, versEcran3D);
}

function jouer(id) {
  const b = arcade.bornes.find((x) => x.infos.id === id);
  if (!b || !ui.entre) return;
  if (ui.partie) quitterPartie(false);
  arreterVisite();
  fermerPanneau();
  fermerFiche();
  fermerAide();
  ui.partie = true;
  partie.borne = b;
  partie.pleinEcran = false;
  controles.liberer();
  majControles();
  b.jeu.modeJoueur();
  controles.volerVers(poseJeu(b));
  brancher();

  const infos = b.infos;
  document.body.classList.add("en-partie");
  document.body.style.setProperty("--teinte-jeu", infos.couleur);
  $("partie-titre").textContent = infos.nom.toUpperCase();
  $("partie-inspiration").textContent = infos.inspiration;
  $("partie-regle").textContent = infos.regle;
  $("partie-touches").textContent = mobile
    ? infos.tactile
    : `${commandesTexte(infos)} · Espace : commencer · P : pause`;
  ["hud-haut", "plan-bouton", "viseur", "joystick", "indice"].forEach((x) => {
    $(x).hidden = true;
  });
  $("hud-partie").hidden = false;
  $("manette").hidden = !mobile;
  cadrer();
  majIndice();
}

function quitterPartie(revenir = true) {
  if (!ui.partie) return;
  const b = partie.borne;
  if (partie.pleinEcran) basculerPleinEcran();
  if (partie.debrancher) partie.debrancher();
  partie.debrancher = null;
  b.jeu.modeDemo();
  ui.partie = false;
  partie.borne = null;
  document.body.classList.remove("en-partie");
  $("hud-partie").hidden = true;
  $("manette").hidden = true;
  cadrer();
  if (revenir) {
    ["hud-haut", "plan-bouton"].forEach((x) => {
      $(x).hidden = false;
    });
    $("viseur").hidden = mobile;
    $("joystick").hidden = !mobile;
    controles.volerVers(
      { vue: b.emplacement.vue, lacet: b.emplacement.lacet, tangage: b.emplacement.tangage },
      true,
    );
  }
  majControles();
  majIndice();
}

function basculerPleinEcran() {
  if (!ui.partie) return;
  const jeu = partie.borne.jeu;
  partie.pleinEcran = !partie.pleinEcran;
  $("partie-plein-ecran").hidden = !partie.pleinEcran;
  $("partie-plein").setAttribute("aria-pressed", String(partie.pleinEcran));
  $("partie-plein").querySelector(".libelle-long").textContent = partie.pleinEcran
    ? "Revenir à la borne"
    : "Plein écran";
  if (partie.pleinEcran) {
    $("partie-ecran").style.setProperty("--teinte", partie.borne.infos.couleur);
    $("partie-ecran").append(jeu.canvas); // le même jeu continue, simplement affiché en grand
  } else jeu.canvas.remove();
  cadrer();
  brancher();
}

$("partie-quitter").addEventListener("click", () => quitterPartie());
$("partie-plein").addEventListener("click", basculerPleinEcran);
$("partie-pause").addEventListener("click", () => {
  const jeu = partie.borne && partie.borne.jeu;
  if (!jeu) return;
  if (jeu.etat === "jeu" || jeu.etat === "pause") jeu.basculerPause();
  else {
    jeu.appuyer("Enter");
    jeu.relacher("Enter");
  }
});
$("partie-son").addEventListener("click", () => {
  JeuArcade.muet = !JeuArcade.muet;
  $("partie-son").setAttribute("aria-pressed", String(JeuArcade.muet));
  $("partie-son").title = JeuArcade.muet ? "Remettre le son" : "Couper le son";
});
// Manette tactile : chaque bouton appuie ou relâche une touche du jeu
document.querySelectorAll("#manette [data-code]").forEach((bouton) => {
  const code = bouton.dataset.code;
  bouton.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (partie.borne) partie.borne.jeu.appuyer(code);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((t) =>
    bouton.addEventListener(t, () => {
      if (partie.borne) partie.borne.jeu.relacher(code);
    }),
  );
});

/* Raccourcis clavier */
addEventListener("keydown", (e) => {
  if (ui.minecraft || ui.retro) return;
  if (e.target.tagName === "INPUT") {
    if (e.key === "Escape") fermerPanneau();
    return;
  }
  if (ui.partie) {
    // les autres touches servent au jeu
    if (e.key === "Escape") quitterPartie();
    else if (e.code === "KeyF") basculerPleinEcran();
    return;
  }
  if (e.key === "Escape") {
    if (ui.aide) fermerAide();
    else if (ui.fiche) fermerFiche();
    else if (ui.panneau) fermerPanneau();
    return;
  }
  if (ui.aide) {
    if (e.code === "KeyH") fermerAide();
    return;
  }
  if (ui.fiche) {
    if (e.key === "ArrowRight") ficheVoisine(1);
    if (e.key === "ArrowLeft") ficheVoisine(-1);
    return;
  }
  if (!ui.entre) {
    if (e.key === "Enter" && !$("entrer").disabled) $("entrer").click();
    return;
  }
  if (e.code === "KeyR") {
    e.preventDefault();
    ui.panneau ? fermerPanneau() : ouvrirPanneau("expos");
  }
  if (e.code === "KeyJ") {
    e.preventDefault();
    ui.panneau ? fermerPanneau() : ouvrirPanneau("jeux");
  }
  if (ui.panneau) return;
  if (e.code === "KeyV") basculerVisite();
  if (e.code === "KeyH" || e.key === "?") ouvrirAide();
  if ((e.code === "KeyE" || e.key === "Enter") && ui.vise) activer(ui.vise);
});

/* ---------- 4. Visite guidée ---------- */
const DUREE_ARRET = 10;
const visite = { i: 0, temps: 0 };
function etapeVisite(i) {
  visite.i = i;
  visite.temps = 0;
  controles.volerVers(expositions.emplacements[i]);
  const e = EXPOSITIONS[i];
  $("visite-titre").textContent = e.titre;
  $("visite-num").textContent = `${String(i + 1).padStart(2, "0")} / ${EXPOSITIONS.length}`;
  $("visite-texte").textContent = `${e.date} · ${e.createur}. ${e.texte.split(". ")[0]}.`;
}
function demarrerVisite() {
  if (ui.partie) return;
  ui.visite = true;
  controles.liberer();
  $("btn-visite").setAttribute("aria-pressed", "true");
  $("legende-visite").hidden = false;
  if (mobile) $("joystick").hidden = true;
  // On commence par la première exposition de la salle actuelle
  etapeVisite(
    Math.max(
      0,
      EXPOSITIONS.findIndex(
        (e) => SALLES.findIndex((s) => s.id === e.salle) === salleEn(joueur.pos.z),
      ),
    ),
  );
  majIndice();
}
function arreterVisite() {
  if (!ui.visite) return;
  ui.visite = false;
  $("btn-visite").setAttribute("aria-pressed", "false");
  $("legende-visite").hidden = true;
  if (mobile && ui.entre && !ui.partie) $("joystick").hidden = false;
  majIndice();
}
const basculerVisite = () => (ui.visite ? arreterVisite() : demarrerVisite());
$("btn-visite").addEventListener("click", basculerVisite);
$("visite-stop").addEventListener("click", arreterVisite);
$("visite-suivante").addEventListener("click", () =>
  etapeVisite((visite.i + 1) % EXPOSITIONS.length),
);
$("visite-fiche").addEventListener("click", () => ouvrirFiche(visite.i));

/* Plan du musée vu de dessus : l'entrée est à gauche. Un clic sur une salle y emmène. */
const plan = $("plan").getContext("2d");
const PL = 480,
  PH = 132,
  PM = 10;
const planU = (z) => PM + ((PLAN.Z_ENTREE - z) / (PLAN.Z_ENTREE - PLAN.Z_FOND)) * (PL - 2 * PM);
const planV = (x) => PM + ((x + PLAN.DEMI_L) / PLAN.LARGEUR) * (PH - 2 * PM);
function dessinerPlan() {
  plan.clearRect(0, 0, PL, PH);
  SALLES.forEach((s, i) => {
    const x0 = planU(debutSalle(i)),
      x1 = planU(debutSalle(i + 1));
    plan.fillStyle = i === ui.salle ? s.couleur + "38" : s.couleur + "10";
    plan.fillRect(x0, PM, x1 - x0, PH - 2 * PM);
    plan.strokeStyle = s.couleur + (i === ui.salle ? "ff" : "88");
    plan.lineWidth = 2;
    plan.strokeRect(x0 + 1, PM, x1 - x0 - 2, PH - 2 * PM);
    plan.fillStyle = s.couleur;
    plan.font = "700 16px Silkscreen, monospace";
    plan.fillText(String(s.numero), x0 + 8, PM + 20);
  });
  expositions.emplacements.forEach((e, i) => {
    const active =
      (ui.vise && ui.vise.type === "expo" && ui.vise.index === i) || (ui.visite && visite.i === i);
    plan.fillStyle = active ? "#ffffff" : SALLES[e.salle].couleur;
    plan.fillRect(planU(e.z) - 8, e.x < 0 ? PM + 2 : PH - PM - 6, 16, 4);
  });
  arcade.bornes.forEach((b) => {
    plan.fillStyle = b.infos.couleur;
    plan.fillRect(planU(b.position.z) - 5, planV(b.position.x) - 5, 10, 10);
  });
  consoles.postes.forEach((p) => {
    plan.fillStyle = SALLES[salleEn(p.position.z)].couleur;
    plan.fillRect(planU(p.position.z) - 4, planV(p.position.x) - 4, 8, 8);
  });
  const angle = Math.atan2(-Math.sin(joueur.lacet), Math.cos(joueur.lacet));
  plan.save();
  plan.translate(planU(joueur.pos.z), planV(joueur.pos.x));
  plan.rotate(angle);
  const d = plan.createRadialGradient(0, 0, 0, 0, 0, 42);
  d.addColorStop(0, "rgba(255,255,255,0.45)");
  d.addColorStop(1, "rgba(255,255,255,0)");
  plan.fillStyle = d;
  plan.beginPath();
  plan.moveTo(0, 0);
  plan.arc(0, 0, 42, -0.6, 0.6);
  plan.fill();
  plan.fillStyle = "#ffffff";
  plan.beginPath();
  plan.arc(0, 0, 6, 0, Math.PI * 2);
  plan.fill();
  plan.restore();
}
$("plan-bouton").addEventListener("click", (e) => {
  const r = $("plan").getBoundingClientRect();
  const u = ((e.clientX - r.left) / r.width) * PL;
  const z = PLAN.Z_ENTREE - ((u - PM) / (PL - 2 * PM)) * (PLAN.Z_ENTREE - PLAN.Z_FOND);
  const i = salleEn(z);
  arreterVisite();
  controles.volerVers({
    vue: new THREE.Vector3(0, PLAN.YEUX, debutSalle(i) - 2.2),
    lacet: 0,
    tangage: 0,
  });
  notifier(`Salle ${SALLES[i].numero} · ${SALLES[i].nom}`, SALLES[i].couleur);
});

/* ---------- 5. Boucle d'animation ---------- */
const horloge = new THREE.Clock();
let tempsDepart = 0;
let derniereImage = 0;
function boucle(maintenant = performance.now()) {
  if (document.hidden || ui.minecraft || ui.retro) {
    horloge.getDelta();
    derniereImage = maintenant;
    requestAnimationFrame(boucle);
    return;
  }
  if (maintenant - derniereImage < 1000 / 60 - 1) {
    requestAnimationFrame(boucle);
    return;
  }
  derniereImage = maintenant;
  const dt = Math.min(horloge.getDelta(), 0.05);

  if (!ui.entre) {
    // Travelling lent dans la salle 2 derrière l'écran de départ
    tempsDepart += dt;
    const z = debutSalle(1) - 4 - (Math.sin(tempsDepart * 0.08) * 0.5 + 0.5) * 6;
    joueur.pos.set(Math.sin(tempsDepart * 0.13) * 2.5, PLAN.YEUX + 0.2, z);
    joueur.lacet = Math.sin(tempsDepart * 0.17) * 0.5;
    joueur.tangage = -0.02;
  } else {
    controles.mettreAJour(dt);
    suivreApproche();
  }

  if (ui.visite && !controles.enVol() && !ui.fiche) {
    visite.temps += dt;
    $("visite-progression").style.width = Math.min(100, (visite.temps / DUREE_ARRET) * 100) + "%";
    if (visite.temps >= DUREE_ARRET) etapeVisite((visite.i + 1) % EXPOSITIONS.length);
  }

  camera.position.copy(joueur.pos);
  camera.rotation.set(joueur.tangage, joueur.lacet, 0);

  if (ui.entre && !occupe()) {
    const c = viser(innerWidth / 2, innerHeight / 2);
    const changement =
      (c && c.type + (c.index ?? c.id)) !==
      (ui.vise && ui.vise.type + (ui.vise.index ?? ui.vise.id));
    if (changement) {
      ui.vise = c;
      $("viseur").classList.toggle("cible", !!c);
      majIndice();
    }
  }
  if (ui.entre && !ui.partie) {
    majSalle();
    dessinerPlan();
  }

  // Halo plus discret pendant une partie, pour que l'écran reste net
  if (halo) halo.strength += ((ui.partie ? 0.1 : 0.35) - halo.strength) * Math.min(1, dt * 4);

  animerBatiment(dt);
  arcade.animer(dt, joueur.pos, partie.borne);
  consoles.animer(dt, joueur.pos);
  if (!partie.pleinEcran) {
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }
  requestAnimationFrame(boucle);
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(
    renderRatio(GRAPHICS[readGraphics()], innerWidth, innerHeight, devicePixelRatio),
  );
  renderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
  cadrer();
  if (ui.partie && !controles.enVol()) {
    const p = poseJeu(partie.borne);
    joueur.pos.copy(p.vue);
  }
});

boucle();
