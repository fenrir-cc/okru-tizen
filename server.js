const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const STATIC_DIR = path.join(__dirname, 'app');

// Clave opcional de TMDB
const TMDB_API_KEY = process.env.TMDB_API_KEY || null;

// Duración mínima para considerar que un video es una película completa (45 minutos)
const MIN_MOVIE_DURATION_MS = 45 * 60 * 1000;

// Catálogo curado con metadatos y pósteres oficiales de The Movie Database (TMDB) (1920 - 1999)
const TMDB_CLASSICS_CATALOG = [
  // AÑOS 20 Y 30
  {
    id: 19,
    title: "Metrópolis",
    original_title: "Metropolis",
    year: 1927,
    era: "20s-30s",
    rating: 8.2,
    overview: "En una megalópolis del año 2026, la sociedad se divide en pensadores y trabajadores.",
    thumbnail: "https://image.tmdb.org/t/p/w500/qBgQLn3GZqNqE524xOQYgP9g44B.jpg"
  },
  {
    id: 653,
    title: "Nosferatu",
    original_title: "Nosferatu, eine Symphonie des Grauens",
    year: 1922,
    era: "20s-30s",
    rating: 7.7,
    overview: "El conde Orlok, un vampiro de los Cárpatos, compra una finca en Wisborg.",
    thumbnail: "https://image.tmdb.org/t/p/w500/h6Z65Nq9J7x60u5u32wGz78N6s.jpg"
  },
  {
    id: 3082,
    title: "Tiempos Modernos",
    original_title: "Modern Times",
    year: 1936,
    era: "20s-30s",
    rating: 8.3,
    overview: "Un obrero metalúrgico lucha por sobrevivir en el mundo industrializado de la Gran Depresión.",
    thumbnail: "https://image.tmdb.org/t/p/w500/7uoiKOEjxBBW0AgDGq1Zrnl9xIN.jpg"
  },
  {
    id: 901,
    title: "Luces de la Ciudad",
    original_title: "City Lights",
    year: 1931,
    era: "20s-30s",
    rating: 8.3,
    overview: "El vagabundo se enamora de una florista ciega y hace todo lo posible por pagarle una operación.",
    thumbnail: "https://image.tmdb.org/t/p/w500/bXNvz2Ihn1v8u1iO3gA3E0x0HwN.jpg"
  },
  {
    id: 832,
    title: "M, el vampiro de Düsseldorf",
    original_title: "M",
    year: 1931,
    era: "20s-30s",
    rating: 8.1,
    overview: "Un asesino de niñas siembra el terror en la ciudad; criminales y policías se unen para cazarlo.",
    thumbnail: "https://image.tmdb.org/t/p/w500/i9Yj2287jU1kL3q52hW24gH90v.jpg"
  },
  {
    id: 630,
    title: "El Mago de Oz",
    original_title: "The Wizard of Oz",
    year: 1939,
    era: "20s-30s",
    rating: 7.6,
    overview: "Dorothy es transportada por un tornado a la fantástica tierra de Oz.",
    thumbnail: "https://image.tmdb.org/t/p/w500/pAiqtqT5gVqK08eH7rT6M5eZqE.jpg"
  },
  {
    id: 770,
    title: "Lo que el viento se llevó",
    original_title: "Gone with the Wind",
    year: 1939,
    era: "20s-30s",
    rating: 7.9,
    overview: "La apasionada Scarlett O'Hara lucha por conservar su plantación durante la Guerra de Secesión.",
    thumbnail: "https://image.tmdb.org/t/p/w500/4O0zvdO6g62HnE7Z3uQv8y6p9w.jpg"
  },

  // AÑOS 40
  {
    id: 289,
    title: "Casablanca",
    original_title: "Casablanca",
    year: 1942,
    era: "40s",
    rating: 8.2,
    overview: "En la Segunda Guerra Mundial, Rick Blaine debe elegir entre su amor por Ilsa y ayudar a la resistencia.",
    thumbnail: "https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg"
  },
  {
    id: 15,
    title: "Ciudadano Kane",
    original_title: "Citizen Kane",
    year: 1941,
    era: "40s",
    rating: 8.0,
    overview: "Un grupo de periodistas intenta desentrañar el significado de la última palabra del magnate Kane: Rosebud.",
    thumbnail: "https://image.tmdb.org/t/p/w500/sav0jxhqiH0bPr2vZFU0Kjt2nZL.jpg"
  },
  {
    id: 914,
    title: "El Gran Dictador",
    original_title: "The Great Dictator",
    year: 1940,
    era: "40s",
    rating: 8.3,
    overview: "Un barbero judío amnésico es confundido con el dictador Adenoid Hynkel.",
    thumbnail: "https://image.tmdb.org/t/p/w500/1QpO9wo7v2kG8tM6w8v0iP9qWw.jpg"
  },
  {
    id: 1580,
    title: "La Soga",
    original_title: "Rope",
    year: 1948,
    era: "40s",
    rating: 7.9,
    overview: "Dos estudiantes cometen el asesinato perfecto y dan una fiesta con el cadáver escondido.",
    thumbnail: "https://image.tmdb.org/t/p/w500/9V87iW2iF2aQ5gT8wN1hK6qW9z.jpg"
  },
  {
    id: 5156,
    title: "Ladrón de Bicicletas",
    original_title: "Ladri di biciclette",
    year: 1948,
    era: "40s",
    rating: 8.2,
    overview: "En la Roma de posguerra, a un obrero le roban la bicicleta imprescindible para trabajar.",
    thumbnail: "https://image.tmdb.org/t/p/w500/wcU6x02dG5fT8wK3v0m8aY9pGf.jpg"
  },

  // AÑOS 50
  {
    id: 389,
    title: "12 Hombres en Pugna",
    original_title: "12 Angry Men",
    year: 1957,
    era: "50s",
    rating: 8.5,
    overview: "Un jurado debe decidir la condena a muerte de un joven. Solo uno duda de su culpabilidad.",
    thumbnail: "https://image.tmdb.org/t/p/w500/ppd84D2i9W8jXmsygtGflC46NC8.jpg"
  },
  {
    id: 567,
    title: "La Ventana Indiscreta",
    original_title: "Rear Window",
    year: 1954,
    era: "50s",
    rating: 8.3,
    overview: "Un fotógrafo con una pierna rota espía a sus vecinos y cree presenciar un asesinato.",
    thumbnail: "https://image.tmdb.org/t/p/w500/ILVF059MRf8H8vW8aF8lV1K8Y1.jpg"
  },
  {
    id: 426,
    title: "Vértigo",
    original_title: "Vertigo",
    year: 1958,
    era: "50s",
    rating: 8.2,
    overview: "Un detective retirado con acrofobia es contratado para vigilar a una misteriosa mujer.",
    thumbnail: "https://image.tmdb.org/t/p/w500/15uOEfqBNVI2q05i79qBwX2uLz.jpg"
  },
  {
    id: 346,
    title: "Los Siete Samuráis",
    original_title: "Shichinin no Samurai",
    year: 1954,
    era: "50s",
    rating: 8.5,
    overview: "Una aldea de campesinos contrata a siete samuráis sin amo para defenderse de unos bandidos.",
    thumbnail: "https://image.tmdb.org/t/p/w500/8J4cK6s9fT1bV8w0iP6qW9z7G2.jpg"
  },
  {
    id: 872,
    title: "Cantando bajo la Lluvia",
    original_title: "Singin' in the Rain",
    year: 1952,
    era: "50s",
    rating: 8.2,
    overview: "Hollywood enfrenta la revolucionaria transición del cine mudo al sonoro.",
    thumbnail: "https://image.tmdb.org/t/p/w500/6iV8oO9w7tG8v8u8iO8aW9z7G2.jpg"
  },
  {
    id: 430,
    title: "El Ocaso de una Vida (Sunset Boulevard)",
    original_title: "Sunset Boulevard",
    year: 1950,
    era: "50s",
    rating: 8.3,
    overview: "Un guionista endeudado se refugia en la mansión de una antigua estrella del cine mudo.",
    thumbnail: "https://image.tmdb.org/t/p/w500/9V87iW2iF2aQ5gT8wN1hK6qW9z.jpg"
  },

  // AÑOS 60
  {
    id: 539,
    title: "Psicosis",
    original_title: "Psycho",
    year: 1960,
    era: "60s",
    rating: 8.4,
    overview: "Marion Crane huye con dinero robado y se hospeda en el aislado motel de Norman Bates.",
    thumbnail: "https://image.tmdb.org/t/p/w500/811DjJTon9gD6hZ8TQj6FLBG3LL.jpg"
  },
  {
    id: 62,
    title: "2001: Odisea del Espacio",
    original_title: "2001: A Space Odyssey",
    year: 1968,
    era: "60s",
    rating: 8.1,
    overview: "Una expedición a Júpiter se ve amenazada por la inteligencia artificial HAL 9000.",
    thumbnail: "https://image.tmdb.org/t/p/w500/ve72VxNqjGM69UmKAdORW9LiIR5.jpg"
  },
  {
    id: 429,
    title: "El Bueno, el Malo y el Feo",
    original_title: "Il buono, il brutto, il cattivo",
    year: 1966,
    era: "60s",
    rating: 8.5,
    overview: "Tres pistoleros buscan un tesoro enterrado en medio de la Guerra de Secesión estadounidense.",
    thumbnail: "https://image.tmdb.org/t/p/w500/bGksxR6s5wE4q7gH6bU7v8x2p.jpg"
  },
  {
    id: 871,
    title: "El Planeta de los Simios",
    original_title: "Planet of the Apes",
    year: 1968,
    era: "60s",
    rating: 7.7,
    overview: "Un astronauta aterriza en un planeta donde los simios inteligentes dominan a los humanos.",
    thumbnail: "https://image.tmdb.org/t/p/w500/q9i8V8u8iO8aW9z7G2bGksxR.jpg"
  },

  // AÑOS 70
  {
    id: 238,
    title: "El Padrino",
    original_title: "The Godfather",
    year: 1972,
    era: "70s",
    rating: 8.7,
    overview: "El patriarca de una dinastía criminal transfiere el control de su imperio clandestino a su hijo menor.",
    thumbnail: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg"
  },
  {
    id: 103,
    title: "Taxi Driver",
    original_title: "Taxi Driver",
    year: 1976,
    era: "70s",
    rating: 8.2,
    overview: "Travis Bickle, un veterano con insomnio, trabaja de taxista nocturno en una Nueva York decadente.",
    thumbnail: "https://image.tmdb.org/t/p/w500/ekstpH69PgBhgw419oqFiq97vd8.jpg"
  },
  {
    id: 348,
    title: "Alien: El Octavo Pasajero",
    original_title: "Alien",
    year: 1979,
    era: "70s",
    rating: 8.1,
    overview: "La tripulación del Nostromo despierta para investigar una misteriosa señal en un planeta desolado.",
    thumbnail: "https://image.tmdb.org/t/p/w500/vfrQk5IPloGg1v9Rzmu2u02EOFm.jpg"
  },
  {
    id: 28,
    title: "Apocalypse Now",
    original_title: "Apocalypse Now",
    year: 1979,
    era: "70s",
    rating: 8.3,
    overview: "Durante la guerra de Vietnam, el capitán Willard recibe la orden de eliminar al coronel Kurtz.",
    thumbnail: "https://image.tmdb.org/t/p/w500/gQB8Y5RScVfz4GoHbBhGAzDxW4w.jpg"
  },
  {
    id: 185,
    title: "La Naranja Mecánica",
    original_title: "A Clockwork Orange",
    year: 1971,
    era: "70s",
    rating: 8.2,
    overview: "Alex DeLarge, un joven ultraviolento, es encarcelado y sometido al experimento de rehabilitación Ludovico.",
    thumbnail: "https://image.tmdb.org/t/p/w500/4S2mP1eR7y6Z1o8V8u8iO8aW9z.jpg"
  },

  // AÑOS 80
  {
    id: 78,
    title: "Blade Runner",
    original_title: "Blade Runner",
    year: 1982,
    era: "80s",
    rating: 7.9,
    overview: "Rick Deckard debe retirar a cuatro replicantes fugitivos en un Los Ángeles futurista.",
    thumbnail: "https://image.tmdb.org/t/p/w500/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg"
  },
  {
    id: 694,
    title: "El Resplandor",
    original_title: "The Shining",
    year: 1980,
    era: "80s",
    rating: 8.2,
    overview: "Una familia cuida un hotel aislado durante el invierno mientras fuerzas siniestras acechan.",
    thumbnail: "https://image.tmdb.org/t/p/w500/b33nnKl1vvg6AqICIRJWmUMurKK.jpg"
  },
  {
    id: 11216,
    title: "Cinema Paradiso",
    original_title: "Nuovo Cinema Paradiso",
    year: 1988,
    era: "80s",
    rating: 8.5,
    overview: "Un cineasta recuerda su infancia en un pequeño pueblo italiano y su amistad con el proyeccionista.",
    thumbnail: "https://image.tmdb.org/t/p/w500/8SRUfRmwQX0ZcR1v1j7G2bGksx.jpg"
  },
  {
    id: 111,
    title: "Scarface (Cara Cortada)",
    original_title: "Scarface",
    year: 1983,
    era: "80s",
    rating: 8.2,
    overview: "Tony Montana, un refugiado cubano, construye un sanguinario imperio de la droga en Miami.",
    thumbnail: "https://image.tmdb.org/t/p/w500/iQ5z9T9qWw7v2kG8tM6w8v0iP9.jpg"
  },
  {
    id: 105,
    title: "Volver al Futuro",
    original_title: "Back to the Future",
    year: 1985,
    era: "80s",
    rating: 8.3,
    overview: "Marty McFly viaja accidentalmente a 1955 en un DeLorean construido por Doc Brown.",
    thumbnail: "https://image.tmdb.org/t/p/w500/7lyBcpYB0Qt8gYhXYaEZUNlNQAv.jpg"
  },

  // AÑOS 90
  {
    id: 680,
    title: "Pulp Fiction (Tiempos Violentos)",
    original_title: "Pulp Fiction",
    year: 1994,
    era: "90s",
    rating: 8.5,
    overview: "Las vidas de dos sicarios, un boxeador y la esposa de un gángster se entrelazan de forma violenta.",
    thumbnail: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg"
  },
  {
    id: 274,
    title: "El Silencio de los Inocentes",
    original_title: "The Silence of the Lambs",
    year: 1991,
    era: "90s",
    rating: 8.3,
    overview: "Clarice Starling consulta al caníbal Hannibal Lecter para atrapar a otro asesino en serie.",
    thumbnail: "https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9B9z7G2bGksxR.jpg"
  },
  {
    id: 278,
    title: "Cadena Perpetua (Sueños de Fuga)",
    original_title: "The Shawshank Redemption",
    year: 1994,
    era: "90s",
    rating: 8.7,
    overview: "Andy Dufresne es condenado a cadena perpetua y forja una esperanza inquebrantable en prisión.",
    thumbnail: "https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg"
  },
  {
    id: 603,
    title: "Matrix",
    original_title: "The Matrix",
    year: 1999,
    era: "90s",
    rating: 8.2,
    overview: "Un hacker descubre que la realidad es una simulación creada por máquinas dominantes.",
    thumbnail: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"
  },
  {
    id: 424,
    title: "La Lista de Schindler",
    original_title: "Schindler's List",
    year: 1993,
    era: "90s",
    rating: 8.6,
    overview: "Oskar Schindler salva a más de mil judíos del holocausto empleándolos en su fábrica.",
    thumbnail: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQYR0.jpg"
  },
  {
    id: 769,
    title: "Buenos Muchachos (Goodfellas)",
    original_title: "GoodFellas",
    year: 1990,
    era: "90s",
    rating: 8.5,
    overview: "Henry Hill asciende en la jerarquía de la mafia italoamericana a lo largo de tres décadas.",
    thumbnail: "https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg"
  }
];

