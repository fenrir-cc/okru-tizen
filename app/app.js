// ==============================================================
// APP NETFLIX SMART TV - OK.RU CINE CLÁSICO
// ==============================================================

const DEFAULT_SERVER_URL = 'http://192.168.18.179:3000';
const SERVER_STORAGE_KEY = 'okru_server_url';
const FAVORITES_STORAGE_KEY = 'okru_movie_favorites';

function getServerBaseUrl() {
  const custom = localStorage.getItem(SERVER_STORAGE_KEY);
  if (custom && custom.trim().length > 0) return custom.trim();
  if (window.location.protocol.startsWith('http') && window.location.hostname === 'localhost') {
    return window.location.origin;
  }
  return DEFAULT_SERVER_URL;
}

const API = {
  get SEARCH() { return `${getServerBaseUrl()}/api/search`; },
  get TMDB_HOME() { return `${getServerBaseUrl()}/api/tmdb-classics`; }
};

// Elementos del DOM
const netflixMain = document.getElementById('netflix-main');
const heroBillboard = document.getElementById('hero-billboard');
const billboardBackdrop = document.getElementById('billboard-backdrop');
const billboardTitle = document.getElementById('billboard-title');
const billboardMatch = document.getElementById('billboard-match');
const billboardYear = document.getElementById('billboard-year');
const billboardRating = document.getElementById('billboard-rating');
const billboardOverview = document.getElementById('billboard-overview');
const btnBillboardPlay = document.getElementById('btn-billboard-play');
const btnBillboardFav = document.getElementById('btn-billboard-fav');

const rowsWrapper = document.getElementById('rows-wrapper');
const searchView = document.getElementById('search-view');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchCloseBtn = document.getElementById('search-close-btn');
const searchTitle = document.getElementById('search-title');
const searchCount = document.getElementById('search-count');
const searchGrid = document.getElementById('search-grid');

const favCounter = document.getElementById('fav-counter');
const toast = document.getElementById('toast');
const statusContainer = document.getElementById('status-container');
const statusSpinner = document.getElementById('status-spinner');
const statusText = document.getElementById('status-text');

const playerModal = document.getElementById('player-modal');
const playerHeader = document.getElementById('player-header');
const playerTitle = document.getElementById('player-title');
const okruIframe = document.getElementById('okru-iframe');
const btnBack = document.getElementById('btn-back');
const btnPlayerFav = document.getElementById('btn-player-fav');

// Elementos de Géneros y Billboard
const billboardGenres = document.getElementById('billboard-genres');
const navGenres = document.getElementById('nav-genres');
const genresPanel = document.getElementById('genres-panel');
const genresTitle = document.getElementById('genres-title');
const btnCloseGenres = document.getElementById('btn-close-genres');
const genrePills = document.querySelectorAll('.genre-pill');

// Sidebar buttons
const navSearch = document.getElementById('nav-search');
const navHome = document.getElementById('nav-home');
const navCategories = document.getElementById('nav-categories');
const navFavorites = document.getElementById('nav-favorites');
const navSettings = document.getElementById('nav-settings');

// Estado de la aplicación
let allClassics = [];
let currentGenre = 'all';
let currentFeaturedMovie = null;
let currentPlayingMovie = null;
let lastFocusedElement = null;
let toastTimeout = null;
let osdTimeout = null;
let billboardUpdateTimeout = null;
let lastNavTime = 0;
const NAV_THROTTLE_MS = 130;

