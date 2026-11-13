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
  get TMDB_HOME() { return `${getServerBaseUrl()}/api/tmdb-classics`; },
  get TMDB_COLLECTIONS() { return `${getServerBaseUrl()}/api/tmdb-collections`; }
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
const rowsSlider = document.getElementById('rows-slider');
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

// Elementos de Colecciones TMDB
const navCollections = document.getElementById('nav-collections');
const collectionView = document.getElementById('collection-view');
const collectionBackdrop = document.getElementById('collection-backdrop');
const collectionTitle = document.getElementById('collection-title');
const collectionCount = document.getElementById('collection-count');
const collectionOverview = document.getElementById('collection-overview');
const collectionPartsCarousel = document.getElementById('collection-parts-carousel');
const btnCloseCollection = document.getElementById('btn-close-collection');

// Sidebar buttons
const navSearch = document.getElementById('nav-search');
const navHome = document.getElementById('nav-home');
const navCategories = document.getElementById('nav-categories');
const navFavorites = document.getElementById('nav-favorites');
const navSettings = document.getElementById('nav-settings');

// Estado de la aplicación
let allClassics = [];
let allCollections = [];
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
      <path fill="${isFav ? '#ee8208' : '#ffffff'}" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
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

  // Colecciones
  if (btnCloseCollection) {
    btnCloseCollection.addEventListener('click', closeCollectionView);
  }

  // Reproductor
  btnBack.addEventListener('click', closePlayer);
  btnPlayerFav.addEventListener('click', () => {
    if (currentPlayingMovie) {
      toggleFavorite(currentPlayingMovie);
    }
  });
});

// -------------------------------------------------------------
// CARGA INICIAL: HOME ESTILO OK.RU CON FILAS Y COLECCIONES
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
  showStatus('Cargando catálogo OK.ru & Colecciones TMDB...', true);

  try {
    const [classicsRes, collectionsRes] = await Promise.all([
      fetch(`${API.TMDB_HOME}?era=all`),
      fetch(API.TMDB_COLLECTIONS).catch(() => null)
    ]);

    allClassics = await classicsRes.json();
    if (collectionsRes && collectionsRes.ok) {
      try {
        allCollections = await collectionsRes.json();
      } catch (e) {
        allCollections = [];
      }
    }
    hideStatus();

    // 1. Configurar una película aleatoria destacada en el Hero Billboard
    if (allClassics.length > 0) {
      const randomIndex = Math.floor(Math.random() * allClassics.length);
      setFeaturedMovie(allClassics[randomIndex]);
    }

    // 2. Renderizar carruseles horizontales con orden aleatorio dinámico
    renderNetflixRows(allClassics, currentGenre);
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

  // Porcentaje estilo OK.ru (calculado en base al rating)
  const matchPct = Math.min(99, Math.max(88, Math.round((movie.rating || 8) * 11)));
  billboardMatch.textContent = `${matchPct}% para ti`;

  billboardOverview.textContent = movie.overview || 'Una de las grandes obras maestras de la historia del cine.';
  updateHeroFavButton(isMovieFavorite(movie));
}

