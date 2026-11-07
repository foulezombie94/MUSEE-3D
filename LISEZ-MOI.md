# CONTINUE? — Musée du jeu vidéo en 3D

Projet SIN, Terminale STI2D. Site en HTML, CSS et JavaScript, avec un musée en 3D (Three.js)
et trois jeux d'arcade programmés à la main. Aucune image externe : les illustrations sont
dessinées par le code, donc tout fonctionne directement.

## Les pages

- `index.html` : accueil, les 4 salles, frise chronologique
- `musee.html` : visite 3D (4 salles, 22 expositions, 3 bornes jouables)
- `expositions.html` : catalogue avec recherche et fiches plein écran
- `arcade.html` : les jeux Raquettes, Serpent et Briques
- `projet.html` : équipe, architecture, technologies, démarche (pour l'oral)

## Tester sur son ordinateur

Le site utilise des modules JavaScript : il ne marche pas en double-cliquant sur `index.html`.
Dans Visual Studio Code : installer l'extension **Live Server**, puis clic droit sur
`index.html` → **Open with Live Server**.

## Mettre en ligne chez OVH (FileZilla)

1. Se connecter avec l'hôte, l'identifiant et le mot de passe FTP donnés par le professeur.
2. Glisser **tout le contenu** du dossier (fichiers + dossiers `css` et `js`) dans le dossier indiqué.
3. Vérifier le site à son adresse finale.

Si le professeur demande une page index numérotée, renommer `index.html` et mettre à jour
les liens « Accueil » des autres pages.

## Modifier le contenu

- Expositions : `js/expositions.js` (titre, date, texte…)
- Illustrations : `js/illustrations.js`
- Jeux : `js/jeux/`
- Musée 3D : `js/musee/` (`plan.js` pour les dimensions)

## Crédits

Three.js © three.js authors, licence MIT (`js/lib/LICENCE-three.txt`).
Polices Chakra Petch, Figtree et Silkscreen (Google Fonts, licence SIL Open Font).
