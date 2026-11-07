/* ============================================================
   CONTINUE ? — Images des tableaux fournies par l'utilisateur
   Si un fichier assets/tableaux/<identifiant>.jpg (ou .png, .webp)
   existe, il remplace l'illustration en pixel art du tableau et
   de la fiche. Sinon, l'illustration dessinée par le code reste.
   La liste des identifiants est dans assets/tableaux/LISEZ-MOI.txt.
   ============================================================ */
const DOSSIER = "assets/tableaux/";
const EXTENSIONS = ["jpg", "png", "webp", "jpeg"];
const recherches = new Map();
/** Images trouvées : identifiant → adresse du fichier */
export const imagesTrouvees = new Map();

/**
 * Le serveur du musée (SERVEUR.ps1) donne la liste des fichiers du dossier
 * en une seule requête. Avec un autre serveur, on essaie chaque format.
 */
let liste = null;
const lireListe = () =>
  (liste ??= fetch(DOSSIER + "liste.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((noms) => (Array.isArray(noms) ? new Set(noms.map((n) => String(n).toLowerCase())) : null))
    .catch(() => null));

/** Cherche l'image d'une exposition ; renvoie l'image chargée, ou null */
export function chargerImage(id) {
  if (!recherches.has(id))
    recherches.set(
      id,
      (async () => {
        const noms = await lireListe();
        for (const ext of EXTENSIONS) {
          const url = DOSSIER + id + "." + ext;
          if (noms && !noms.has(id + "." + ext)) continue;
          try {
            if (!noms) {
              const reponse = await fetch(url, { method: "HEAD", cache: "no-store" });
              if (!reponse.ok) continue;
            }
            const img = new Image();
            img.src = url;
            await img.decode();
            imagesTrouvees.set(id, url);
            return img;
          } catch (e) {
            /* fichier absent ou illisible : on essaie le format suivant */
          }
        }
        return null;
      })(),
    );
  return recherches.get(id);
}

/**
 * Compose l'image pour un cadre de proportions l × h :
 * l'image entière au centre, sur un fond flou tiré de l'image elle-même
 * (comme une affiche encadrée, sans rien couper).
 */
export function composerTableau(img, largeur = 1200, hauteur = 750) {
  const c = document.createElement("canvas");
  c.width = largeur;
  c.height = hauteur;
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, largeur, hauteur);
  const couvre = Math.max(largeur / img.width, hauteur / img.height);
  g.filter = "blur(28px) brightness(0.4)";
  g.drawImage(
    img,
    (largeur - img.width * couvre) / 2,
    (hauteur - img.height * couvre) / 2,
    img.width * couvre,
    img.height * couvre,
  );
  g.filter = "none";
  const contient = Math.min(largeur / img.width, hauteur / img.height);
  // Les petites captures d'écran rétro restent nettes, sans flou d'agrandissement
  g.imageSmoothingEnabled = img.width >= 480;
  g.drawImage(
    img,
    (largeur - img.width * contient) / 2,
    (hauteur - img.height * contient) / 2,
    img.width * contient,
    img.height * contient,
  );
  return c;
}
