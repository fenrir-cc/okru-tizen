# 🎬 OK.ru Películas para Samsung Smart TV (Tizen / TizenBrew)

Aplicación funcional de streaming para Smart TV Samsung y navegadores, con pantalla de inicio impulsada por **The Movie Database (TMDB)** para recomendaciones de cine clásico (1920 - 1999) y motor de búsqueda y reproducción nativo en **OK.ru** (sin TMDB en los resultados).

---

## 🌟 Arquitectura Híbrida

1. **Pantalla de Inicio (Home con TMDB):**
   * Muestra las mejores obras maestras del cine desde 1920 hasta 1999 (organizadas por décadas: *Años 20-30*, *40s*, *50s*, *60s*, *70s*, *80s*, *90s*).
   * Muestra los pósteres oficiales de TMDB, años de estreno, calificaciones (`⭐ 8.7`) y sinopsis.

2. **Flujo de Selección:**
   * Al hacer click o presionar **Enter** sobre cualquier película recomendada del Home, la app toma el título y año y entra automáticamente al **flujo normal del buscador**.

3. **Pantalla de Resultados y Reproductor (100% OK.ru - Sin TMDB):**
   * Consulta directamente los servidores de OK.ru.
   * Muestra más de 20 copias reales encontradas con sus miniaturas nativas de OK.ru.
   * **Verificación de calidad real:** Insignias de `1080p`, `4K`, `720p`, `480p` y duración (`1h 45m`).
   * Al pulsar OK/Enter en cualquier copia, se abre el reproductor a pantalla completa.

---

## 🎮 Controles con el Mando a Distancia (D-Pad)

* **Flechas:** Navegación espacial 2D entre buscador, botones de décadas y tarjetas de películas.
* **Botón Enter / OK (`13`):**
  * En el Home: Busca la película en OK.ru.
  * En los resultados de OK.ru: Abre la película en pantalla completa.
* **Botón Atrás / Return (`10009` o `Esc`):**
  * Si el reproductor está abierto: Lo cierra y regresa a la lista.
  * Si estás en los resultados de búsqueda: Regresa al Home de clásicos recomendados.

---

## 🚀 Cómo iniciar el proyecto

```bash
node server.js
```

Abre en tu navegador o TV:
👉 `http://localhost:3000` (o `http://<IP-DE-TU-PC>:3000` en la red local).
