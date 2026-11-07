// Configuración de endpoints (Auto-detecta si corre en PC o en Smart TV)
const DEFAULT_SERVER_URL = 'http://192.168.18.179:3000';
const SERVER_STORAGE_KEY = 'okru_server_url';

function getServerBaseUrl() {
  const custom = localStorage.getItem(SERVER_STORAGE_KEY);
  if (custom && custom.trim().length > 0) return custom.trim();
  // Si estamos en un navegador en localhost
  if (window.location.protocol.startsWith('http') && window.location.hostname === 'localhost') {
    return window.location.origin;
  }
  // En Smart TV o empaquetado, usar la IP local del PC servidor
  return DEFAULT_SERVER_URL;
}

const API = {
  get SEARCH() { return `${getServerBaseUrl()}/api/search`; },
  get TMDB_HOME() { return `${getServerBaseUrl()}/api/tmdb-classics`; }
};

// Clave para almacenamiento local de favoritos
const FAVORITES_STORAGE_KEY = 'okru_movie_favorites';

// Títulos de las épocas cinematográficas para el Home
const ERA_TITLES = {
  'all': 'Grandes Clásicos del Cine (1920 - 1999) - Recomendadas por TMDB',
  'favorites': 'Mis Películas Favoritas Guardadas',
  '20s-30s': 'Años 20 y 30: Cine Mudo y la Época Dorada Temprana',
  '40s': 'Años 40: Cine Negro y Obras Maestras',
  '50s': 'Años 50: La Era de Oro de Hollywood',
  '60s': 'Años 60: Revolución Cinematográfica y Suspenso',
  '70s': 'Años 70: Nuevo Hollywood y Grandes Dramas',
  '80s': 'Años 80: Cine de Culto, Épicas y Ciencia Ficción',
  '90s': 'Años 90: La Última Gran Década Clásica'
};

// Elementos del DOM
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const categoryButtons = document.querySelectorAll('.category-btn');
const favCounter = document.getElementById('fav-counter');
const toast = document.getElementById('toast');

const moviesGrid = document.getElementById('movies-grid');
const sectionTitle = document.getElementById('section-title');
const sectionSubtitle = document.getElementById('section-subtitle');
const resultsCount = document.getElementById('results-count');
const statusContainer = document.getElementById('status-container');
const statusSpinner = document.getElementById('status-spinner');
const statusText = document.getElementById('status-text');

const playerModal = document.getElementById('player-modal');
const playerTitle = document.getElementById('player-title');
const okruIframe = document.getElementById('okru-iframe');
const btnBack = document.getElementById('btn-back');
const btnPlayerFav = document.getElementById('btn-player-fav');

let lastFocusedElement = null;
let isHomeView = true;
let currentEra = 'all';
let currentPlayingMovie = null;
let toastTimeout = null;

// SVG del icono de corazón para reusar en tarjetas
function getHeartSvg(isFav) {
  return `
    <svg class="heart-svg" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  `;
}

// -------------------------------------------------------------
// GESTIÓN DE FAVORITOS EN LOCALSTORAGE
// -------------------------------------------------------------
function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error leyendo localStorage:", e);
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    updateFavoritesCounter();
  } catch (e) {
    console.error("Error guardando en localStorage:", e);
  }
}

function updateFavoritesCounter() {
  const count = getFavorites().length;
  if (favCounter) {
    favCounter.textContent = count;
  }
}

function isMovieFavorite(movie) {
  const favorites = getFavorites();
  return favorites.some(f => (f.id && f.id === movie.id) || (f.title && f.title.toLowerCase() === movie.title.toLowerCase()));
}

