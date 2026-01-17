#!/usr/bin/env python3
"""
Geocodage des producteurs via l'API Nominatim (OpenStreetMap)
Ecrit les coordonnees dans un fichier JSON separe - ne modifie PAS le CSV source

Strategie de geocodage:
1. Adresse complete
2. Ville + Code postal  
3. Ville seule
4. Recherche de nom de commune
"""
import csv
import json
import time
import re
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime

# Configuration
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "AMAP-Gironde-Geocoder/1.0"
DELAY_BETWEEN_REQUESTS = 1.1  # Respecter les limites Nominatim (1 req/sec)

def clean_address(address):
    """Nettoie une adresse pour le geocodage"""
    if not address:
        return None
    # Supprime les retours a la ligne et espaces multiples
    address = re.sub(r'\s+', ' ', address.strip())
    # Supprime les informations parasites entre parentheses
    address = re.sub(r'\([^)]*\)', '', address)
    # Supprime les prefixes courants
    address = re.sub(r'^(chez|ferme|domaine|chateau)\s+', '', address, flags=re.IGNORECASE)
    return address.strip()

def extract_city_from_address(address):
    """Extrait la ville d'une adresse"""
    if not address:
        return None
    
    # Cherche un code postal suivi d'une ville
    match = re.search(r'(\d{5})\s+([A-Za-zÀ-ÿ\-\s]+)', address)
    if match:
        return match.group(2).strip()
    
    # Cherche apres la derniere virgule
    parts = address.split(',')
    if len(parts) > 1:
        last_part = parts[-1].strip()
        last_part = re.sub(r'^\d{5}\s*', '', last_part)
        if last_part:
            return last_part
    
    return None

def extract_postal_code(address):
    """Extrait le code postal d'une adresse"""
    if not address:
        return None
    match = re.search(r'\b(\d{5})\b', address)
    return match.group(1) if match else None

def geocode_nominatim(query, country="France"):
    """Appelle l'API Nominatim pour geocoder une adresse"""
    params = {
        'q': query,
        'format': 'json',
        'limit': 1,
        'countrycodes': 'fr',
        'addressdetails': 1
    }
    
    url = f"{NOMINATIM_URL}?{urllib.parse.urlencode(params)}"
    
    req = urllib.request.Request(url)
    req.add_header('User-Agent', USER_AGENT)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data and len(data) > 0:
                result = data[0]
                return {
                    'lat': float(result['lat']),
                    'lng': float(result['lon']),
                    'display_name': result.get('display_name', ''),
                }
    except Exception as e:
        print(f"    Erreur API: {e}")
    
    return None

def geocode_address_with_fallback(address, verbose=True):
    """
    Geocode avec strategie de fallback:
    1. Adresse complete
    2. Ville + Code postal
    3. Ville seule
    4. Extraction de commune
    """
    if not address:
        return None
    
    clean_addr = clean_address(address)
    city = extract_city_from_address(address)
    postal_code = extract_postal_code(address)
    
    # Tentative 1: Adresse complete
    if clean_addr:
        if verbose:
            print(f"    Essai 1: {clean_addr[:50]}...")
        result = geocode_nominatim(clean_addr)
        if result:
            result['precision'] = 'adresse_complete'
            return result
        time.sleep(DELAY_BETWEEN_REQUESTS)
    
    # Tentative 2: Ville + Code postal
    if city and postal_code:
        query = f"{postal_code} {city}, France"
        if verbose:
            print(f"    Essai 2: {query}")
        result = geocode_nominatim(query)
        if result:
            result['precision'] = 'ville_cp'
            return result
        time.sleep(DELAY_BETWEEN_REQUESTS)
    
    # Tentative 3: Ville seule
    if city:
        query = f"{city}, France"
        if verbose:
            print(f"    Essai 3: {query}")
        result = geocode_nominatim(query)
        if result:
            result['precision'] = 'ville'
            return result
        time.sleep(DELAY_BETWEEN_REQUESTS)
    
    # Tentative 4: Recherche de commune
    communes_match = re.search(r'(Saint[e]?[\-\s][A-Za-zÀ-ÿ\-]+|[A-Z][a-zÀ-ÿ]+[\-\s](?:de|du|des|sur|en|la|le|les)[\-\s][A-Za-zÀ-ÿ\-]+)', address)
    if communes_match:
        query = f"{communes_match.group(1)}, France"
        if verbose:
            print(f"    Essai 4: {query}")
        result = geocode_nominatim(query)
        if result:
            result['precision'] = 'commune_extraite'
            return result
    
    return None

