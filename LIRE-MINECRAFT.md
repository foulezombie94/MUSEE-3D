# Musée Continue — Minecraft jouable

Sous Windows, décompresser le dossier puis ouvrir **LANCER-MUSEE.cmd**.
Pour démarrer directement le jeu : **JOUER-MINECRAFT.cmd**.
Garder la fenêtre du serveur ouverte pendant la visite.

Dans le musée, rejoindre le tableau Minecraft de la salle 4, puis cliquer dessus ou appuyer sur E.

## Jouer

- ZQSD / WASD : marcher ; Espace : sauter ; double Espace en créatif : voler.
- Maintenir le clic gauche : miner ; viser un animal et cliquer : frapper.
- Clic droit : poser un bloc ou utiliser un établi.
- E : inventaire ; 1 à 9 et molette : barre rapide ; F : manger ; Échap : pause.

## PC bas de gamme

Le réglage **PC faible** est activé par défaut. Il conserve le gameplay et les sauvegardes : le terrain reste explorable et les constructions ne sont pas supprimées lorsque les zones éloignées sortent de la mémoire.

Le calcul des surfaces des blocs s’effectue dans un Web Worker pour laisser les commandes réactives. Les surfaces partagent leurs sommets, la résolution 3D s’adapte à la charge, la distance d’affichage est réduite et le nombre de particules visuelles est limité. Le musée désactive le miroir du sol et le halo en mode PC faible. Le rendu ralentit dans les menus et s’arrête lorsque l’onglet est caché.

Dans **Échap → Options → Graphismes**, choisir PC faible, Équilibré ou Qualité. Le choix est conservé séparément du monde. L’interface et les textes gardent la résolution de l’écran.

Ces réglages réduisent la charge ; le nombre de FPS dépend du processeur, du GPU et du navigateur. Aucun FPS minimum sur un ordinateur physique d’entrée de gamme n’a été certifié.

## Inventaire et fabrication

L’inventaire comprend 27 cases de stockage et 9 cases de barre rapide. Chaque case conserve son propre objet et sa quantité, y compris après rechargement.

- Clic gauche : prendre une pile, la déposer, fusionner deux piles identiques ou échanger deux objets.
- Clic droit : prendre la moitié d’une pile ou déposer un seul objet.
- Maj + clic : transfert rapide entre le stockage et la barre rapide ; sur le résultat, fabriquer autant que possible.
- Glisser une pile : déplacer ; glisser avec une pile déjà tenue : répartir entre les cases parcourues.
- Double clic : réunir les piles identiques jusqu’à leur limite.
- Survoler une case puis appuyer sur 1 à 9 : l’échanger avec la case correspondante de la barre rapide.

La grille personnelle est de 2 × 2. Le clic droit sur un établi ouvre la grille de 3 × 3. Placer les vrais ingrédients dans les cases, puis cliquer sur le résultat pour le récupérer. Le livre de recettes place les ingrédients disponibles sans fabriquer automatiquement le résultat. Les ingrédients restants et l’objet tenu reviennent dans l’inventaire à la fermeture ; si celui-ci est plein, ils sont déposés au sol.

En créatif, l’onglet avec Steve ouvre l’inventaire personnel et la fabrication. L’onglet Outils donne accès aux objets et outils. Les outils se placent dans la barre rapide et doivent être sélectionnés pour être utilisés.

En survie, un bloc cassé peut laisser un petit objet en 3D au sol selon l’outil utilisé.
Approcher pour le ramasser après un court délai. Il tourne, flotte légèrement et disparaît après cinq minutes de jeu s’il n’est pas ramassé.
Le verre ne laisse pas de bloc, la roche mère ne peut pas être cassée et le mode créatif ne produit pas de butin de blocs.

Les cochons et moutons fuient les coups, tombent sur le côté à leur mort puis disparaissent dans un nuage de particules. Ils laissent de la viande ; les moutons laissent aussi de la laine.

Le monde, l’inventaire et les objets au sol sont sauvegardés dans le navigateur. Revenir à la même adresse et au même port pour retrouver la sauvegarde.

Recréation indépendante pour le musée, avec moteur voxel propre. Les textures, la police bitmap et les sons Minecraft utilisés restent la propriété de Mojang / Microsoft ; voir assets/minecraft/CREDITS.txt. Ce projet n’est pas le jeu officiel complet.

Animation de la main : frappe en vue subjective sur six ticks, mouvement distinct à main vide et avec un objet, retour complet après relâchement et répétition pendant le minage. La main est rendue au premier plan pour rester visible près des blocs.

Temps de minage : propriétés des 57 blocs alignées sur Java 1.20.4 (PrismarineJS minecraft-data). En Survie, à main nue au sol et hors de l’eau : bûches/planches 3 s ; terre/sable 0,75 s ; herbe 0,9 s ; pierre/pierre taillée 7,5 s ; verre 0,45 s. Progression sur des ticks de 50 ms, fissures synchronisées, remise à zéro au relâchement, délai de 0,3 s entre les blocs non instantanés. Les conditions sous l’eau et en l’air ralentissent la casse comme en Java. Le Créatif casse instantanément. Référence : https://github.com/PrismarineJS/minecraft-data/blob/master/data/pc/1.20.4/blocks.json

Correction du contact au sol : l’état au sol est conservé après une collision pendant les sous-étapes physiques. Cela rétablit le saut avec Espace et évite d’appliquer à tort le ralentissement de minage aérien. Les appuis très brefs sur Espace sont mémorisés pendant 150 ms. Vérifications en navigateur : appui bref/maintenu, atterrissage, double Espace créatif et minage de terre avec la physique active à 20/30/60/144 FPS.

Zombie : jambes articulées aux hanches, pieds alignés au sol au repos et texture classique inversée pour la jambe gauche. Vérification visuelle et contrôle de l’attache pendant toute l’amplitude de marche.