function toggleFavorite(movie, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  let favorites = getFavorites();
  const existingIndex = favorites.findIndex(f => 
    (f.id && f.id === movie.id) || (f.title && f.title.toLowerCase() === movie.title.toLowerCase())
  );

  let isNowFav = false;

  if (existingIndex >= 0) {
    // Eliminar de favoritos
    favorites.splice(existingIndex, 1);
    saveFavorites(favorites);
    showToast(`Eliminado de Favoritos 🤍`);
  } else {
    // Agregar a favoritos
    favorites.unshift({
      id: movie.id || '',
      title: movie.title,
      year: movie.year || '',
      rating: movie.rating || '',
      quality: movie.quality || 'HD',
      duration: movie.duration || '',
      resolution: movie.resolution || '',
      thumbnail: movie.thumbnail || '',
      overview: movie.overview || '',
      author: movie.author || '',
      isHomeMovie: !!movie.isHomeMovie
    });
    saveFavorites(favorites);
    isNowFav = true;
    showToast(`Guardado en Favoritos ❤️`);
  }

  // Actualizar botones de corazón en la vista actual
  document.querySelectorAll(`.movie-card[data-title="${movie.title}"] .btn-fav`).forEach(btn => {
    if (isNowFav) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Si estamos en la vista de favoritos, refrescar la lista
  if (currentEra === 'favorites') {
    loadFavoritesView();
  }

  // Si el reproductor está abierto con esta película, actualizar el botón del player
  if (currentPlayingMovie && currentPlayingMovie.title === movie.title) {
    updatePlayerFavButton(isNowFav);
  }
}

function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2200);
}

// -------------------------------------------------------------
// INICIALIZACIÓN
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initRemoteKeys();
  initCategories();
  updateFavoritesCounter();

  // 1. CARGA INICIAL: Home con las recomendadas de TMDB
  loadHomeClassics('all');

  // 2. BÚSQUEDA LIBRE DIRECTA EN OK.RU
  searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    if (q) searchCustomQuery(q);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.keyCode === 13) {
      const q = searchInput.value.trim();
      if (q) searchCustomQuery(q);
    }
  });

  btnBack.addEventListener('click', closePlayer);

  btnPlayerFav.addEventListener('click', () => {
    if (currentPlayingMovie) {
      toggleFavorite(currentPlayingMovie);
    }
  });

  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', configureServerUrl);
  }
});

function configureServerUrl() {
  const current = getServerBaseUrl();
  const newUrl = prompt("Configurar IP/URL del Servidor PC (ej: http://192.168.18.179:3000):", current);
  if (newUrl !== null && newUrl.trim() !== '') {
    const clean = newUrl.trim().replace(/\/+$/, '');
    localStorage.setItem(SERVER_STORAGE_KEY, clean);
    showToast(`Servidor configurado: ${clean}`);
    loadHomeClassics(currentEra);
  }
}

// Configurar barra de épocas y pestaña de favoritos
function initCategories() {
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const era = btn.getAttribute('data-era');
      setActiveCategory(btn);
      if (era === 'favorites') {
        loadFavoritesView();
      } else {
        loadHomeClassics(era);
      }
    });

    btn.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        const era = btn.getAttribute('data-era');
        setActiveCategory(btn);
        if (era === 'favorites') {
          loadFavoritesView();
        } else {
          loadHomeClassics(era);
        }
      }
    });
  });
}

function setActiveCategory(activeBtn) {
  categoryButtons.forEach(b => b.classList.remove('active'));
  if (activeBtn) activeBtn.classList.add('active');
}

// -------------------------------------------------------------
// VISTA HOME: RECOMENDADAS CLÁSICAS (TMDB)
// -------------------------------------------------------------
async function loadHomeClassics(era = 'all') {
  isHomeView = true;
  currentEra = era;
  sectionTitle.textContent = ERA_TITLES[era] || 'Recomendadas de Cine Clásico';
  sectionSubtitle.textContent = 'Selecciona cualquier película para buscar todas sus copias y calidades disponibles en OK.ru';
  resultsCount.textContent = '';
  moviesGrid.innerHTML = '';

  showStatus('Cargando catálogo recomendado con TMDB...', true);

  try {
    const res = await fetch(`${API.TMDB_HOME}?era=${encodeURIComponent(era)}`);
    const movies = await res.json();
    hideStatus();

    resultsCount.textContent = `${movies.length} recomendadas`;
    renderHomeMovies(movies);
  } catch (err) {
    console.error('Error cargando recomendadas de TMDB:', err);
    showStatus('Error al conectar con el catálogo de TMDB.', false);
  }
}

