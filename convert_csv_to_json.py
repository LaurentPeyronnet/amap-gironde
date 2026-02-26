#!/usr/bin/env python3
"""
Script de conversion CSV vers JSON pour la carte des AMAPs Gironde
Inclut les AMAPs et les Producteurs avec coordonnées géocodées
Version anonymisee - sans donnees personnelles
"""
import csv
import json
from datetime import datetime
from pathlib import Path
import re

# Mapping des produits vers des categories pour les icones
PRODUCT_CATEGORIES = {
    'légumes': 'legumes', 'legumes': 'legumes', 'tomate': 'legumes', 'asperge': 'legumes', 'endive': 'legumes',
    'pain': 'pain', 'farine': 'pain', 'céréales': 'pain', 'cereales': 'pain',
    'volaille': 'volaille', 'poulet': 'volaille', 'pintade': 'volaille', 'pigeon': 'volaille',
    'oeuf': 'oeuf',
    'boeuf': 'viande', 'veau': 'viande', 'agneau': 'viande', 'brebis': 'viande', 'porc': 'viande', 'lapin': 'viande',
    'poisson': 'poisson', 'huître': 'poisson', 'huitre': 'poisson',
    'fromage': 'fromage', 'produits laitiers': 'fromage', 'yaourt': 'fromage', 'tomme': 'fromage',
    'miel': 'miel', 'propolis': 'miel',
    'vin': 'vin', 'bière': 'vin', 'biere': 'vin',
    'pomme': 'fruits', 'poire': 'fruits', 'fruits': 'fruits', 'fraise': 'fruits', 'framboise': 'fruits',
    'kiwi': 'fruits', 'agrume': 'fruits', 'orange': 'fruits', 'citron': 'fruits', 'raisin': 'fruits',
    'noix': 'fruits', 'châtaigne': 'fruits', 'chataigne': 'fruits',
    'champignon': 'champignon', 'pleurotte': 'champignon', 'shiitake': 'champignon',
    'tisane': 'plantes', 'plante': 'plantes', 'aromate': 'plantes', 'herbe': 'plantes', 'fleur': 'plantes',
    'huile': 'huile', 'spiruline': 'autre', 'sel': 'autre', 'savon': 'autre', 'cosmétique': 'autre',
}

def clean_value(value):
    """Nettoie une valeur"""
    if value is None:
        return None
    value = str(value).strip()
    value = re.sub(r'\n\s*\n', ' ', value)
    value = re.sub(r'\s+', ' ', value)
    return value if value else None

def parse_date(date_str):
    """Parse une date au format M/D/YYYY vers YYYY-MM-DD"""
    if not date_str or date_str.strip() == '':
        return None
    try:
        parts = date_str.strip().split('/')
        if len(parts) == 3:
            month, day, year = parts
            return f"{year}-{int(month):02d}-{int(day):02d}"
    except (ValueError, IndexError):
        pass
    return None

def get_plateforme_name(plateforme_str):
    if not plateforme_str:
        return None
    lower = plateforme_str.lower()
    if 'camap' in lower: return 'CAMAP'
    if 'amapj' in lower: return 'AmapJ'
    if 'cagette' in lower: return 'Cagette'
    return None

def extract_website(site_str, plateforme_str):
    urls = []
    combined = (site_str or '') + ' + ' + (plateforme_str or '')
    for part in combined.split('+'):
        url = part.strip()
        if url.startswith('http') and not any(x in url.lower() for x in ['amapj.fr/p/', 'camap.amap44.org/group']):
            urls.append(url)
    return urls[0] if urls else None

def get_product_category(product_str):
    if not product_str:
        return 'autre'
    product_lower = product_str.lower()
    for keyword, category in PRODUCT_CATEGORIES.items():
        if keyword in product_lower:
            return category
    return 'autre'

def parse_amap_codes(code_str):
    if not code_str:
        return []
    codes = re.split(r'[,;]', code_str)
    return [c.strip() for c in codes if c.strip()]

