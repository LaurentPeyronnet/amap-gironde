#!/usr/bin/env python3
"""
Script de conversion CSV vers JSON pour la carte des AMAPs Gironde
Version anonymisee - sans donnees personnelles
"""
import csv
import json
from datetime import datetime
from pathlib import Path

def clean_value(value):
    """Nettoie une valeur (strip, gestion des vides)"""
    if value is None:
        return None
    value = value.strip()
    return value if value else None

def parse_date(date_str):
    """Parse une date au format M/D/YYYY vers YYYY-MM-DD"""
    if not date_str or date_str.strip() == '':
        return None
    try:
        # Format attendu: M/D/YYYY (ex: 7/24/2013)
        parts = date_str.strip().split('/')
        if len(parts) == 3:
            month, day, year = parts
            return f"{year}-{int(month):02d}-{int(day):02d}"
    except (ValueError, IndexError):
        pass
    return None

def get_plateforme_name(plateforme_str):
    """Extrait le nom de la plateforme de gestion"""
    if not plateforme_str:
        return None
    lower = plateforme_str.lower()
    if 'camap' in lower:
        return 'CAMAP'
    if 'amapj' in lower:
        return 'AmapJ'
    if 'cagette' in lower:
        return 'Cagette'
    return None

def extract_website(site_str, plateforme_str):
    """Extrait les URLs de site web (sans les plateformes de gestion)"""
    urls = []
    
    # Combine les deux champs
    combined = ''
    if site_str:
        combined += site_str
    if plateforme_str:
        combined += ' + ' + plateforme_str
    
    if not combined:
        return None
    
    # Separe par + et extrait les URLs
    for part in combined.split('+'):
        url = part.strip()
        if url.startswith('http'):
            # Filtre les URLs de plateformes de gestion (on garde les autres)
            if not any(x in url.lower() for x in ['amapj.fr/p/', 'camap.amap44.org/group']):
                urls.append(url)
    
    return urls[0] if urls else None

def convert_csv_to_json(csv_path, json_path):
    """Convertit le CSV en JSON structure et anonymise"""
    amaps = []
    date_min = None
    date_max = None
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Extraction des coordonnees
            lat = clean_value(row.get('Latitude'))
            lng = clean_value(row.get('Longitude'))
            
            try:
                lat = float(lat) if lat else None
                lng = float(lng) if lng else None
            except ValueError:
                lat, lng = None, None
            
            # Date de creation
            date_creation = parse_date(row.get('rna_date_creat', ''))
            
            # Mise a jour des bornes temporelles
            if date_creation:
                if date_min is None or date_creation < date_min:
                    date_min = date_creation
                if date_max is None or date_creation > date_max:
                    date_max = date_creation
            
            # Structure anonymisee (sans email, telephone, contact)
            amap = {
                "id": clean_value(row.get('Code')),
                "nom": clean_value(row.get('Nom')),
                "localisation": {
                    "ville": clean_value(row.get('Ville')),
                    "codePostal": clean_value(row.get('Code Postal')),
                    "adresse": clean_value(row.get('Adresse')),
                    "lat": lat,
                    "lng": lng
                },
                "distribution": {
                    "jour": clean_value(row.get('Distribution Jour')),
                    "horaire": clean_value(row.get('Distribution Horaire'))
                },
                "web": {
                    "siteWeb": extract_website(
                        row.get('Site Web', ''), 
                        row.get('Plateforme Gestion', '')
                    ),
                    "plateforme": get_plateforme_name(row.get('Plateforme Gestion', ''))
                },
                "dateCreation": date_creation,
                "rnaId": clean_value(row.get('rna_id'))
            }
            amaps.append(amap)
    
    # Compte les AMAPs avec date de creation
    amaps_with_date = sum(1 for a in amaps if a['dateCreation'])
    amaps_geocoded = sum(1 for a in amaps if a['localisation']['lat'])
    
    output = {
        "metadata": {
            "source": "AMAPs_Gironde_2025 - AMAP - 12_2025.csv",
            "generated": datetime.now().strftime("%Y-%m-%d"),
            "count": len(amaps),
            "geocoded": amaps_geocoded,
            "withDate": amaps_with_date,
            "dateMin": date_min,
            "dateMax": date_max
        },
        "amaps": amaps
    }
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"[OK] Conversion terminee: {len(amaps)} AMAPs")
    print(f"     - Geolocalisees: {amaps_geocoded}")
    print(f"     - Avec date creation: {amaps_with_date}")
    print(f"     - Periode: {date_min} a {date_max}")
    print(f"     - Fichier: {json_path}")
    
    return output

if __name__ == "__main__":
    base_path = Path(__file__).parent.parent
    csv_path = base_path / "data" / "AMAPs_Gironde_2025 - AMAP - 12_2025.csv"
    json_path = Path(__file__).parent / "data" / "amaps.json"
    
    # Cree le dossier data s'il n'existe pas
    json_path.parent.mkdir(parents=True, exist_ok=True)
    
    convert_csv_to_json(csv_path, json_path)
