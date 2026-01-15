/**
 * AMAPs Gironde - Carte Interactive avec Timeline et Liste
 * Version sans données personnelles
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    // Centre de la Gironde (proche Bordeaux)
    mapCenter: [44.84, -0.58],
    mapZoom: 9,
    
    // Couleurs des marqueurs
    markerColors: {
        default: '#e07b39',     // Orange terre cuite
        hover: '#5a8f3e',       // Vert feuille
        border: '#c4a35a'       // Ocre/blé
    },
    
    // Style de carte
    tileLayer: {
        url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
};

// ============================================
// État global
// ============================================
let state = {
    data: null,
    map: null,
    markers: [],
    filteredAmaps: [],
    filters: {
        search: '',
        yearMax: 2024
    },
    yearRange: {
        min: 2005,
        max: 2024
    }
};

// ============================================
// Initialisation
// ============================================
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        await loadData();
        initMap();
        initTimeline();
        initEventListeners();
        updateAll();
    } catch (error) {
        console.error('Erreur initialisation:', error);
    }
}

// ============================================
// Chargement des données
// ============================================
async function loadData() {
    const response = await fetch('data/amaps.json');
    if (!response.ok) throw new Error('Erreur chargement données');
    state.data = await response.json();
    
    // Extraire les bornes temporelles
    if (state.data.metadata.dateMin) {
        state.yearRange.min = parseInt(state.data.metadata.dateMin.substring(0, 4));
    }
    if (state.data.metadata.dateMax) {
        state.yearRange.max = parseInt(state.data.metadata.dateMax.substring(0, 4));
    }
    
    // Valeur initiale : toutes les AMAPs
    state.filters.yearMax = state.yearRange.max;
}

// ============================================
// Carte
// ============================================
function initMap() {
    state.map = L.map('map', {
        center: CONFIG.mapCenter,
        zoom: CONFIG.mapZoom,
        scrollWheelZoom: true,
        zoomControl: true
    });
    
    // Tile layer
    L.tileLayer(CONFIG.tileLayer.url, {
        attribution: CONFIG.tileLayer.attribution,
        maxZoom: 18
    }).addTo(state.map);
    
    state.map.zoomControl.setPosition('topright');
}

function updateMap() {
    // Supprimer les marqueurs existants
    state.markers.forEach(marker => state.map.removeLayer(marker));
    state.markers = [];
    
    // Ajouter les marqueurs filtrés
    state.filteredAmaps.forEach(amap => {
        const lat = amap.localisation?.lat;
        const lng = amap.localisation?.lng;
        
        if (lat && lng) {
            const marker = createMarker(amap, lat, lng);
            marker.addTo(state.map);
            state.markers.push(marker);
        }
    });
}

function createMarker(amap, lat, lng) {
    const marker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: CONFIG.markerColors.default,
        color: CONFIG.markerColors.border,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
    });
    
    // Clic = ouvrir la modal détail
    marker.on('click', () => openDetail(amap.id));
    
    // Interactions hover
    marker.on('mouseover', function() {
        this.setStyle({ 
            fillColor: CONFIG.markerColors.hover,
            radius: 11
        });
        this.bringToFront();
    });
    
    marker.on('mouseout', function() {
        this.setStyle({ 
            fillColor: CONFIG.markerColors.default,
            radius: 9
        });
    });
    
    // Tooltip au survol
    marker.bindTooltip(amap.nom, {
        direction: 'top',
        offset: [0, -10],
        className: 'amap-tooltip'
    });
    
    return marker;
}

// ============================================
// Timeline / Slider temporel compact
// ============================================
function initTimeline() {
    const slider = document.getElementById('timelineSlider');
    const { min, max } = state.yearRange;
    
    // Configurer le slider
    slider.min = min;
    slider.max = max;
    slider.value = max;
    
    // Labels
    document.getElementById('yearMin').textContent = min;
    document.getElementById('yearCurrent').textContent = max;
    
    updateSliderProgress(max);
}

function updateSliderProgress(value) {
    const slider = document.getElementById('timelineSlider');
    const { min, max } = state.yearRange;
    const progress = ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--progress', `${progress}%`);
}

// ============================================
// Liste des AMAPs
// ============================================
function updateList() {
    const tbody = document.getElementById('amapsBody');
    
    tbody.innerHTML = state.filteredAmaps.map(amap => {
        const ville = amap.localisation?.ville || '-';
        const jour = amap.distribution?.jour || '-';
        const horaire = amap.distribution?.horaire || '-';
        
        return `
            <tr>
                <td class="amap-name">${amap.nom}</td>
                <td>${ville}</td>
                <td><span class="badge badge-jour">${truncate(jour, 12)}</span></td>
                <td>${horaire}</td>
                <td>
                    <button class="btn-view" onclick="openDetail('${amap.id}')">
                        👁️ Voir
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Compteur
    document.getElementById('resultCount').textContent = 
        `${state.filteredAmaps.length} résultat${state.filteredAmaps.length > 1 ? 's' : ''}`;
}

// ============================================
// Modal Détail
// ============================================
function openDetail(id) {
    const amap = state.data.amaps.find(a => a.id === id);
    if (!amap) return;
    
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    
    body.innerHTML = createDetailContent(amap);
    modal.classList.remove('hidden');
    
    // Bloquer le scroll du body
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function createDetailContent(amap) {
    const loc = amap.localisation || {};
    const dist = amap.distribution || {};
    const web = amap.web || {};
    const dateCreation = amap.dateCreation;
    
    let html = `
        <div class="detail-header">
            <h2>${amap.nom}</h2>
            <p class="subtitle">${loc.ville || ''}${loc.codePostal ? ` (${loc.codePostal})` : ''}</p>
        </div>
    `;
    
    // Site web EN PRIORITÉ
    if (web.siteWeb) {
        html += `
            <div class="detail-website">
                <a href="${web.siteWeb}" target="_blank" rel="noopener" class="detail-website-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    Accéder au site web
                </a>
            </div>
        `;
    }
    
    // Infos compactes
    html += `<div class="detail-info">`;
    
    // Distribution
    if (dist.jour) {
        html += `
            <div class="detail-info-item">
                <span class="detail-info-icon">📅</span>
                <div class="detail-info-content">
                    <div class="detail-info-label">Distribution</div>
                    <div class="detail-info-value">
                        <span class="detail-badge detail-badge-jour">${dist.jour}</span>
                        ${dist.horaire ? ` ${dist.horaire}` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Année création
    if (dateCreation) {
        const year = dateCreation.substring(0, 4);
        html += `
            <div class="detail-info-item">
                <span class="detail-info-icon">🌱</span>
                <div class="detail-info-content">
                    <div class="detail-info-label">Création</div>
                    <div class="detail-info-value">
                        <span class="detail-badge detail-badge-year">${year}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Plateforme
    if (web.plateforme) {
        html += `
            <div class="detail-info-item">
                <span class="detail-info-icon">💻</span>
                <div class="detail-info-content">
                    <div class="detail-info-label">Plateforme</div>
                    <div class="detail-info-value">
                        <span class="detail-badge detail-badge-plateforme">${web.plateforme}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Adresse
    if (loc.adresse) {
        html += `
            <div class="detail-info-item full-width">
                <span class="detail-info-icon">📍</span>
                <div class="detail-info-content">
                    <div class="detail-info-label">Lieu de distribution</div>
                    <div class="detail-info-value">${loc.adresse}</div>
                </div>
            </div>
        `;
    }
    
    html += `</div>`;
    
    return html;
}

// ============================================
// Filtrage
// ============================================
function filterAmaps() {
    let result = state.data.amaps;
    
    // Filtre par recherche textuelle
    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        result = result.filter(a => 
            a.nom?.toLowerCase().includes(search) ||
            a.localisation?.ville?.toLowerCase().includes(search)
        );
    }
    
    // Filtre par date de création (timeline)
    result = result.filter(a => {
        if (!a.dateCreation) {
            // Si pas de date, on les affiche par défaut
            return true;
        }
        const year = parseInt(a.dateCreation.substring(0, 4));
        return year <= state.filters.yearMax;
    });
    
    state.filteredAmaps = result;
}

// ============================================
// Mise à jour globale
// ============================================
function updateAll() {
    filterAmaps();
    updateMap();
    updateList();
    updateCount();
}

function updateCount() {
    // Le compteur est maintenant dans resultCount
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    // Recherche
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(e => {
        state.filters.search = e.target.value;
        updateAll();
    }, 200));
    
    // Slider timeline
    const slider = document.getElementById('timelineSlider');
    slider.addEventListener('input', e => {
        const year = parseInt(e.target.value);
        state.filters.yearMax = year;
        
        // Mise à jour visuelle
        document.getElementById('yearCurrent').textContent = year;
        updateSliderProgress(year);
        
        // Mise à jour données
        updateAll();
    });
    
    // Modal - fermeture
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

// ============================================
// Utilitaires
// ============================================
function truncate(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Exposer pour les onclick dans le HTML
window.openDetail = openDetail;