def load_coords_cache(coords_file):
    """Charge le cache de coordonnées géocodées"""
    try:
        with open(coords_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('coords', {})
    except:
        return {}

def find_coords(address, coords_cache):
    """Trouve les coordonnées pour une adresse"""
    if not address:
        return None, None, None
    
    # Recherche exacte
    if address in coords_cache:
        c = coords_cache[address]
        return c['lat'], c['lng'], c.get('precision', 'cache')
    
    # Recherche partielle
    addr_lower = address.lower()
    for key, c in coords_cache.items():
        if key.lower() in addr_lower or addr_lower in key.lower():
            return c['lat'], c['lng'], c.get('precision', 'partial')
    
    return None, None, None

def convert_csv_to_json(amaps_csv, producteurs_csv, coords_file, json_path):
    """Convertit les CSV en JSON structure"""
    amaps = []
    producteurs = []
    date_min = None
    date_max = None
    
    # Charger le cache de coordonnées
    coords_cache = load_coords_cache(coords_file)
    print(f"Cache de coordonnees charge: {len(coords_cache)} adresses")
    
    # === Charger les AMAPs ===
    with open(amaps_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            lat = clean_value(row.get('Latitude'))
            lng = clean_value(row.get('Longitude'))
            try:
                lat = float(lat) if lat else None
                lng = float(lng) if lng else None
            except ValueError:
                lat, lng = None, None
            
            date_creation = parse_date(row.get('rna_date_creat', ''))
            if date_creation:
                if date_min is None or date_creation < date_min:
                    date_min = date_creation
                if date_max is None or date_creation > date_max:
                    date_max = date_creation
            
            code = clean_value(row.get('Code'))
            amap = {
                "id": code,
                "nom": clean_value(row.get('Nom')),
                "localisation": {
                    "ville": clean_value(row.get('Ville')),
                    "codePostal": clean_value(row.get('Code Postal')),
                    "adresse": clean_value(row.get('Adresse')),
                    "lat": lat,
                    "lng": lng
                },
                "livraison": {
                    "jour": clean_value(row.get('Distribution Jour')),
                    "horaire": clean_value(row.get('Distribution Horaire'))
                },
                "web": {
                    "siteWeb": extract_website(row.get('Site Web', ''), row.get('Plateforme Gestion', '')),
                    "plateforme": get_plateforme_name(row.get('Plateforme Gestion', ''))
                },
                "dateCreation": date_creation,
                "rnaId": clean_value(row.get('rna_id')),
                "producteurs": []
            }
            amaps.append(amap)
    
    amap_by_code = {a['id']: a for a in amaps}
    
    # === Charger les Producteurs ===
    producteur_id = 0
    with open(producteurs_csv, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parser manuellement pour gérer les lignes multilignes
    lines = content.split('\n')
    header = None
    current_row = []
    
    for line in lines:
        if header is None:
            header = line.split(',')
            continue
        
        # Compter les guillemets pour détecter les lignes multilignes
        current_row.append(line)
        full_line = '\n'.join(current_row)
        
        # Si le nombre de guillemets est pair, la ligne est complète
        if full_line.count('"') % 2 == 0:
            # Parser la ligne avec csv
            try:
                parsed = list(csv.reader([full_line]))[0]
                if len(parsed) >= 10:  # Au moins les colonnes de base
                    producteur_id += 1
                    pid = f"PROD-{producteur_id:03d}"
                    
                    produit = clean_value(parsed[0]) if len(parsed) > 0 else ''
                    nom = clean_value(parsed[2]) if len(parsed) > 2 else ''
                    societe = clean_value(parsed[3]) if len(parsed) > 3 else ''
                    adresse = clean_value(parsed[5]) if len(parsed) > 5 else ''
                    www = clean_value(parsed[8]) if len(parsed) > 8 else ''
                    infos = clean_value(parsed[7]) if len(parsed) > 7 else ''
                    code_amap = clean_value(parsed[9]) if len(parsed) > 9 else ''
                    frequence = clean_value(parsed[1]) if len(parsed) > 1 else ''
                    
                    if not nom and not societe:
                        current_row = []
                        continue
                    
                    categorie = get_product_category(produit)
                    amap_codes = parse_amap_codes(code_amap)
                    
                    # Récupérer les coordonnées du cache
                    lat, lng, precision = find_coords(adresse, coords_cache)
                    
                    producteur = {
                        "id": pid,
                        "nom": nom or societe,
                        "societe": societe,
                        "produit": produit,
                        "categorie": categorie,
                        "frequence": frequence,
                        "localisation": {
                            "adresse": adresse,
                            "lat": lat,
                            "lng": lng,
                            "precision": precision
                        },
                        "web": {"siteWeb": www},
                        "infos": infos,
                        "amaps": amap_codes
                    }
                    producteurs.append(producteur)
                    
                    for amap_code in amap_codes:
                        if amap_code in amap_by_code:
                            amap_by_code[amap_code]['producteurs'].append(pid)
            except Exception as e:
                pass
            
            current_row = []
    
    # Stats
    amaps_geocoded = sum(1 for a in amaps if a['localisation']['lat'])
    amaps_with_date = sum(1 for a in amaps if a['dateCreation'])
    producteurs_geocoded = sum(1 for p in producteurs if p['localisation']['lat'])
    
    output = {
        "metadata": {
            "source": "AMAPs_Gironde_2025",
            "generated": datetime.now().strftime("%Y-%m-%d"),
            "amapsCount": len(amaps),
            "amapsGeocoded": amaps_geocoded,
            "producteursCount": len(producteurs),
            "producteursGeocoded": producteurs_geocoded,
            "withDate": amaps_with_date,
            "dateMin": date_min,
            "dateMax": date_max
        },
        "amaps": amaps,
        "producteurs": producteurs
    }
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"[OK] Conversion terminee:")
    print(f"     - {len(amaps)} AMAPs ({amaps_geocoded} geolocalisees)")
    print(f"     - {len(producteurs)} Producteurs ({producteurs_geocoded} geolocalisees)")
    print(f"     - Periode: {date_min} a {date_max}")
    print(f"     - Fichier: {json_path}")
    
    return output

if __name__ == "__main__":
    base_path = Path(__file__).parent.parent
    dashboard_path = Path(__file__).parent
    
    amaps_csv = base_path / "data" / "AMAPs_Gironde_2025 - AMAP - 12_2025.csv"
    producteurs_csv = base_path / "data" / "AMAPs_Gironde_2025 - Producteur - 12_2025.csv"
    coords_file = dashboard_path / "data" / "producteurs_coords.json"
    json_path = dashboard_path / "data" / "amaps.json"
    
    json_path.parent.mkdir(parents=True, exist_ok=True)
    convert_csv_to_json(amaps_csv, producteurs_csv, coords_file, json_path)
