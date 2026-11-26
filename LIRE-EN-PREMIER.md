# GTA 42 – Saint-Étienne : instructions de livraison GitHub

Ce dépôt de documents contient le code source **complet et testé** du jeu **GTA 42 – Saint-Étienne** (open world 3D, Three.js r134, HTML5/CSS3/JS, fonctions sous `file://`).

## Structure du projet à reconstituer

Chaque document porte le nom exact du fichier du projet (les `/` indiquent les dossiers) :

```
gta42/
├── index.html              (point d'entrée, lance les scripts dans l'ordre)
├── css/style.css           (UI premium : menu, HUD, minimap, commandes tactiles)
├── build.py                (script Python qui produit le fichier autonome dist/)
├── README.md               (documentation complète en français)
├── vendor/three.min.js     (Three.js r134, 615 601 octets — NE PAS régénérer)
├── js/ (13 modules, ordre de chargement :)
│   config.js, utils.js, save.js, audio.js, input.js, world.js,
│   city.js, traffic.js, vehicle.js, character.js, missions.js, ui.js, main.js
└── test/smoke.js           (harnais de test headless, nécessite `npm i jsdom`)
```

## Étapes demandées

1. **Lire chaque document** de cette bibliothèque et recréer les fichiers **octet pour octet** sous `gta42/` en respectant les chemins ci-dessus. Ne rien reformater, ne pas « améliorer » le code : il est testé et validé.
2. **Vérifier** : `node --check js/*.js` (les 13 fichiers doivent passer).
3. **Construire le livrable autonome** : `python3 build.py` → produit `dist/gta42-saint-etienne.html` (~724 Ko, tout inclus, ouvrable par double-clic).
4. **Pousser sur GitHub** (dépôt fourni par l'utilisateur) :
   - nouvelle branche, ex. `feature/gta42-saint-etienne-v1`
   - un commit propre, ex. `feat: GTA 42 – Saint-Étienne v1.0.0 (base jouable)`
   - ouvrir une **pull request** avec un résumé des fonctionnalités.
5. **Ne pas inclure** de dossier `node_modules` ni de fichiers temporaires.

## Contenu du jeu (v1.0.0)

- Ville de Saint-Étienne : centre-ville, place Jean Jaurès (fontaine + marché), Hôtel de Ville, cathédrale, Châteaucreux (gare + rails + train), stade Geoffroy-Guichard (tribunes + projecteurs), parc de l'Europe avec étang, Design City, quartiers Montaud/nord/résidentiel, collines, limites de carte, rivière.
- 23 rues nommées d'après la vraie ville, îlots dérivés des routes, trottoirs, lampadaires (instanciés), arbres, feux tricolores fonctionnels, voitures garées, mobilier urbain.
- Conduite : 5 véhicules (citadine, berline, sportive, fourgonnette, taxi), accélération progressive, freinage, marche arrière, dérapage (frein à main), dégâts visuels, collisions 6 points, caméra 3e personne (3 modes, touche C).
- Personnage à pied : marche/course (ZQSD/WASD/flèches, Shift), entrée/sortie de véhicule (F/E).
- Monde vivant : circulation IA avec feux, piétons, cycle jour/nuit (8 min), météo (clair/nuage/pluie), sons WebAudio.
- Missions : 5 missions séquentielles (+ récompenses en €), 10 rubans verts à collecter (+100 €), argent, sauvegarde localStorage automatique.
- UI : menu, paramètres (3 presets qualité + auto), pause, minimap circulaire, carte interactive cliquable, compteur, commandes tactiles (joystick + pédales).

## Test headless (optionnel)

`npm i jsdom && node test/smoke.js` — vérifie démarrage, marche, entrée/sortie de voiture, conduite, pause, nuit, mission m0.