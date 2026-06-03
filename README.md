# 🥬 Carte des AMAPs de Gironde

Visualisation cartographique interactive des AMAPs (Associations pour le Maintien d'une Agriculture Paysanne) de Gironde.

## 🌐 Démo

Ouvrir `index.html` dans un navigateur moderne.

> ⚠️ Pour éviter les restrictions CORS, utilisez un serveur local :
> ```bash
> python -m http.server 8080
> # puis ouvrez http://localhost:8080
> ```

## ✨ Fonctionnalités

- **Carte interactive** des AMAPs géolocalisées
- **Slider temporel** pour visualiser l'évolution du réseau (2005-2026)
- **Liste filtrable** avec recherche
- **Fiche détail** au clic sur un marqueur

## 📁 Structure

```
├── index.html              # Page principale
├── css/style.css           # Styles (thème naturel)
├── js/app.js               # Logique applicative
├── data/amaps.json         # Données des AMAPs
├── convert_csv_to_json.py  # Script de conversion
└── REQUIREMENTS.md         # Spécifications
```

## 🎨 Design

Interface avec un thème naturel évoquant l'agriculture paysanne :
- Palette de couleurs chaudes (beige, vert feuille, terre cuite)
- Typographie : Playfair Display + Source Sans 3

## 🔒 Confidentialité

Les données personnelles (emails, téléphones, noms de contacts) ont été supprimées.
Seules les informations publiques sont affichées.

## 📊 Données

- **108 AMAPs** en Gironde (107 géolocalisées, 46 avec date de création RNA)
- **221 producteurs** dont **170 géolocalisés** (≥1 producteur sur 39 AMAP)

Dernière mise à jour : **juin 2026** — consolidation du référentiel producteurs
- Producteurs fusionnés depuis 4 sources : liste Inter-AMAP (S1), export CAMAP, sites des AMAP scrapés, recherches web
- Vérification officielle au **SIREN/INSEE** (champ `valide`) + géocodage **BAN** au plus précis (champ `localisation.precision` : insee/housenumber/street/locality/municipality)
- 35 producteurs hors-Gironde (contamination) exclus ; doublons fusionnés
- Données personnelles (tél/email/contacts) non publiées

Mise à jour précédente : février 2026 — campagne de vérification Inter-AMAP (état actif/fermé, adresses, horaires ; 2 nouvelles AMAP)

Source : Réseau Inter-AMAP Gironde + référentiel consolidé (voir `../consolidation/`)

## 🛠️ Technologies

- HTML5 / CSS3 / JavaScript (ES6+)
- [Leaflet.js](https://leafletjs.com/) pour la carte
- OpenStreetMap pour les tuiles

## 📄 Licence

Données ouvertes - Usage libre avec mention de la source.