// -------------------------------------------------------------
// RENDERIZADO DE FILAS Y CARRUSELES ALEATORIOS
// -------------------------------------------------------------
function renderNetflixRows(movies, genreFilter = 'all') {
  const container = rowsSlider || rowsWrapper;
  container.innerHTML = '';
  if (rowsSlider) rowsSlider.style.transform = 'translateY(0px)';

  // 1. Si hay filtro de género activo
  if (genreFilter && genreFilter !== 'all') {
    const listToUse = movies.filter(m => m.genres && m.genres.some(g => g.toLowerCase() === genreFilter.toLowerCase()));
    
    if (listToUse.length === 0) {
      container.innerHTML = `<div class="status-message">No hay películas clásicas en el catálogo para el género "${genreFilter}".</div>`;
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

    const firstCard = container.querySelector('.movie-card');
    if (firstCard) firstCard.focus();
    return;
  }

  // 2. Modo general (Todos los géneros y colecciones)
  const trending = shuffleArray(movies).slice(0, 10);
  const topRated = shuffleArray(movies.filter(m => (m.rating || 0) >= 8.2));
  const era20s30s = shuffleArray(movies.filter(m => m.era === '20s-30s'));
  const era40s50s = shuffleArray(movies.filter(m => m.era === '40s' || m.era === '50s'));
  const era60s70s = shuffleArray(movies.filter(m => m.era === '60s' || m.era === '70s'));
  const era80s90s = shuffleArray(movies.filter(m => m.era === '80s' || m.era === '90s'));
  const discover = shuffleArray(movies).slice(0, 10);

  const rowsData = [
    { id: 'row-trending', title: '🔥 Recomendadas y Tendencias de Hoy', list: trending },
    { id: 'row-collections', title: '🏛️ Grandes Colecciones y Sagas de TMDB', list: allCollections, isCollectionRow: true },
    { id: 'row-favs', title: '❤️ Mi Lista', list: getFavorites(), isFavRow: true },
    { id: 'row-top', title: '⭐ Obras Maestras Aclamadas por la Crítica', list: topRated },
    { id: 'row-80-90', title: '🌆 Años 80 y 90: Cine de Culto y Ciencia Ficción', list: era80s90s },
    { id: 'row-60-70', title: '🚀 Años 60 y 70: Revolución, Suspenso y Nuevo Cine', list: era60s70s },
    { id: 'row-40-50', title: '📽️ Años 40 y 50: Obras Maestras del Cine Negro y Hollywood', list: era40s50s },
    { id: 'row-20-30', title: '🎞️ Años 20 y 30: Los Inicios del Cine y Época Dorada', list: era20s30s },
    { id: 'row-discover', title: '🎲 Joyas Cinematográficas para Descubrir', list: discover }
  ];

  rowsData.forEach(row => {
    if (row.isFavRow && row.list.length === 0) return;
    if (row.isCollectionRow && (!row.list || row.list.length === 0)) return;
    createMovieRow(row);
  });

  // Enfocar la primera tarjeta del primer carrusel
  const firstCard = container.querySelector('.movie-card, .collection-card');
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

  if (rowData.isCollectionRow) {
    rowData.list.forEach(col => {
      const card = createCollectionCard(col);
      carouselEl.appendChild(card);
    });
  } else {
    rowData.list.forEach(movie => {
      const card = createMovieCard(movie);
      carouselEl.appendChild(card);
    });
  }

  rowEl.appendChild(carouselEl);
  const targetContainer = rowsSlider || rowsWrapper;
  targetContainer.appendChild(rowEl);
}

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card focusable';
  card.tabIndex = 0;
  card.setAttribute('data-title', movie.title);

  const isFav = isMovieFavorite(movie);
  const fallbackSvg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'%3E%3Crect width='100%25' height='100%25' fill='%23131720'/%3E%3Ctext x='50%25' y='50%25' fill='%23ee8208' font-family='sans-serif' font-size='32' font-weight='bold' text-anchor='middle'%3E" + encodeURIComponent(movie.title) + "%3C/text%3E%3C/svg%3E";

  card.innerHTML = `
    <img 
      class="movie-poster" 
      src="${movie.thumbnail || fallbackSvg}" 
      alt="${escapeHtml(movie.title)}" 
      onerror="this.onerror=null; this.src='${fallbackSvg}';"
    />
    <div class="card-ok-badge">OK</div>
    <div class="card-badges">
      ${movie.rating ? `<span class="card-rating-badge">⭐ ${movie.rating}</span>` : ''}
      ${movie.year ? `<span class="card-year-badge">${movie.year}</span>` : ''}
    </div>
    <button class="card-fav-btn ${isFav ? 'active' : ''}" data-title="${escapeAttr(movie.title)}" title="Mi Lista">
      ${getHeartSvg(isFav)}
    </button>
  `;

  // Al enfocar una tarjeta: Actualizar Hero Billboard y desplazar fila hacia arriba
  card.addEventListener('focus', () => {
    if (billboardUpdateTimeout) clearTimeout(billboardUpdateTimeout);
    billboardUpdateTimeout = setTimeout(() => {
      setFeaturedMovie(movie);
    }, 120);

    card.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });

    // Desplazamiento dinámico para que la fila activa quede visible bajo el billboard
    const parentRow = card.closest('.movie-row');
    if (parentRow && rowsSlider) {
      rowsSlider.style.transform = `translateY(-${parentRow.offsetTop}px)`;
    }
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

// Tarjeta para carrusel de colecciones
function createCollectionCard(col) {
  const card = document.createElement('div');
  card.className = 'collection-card focusable';
  card.tabIndex = 0;
  card.setAttribute('data-col-id', col.id);

  const fallbackSvg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='300' viewBox='0 0 500 300'%3E%3Crect width='100%25' height='100%25' fill='%23131720'/%3E%3Ctext x='50%25' y='50%25' fill='%23ee8208' font-family='sans-serif' font-size='28' font-weight='bold' text-anchor='middle'%3E" + encodeURIComponent(col.name) + "%3C/text%3E%3C/svg%3E";

  card.innerHTML = `
    <img 
      class="collection-card-poster" 
      src="${col.poster || col.backdrop || fallbackSvg}" 
      alt="${escapeHtml(col.name)}" 
      onerror="this.onerror=null; this.src='${fallbackSvg}';"
    />
    <div class="collection-card-gradient"></div>
    <div class="collection-card-info">
      <span class="collection-card-count">⭐ Saga • ${col.count} Películas</span>
      <h3 class="collection-card-title">${escapeHtml(col.name)}</h3>
    </div>
  `;

  card.addEventListener('focus', () => {
    card.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });

    const parentRow = card.closest('.movie-row');
    if (parentRow && rowsSlider) {
      rowsSlider.style.transform = `translateY(-${parentRow.offsetTop}px)`;
    }
  });

  const onOpen = () => openCollectionView(col);
  card.addEventListener('click', onOpen);
  card.addEventListener('keydown', (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      onOpen();
    }
  });

  return card;
}