// SVG del icono de corazón para reusar en tarjetas
function getHeartSvg(isFav) {
  return `
    <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24">
      <path fill="${isFav ? '#e50914' : '#ffffff'}" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
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
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    updateFavoritesCounter();
    renderFavoritesRow();
  } catch (e) {
    console.error("Error guardando favoritos:", e);
  }
}

function updateFavoritesCounter() {
  const count = getFavorites().length;
  if (favCounter) favCounter.textContent = count;
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
    favorites.splice(existingIndex, 1);
    saveFavorites(favorites);
    showToast(`Eliminado de Mi Lista 🤍`);
  } else {
    favorites.unshift({
      id: movie.id || '',
      title: movie.title,
      year: movie.year || '',
      rating: movie.rating || '',
      quality: movie.quality || 'FULL HD',
      duration: movie.duration || '',
      thumbnail: movie.thumbnail || '',
      backdrop: movie.backdrop || movie.thumbnail || '',
      overview: movie.overview || ''
    });
    saveFavorites(favorites);
    isNowFav = true;
    showToast(`Guardado en Mi Lista ❤️`);
  }

  // Actualizar botones de favoritos visuales
  document.querySelectorAll(`.card-fav-btn[data-title="${escapeAttr(movie.title)}"]`).forEach(btn => {
    btn.classList.toggle('active', isNowFav);
    btn.innerHTML = getHeartSvg(isNowFav);
  });

  if (currentFeaturedMovie && currentFeaturedMovie.title === movie.title) {
    updateHeroFavButton(isNowFav);
  }

  if (currentPlayingMovie && currentPlayingMovie.title === movie.title) {
    updatePlayerFavButton(isNowFav);
  }
}

function updateHeroFavButton(isFav) {
  if (!btnBillboardFav) return;
  if (isFav) {
    btnBillboardFav.classList.add('active');
    btnBillboardFav.innerHTML = `<span class="hero-fav-icon">❤️</span> En Mi Lista`;
  } else {
    btnBillboardFav.classList.remove('active');
    btnBillboardFav.innerHTML = `<span class="hero-fav-icon">🤍</span> Mi Lista`;
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
  initSidebar();
  initGenrePills();
  updateFavoritesCounter();
  loadNetflixHome();

  // Botones del Hero Billboard
  btnBillboardPlay.addEventListener('click', () => {
    if (currentFeaturedMovie) {
      searchAndPlayMovie(currentFeaturedMovie);
    }
  });

  btnBillboardFav.addEventListener('click', () => {
    if (currentFeaturedMovie) {
      toggleFavorite(currentFeaturedMovie);
    }
  });

  // Búsqueda
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

  searchCloseBtn.addEventListener('click', closeSearchView);

  // Reproductor
  btnBack.addEventListener('click', closePlayer);
  btnPlayerFav.addEventListener('click', () => {
    if (currentPlayingMovie) {
      toggleFavorite(currentPlayingMovie);
    }
  });
});

// -------------------------------------------------------------
// CARGA INICIAL: HOME ESTILO NETFLIX CON FILAS
// -------------------------------------------------------------

// Función para barajar elementos de forma aleatoria (Fisher-Yates)
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function loadNetflixHome() {
  showStatus('Cargando catálogo Netflix...', true);

  try {
    const res = await fetch(`${API.TMDB_HOME}?era=all`);
    allClassics = await res.json();
    hideStatus();

    // 1. Configurar una película aleatoria destacada en el Hero Billboard
    if (allClassics.length > 0) {
      const randomIndex = Math.floor(Math.random() * allClassics.length);
      setFeaturedMovie(allClassics[randomIndex]);
    }

    // 2. Renderizar carruseles horizontales con orden aleatorio dinámico
    renderNetflixRows(allClassics);
  } catch (err) {
    console.error('Error cargando catálogo:', err);
    showStatus('Error al conectar con el servidor local.', false);
  }
}

// Actualizar dinámicamente el Hero Billboard al pasar sobre una tarjeta
function setFeaturedMovie(movie) {
  currentFeaturedMovie = movie;
  const bgImg = movie.backdrop || movie.thumbnail || '';
  billboardBackdrop.style.backgroundImage = `url('${bgImg}')`;
  billboardTitle.textContent = movie.title;
  billboardYear.textContent = movie.year || '';
  billboardRating.textContent = movie.rating ? `⭐ ${movie.rating}` : '⭐ 8.0';
  
  if (billboardGenres) {
    billboardGenres.textContent = movie.genres && movie.genres.length ? movie.genres.join(' • ') : 'Cine Clásico';
  }

  // Porcentaje ficticio estilo Netflix (calculado en base al rating)
  const matchPct = Math.min(99, Math.max(88, Math.round((movie.rating || 8) * 11)));
  billboardMatch.textContent = `${matchPct}% para ti`;

  billboardOverview.textContent = movie.overview || 'Una de las grandes obras maestras de la historia del cine.';
  updateHeroFavButton(isMovieFavorite(movie));
}

// -------------------------------------------------------------
// RENDERIZADO DE FILAS Y CARRUSELES ALEATORIOS
// -------------------------------------------------------------
function renderNetflixRows(movies, genreFilter = 'all') {
  rowsWrapper.innerHTML = '';

  // 1. Si hay filtro de género activo
  if (genreFilter && genreFilter !== 'all') {
    const listToUse = movies.filter(m => m.genres && m.genres.some(g => g.toLowerCase() === genreFilter.toLowerCase()));
    
    if (listToUse.length === 0) {
      rowsWrapper.innerHTML = `<div class="status-message">No hay películas clásicas en el catálogo para el género "${genreFilter}".</div>`;
      return;
    }

    const topInGenre = [...listToUse].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const randomInGenre = shuffleArray(listToUse);

    const rowsData = [
      { id: 'row-genre-top', title: `⭐ Obras Maestras de ${genreFilter}`, list: topInGenre },
      { id: 'row-genre-all', title: `🎬 Todos los Clásicos de ${genreFilter} (${listToUse.length})`, list: randomInGenre }
    ];

    rowsData.forEach(row => createMovieRow(row));

    // Destacar la mejor película del género en el Billboard
    setFeaturedMovie(topInGenre[0]);

    const firstCard = rowsWrapper.querySelector('.movie-card');
    if (firstCard) firstCard.focus();
    return;
  }

  // 2. Modo general (Todos los géneros)
  const trending = shuffleArray(movies).slice(0, 10);
  const topRated = shuffleArray(movies.filter(m => (m.rating || 0) >= 8.2));
  const era20s30s = shuffleArray(movies.filter(m => m.era === '20s-30s'));
  const era40s50s = shuffleArray(movies.filter(m => m.era === '40s' || m.era === '50s'));
  const era60s70s = shuffleArray(movies.filter(m => m.era === '60s' || m.era === '70s'));
  const era80s90s = shuffleArray(movies.filter(m => m.era === '80s' || m.era === '90s'));
  const discover = shuffleArray(movies).slice(0, 10);

  const rowsData = [
    { id: 'row-trending', title: '🔥 Recomendadas y Tendencias de Hoy', list: trending },
    { id: 'row-favs', title: '❤️ Mi Lista', list: getFavorites(), isFavRow: true },
    { id: 'row-top', title: '⭐ Obras Maestras Aclamadas por la Crítica', list: topRated },
    { id: 'row-80-90', title: '🌆 Años 80 y 90: Cine de Culto y Ciencia Ficción', list: era80s90s },
    { id: 'row-60-70', title: '🚀 Años 60 y 70: Revolución, Suspenso y Nuevo Cine', list: era60s70s },
    { id: 'row-40-50', title: '📽️ Años 40 y 50: Obras Maestras del Cine Negro y Hollywood', list: era40s50s },
    { id: 'row-20-30', title: '🎞️ Años 20 y 30: Los Inicios del Cine y Época Dorada', list: era20s30s },
    { id: 'row-discover', title: '🎲 Joyas Cinematográficas para Descubrir', list: discover }
  ];

  rowsData.forEach(row => {
    if (row.isFavRow && row.list.length === 0) return; // No mostrar Mi Lista si está vacía
    createMovieRow(row);
  });

  // Enfocar la primera tarjeta del primer carrusel
  const firstCard = rowsWrapper.querySelector('.movie-card');
  if (firstCard) firstCard.focus();
}

function createMovieRow(rowData) {
  const rowEl = document.createElement('div');
  rowEl.className = 'movie-row';
  rowEl.id = rowData.id;

  const titleEl = document.createElement('h2');
  titleEl.className = 'row-title';
  titleEl.textContent = rowData.title;
  rowEl.appendChild(titleEl);

  const carouselEl = document.createElement('div');
  carouselEl.className = 'row-carousel';

  rowData.list.forEach(movie => {
    const card = createMovieCard(movie);
    carouselEl.appendChild(card);
  });

  rowEl.appendChild(carouselEl);
  rowsWrapper.appendChild(rowEl);
}

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card focusable';
  card.tabIndex = 0;
  card.setAttribute('data-title', movie.title);

  const isFav = isMovieFavorite(movie);
  const fallbackSvg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'%3E%3Crect width='100%25' height='100%25' fill='%23131720'/%3E%3Ctext x='50%25' y='50%25' fill='%23e50914' font-family='sans-serif' font-size='32' font-weight='bold' text-anchor='middle'%3E" + encodeURIComponent(movie.title) + "%3C/text%3E%3C/svg%3E";

  card.innerHTML = `
    <img 
      class="movie-poster" 
      src="${movie.thumbnail || fallbackSvg}" 
      alt="${escapeHtml(movie.title)}" 
      onerror="this.onerror=null; this.src='${fallbackSvg}';"
    />
    <div class="card-n-badge">N</div>
    <div class="card-badges">
      ${movie.rating ? `<span class="card-rating-badge">⭐ ${movie.rating}</span>` : ''}
      ${movie.year ? `<span class="card-year-badge">${movie.year}</span>` : ''}
    </div>
    <button class="card-fav-btn ${isFav ? 'active' : ''}" data-title="${escapeAttr(movie.title)}" title="Mi Lista">
      ${getHeartSvg(isFav)}
    </button>
  `;

  // Al enfocar una tarjeta: Actualizar Hero Billboard con suave retardo
  card.addEventListener('focus', () => {
    if (billboardUpdateTimeout) clearTimeout(billboardUpdateTimeout);
    billboardUpdateTimeout = setTimeout(() => {
      setFeaturedMovie(movie);
    }, 180);

    // Auto-scroll horizontal en el carrusel para centrar la tarjeta
    card.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
  });

  // Click en el corazón de la tarjeta
  const favBtn = card.querySelector('.card-fav-btn');
  favBtn.addEventListener('click', (e) => toggleFavorite(movie, e));

  // Click o Enter en la tarjeta: Buscar y reproducir en OK.ru
  const onSelect = () => searchAndPlayMovie(movie);
  card.addEventListener('click', onSelect);
  card.addEventListener('keydown', (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      onSelect();
    }
  });

  return card;
}

// Refrescar fila de favoritos si cambia
function renderFavoritesRow() {
  const existingFavRow = document.getElementById('row-favs');
  const favs = getFavorites();

  if (favs.length === 0) {
    if (existingFavRow) existingFavRow.remove();
    return;
  }

  if (existingFavRow) {
    const carousel = existingFavRow.querySelector('.row-carousel');
    carousel.innerHTML = '';
    favs.forEach(movie => {
      carousel.appendChild(createMovieCard(movie));
    });
  } else {
    // Insertar después de la fila top
    const rowEl = document.createElement('div');
    rowEl.className = 'movie-row';
    rowEl.id = 'row-favs';
    rowEl.innerHTML = `<h2 class="row-title">❤️ Mi Lista</h2><div class="row-carousel"></div>`;
    const carousel = rowEl.querySelector('.row-carousel');
    favs.forEach(movie => {
      carousel.appendChild(createMovieCard(movie));
    });

    const rowTop = document.getElementById('row-top');
    if (rowTop && rowTop.nextSibling) {
      rowsWrapper.insertBefore(rowEl, rowTop.nextSibling);
    } else {
      rowsWrapper.prepend(rowEl);
    }
  }
}

// -------------------------------------------------------------
// BÚSQUEDA Y TRANSICIÓN A OK.RU
// -------------------------------------------------------------
function searchAndPlayMovie(movie) {
  const query = movie.year ? `${movie.title} ${movie.year}` : movie.title;
  searchInput.value = query;
  searchCustomQuery(query);
}

async function searchCustomQuery(query) {
  openSearchView();
  searchTitle.textContent = `Películas completas para: "${query}"`;
  searchCount.textContent = 'Buscando en OK.ru...';
  searchGrid.innerHTML = '';
  showStatus(`Buscando películas completas de "${query}" en OK.ru...`, true);

  try {
    const res = await fetch(`${API.SEARCH}?q=${encodeURIComponent(query)}`);
    const movies = await res.json();
    hideStatus();

    searchCount.textContent = `${movies.length} disponibles`;
    renderSearchGrid(movies);
  } catch (err) {
    console.error('Error buscando:', err);
    showStatus('Error al conectar con OK.ru. Verifica el servidor local.', false);
  }
}

function openSearchView() {
  if (genresPanel) genresPanel.classList.add('hidden');
  heroBillboard.classList.add('hidden');
  rowsWrapper.classList.add('hidden');
  searchView.classList.remove('hidden');
  searchInput.focus();
}

function closeSearchView() {
  searchView.classList.add('hidden');
  heroBillboard.classList.remove('hidden');
  rowsWrapper.classList.remove('hidden');
  hideStatus();
  
  const firstCard = rowsWrapper.querySelector('.movie-card');
  if (firstCard) firstCard.focus();
}

function toggleGenresPanel(show = null) {
  if (!genresPanel) return;
  const shouldOpen = show !== null ? show : genresPanel.classList.contains('hidden');
  if (shouldOpen) {
    genresPanel.classList.remove('hidden');
    genresPanel.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    const activePill = genresPanel.querySelector('.genre-pill.active') || genresPanel.querySelector('.genre-pill');
    if (activePill) activePill.focus();
  } else {
    genresPanel.classList.add('hidden');
  }
}

function updateGenrePillsUI(activeGenre) {
  if (!genrePills) return;
  genrePills.forEach(pill => {
    const g = pill.getAttribute('data-genre');
    if (g === activeGenre) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

function selectGenre(genre) {
  currentGenre = genre;
  updateGenrePillsUI(genre);
  renderNetflixRows(allClassics, genre);
  if (genre === 'all') {
    showToast('Mostrando todos los géneros');
  } else {
    showToast(`Filtrado por: ${genre}`);
  }
}

function initGenrePills() {
  if (!genrePills) return;

  genrePills.forEach(pill => {
    const g = pill.getAttribute('data-genre');
    const onSelect = () => {
      selectGenre(g);
    };

    pill.addEventListener('click', onSelect);
    pill.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        onSelect();
      }
    });
  });

  if (btnCloseGenres) {
    const onClose = () => {
      toggleGenresPanel(false);
      if (currentGenre !== 'all') {
        selectGenre('all');
      }
      const firstCard = rowsWrapper.querySelector('.movie-card');
      if (firstCard) firstCard.focus();
    };

    btnCloseGenres.addEventListener('click', onClose);
    btnCloseGenres.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        onClose();
      }
    });
  }
}

function renderSearchGrid(movies) {
  searchGrid.innerHTML = '';

  if (!movies || movies.length === 0) {
    showStatus('No se encontraron copias completas en OK.ru para este título.', false);
    return;
  }

  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'okru-result-card focusable';
    card.tabIndex = 0;

    const qualityClass = getBadgeClass(movie.quality);

    card.innerHTML = `
      <div class="okru-thumb-wrapper">
        <img class="okru-thumb" src="${movie.thumbnail || ''}" alt="${escapeHtml(movie.title)}" onerror="this.src='https://via.placeholder.com/640x360/14181f/ffffff?text=OK.ru';" />
        <span class="okru-quality-tag ${qualityClass}">${movie.quality || 'HD'}</span>
        ${movie.duration ? `<span class="okru-duration-tag">${movie.duration}</span>` : ''}
      </div>
      <div class="okru-info">
        <h3 class="okru-title">${escapeHtml(movie.title)}</h3>
        <div class="okru-meta">
          <span>${escapeHtml(movie.author || 'OK.ru')}</span>
          <span>${movie.resolution || ''}</span>
        </div>
      </div>
    `;

    const onPlay = () => openPlayer(movie);
    card.addEventListener('click', onPlay);
    card.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        onPlay();
      }
    });

    searchGrid.appendChild(card);
  });

  const first = searchGrid.querySelector('.okru-result-card');
  if (first) first.focus();
}

// -------------------------------------------------------------
// SIDEBAR VERTICAL
// -------------------------------------------------------------
function initSidebar() {
  navSearch.addEventListener('click', () => {
    openSearchView();
  });

  navHome.addEventListener('click', () => {
    closeSearchView();
    if (currentGenre !== 'all') {
      selectGenre('all');
    }
    toggleGenresPanel(false);
    netflixMain.scrollTo({ top: 0, behavior: 'auto' });
    const firstCard = rowsWrapper.querySelector('.movie-card');
    if (firstCard) firstCard.focus();
  });

  if (navGenres) {
    navGenres.addEventListener('click', () => {
      closeSearchView();
      toggleGenresPanel();
    });
  }

  navCategories.addEventListener('click', () => {
    closeSearchView();
    toggleGenresPanel(false);
    const row2030 = document.getElementById('row-20-30');
    if (row2030) {
      row2030.scrollIntoView({ behavior: 'auto', block: 'start' });
      const card = row2030.querySelector('.movie-card');
      if (card) card.focus();
    }
  });

  navFavorites.addEventListener('click', () => {
    closeSearchView();
    toggleGenresPanel(false);
    const rowFavs = document.getElementById('row-favs');
    if (rowFavs) {
      rowFavs.scrollIntoView({ behavior: 'auto', block: 'start' });
      const card = rowFavs.querySelector('.movie-card');
      if (card) card.focus();
    } else {
      showToast('Aún no tienes películas guardadas en Mi Lista ❤️');
    }
  });

  navSettings.addEventListener('click', () => {
    const current = getServerBaseUrl();
    const newUrl = prompt("Configurar IP del Servidor PC (ej: http://192.168.18.179:3000):", current);
    if (newUrl !== null && newUrl.trim() !== '') {
      const clean = newUrl.trim().replace(/\/+$/, '');
      localStorage.setItem(SERVER_STORAGE_KEY, clean);
      showToast(`Servidor configurado: ${clean}`);
      loadNetflixHome();
    }
  });
}

// -------------------------------------------------------------
// REPRODUCTOR MODAL A PANTALLA COMPLETA
// -------------------------------------------------------------
function showPlayerOsd() {
  if (!playerHeader) return;
  playerHeader.classList.remove('osd-hidden');
  if (osdTimeout) clearTimeout(osdTimeout);
  osdTimeout = setTimeout(() => {
    if (!playerModal.classList.contains('hidden')) {
      playerHeader.classList.add('osd-hidden');
    }
  }, 3500);
}

function openPlayer(movie) {
  lastFocusedElement = document.activeElement;
  currentPlayingMovie = movie;

  playerTitle.textContent = `${movie.title} [${movie.quality || 'FULL HD'}]`;
  okruIframe.src = `https://ok.ru/videoembed/${movie.id}?autoplay=1`;

  updatePlayerFavButton(isMovieFavorite(movie));

  playerModal.classList.remove('hidden');
  showPlayerOsd();
  btnBack.focus();

  try {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } catch (err) {}
}

