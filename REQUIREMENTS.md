# 📋 Exigences - Carte des AMAPs Gironde

## 1. Contexte et objectifs

### 1.1 Contexte
Le fichier `AMAPs_Gironde_2025 - AMAP - 12_2025.csv` contient les données de **117 AMAPs** (Associations pour le Maintien d'une Agriculture Paysanne) situées en Gironde.

### 1.2 Objectif
Créer une **visualisation cartographique** permettant d'explorer les AMAPs de Gironde avec une dimension temporelle (évolution historique du réseau) et une liste détaillée.

### 1.3 Principes directeurs
- **Carte au centre** : La carte est l'élément principal de l'interface
- **Liste complémentaire** : Tableau permettant de parcourir toutes les AMAPs
- **Vue détail** : Fiche complète accessible depuis la carte ou la liste
- **Respect de la vie privée** : Aucune donnée personnelle (email, téléphone, nom de contact)
- **Ambiance naturelle** : Design évoquant l'agriculture, la terre, le végétal

---

## 2. Exigences fonctionnelles

### 2.1 Carte interactive (élément central)

| ID | Exigence | Priorité |
|----|----------|----------|
| F01 | Afficher les AMAPs géolocalisées sur une carte | Haute |
| F02 | Permettre le zoom et le déplacement | Haute |
| F03 | Ouvrir la fiche détail au clic sur un marqueur | Haute |
| F04 | Centrer la carte sur la Gironde | Haute |
| F05 | Style de carte cohérent avec le thème naturel | Moyenne |

### 2.2 Slider temporel (filtrage par date de création)

| ID | Exigence | Priorité |
|----|----------|----------|
| F06 | Afficher un slider avec plage de dates de création | Haute |
| F07 | Filtrer dynamiquement les marqueurs et la liste selon la période | Haute |
| F08 | Afficher les bornes min/max et la sélection actuelle | Haute |
| F09 | Animation fluide lors du filtrage | Moyenne |
| F10 | Afficher le nombre d'AMAPs visibles pour la période | Moyenne |

### 2.3 Liste des AMAPs

| ID | Exigence | Priorité |
|----|----------|----------|
| F11 | Afficher la liste des AMAPs dans un tableau | Haute |
| F12 | Permettre la recherche textuelle (nom, ville) | Haute |
| F13 | Afficher un bouton "Voir" pour ouvrir la fiche détail | Haute |
| F14 | Synchroniser la liste avec le filtre temporel | Haute |
| F15 | Afficher le compteur de résultats | Moyenne |

### 2.4 Fiche détail (modal)

| ID | Exigence | Priorité |
|----|----------|----------|
| F16 | Ouvrir au clic sur marqueur carte OU bouton liste | Haute |
| F17 | Afficher les informations non-personnelles | Haute |
| F18 | Permettre la fermeture (croix, clic extérieur, Escape) | Haute |
| F19 | Liens cliquables vers site web | Moyenne |

### 2.5 Informations affichées

| Donnée | Affichée | Raison |
|--------|----------|--------|
| Nom de l'AMAP | ✅ Oui | Information publique |
| Ville | ✅ Oui | Localisation générale |
| Adresse de livraison | ✅ Oui | Lieu public |
| Jour et horaire | ✅ Oui | Info pratique |
| Site web / Page Facebook | ✅ Oui | Lien public |
| Date de création | ✅ Oui | Contexte historique |
| Plateforme de gestion | ✅ Oui | Info technique |
| Email | ❌ Non | Donnée personnelle |
| Téléphone | ❌ Non | Donnée personnelle |
| Nom du contact | ❌ Non | Donnée personnelle |

---

## 3. Exigences non-fonctionnelles

### 3.1 Performance

| ID | Exigence |
|----|----------|
| NF01 | Chargement initial < 2 secondes |
| NF02 | Réactivité du slider < 100ms |

### 3.2 Compatibilité

| ID | Exigence |
|----|----------|
| NF03 | Compatible navigateurs modernes |
| NF04 | Responsive (desktop prioritaire) |
| NF05 | Fonctionne en fichiers statiques |

### 3.3 Confidentialité

| ID | Exigence |
|----|----------|
| NF06 | Aucune donnée personnelle dans le JSON |
| NF07 | Aucun email/téléphone/nom affiché |

---

## 4. Charte graphique

### 4.1 Ambiance visuelle
L'interface doit évoquer :
- 🌿 La nature, le végétal
- 🌾 L'agriculture paysanne
- 🏡 La proximité, le local
- 🤝 Le lien social, la communauté

### 4.2 Palette de couleurs

| Élément | Couleur | Usage |
|---------|---------|-------|
| Fond principal | `#f5f1eb` | Beige clair naturel |
| Fond secondaire | `#e8e2d9` | Beige plus soutenu |
| Texte principal | `#3d3929` | Brun terreux |
| Texte secondaire | `#6b6352` | Brun clair |
| Accent principal | `#5a8f3e` | Vert feuille |
| Accent secondaire | `#7cb356` | Vert prairie |
| Accent tertiaire | `#c4a35a` | Ocre/blé |
| Marqueurs carte | `#e07b39` | Orange terre cuite |

### 4.3 Typographie
- **Titres** : Playfair Display (élégant, naturel)
- **Corps** : Source Sans 3 (lisible, chaleureux)

---

## 5. Architecture technique

### 5.1 Structure des fichiers

```
dashboard/
├── index.html              # Page unique
├── css/
│   └── style.css          # Styles thème naturel
├── js/
│   └── app.js             # Carte + slider + liste + modal
├── data/
│   └── amaps.json         # Données anonymisées
├── convert_csv_to_json.py # Script conversion
└── REQUIREMENTS.md        # Ce document
```

### 5.2 Structure des données JSON (anonymisées)

```json
{
  "metadata": {
    "source": "AMAPs_Gironde_2025",
    "generated": "2025-01-15",
    "count": 107,
    "dateMin": "2005-10-10",
    "dateMax": "2022-09-23"
  },
  "amaps": [
    {
      "id": "AMBARES-POTAG",
      "nom": "AMAP Le Potager Gourmand",
      "localisation": {
        "ville": "Ambarès-et-Lagrave",
        "codePostal": "33440",
        "adresse": "école Rosa Bonheur",
        "lat": 44.96083,
        "lng": -0.50029
      },
      "livraison": {
        "jour": "Jeudi",
        "horaire": "19h00-20h00"
      },
      "web": {
        "siteWeb": "https://...",
        "plateforme": "AmapJ"
      },
      "dateCreation": "2013-07-24"
    }
  ]
}
```

---

## 6. Maquette fonctionnelle

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🥬 AMAPs de Gironde          [Rechercher...            🔍]   │
│   Cartographie du réseau                                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │                    🗺️ CARTE                            │  │
│   │              📍  📍    📍                               │  │
│   │                 📍   📍  📍    ← Clic = ouvrir détail   │  │
│   │              📍    BORDEAUX  📍                         │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  🌱 Évolution du réseau              87 AMAPs affichées │  │
│   │  2005 ○────────────●━━━━━━━━━━━━━━━━━━━━○ 2022         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 📋 Liste des AMAPs                         87 résultats │  │
│   ├─────────────────────────────────────────────────────────┤  │
│   │ Nom                    │ Ville        │ Jour    │ Action│  │
│   │ Le Potager Gourmand    │ Ambarès      │ Jeudi   │ [Voir]│  │
│   │ Amap Art               │ Artigues     │ Mercredi│ [Voir]│  │
│   │ ...                                                     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🥬 AMAP Le Potager Gourmand      [×]  │  ← Modal détail
│  Ambarès-et-Lagrave (33440)            │
│  ─────────────────────────────────────  │
│  📍 école Rosa Bonheur                 │
│  📅 Jeudi 19h00-20h00                  │
│  🌐 Voir le site web                   │
│  📋 Créée en 2013                      │
└─────────────────────────────────────────┘
```

---

## 7. Critères d'acceptation

- [ ] La carte affiche les AMAPs géolocalisées
- [ ] Le slider filtre les AMAPs par date de création
- [ ] La liste affiche les AMAPs filtrées
- [ ] Le clic sur un marqueur ouvre la fiche détail
- [ ] Le clic sur "Voir" dans la liste ouvre la fiche détail
- [ ] Aucune donnée personnelle n'apparaît
- [ ] Le thème évoque la nature et l'agriculture
- [ ] Le site fonctionne en ouvrant directement `index.html`