// Renderizar tarjetas del HOME con botón de corazón
function renderHomeMovies(movies) {
  moviesGrid.innerHTML = '';

  movies.forEach(movie => {
    movie.isHomeMovie = true;
    const card = document.createElement('div');
    card.className = 'movie-card focusable home-card';
    card.tabIndex = 0;
    card.setAttribute('data-title', movie.title);

    const isFav = isMovieFavorite(movie);

    card.innerHTML = `
      <div class="thumbnail-wrapper">
        <img 
          class="movie-poster" 
          src="${movie.thumbnail || 'https://via.placeholder.com/500x750/1a1e24/ffffff?text=TMDB'}" 
          alt="${escapeHtml(movie.title)}" 
          loading="lazy" 
        />
        <div class="badges-container">
          ${movie.year ? `<span class="year-badge">${movie.year}</span>` : ''}
          ${movie.rating ? `<span class="rating-badge">⭐ ${movie.rating}</span>` : ''}
        </div>
        <button class="btn-fav ${isFav ? 'active' : ''}" title="Guardar en favoritos" aria-label="Favorito">
          ${getHeartSvg(isFav)}
        </button>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
        <p class="movie-overview">${escapeHtml(movie.overview || '')}</p>
        <div class="movie-meta">
          <span class="tmdb-tag">TMDB Clásico</span>
          <span class="click-to-search">Presiona OK para buscar en OK.ru ➔</span>
        </div>
      </div>
    `;

    // Click en el corazón: Alternar favorito
    const heartBtn = card.querySelector('.btn-fav');
    heartBtn.addEventListener('click', (e) => toggleFavorite(movie, e));

    // Click en la tarjeta: Buscar en OK.ru (Flujo normal sin TMDB)
    const onSelect = () => {
      const searchTerms = movie.year ? `${movie.title} ${movie.year}` : movie.title;
      searchInput.value = searchTerms;
      searchCustomQuery(searchTerms);
    };

    card.addEventListener('click', onSelect);
    card.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        onSelect();
      }
    });

    moviesGrid.appendChild(card);
  });

  const first = moviesGrid.querySelector('.movie-card');
  if (first && document.activeElement !== searchInput && !document.activeElement.classList.contains('category-btn')) {
    first.focus();
  }
}

// -------------------------------------------------------------
// VISTA FAVORITOS (CARGADOS DESDE LOCALSTORAGE)
// -------------------------------------------------------------
function loadFavoritesView() {
  isHomeView = false;
  currentEra = 'favorites';
  sectionTitle.textContent = '❤️ Mis Películas Favoritas Guardadas';
  sectionSubtitle.textContent = 'Películas guardadas de forma local en este dispositivo';
  resultsCount.textContent = '';
  moviesGrid.innerHTML = '';

  const favorites = getFavorites();
  hideStatus();

  if (favorites.length === 0) {
    showStatus('Aún no tienes películas guardadas en favoritos. Pulsa el corazón ❤️ en cualquier película para agregarla aquí.', false);
    resultsCount.textContent = '0 favoritas';
    return;
  }

  resultsCount.textContent = `${favorites.length} favoritas`;

  favorites.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card focusable okru-card';
    card.tabIndex = 0;
    card.setAttribute('data-id', movie.id);
    card.setAttribute('data-title', movie.title);

    const qualityClass = getBadgeClass(movie.quality || '1080p');

    card.innerHTML = `
      <div class="thumbnail-wrapper">
        <img 
          class="movie-poster" 
          src="${movie.thumbnail || 'https://via.placeholder.com/640x360/1a1e24/ffffff?text=Favorita'}" 
          alt="${escapeHtml(movie.title)}" 
          loading="lazy" 
        />
        <div class="badges-container">
          ${movie.year ? `<span class="year-badge">${movie.year}</span>` : ''}
          <span class="quality-badge ${qualityClass}">${movie.quality || 'HD'}</span>
        </div>
        ${movie.duration ? `<span class="duration-badge">${movie.duration}</span>` : ''}
        <button class="btn-fav active" title="Eliminar de favoritos" aria-label="Favorito">
          ${getHeartSvg(true)}
        </button>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
        <div class="movie-meta">
          <span>${escapeHtml(movie.author || 'Favoritos')}</span>
          <span class="click-to-search">Reproducir ➔</span>
        </div>
      </div>
    `;

    const heartBtn = card.querySelector('.btn-fav');
    heartBtn.addEventListener('click', (e) => toggleFavorite(movie, e));

    const onPlay = () => {
      if (movie.id && movie.id.length > 5) {
        openPlayer(movie);
      } else {
        // Si fue guardada desde el Home sin ID directo, buscarla en OK.ru
        const query = movie.year ? `${movie.title} ${movie.year}` : movie.title;
        searchInput.value = query;
        searchCustomQuery(query);
      }
    };

    card.addEventListener('click', onPlay);
    card.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        onPlay();
      }
    });

    moviesGrid.appendChild(card);
  });

  const first = moviesGrid.querySelector('.movie-card');
  if (first && document.activeElement !== searchInput) {
    first.focus();
  }
}