// -------------------------------------------------------------
// VISTA Y REPRODUCCIÓN DE COLECCIÓN TMDB
// -------------------------------------------------------------
function openCollectionView(col) {
  lastFocusedElement = document.activeElement;
  currentCollection = col;

  if (collectionBackdrop) {
    collectionBackdrop.style.backgroundImage = `url('${col.backdrop || col.poster || ''}')`;
  }
  if (collectionTitle) {
    collectionTitle.textContent = col.name;
  }
  if (collectionCount) {
    collectionCount.textContent = `⭐ ${col.count} Películas en la saga`;
  }
  if (collectionOverview) {
    collectionOverview.textContent = col.overview || 'Explora todas las entregas de esta legendaria franquicia.';
  }

  // Renderizar las entregas de la colección
  if (collectionPartsCarousel) {
    collectionPartsCarousel.innerHTML = '';
    col.movies.forEach(movie => {
      const card = createMovieCard(movie);
      collectionPartsCarousel.appendChild(card);
    });
  }

  if (collectionView) {
    collectionView.classList.remove('hidden');
    collectionView.scrollTo({ top: 0, behavior: 'auto' });
  }

  // Enfocar primera entrega o botón volver
  const firstMovie = collectionPartsCarousel ? collectionPartsCarousel.querySelector('.movie-card') : null;
  if (firstMovie) {
    firstMovie.focus();
  } else if (btnCloseCollection) {
    btnCloseCollection.focus();
  }
}