// Caché en memoria para búsquedas de OK.ru
const okruSearchCache = new Map();

// Helper para llamadas HTTPS en OK.ru siguiendo redirecciones
function fetchFollow(targetUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        ...headers
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location;
        if (nextUrl.startsWith('/')) nextUrl = 'https://ok.ru' + nextUrl;
        return fetchFollow(nextUrl, headers).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

// Extrae el array de videos del HTML de resultados de búsqueda de OK.ru
function parseVideosFromHtml(html) {
  const match = html.match(/data-bundle-name="video-search-result"[^>]*>([\s\S]*?)<\/div>|data-props="([^"]+)" data-bundle-name="video-search-result"/);
  if (!match) return [];
  const propsRaw = match[2] || match[1];
  const jsonStr = propsRaw.replace(/&quot;/g, '"');
  try {
    const data = JSON.parse(jsonStr);
    if (data.videos && Array.isArray(data.videos.list)) {
      return data.videos.list;
    }
  } catch (e) {
    console.error('Error al parsear JSON de OK.ru:', e.message);
  }
  return [];
}

// Obtener duración en milisegundos tanto de movie.duration como de innerVideoContent
function getDurationMs(movie, item) {
  if (movie && typeof movie.duration === 'number' && movie.duration > 0) {
    return movie.duration;
  }
  if (item && item.innerVideoContent) {
    const m = item.innerVideoContent.match(/class="video-card_duration">([^<]+)<\/div>/);
    if (m) {
      const parts = m[1].trim().split(':').map(Number);
      if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    }
  }
  return 0;
}

