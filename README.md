# GTA 42 — Saint-Étienne

Jeu vidéo 3D en monde ouvert dans le navigateur, inspiré de GTA, se déroulant dans une
reproduction stylisée de Saint-Étienne (Place Jean Jaurès, Hôtel de Ville, gare de
Châteaucreux, stade Geoffroy-Guichard, Cité du Design, cathédrale Saint-Charles,
quartier du Montaud, le Furan, les collines du Pilat au sud).

Technologies : HTML5 + CSS3 + JavaScript + Three.js (r134, inclus localement).
Aucune dépendance réseau, aucun serveur requis.

## Lancement

**Version autonome (recommandée)** : ouvrir `dist/gta42-saint-etienne.html`
dans un navigateur (Chrome, Edge, Firefox, Safari, Chrome Android). Un seul fichier,
tout est inclus.

**Version développement** : ouvrir `index.html`. Si le navigateur bloque les scripts
en `file://`, servir le dossier :

```bash
cd gta42
python3 -m http.server 8000
# puis http://localhost:8000
```

## Rebuild de la version autonome

```bash
python3 build.py   # régénère dist/gta42-saint-etienne.html
```

## Commandes

| Action | Clavier | Tactile |
|---|---|---|
| Se déplacer / conduire | ZQSD, WASD ou flèches | Joystick gauche |
| Courir | Maj | Joystick à fond / bouton 🏃 |
| Accélérer / freiner-reculer | ↑ / ↓ | Pédales ⛽ / 🛑 |
| Frein à main | Espace | — |
| Entrer / sortir d'un véhicule | E ou F | Bouton 🚪 |
| Caméra | C | Bouton 🎥 |
| Klaxon | H | Bouton 📢 |
| Carte | M | Bouton 🗺️ |
| Pause | Échap ou P | Bouton ⏸ |

Sur la carte, touchez un point pour définir un itinéraire (balise bleue).

## Architecture

```
index.html                  Version dev (scripts séparés)
css/style.css               Interface (menus, HUD, tactile)
js/config.js                Constantes, presets qualité, véhicules
js/utils.js                 Maths, textures procédurales, fusion de géométries, spatial hash
js/save.js                  Sauvegarde locale (localStorage)
js/audio.js                 Sons synthétisés (WebAudio) : moteur, pluie, klaxon, impacts
js/input.js                 Clavier + tactile unifiés
js/world.js                 Ciel, cycle jour/nuit, météo, ombres
js/city.js                  Géographie de Saint-Étienne : routes, quartiers, bâtiments, monuments, carte
js/traffic.js               Voitures IA, feux tricolores, piétons
js/vehicle.js               Physique automobile (accélération, dérive, suspension, dégâts)
js/character.js             Personnage à pied animé
js/missions.js              Missions, marqueurs, colis cachés, récompenses
js/ui.js                    HUD, mini-carte, carte interactive, menus, commandes tactiles
js/main.js                  Boucle de jeu, caméra, optimisation adaptative
build.py                    Génère la version autonome
dist/gta42-saint-etienne.html   Version autonome (un seul fichier)
```

## Optimisation

- Bâtiments fusionnés en 3 draw calls (textures de façades générées par canvas).
- Lampadaires, arbres, voitures garées, piétons et trafic instanciés (InstancedMesh).
- 3 presets + mode Auto : résolution adaptative, distance de brouillard, ombres.
- Collisions via spatial hash (grille 24 m).
- Physique arcade légère, aucune bibliothèque physique externe.

## Sauvegarde

Automatique (argent, missions, 10 rubans verts cachés, position, heure, réglages)
dans `localStorage`. Bouton « Nouvelle partie » pour réinitialiser.

## Carte extensible

Ajouter une rue = une ligne `addRoad(...)` dans `js/city.js` : les pâtés de maisons,
trottoirs, lampadaires, trafic et carte sont régénérés automatiquement autour du
nouveau tracé. Les points d'intérêt sont déclarés dans `G.city.poi`.
