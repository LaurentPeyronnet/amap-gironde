/**
 * AMAPs Gironde - Carte Interactive
 * AMAPs et Producteurs
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    mapCenter: [44.84, -0.58],
    mapZoom: 9,
    
    // Couleurs pour les AMAPs
    amapColors: {
        default: '#e07b39',
        hover: '#5a8f3e',
        border: '#c4a35a',
        retour: '#5a8f3e',
        retourBorder: '#3d6b28',
        retourHover: '#e07b39'
    },
    
    // Couleurs et icônes par catégorie de produit
    productCategories: {
        legumes: { color: '#4caf50', icon: '🥬', label: 'Légumes' },
        pain: { color: '#d4a373', icon: '🍞', label: 'Pain/Céréales' },
        volaille: { color: '#ff9800', icon: '🐔', label: 'Volaille' },
        oeuf: { color: '#ffeb3b', icon: '🥚', label: 'Œufs' },
        viande: { color: '#c62828', icon: '🥩', label: 'Viande' },
        poisson: { color: '#03a9f4', icon: '🐟', label: 'Poisson' },
        fromage: { color: '#ffc107', icon: '🧀', label: 'Fromage' },
        miel: { color: '#ff8f00', icon: '🍯', label: 'Miel' },
        vin: { color: '#7b1fa2', icon: '🍷', label: 'Vin/Bière' },
        fruits: { color: '#e91e63', icon: '🍎', label: 'Fruits' },
        champignon: { color: '#795548', icon: '🍄', label: 'Champignons' },
        plantes: { color: '#8bc34a', icon: '🌿', label: 'Plantes' },
        huile: { color: '#827717', icon: '🫒', label: 'Huile' },
        autre: { color: '#607d8b', icon: '📦', label: 'Autre' }
    },
    
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
    connectionLines: [],
    currentView: 'amaps', // 'amaps' ou 'producteurs'
    filters: {
        search: '',
        yearMax: 2024,
        category: ''
    },
    yearRange: { min: 2005, max: 2024 },
    selectedAmap: null
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
        buildCategoryFilter();
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
    
    if (state.data.metadata.dateMin) {
        state.yearRange.min = parseInt(state.data.metadata.dateMin.substring(0, 4));
    }
    if (state.data.metadata.dateMax) {
        state.yearRange.max = parseInt(state.data.metadata.dateMax.substring(0, 4));
    }
    state.filters.yearMax = state.yearRange.max;
}

// ============================================
// Carte
// ============================================
function initMap() {
    state.map = L.map('map', {
        center: CONFIG.mapCenter,
        zoom: CONFIG.mapZoom,
        scrollWheelZoom: true
    });
    
    L.tileLayer(CONFIG.tileLayer.url, {
        attribution: CONFIG.tileLayer.attribution,
        maxZoom: 18
    }).addTo(state.map);
    
    state.map.zoomControl.setPosition('topright');
}

function updateMap() {
    clearMap();
    
    if (state.currentView === 'amaps') {
        updateAmapsMap();
    } else {
        updateProducteursMap();
    }
}

function clearMap() {
    state.markers.forEach(m => state.map.removeLayer(m));
    state.markers = [];
    clearConnectionLines();
}

function clearConnectionLines() {
    state.connectionLines.forEach(l => state.map.removeLayer(l));
    state.connectionLines = [];
}

// ============================================
// Vue AMAPs
// ============================================
function updateAmapsMap() {
    const filtered = filterAmaps();
    
    filtered.forEach(amap => {
        const lat = amap.localisation?.lat;
        const lng = amap.localisation?.lng;
        
        if (lat && lng) {
            const hasRetour = amap.retour === true;
            const baseColor = hasRetour ? CONFIG.amapColors.retour : CONFIG.amapColors.default;
            const borderColor = hasRetour ? CONFIG.amapColors.retourBorder : CONFIG.amapColors.border;
            const hoverColor = hasRetour ? CONFIG.amapColors.retourHover : CONFIG.amapColors.hover;
            const baseRadius = hasRetour ? 10 : 8;
            
            const marker = L.circleMarker([lat, lng], {
                radius: baseRadius,
                fillColor: baseColor,
                color: borderColor,
                weight: hasRetour ? 3 : 2,
                opacity: 1,
                fillOpacity: hasRetour ? 0.9 : 0.7
            });
            
            marker.on('click', () => {
                openAmapDetail(amap.id);
            });
            
            marker.on('mouseover', function() {
                this.setStyle({ fillColor: hoverColor, radius: baseRadius + 2 });
            });
            marker.on('mouseout', function() {
                this.setStyle({ fillColor: baseColor, radius: baseRadius });
            });
            
            const tooltipPrefix = hasRetour ? '✅ ' : '';
            marker.bindTooltip(tooltipPrefix + amap.nom, { direction: 'top', offset: [0, -10] });
            marker.addTo(state.map);
            state.markers.push(marker);
        }
    });
    
    updateAmapsLegend(filtered);
}

// ============================================
// Vue Producteurs
// ============================================
function updateProducteursMap() {
    const filtered = filterProducteurs();
    const categoriesUsed = new Set();
    
    filtered.forEach(prod => {
        const lat = prod.localisation?.lat;
        const lng = prod.localisation?.lng;
        
        if (lat && lng) {
            const cat = CONFIG.productCategories[prod.categorie] || CONFIG.productCategories.autre;
            categoriesUsed.add(prod.categorie);
            
            // Créer une icône avec l'emoji du produit
            const icon = L.divIcon({
                className: 'producteur-marker',
                html: `<div class="marker-icon" style="background:${cat.color};border-color:${cat.color}">${cat.icon}</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });
            
            const marker = L.marker([lat, lng], { icon });
            
            // Popup avec infos
            const popupContent = `
                <div class="popup-content">
                    <strong>${cat.icon} ${prod.nom || prod.societe || 'Producteur'}</strong>
                    <p>${prod.produit || ''}</p>
                    ${prod.localisation?.adresse ? `<small>${prod.localisation.adresse}</small>` : ''}
                </div>
            `;
            marker.bindPopup(popupContent);
            marker.on('click', () => openProducteurDetail(prod.id));
            
            marker.addTo(state.map);
            state.markers.push(marker);
        } else {
            // Producteur sans coordonnées
            categoriesUsed.add(prod.categorie);
        }
    });
    
    // Afficher la légende
    updateLegend(categoriesUsed);
}

function updateAmapsLegend(filtered) {
    const legend = document.getElementById('mapLegend');
    const items = document.getElementById('legendItems');
    const retourCount = filtered.filter(a => a.retour).length;
    const otherCount = filtered.length - retourCount;
    
    items.innerHTML = `
        <div class="legend-item">
            <span class="legend-dot" style="background:${CONFIG.amapColors.retour};border:2px solid ${CONFIG.amapColors.retourBorder}"></span>
            <span>Retour confirmé (${retourCount})</span>
        </div>
        <div class="legend-item">
            <span class="legend-dot" style="background:${CONFIG.amapColors.default};border:2px solid ${CONFIG.amapColors.border}"></span>
            <span>Pas de retour (${otherCount})</span>
        </div>
    `;
    legend.classList.add('visible');
}

function updateLegend(categories) {
    const legend = document.getElementById('mapLegend');
    const items = document.getElementById('legendItems');
    
    if (categories.size === 0) {
        legend.classList.remove('visible');
        return;
    }
    
    items.innerHTML = Array.from(categories).map(cat => {
        const c = CONFIG.productCategories[cat] || CONFIG.productCategories.autre;
        return `<div class="legend-item">
            <span class="legend-dot" style="background:${c.color}"></span>
            <span>${c.icon} ${c.label}</span>
        </div>`;
    }).join('');
    
    legend.classList.add('visible');
}

// ============================================
// Timeline
// ============================================
function initTimeline() {
    const slider = document.getElementById('timelineSlider');
    const { min, max } = state.yearRange;
    
    slider.min = min;
    slider.max = max;
    slider.value = max;
    
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
// Filtres
// ============================================
function buildCategoryFilter() {
    const select = document.getElementById('filterCategory');
    const categories = new Set();
    
    state.data.producteurs.forEach(p => {
        if (p.categorie) categories.add(p.categorie);
    });
    
    select.innerHTML = '<option value="">Tous les produits</option>' +
        Array.from(categories).sort().map(cat => {
            const c = CONFIG.productCategories[cat] || CONFIG.productCategories.autre;
            return `<option value="${cat}">${c.icon} ${c.label}</option>`;
        }).join('');
}

function filterAmaps() {
    let result = state.data.amaps;
    
    if (state.filters.search) {
        const s = state.filters.search.toLowerCase();
        result = result.filter(a => 
            a.nom?.toLowerCase().includes(s) ||
            a.localisation?.ville?.toLowerCase().includes(s)
        );
    }
    
    result = result.filter(a => {
        if (!a.dateCreation) return true;
        return parseInt(a.dateCreation.substring(0, 4)) <= state.filters.yearMax;
    });
    
    return result;
}

function filterProducteurs() {
    let result = state.data.producteurs;
    
    if (state.filters.search) {
        const s = state.filters.search.toLowerCase();
        result = result.filter(p => 
            p.nom?.toLowerCase().includes(s) ||
            p.produit?.toLowerCase().includes(s) ||
            p.societe?.toLowerCase().includes(s)
        );
    }
    
    if (state.filters.category) {
        result = result.filter(p => p.categorie === state.filters.category);
    }
    
    return result;
}

// ============================================
// Listes
// ============================================
function updateAmapsList() {
    const filtered = filterAmaps();
    const tbody = document.getElementById('amapsBody');
    
    tbody.innerHTML = filtered.map(amap => {
        const ville = amap.localisation?.ville || '-';
        const jour = amap.distribution?.jour || '-';
        const hasRetour = amap.retour === true;
        const rowClass = hasRetour ? 'class="amap-retour"' : '';
        const retourBadge = hasRetour ? '<span class="badge badge-retour" title="Retour confirmé">✅</span> ' : '';
        
        return `<tr ${rowClass}>
            <td class="item-name">${retourBadge}${amap.nom}</td>
            <td>${ville}</td>
            <td><span class="badge badge-jour">${truncate(jour, 10)}</span></td>
            <td><button class="btn-view" onclick="openAmapDetail('${amap.id}')">Voir</button></td>
        </tr>`;
    }).join('');
    
    document.getElementById('amapsResultCount').textContent = `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`;
}

function updateProducteursList() {
    const filtered = filterProducteurs();
    const tbody = document.getElementById('producteursBody');
    
    tbody.innerHTML = filtered.map(prod => {
        const cat = CONFIG.productCategories[prod.categorie] || CONFIG.productCategories.autre;
        const freq = prod.frequence || '-';
        
        return `<tr>
            <td>
                <span class="badge badge-product" style="background:${cat.color}20;color:${cat.color}">
                    ${cat.icon} ${truncate(prod.produit, 20)}
                </span>
            </td>
            <td class="item-name">${prod.nom || prod.societe || '-'}</td>
            <td>${truncate(freq, 15)}</td>
            <td><button class="btn-view" onclick="openProducteurDetail('${prod.id}')">Voir</button></td>
        </tr>`;
    }).join('');
    
    document.getElementById('producteursResultCount').textContent = `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`;
}

// ============================================
// Modales détail
// ============================================
function openAmapDetail(id) {
    const amap = state.data.amaps.find(a => a.id === id);
    if (!amap) return;
    
    state.selectedAmap = amap;
    
    const loc = amap.localisation || {};
    const dist = amap.distribution || {};
    const web = amap.web || {};
    
    const retourTag = amap.retour ? '<span class="detail-badge detail-badge-retour">✅ Retour confirmé</span>' : '';
    const etatTag = amap.etat ? `<span class="detail-badge detail-badge-etat detail-badge-etat-${amap.etat}">${amap.etat}</span>` : '';
    
    let html = `
        <div class="detail-header">
            <h2>🏠 ${amap.nom}</h2>
            <p class="subtitle">${loc.ville || ''}${loc.codePostal ? ` (${loc.codePostal})` : ''}</p>
            <div class="detail-tags">${etatTag} ${retourTag}</div>
        </div>
    `;
    
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
    
    html += `<div class="detail-info">`;
    
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
    
    if (amap.dateCreation) {
        html += `
            <div class="detail-info-item">
                <span class="detail-info-icon">🌱</span>
                <div class="detail-info-content">
                    <div class="detail-info-label">Création</div>
                    <div class="detail-info-value">
                        <span class="detail-badge detail-badge-year">${amap.dateCreation.substring(0, 4)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
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
    
    if (loc.adresse) {
        html += `
            <div class="detail-info-item full-width">
                <span class="detail-info-icon">📍</span>
                <div class="detail-info-content">
                    <div class="detail-info-label">Adresse</div>
                    <div class="detail-info-value">${loc.adresse}</div>
                </div>
            </div>
        `;
    }
    
    html += `</div>`;
    
    showModal(html);
}

function openProducteurDetail(id) {
    const prod = state.data.producteurs.find(p => p.id === id);
    if (!prod) return;
    
    const cat = CONFIG.productCategories[prod.categorie] || CONFIG.productCategories.autre;
    
    let html = `
        <div class="detail-header">
            <h2>${cat.icon} ${prod.nom || prod.societe || 'Producteur'}</h2>
            <p class="subtitle">${prod.produit || ''}</p>
        </div>
    `;
    
    if (prod.web?.siteWeb) {
        html += `
            <div class="detail-website">
                <a href="${prod.web.siteWeb}" target="_blank" rel="noopener" class="detail-website-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    Accéder au site web
                </a>
            </div>
        `;
    }
    
    html += `<div class="detail-info">`;
    
    if (prod.frequence) {
        html += `
            <div class="detail-info-item">
                <span class="detail-info-icon">🗓️</span>
                <div class="detail-info-content">
                    <div class="detail-info-label">Fréquence</div>
                    <div class="detail-info-value">${prod.frequence}</div>
                </div>
            </div>
        `;
    }
    
    if (prod.societe && prod.societe !== prod.nom) {
        html += `
            <div class="detail-info-item">
                <span class="detail-info-icon">🏢</span>
                <div class="detail-info-content">
                    <div class="detail-info-label">Société</div>
                    <div class="detail-info-value">${prod.societe}</div>
                </div>
            </div>
        `;
    }
    
    if (prod.localisation?.adresse) {
        html += `
            <div class="detail-info-item full-width">
                <span class="detail-info-icon">📍</span>
                <div class="detail-info-content">
                    <div class="detail-info-label">Localisation</div>
                    <div class="detail-info-value">${prod.localisation.adresse}</div>
                </div>
            </div>
        `;
    }
    
    if (prod.infos) {
        html += `
            <div class="detail-info-item full-width">
                <span class="detail-info-icon">ℹ️</span>
                <div class="detail-info-content">
                    <div class="detail-info-label">Informations</div>
                    <div class="detail-info-value">${prod.infos}</div>
                </div>
            </div>
        `;
    }
    
    html += `</div>`;
    
    showModal(html);
}

function showModal(content) {
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.body.style.overflow = '';
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    // Toggle vue
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentView = btn.dataset.view;
            updateViewVisibility();
            updateAll();
        });
    });
    
    // Recherche
    document.getElementById('searchInput').addEventListener('input', debounce(e => {
        state.filters.search = e.target.value;
        updateAll();
    }, 200));
    
    // Slider timeline
    document.getElementById('timelineSlider').addEventListener('input', e => {
        const year = parseInt(e.target.value);
        state.filters.yearMax = year;
        document.getElementById('yearCurrent').textContent = year;
        updateSliderProgress(year);
        updateAll();
    });
    
    // Filtre catégorie
    document.getElementById('filterCategory').addEventListener('change', e => {
        state.filters.category = e.target.value;
        updateAll();
    });
    
    // Modal
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

function updateViewVisibility() {
    const isAmaps = state.currentView === 'amaps';
    
    document.getElementById('amapsList').classList.toggle('hidden', !isAmaps);
    document.getElementById('producteursList').classList.toggle('hidden', isAmaps);
    document.getElementById('timelinePanel').classList.toggle('hidden', !isAmaps);
    document.getElementById('categoryFilter').classList.toggle('hidden', isAmaps);
}

// ============================================
// Mise à jour globale
// ============================================
function updateAll() {
    updateMap();
    if (state.currentView === 'amaps') {
        updateAmapsList();
    } else {
        updateProducteursList();
    }
}

// ============================================
// Utilitaires
// ============================================
function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '...' : str;
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Exposer les fonctions pour onclick
window.openAmapDetail = openAmapDetail;
window.openProducteurDetail = openProducteurDetail;