function updatePlayerFavButton(isFav) {
  if (!btnPlayerFav) return;
  if (isFav) {
    btnPlayerFav.classList.add('active');
    btnPlayerFav.textContent = '❤️ En Mi Lista';
  } else {
    btnPlayerFav.classList.remove('active');
    btnPlayerFav.textContent = '🤍 Mi Lista';
  }
}

function closePlayer() {
  if (osdTimeout) clearTimeout(osdTimeout);
  if (playerHeader) playerHeader.classList.remove('osd-hidden');

  okruIframe.src = '';
  playerModal.classList.add('hidden');
  currentPlayingMovie = null;

  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  } catch (err) {}

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

// -------------------------------------------------------------
// CONTROL REMOTO SMART TV
// -------------------------------------------------------------
function registerTizenKeys() {
  if (window.tizen && window.tizen.tvinputdevice) {
    const keys = ['Return', 'Exit', 'MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop'];
    keys.forEach(k => {
      try { window.tizen.tvinputdevice.registerKey(k); } catch (err) {}
    });
  }
}

function isBackKey(e) {
  const code = e.keyCode || e.which;
  const key = e.key;
  return (
    code === 10009 ||          // Samsung Tizen Hardware Remote RETURN
    code === 27 ||             // Escape
    code === 8 ||              // Backspace
    code === 461 ||            // LG webOS / Smart TV generic back
    key === 'GoBack' ||
    key === 'Back' ||
    key === 'Escape'
  );
}

