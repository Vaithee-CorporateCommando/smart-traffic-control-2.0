/**
 * Routing & Geocoding Service for Smart Traffic Control 2.0
 * Connects to OpenStreetMap OSRM for actual road-following routes
 * Connects to Photon / Nominatim for global and city-wide location geocoding
 */

// In-memory cache to avoid duplicate network requests
const geocodeCache = new Map();
const routeCache = new Map();

/**
 * Search places across local network junctions and global geocoding service
 * @param {string} query - Location name, address, or landmark
 * @param {Array} localJunctions - Configured junctions in current network
 * @returns {Promise<Array>} List of place suggestions with lat/lng
 */
export async function searchPlaces(query, localJunctions = []) {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim().toLowerCase();
  const results = [];

  // 1. Search local junctions first (instant match)
  if (localJunctions && localJunctions.length > 0) {
    const localMatches = localJunctions.filter(j =>
      j.name.toLowerCase().includes(q) ||
      j.id.toLowerCase().includes(q) ||
      (j.district && j.district.toLowerCase().includes(q)) ||
      (j.landmark && j.landmark.toLowerCase().includes(q))
    );

    localMatches.forEach(j => {
      results.push({
        id: `junction-${j.id}`,
        label: `${j.id} - ${j.name}`,
        subtitle: `${j.district || 'Traffic Node'} • ${j.landmark || 'Configured Junction'}`,
        lat: j.lat,
        lng: j.lng,
        isJunction: true,
        junctionId: j.id,
        source: 'local'
      });
    });
  }

  // 2. Query open geocoding service (Photon / Komoot based on OSM)
  if (geocodeCache.has(q)) {
    return [...results, ...geocodeCache.get(q)];
  }

  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=5`;
    const res = await fetch(photonUrl);

    if (res.ok) {
      const data = await res.json();
      const apiResults = [];

      if (data && data.features) {
        data.features.forEach(f => {
          const props = f.properties || {};
          const geom = f.geometry || {};

          if (geom.coordinates && geom.coordinates.length >= 2) {
            const lng = geom.coordinates[0];
            const lat = geom.coordinates[1];

            // Build clean human-readable name & details
            const parts = [
              props.city || props.town || props.village,
              props.state,
              props.country
            ].filter(Boolean);

            apiResults.push({
              id: `geo-${f.properties.osm_id || Math.random()}`,
              label: props.name || props.street || query,
              subtitle: parts.join(', ') || 'Geocoded Location',
              lat,
              lng,
              isJunction: false,
              source: 'osm-photon'
            });
          }
        });
      }

      geocodeCache.set(q, apiResults);
      return [...results, ...apiResults];
    }
  } catch (err) {
    // If Photon is slow or offline, fallback to Nominatim
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=4`;
      const nomRes = await fetch(nomUrl, {
        headers: { 'Accept-Language': 'en' }
      });
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        const nomResults = nomData.map(item => ({
          id: `nom-${item.place_id}`,
          label: item.display_name.split(',')[0],
          subtitle: item.display_name.split(',').slice(1, 4).join(',').trim(),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          isJunction: false,
          source: 'nominatim'
        }));
        geocodeCache.set(q, nomResults);
        return [...results, ...nomResults];
      }
    } catch (e) {
      console.warn('Geocoding service unavailable:', e.message);
    }
  }

  return results;
}

/**
 * Fetch a genuine road-following route between two coordinates using OSRM
 * @param {Array<number>} origin - [lat, lng]
 * @param {Array<number>} destination - [lat, lng]
 * @returns {Promise<Object>} Route result with road-following geometry, distance, and duration
 */
export async function calculateRoadRoute(origin, destination) {
  if (!origin || !destination || origin.length < 2 || destination.length < 2) {
    return {
      success: false,
      error: 'Please specify both origin and destination coordinates.'
    };
  }

  const [lat1, lng1] = origin;
  const [lat2, lng2] = destination;

  // Basic check for identical coordinates
  const distanceApproxKm = Math.hypot(lat2 - lat1, lng2 - lng1) * 111;
  if (distanceApproxKm < 0.05) {
    return {
      success: true,
      routes: [{
        name: 'Same Location Point',
        distanceKm: 0,
        durationMins: 0,
        coordinates: [[lat1, lng1]],
        summary: 'Origin and destination are at the same point.',
        recommended: true
      }]
    };
  }

  const cacheKey = `${lat1.toFixed(5)},${lng1.toFixed(5)}_${lat2.toFixed(5)},${lng2.toFixed(5)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  try {
    // OSRM format requires: {lng1},{lat1};{lng2},{lat2}
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson&alternatives=true`;
    
    const res = await fetch(osrmUrl);
    if (!res.ok) {
      throw new Error(`OSRM HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return {
        success: false,
        error: data.message || 'No drivable road route found between these locations.'
      };
    }

    const formattedRoutes = data.routes.map((r, index) => {
      // Convert OSRM GeoJSON [lng, lat] coordinates to Leaflet [lat, lng]
      const leafletCoords = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const distanceKm = Number((r.distance / 1000).toFixed(1));
      const durationMins = Math.max(1, Math.round(r.duration / 60));
      const legSummary = r.legs?.[0]?.summary || `Route ${index + 1}`;

      return {
        id: `route-${index}`,
        name: index === 0 ? 'Fastest Road Route (Recommended)' : `Alternative via ${legSummary}`,
        distanceKm,
        durationMins,
        coordinates: leafletCoords,
        summary: legSummary,
        recommended: index === 0
      };
    });

    const result = {
      success: true,
      routes: formattedRoutes
    };

    routeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('OSRM road routing error:', err);
    return {
      success: false,
      error: 'Road routing service is currently unreachable. Please check network connection and try again.'
    };
  }
}