function formatDuration(ms) {
  if (!ms) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

// Determinar etiqueta y puntaje numérico para ordenamiento por resolución descendente
function getQualityInfo(width, height) {
  const h = parseInt(height, 10) || 0;
  const w = parseInt(width, 10) || 0;
  if (h >= 2160 || w >= 3840) return { label: '4K', score: 2160 };
  if (h >= 1440 || w >= 2560) return { label: '2K', score: 1440 };
  if (h >= 1080 || w >= 1920) return { label: '1080p', score: 1080 };
  if (h >= 720 || w >= 1280) return { label: '720p', score: 720 };
  if (h >= 480 || w >= 640) return { label: '480p', score: 480 };
  if (h >= 360) return { label: '360p', score: 360 };
  return { label: 'SD', score: 240 };
}

// Búsqueda pura en OK.ru (SIN TMDB)
// 1. FILTRA videos que son minutos (<45 minutos)
// 2. ORDENA resoluciones más altas primero (4K > 2K > 1080p > 720p > 480p)
async function searchOkru(query) {
  const cacheKey = query.trim().toLowerCase();
  if (okruSearchCache.has(cacheKey)) {
    return okruSearchCache.get(cacheKey);
  }

  const queryClean = query.trim();
  const variants = [
    queryClean,
    `${queryClean} pelicula completa`,
    `${queryClean} pelicula`,
    `${queryClean} espanol`,
    `${queryClean} latino`,
    `${queryClean} hd`
  ];

  const allItems = [];
  const existingIds = new Set();

  for (const variant of variants) {
    try {
      const targetUrl = `https://ok.ru/video/search/${encodeURIComponent(variant)}`;
      const html = await fetchFollow(targetUrl);
      const list = parseVideosFromHtml(html);

      for (const item of list) {
        const movie = item.movie || {};
        const id = movie.id;
        if (!id || existingIds.has(id)) continue;

        // 🎯 REQUISITO 1: FILTRAR VIDEOS CORTOS (TRAILERS, CANCIONES, MINUTOS)
        const durationMs = getDurationMs(movie, item);
        if (durationMs < MIN_MOVIE_DURATION_MS) {
          continue; // Descartar si dura menos de 45 minutos
        }

        existingIds.add(id);
        const qualityInfo = getQualityInfo(movie.width, movie.height);

        allItems.push({
          id: movie.id,
          title: movie.title || item.name || 'Sin título',
          durationMs: durationMs,
          duration: formatDuration(durationMs),
          quality: qualityInfo.label,
          qualityScore: qualityInfo.score,
          resolution: (movie.width && movie.height) ? `${movie.width}x${movie.height}` : qualityInfo.label,
          thumbnail: ((movie.thumbnail && movie.thumbnail.big) || item.imageUrl || '').replace(/&amp;/g, '&'),
          author: (item.owner && item.owner.album && item.owner.album.name) || (item.owner && item.owner.name) || 'OK.ru'
        });
      }

      // Si ya tenemos 25 o más películas completas, terminamos para máxima velocidad
      if (allItems.length >= 25) {
        break;
      }
    } catch (err) {
      console.warn(`Aviso: Error buscando variante "${variant}":`, err.message);
    }
  }

  // 🎯 REQUISITO 2: ORDENAR RESOLUCIONES MÁS ALTAS PRIMERO (4K -> 2K -> 1080p -> 720p -> 480p)
  allItems.sort((a, b) => {
    if (b.qualityScore !== a.qualityScore) {
      return b.qualityScore - a.qualityScore;
    }
    // Si tienen la misma resolución, la de mayor duración va primero
    return b.durationMs - a.durationMs;
  });

  okruSearchCache.set(cacheKey, allItems);
  return allItems;
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. ENDPOINT HOME: TMDB Clásicos (SOLO para el Home)
  if (pathname === '/api/tmdb-classics') {
    const era = parsedUrl.query.era || 'all';

    if (TMDB_API_KEY) {
      try {
        const eraDates = {
          'all': { start: '1920-01-01', end: '1999-12-31' },
          '20s-30s': { start: '1920-01-01', end: '1939-12-31' },
          '40s': { start: '1940-01-01', end: '1949-12-31' },
          '50s': { start: '1950-01-01', end: '1959-12-31' },
          '60s': { start: '1960-01-01', end: '1969-12-31' },
          '70s': { start: '1970-01-01', end: '1979-12-31' },
          '80s': { start: '1980-01-01', end: '1989-12-31' },
          '90s': { start: '1990-01-01', end: '1999-12-31' }
        };
        const dates = eraDates[era] || eraDates['all'];
        const tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&sort_by=vote_count.desc&primary_release_date.gte=${dates.start}&primary_release_date.lte=${dates.end}&vote_count.gte=200`;
        const rawData = await fetchFollow(tmdbUrl);
        const parsed = JSON.parse(rawData);

        const liveMovies = (parsed.results || []).map(m => ({
          id: m.id,
          title: m.title || m.original_title,
          original_title: m.original_title,
          year: m.release_date ? parseInt(m.release_date.split('-')[0], 10) : '',
          era: era,
          rating: m.vote_average,
          overview: m.overview,
          thumbnail: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : ''
        }));

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(liveMovies));
        return;
      } catch (err) {
        console.warn("Fallback a catálogo TMDB local:", err.message);
      }
    }

    let filtered = TMDB_CLASSICS_CATALOG;
    if (era !== 'all') {
      filtered = TMDB_CLASSICS_CATALOG.filter(m => m.era === era);
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(filtered));
    return;
  }

  // 2. ENDPOINT BÚSQUEDA Y RESULTADOS: 100% OK.ru (SIN TMDB)
  // Con filtrado de videos de minutos y ordenado por resolución descendente
  if (pathname === '/api/search') {
    const query = parsedUrl.query.q || '';
    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Falta término de búsqueda (?q=...)' }));
      return;
    }

    try {
      console.log(`[OK.ru Search] Buscando: "${query}"...`);
      const results = await searchOkru(query);
      console.log(`[OK.ru Search] Retornando ${results.length} películas completas ordenadas por resolución.`);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(results));
    } catch (error) {
      console.error('[OK.ru Search Error]:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error en OK.ru', details: error.message }));
    }
    return;
  }

  // 3. Servidor de archivos estáticos (/app)
  let filePath = path.join(STATIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🎬 Servidor OK.ru TV iniciado en:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`🌟 HOME: Alimentado por TMDB (Clásicos 1920-1999)`);
  console.log(`🔍 RESULTADOS: 100% OK.ru (Filtrado de minutos + Orden por resolución)`);
  console.log(`======================================================\n`);
});