def extract_addresses_from_csv(csv_path):
    """Extrait toutes les adresses uniques du CSV"""
    addresses = {}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    header = None
    current_row = []
    
    for line in lines:
        if header is None:
            header = line
            continue
        
        current_row.append(line)
        full_line = '\n'.join(current_row)
        
        if full_line.count('"') % 2 == 0:
            try:
                parsed = list(csv.reader([full_line]))[0]
                if len(parsed) > 5:
                    adresse = parsed[5].strip() if parsed[5] else None
                    if adresse and adresse not in addresses:
                        addresses[adresse] = None
            except:
                pass
            current_row = []
    
    return addresses

def geocode_to_json(csv_path, output_json):
    """Geocode les adresses et ecrit dans un fichier JSON separe"""
    
    # Charger le cache existant
    existing_coords = {}
    if Path(output_json).exists():
        try:
            with open(output_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
                existing_coords = data.get('coords', {})
            print(f"Cache existant charge: {len(existing_coords)} adresses")
        except:
            pass
    
    # Extraire les adresses du CSV
    addresses = extract_addresses_from_csv(csv_path)
    print(f"Adresses a geocoder: {len(addresses)}")
    
    # Filtrer les adresses deja geocodees
    to_geocode = [a for a in addresses if a not in existing_coords]
    print(f"Nouvelles adresses: {len(to_geocode)}")
    
    geocoded = 0
    failed = 0
    
    for i, address in enumerate(to_geocode):
        print(f"[{i+1}/{len(to_geocode)}] {address[:50]}...")
        
        result = geocode_address_with_fallback(address)
        
        if result:
            existing_coords[address] = {
                'lat': result['lat'],
                'lng': result['lng'],
                'precision': result['precision']
            }
            geocoded += 1
            print(f"    -> OK ({result['precision']}): {result['lat']:.5f}, {result['lng']:.5f}")
        else:
            failed += 1
            print(f"    -> ECHEC")
        
        time.sleep(DELAY_BETWEEN_REQUESTS)
        
        # Sauvegarder toutes les 10 adresses
        if (i + 1) % 10 == 0:
            output = {
                "geocoded": datetime.now().strftime("%Y-%m-%d"),
                "source": "Nominatim (OpenStreetMap)",
                "coords": existing_coords
            }
            with open(output_json, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
            print(f"    [Sauvegarde intermediaire]")
    
    # Sauvegarde finale
    output = {
        "geocoded": datetime.now().strftime("%Y-%m-%d"),
        "source": "Nominatim (OpenStreetMap)",
        "coords": existing_coords
    }
    
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n=== Resultats ===")
    print(f"Nouveaux geocodes: {geocoded}")
    print(f"Echecs: {failed}")
    print(f"Total dans le cache: {len(existing_coords)}")
    print(f"Fichier: {output_json}")

if __name__ == "__main__":
    base_path = Path(__file__).parent.parent
    dashboard_path = Path(__file__).parent
    
    csv_path = base_path / "data" / "AMAPs_Gironde_2025 - Producteur - 12_2025.csv"
    output_json = dashboard_path / "data" / "producteurs_coords.json"
    
    print("Geocodage des producteurs via Nominatim (OpenStreetMap)")
    print(f"Fichier source: {csv_path}")
    print(f"Cache coordonnees: {output_json}")
    print(f"NOTE: Le CSV source n'est PAS modifie")
    print()
    
    geocode_to_json(csv_path, output_json)