function handleBackAction() {
  // 1. Si el reproductor está abierto -> Cerrar reproductor y volver
  if (!playerModal.classList.contains('hidden')) {
    closePlayer();
    return true;
  }

  // 2. Si la vista de búsqueda está abierta -> Volver al Home de Netflix
  if (!searchView.classList.contains('hidden')) {
    closeSearchView();
    return true;
  }

  // 3. Si el panel de géneros está abierto o hay un filtro de género activo -> resetear filtro y cerrar panel
  if (genresPanel && (!genresPanel.classList.contains('hidden') || currentGenre !== 'all')) {
    if (currentGenre !== 'all') {
      selectGenre('all');
    }
    toggleGenresPanel(false);
    const firstCard = rowsWrapper.querySelector('.movie-card');
    if (firstCard) firstCard.focus();
    return true;
  }

  // 4. Si está en el Home -> Salir si corre en Tizen
  if (window.tizen && window.tizen.application) {
    try {
      window.tizen.application.getCurrentApplication().exit();
      return true;
    } catch (e) {}
  }

  return false;
}

function initRemoteKeys() {
  registerTizenKeys();

  // Evento nativo de hardware de Samsung Tizen (tizenhwkey)
  document.addEventListener('tizenhwkey', (e) => {
    if (e.keyName === 'back' || e.keyName === 'Exit' || e.keyName === 'Return') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      handleBackAction();
    }
  }, true);

  // Evento keydown capturado una sola vez en window con debounce anti-salto
  const handleKeydown = (e) => {
    if (!playerModal.classList.contains('hidden')) {
      showPlayerOsd();
    }

    if (isBackKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      handleBackAction();
      return;
    }

    const key = e.keyCode || e.which;

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
      e.stopPropagation();
      e.stopImmediatePropagation();

      const now = Date.now();
      if (now - lastNavTime < NAV_THROTTLE_MS) {
        return;
      }
      lastNavTime = now;

      navigateSpatial(directions[key]);
    }
  };

  window.addEventListener('keydown', handleKeydown, true);
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
    bestCandidate.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
  }
}

function getBadgeClass(quality) {
  switch ((quality || '').toLowerCase()) {
    case '4k': return 'badge-4k';
    case '2k': return 'badge-2k';
    case '1080p': return 'badge-1080p';
    case '720p': return 'badge-720p';
    default: return 'badge-sd';
  }
}

function showStatus(text, isLoading) {
  statusText.textContent = text;
  if (isLoading) statusSpinner.classList.remove('hidden');
  else statusSpinner.classList.add('hidden');
  statusContainer.classList.remove('hidden');
}

function hideStatus() {
  statusContainer.classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