function closeCollectionView() {
  if (collectionView) {
    collectionView.classList.add('hidden');
  }
  currentCollection = null;
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  } else {
    const first = rowsWrapper.querySelector('.movie-card, .collection-card');
    if (first) first.focus();
  }
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
  if (collectionView) collectionView.classList.add('hidden');
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
  
  const firstCard = rowsWrapper.querySelector('.movie-card, .collection-card');
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
    closeCollectionView();
    if (currentGenre !== 'all') {
      selectGenre('all');
    }
    toggleGenresPanel(false);
    netflixMain.scrollTo({ top: 0, behavior: 'auto' });
    const firstCard = rowsWrapper.querySelector('.movie-card, .collection-card');
    if (firstCard) firstCard.focus();
  });

  if (navCollections) {
    navCollections.addEventListener('click', () => {
      closeSearchView();
      toggleGenresPanel(false);
      closeCollectionView();
      const rowCol = document.getElementById('row-collections');
      if (rowCol) {
        rowCol.scrollIntoView({ behavior: 'auto', block: 'start' });
        const card = rowCol.querySelector('.collection-card');
        if (card) card.focus();
      } else {
        showToast('🏛️ Sagas y Colecciones de TMDB');
      }
    });
  }

  if (navGenres) {
    navGenres.addEventListener('click', () => {
      closeSearchView();
      closeCollectionView();
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

  // 2. Si la vista de colección está abierta -> Volver al Home
  if (collectionView && !collectionView.classList.contains('hidden')) {
    closeCollectionView();
    return true;
  }

  // 3. Si la vista de búsqueda está abierta -> Volver al Home
  if (!searchView.classList.contains('hidden')) {
    closeSearchView();
    return true;
  }

  // 4. Si el panel de géneros está abierto o hay un filtro de género activo -> resetear filtro y cerrar panel
  if (genresPanel && (!genresPanel.classList.contains('hidden') || currentGenre !== 'all')) {
    if (currentGenre !== 'all') {
      selectGenre('all');
    }
    toggleGenresPanel(false);
    const firstCard = rowsWrapper.querySelector('.movie-card, .collection-card');
    if (firstCard) firstCard.focus();
    return true;
  }

  // 5. Si está en el Home -> Salir si corre en Tizen
  if (window.tizen && window.tizen.application) {
    try {
      window.tizen.application.getCurrentApplication().exit();
      return true;
    } catch (e) {}
  }

  return false;
}

// -------------------------------------------------------------
// NAVEGACIÓN INTELIGENTE ENTRE FILAS Y CARRUSELES
// -------------------------------------------------------------
function handleCardNavigation(card, direction) {
  const currentRow = card.closest('.movie-row');
  if (!currentRow) return false;

  if (direction === 'left') {
    const prevCard = card.previousElementSibling;
    if (prevCard && (prevCard.classList.contains('movie-card') || prevCard.classList.contains('collection-card'))) {
      prevCard.focus();
      return true;
    } else {
      // Ir a la barra lateral izquierda
      if (navHome) {
        navHome.focus();
        return true;
      }
    }
    return false;
  }

  if (direction === 'right') {
    const nextCard = card.nextElementSibling;
    if (nextCard && (nextCard.classList.contains('movie-card') || nextCard.classList.contains('collection-card'))) {
      nextCard.focus();
      return true;
    }
    return true; // Límite derecho
  }

  if (direction === 'down') {
    let nextRow = currentRow.nextElementSibling;
    while (nextRow && !nextRow.classList.contains('movie-row')) {
      nextRow = nextRow.nextElementSibling;
    }
    if (nextRow) {
      const cardsInNext = Array.from(nextRow.querySelectorAll('.movie-card, .collection-card'));
      if (cardsInNext.length > 0) {
        const cardRect = card.getBoundingClientRect();
        let closestCard = cardsInNext[0];
        let minDiff = Infinity;
        cardsInNext.forEach(c => {
          const diff = Math.abs(c.getBoundingClientRect().left - cardRect.left);
          if (diff < minDiff) {
            minDiff = diff;
            closestCard = c;
          }
        });
        closestCard.focus();
        return true;
      }
    }
    return false;
  }

  if (direction === 'up') {
    let prevRow = currentRow.previousElementSibling;
    while (prevRow && !prevRow.classList.contains('movie-row')) {
      prevRow = prevRow.previousElementSibling;
    }
    if (prevRow) {
      const cardsInPrev = Array.from(prevRow.querySelectorAll('.movie-card, .collection-card'));
      if (cardsInPrev.length > 0) {
        const cardRect = card.getBoundingClientRect();
        let closestCard = cardsInPrev[0];
        let minDiff = Infinity;
        cardsInPrev.forEach(c => {
          const diff = Math.abs(c.getBoundingClientRect().left - cardRect.left);
          if (diff < minDiff) {
            minDiff = diff;
            closestCard = c;
          }
        });
        closestCard.focus();
        return true;
      }
    } else {
      // Fila 0: Subir a los botones del Hero Billboard
      if (btnBillboardPlay) {
        btnBillboardPlay.focus();
        return true;
      }
    }
    return false;
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

      // 1. Navegación directa en tarjetas de carrusel (Películas y Colecciones)
      const current = document.activeElement;
      if (current && (current.classList.contains('movie-card') || current.classList.contains('collection-card'))) {
        const inCollectionModal = current.closest('#collection-view');
        if (!inCollectionModal) {
          const handled = handleCardNavigation(current, directions[key]);
          if (handled) return;
        }
      }

      // 2. Navegación desde botones del Billboard hacia abajo
      if (current === btnBillboardPlay || current === btnBillboardFav) {
        if (directions[key] === 'down') {
          const firstCard = (rowsSlider || rowsWrapper).querySelector('.movie-card, .collection-card');
          if (firstCard) {
            firstCard.focus();
            return;
          }
        } else if (directions[key] === 'left') {
          if (navHome) {
            navHome.focus();
            return;
          }
        }
      }

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
      const inColView = el.closest('#collection-view');
      if (collectionView && !collectionView.classList.contains('hidden')) {
        return inColView && el.offsetParent !== null;
      }
      return !inPlayer && !inColView && el.offsetParent !== null;
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