// -------------------------------------------------------------
// VISTA RESULTADOS: 100% OK.RU (SIN USAR TMDB)
// -------------------------------------------------------------
async function searchCustomQuery(query) {
  isHomeView = false;
  currentEra = 'search';
  categoryButtons.forEach(b => b.classList.remove('active'));

  sectionTitle.textContent = `Películas completas encontradas para: "${query}"`;
  sectionSubtitle.textContent = 'Resultados de OK.ru ordenados de mayor a menor resolución (filtrados videos cortos)';
  resultsCount.textContent = '';
  moviesGrid.innerHTML = '';

  showStatus(`Buscando películas completas de "${query}" en OK.ru...`, true);

  try {
    const response = await fetch(`${API.SEARCH}?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const okruMovies = await response.json();
    hideStatus();

    resultsCount.textContent = `${okruMovies.length} películas completas`;
    renderOkruResults(okruMovies);
  } catch (err) {
    console.error('Error buscando en OK.ru:', err);
    showStatus('Error al buscar en OK.ru. Verifica que el servidor esté activo.', false);
  }
}

function renderOkruResults(movies) {
  moviesGrid.innerHTML = '';

  if (!movies || movies.length === 0) {
    showStatus('No se encontraron películas completas para este título en OK.ru.', false);
    return;
  }

  movies.forEach(movie => {
    movie.isHomeMovie = false;
    const card = document.createElement('div');
    card.className = 'movie-card focusable okru-card';
    card.tabIndex = 0;
    card.setAttribute('data-id', movie.id);
    card.setAttribute('data-title', movie.title);

    const isFav = isMovieFavorite(movie);
    const qualityClass = getBadgeClass(movie.quality);

    card.innerHTML = `
      <div class="thumbnail-wrapper">
        <img 
          class="movie-poster" 
          src="${movie.thumbnail || 'https://via.placeholder.com/640x360/1a1e24/ffffff?text=OK.ru'}" 
          alt="${escapeHtml(movie.title)}" 
          loading="lazy" 
          onerror="this.src='https://via.placeholder.com/640x360/1a1e24/ffffff?text=OK.ru';"
        />
        <div class="badges-container">
          <span class="quality-badge ${qualityClass}">${movie.quality}</span>
        </div>
        ${movie.duration ? `<span class="duration-badge">${movie.duration}</span>` : ''}
        <button class="btn-fav ${isFav ? 'active' : ''}" title="Guardar en favoritos" aria-label="Favorito">
          ${getHeartSvg(isFav)}
        </button>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
        <div class="movie-meta">
          <span>${escapeHtml(movie.author || 'OK.ru')}</span>
          <span class="movie-resolution">${movie.resolution}</span>
        </div>
      </div>
    `;

    const heartBtn = card.querySelector('.btn-fav');
    heartBtn.addEventListener('click', (e) => toggleFavorite(movie, e));

    card.addEventListener('click', () => openPlayer(movie));
    card.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        openPlayer(movie);
      }
    });

    moviesGrid.appendChild(card);
  });

  const firstCard = moviesGrid.querySelector('.movie-card');
  if (firstCard && document.activeElement !== searchInput) {
    firstCard.focus();
  }
}

// -------------------------------------------------------------
// REPRODUCTOR MODAL A PANTALLA COMPLETA
// -------------------------------------------------------------
function openPlayer(movie) {
  lastFocusedElement = document.activeElement;
  currentPlayingMovie = movie;

  playerTitle.textContent = `${movie.title} [${movie.quality || 'HD'}]`;
  okruIframe.src = `https://ok.ru/videoembed/${movie.id}?autoplay=1`;

  updatePlayerFavButton(isMovieFavorite(movie));

  playerModal.classList.remove('hidden');
  btnBack.focus();
}

function updatePlayerFavButton(isFav) {
  if (!btnPlayerFav) return;
  if (isFav) {
    btnPlayerFav.classList.add('active');
    btnPlayerFav.textContent = '❤️ En Favoritos';
  } else {
    btnPlayerFav.classList.remove('active');
    btnPlayerFav.textContent = '🤍 Guardar en Favoritos';
  }
}

function closePlayer() {
  okruIframe.src = '';
  playerModal.classList.add('hidden');
  currentPlayingMovie = null;
  if (lastFocusedElement) {
    lastFocusedElement.focus();
  } else {
    searchInput.focus();
  }
}

function getBadgeClass(quality) {
  switch ((quality || '').toLowerCase()) {
    case '4k': return 'badge-4k';
    case '2k': return 'badge-2k';
    case '1080p': return 'badge-1080p';
    case '720p': return 'badge-720p';
    case '480p': return 'badge-480p';
    default: return 'badge-sd';
  }
}

function showStatus(text, isLoading) {
  statusText.textContent = text;
  if (isLoading) {
    statusSpinner.classList.remove('hidden');
  } else {
    statusSpinner.classList.add('hidden');
  }
  statusContainer.classList.remove('hidden');
}

function hideStatus() {
  statusContainer.classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -------------------------------------------------------------
// NAVEGACIÓN ESPACIAL PARA CONTROL REMOTO DE TV (D-PAD)
// -------------------------------------------------------------
function initRemoteKeys() {
  window.addEventListener('keydown', (e) => {
    const key = e.keyCode;

    // Tecla ATRÁS / RETURN de Samsung (10009) o Escape (27)
    if (key === 10009 || key === 27) {
      if (!playerModal.classList.contains('hidden')) {
        e.preventDefault();
        closePlayer();
        return;
      }

      if (!isHomeView) {
        e.preventDefault();
        loadHomeClassics('all');
        const firstCategory = document.querySelector('.category-btn[data-era="all"]');
        if (firstCategory) setActiveCategory(firstCategory);
        return;
      }
    }

    // Tecla 'F' o 'f': Alternar favorito en la película actualmente enfocada
    if (key === 70 || key === 102) {
      const focusedCard = document.activeElement.closest('.movie-card');
      if (focusedCard) {
        const title = focusedCard.getAttribute('data-title');
        const id = focusedCard.getAttribute('data-id');
        toggleFavorite({ title, id });
        return;
      }
    }

    const directions = {
      37: 'left',
      38: 'up',
      39: 'right',
      40: 'down'
    };

    if (directions[key]) {
      if (document.activeElement === searchInput && (key === 37 || key === 39)) {
        return;
      }

      e.preventDefault();
      navigateSpatial(directions[key]);
    }
  });
}

function navigateSpatial(direction) {
  const current = document.activeElement;
  const focusables = Array.from(document.querySelectorAll('.focusable:not(.hidden)'))
    .filter(el => {
      const inPlayer = el.closest('#player-modal');
      if (!playerModal.classList.contains('hidden')) {
        return inPlayer;
      }
      return !inPlayer && el.offsetParent !== null;
    });

  if (!focusables.length) return;

  if (!current || !focusables.includes(current)) {
    focusables[0].focus();
    return;
  }

  const currentRect = current.getBoundingClientRect();
  const currentCenter = {
    x: currentRect.left + currentRect.width / 2,
    y: currentRect.top + currentRect.height / 2
  };

  let bestCandidate = null;
  let minDistance = Infinity;

  focusables.forEach(candidate => {
    if (candidate === current) return;

    const rect = candidate.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    const dx = center.x - currentCenter.x;
    const dy = center.y - currentCenter.y;

    let isValid = false;
    let distance = 0;

    switch (direction) {
      case 'left':
        isValid = dx < -10;
        distance = Math.abs(dx) + Math.abs(dy) * 2;
        break;
      case 'right':
        isValid = dx > 10;
        distance = Math.abs(dx) + Math.abs(dy) * 2;
        break;
      case 'up':
        isValid = dy < -10;
        distance = Math.abs(dy) + Math.abs(dx) * 2;
        break;
      case 'down':
        isValid = dy > 10;
        distance = Math.abs(dy) + Math.abs(dx) * 2;
        break;
    }

    if (isValid && distance < minDistance) {
      minDistance = distance;
      bestCandidate = candidate;
    }
  });

  if (bestCandidate) {
    bestCandidate.focus();
    bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
