import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Crosshair,
  Layers,
  MapPin,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  X,
  Compass,
  Navigation,
  Info,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import { MAP_CONFIG } from '../trafficData';
import { searchPlaces } from '../services/routingService';

// Fix standard marker icon URLs if any default icon is instantiated
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

export default function TrafficMap({
  containerId = null,
  junctions = [],
  roads = [],
  incidents = [],
  roadBlocks = [],
  selectedJunction = null,
  onSelectJunction = () => {},
  activeRoute = null,
  highlightedRoute = null,
  alternativeRoutes = [],
  onSelectAlternativeRoute = () => {},
  originPoint = null,
  destPoint = null,
  onClearRoute = null,
  isAdmin = false,
  onAdminAction = null,
  initialCenter = MAP_CONFIG.defaultCenter,
  initialZoom = MAP_CONFIG.defaultZoom,
  height = '100%'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  
  // Dedicated layer groups
  const layersGroupRef = useRef({
    roads: L.layerGroup(),
    junctions: L.layerGroup(),
    incidents: L.layerGroup(),
    route: L.layerGroup(),
    endpoints: L.layerGroup(),
    userLocation: L.layerGroup()
  });

  // Map settings - Clean by default! (Toggles off initially so base map is uncluttered)
  const [activeTileId, setActiveTileId] = useState('osm');
  const [showRoadsOverlay, setShowRoadsOverlay] = useState(false); // Clean by default!
  const [showIncidentsOverlay, setShowIncidentsOverlay] = useState(false); // Clean by default!
  const [showControlsMenu, setShowControlsMenu] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(initialCenter);
  const [currentZoom, setCurrentZoom] = useState(initialZoom);
  const [locatingUser, setLocatingUser] = useState(false);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Free world map navigation (no rigid bounds restricting user to Delhi)
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 2,
      maxZoom: 19,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: true
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileConf = MAP_CONFIG.providers[activeTileId] || MAP_CONFIG.providers.osm;
    const tileLayer = L.tileLayer(tileConf.url, {
      attribution: tileConf.attribution,
      maxZoom: tileConf.maxZoom || 19,
      maxNativeZoom: tileConf.maxNativeZoom || 19,
      subdomains: tileConf.subdomains || 'abc'
    });

    tileLayer.on('tileerror', (error) => {
      // Graceful fallback to standard OSM if any provider tile fails
      if (error && error.tile && tileConf.id !== 'osm' && tileConf.id !== 'street') {
        const c = error.coords;
        if (c) {
          error.tile.src = `https://tile.openstreetmap.org/${c.z}/${c.x}/${c.y}.png`;
        }
      }
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Attach layer groups
    Object.values(layersGroupRef.current).forEach(g => g.addTo(map));

    mapInstanceRef.current = map;

    map.on('move', () => {
      const c = map.getCenter();
      setCurrentCoords([Number(c.lat.toFixed(4)), Number(c.lng.toFixed(4))]);
      setCurrentZoom(map.getZoom());
    });

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    // Initial size invalidation safeguard
    const initTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(initTimer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Tile Provider Switcher
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const tileConf = MAP_CONFIG.providers[activeTileId] || MAP_CONFIG.providers.osm;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const newTileLayer = L.tileLayer(tileConf.url, {
      attribution: tileConf.attribution,
      maxZoom: tileConf.maxZoom || 19,
      maxNativeZoom: tileConf.maxNativeZoom || 19,
      subdomains: tileConf.subdomains || 'abc'
    });

    newTileLayer.on('tileerror', (error) => {
      // Graceful fallback to standard OSM if any provider tile fails
      if (error && error.tile && tileConf.id !== 'osm' && tileConf.id !== 'street') {
        const c = error.coords;
        if (c) {
          error.tile.src = `https://tile.openstreetmap.org/${c.z}/${c.x}/${c.y}.png`;
        }
      }
    });

    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [activeTileId]);

  // 3. Delegated Click Listener for popup actions
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    const handlePopupClick = (e) => {
      const target = e.target.closest('[data-admin-action]');
      if (!target) return;
      const actionType = target.getAttribute('data-admin-action');
      const jId = target.getAttribute('data-junction-id');
      if (actionType === 'MANAGE_SIGNAL' && onAdminAction) {
        onAdminAction({ type: 'MANAGE_SIGNAL', junctionId: jId });
      }
    };
    container.addEventListener('click', handlePopupClick);
    return () => container.removeEventListener('click', handlePopupClick);
  }, [onAdminAction]);

  // 4. Render Road Density Overlays (Subtle, only when explicitly enabled and not obscured by active route)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const roadGroup = layersGroupRef.current.roads;
    roadGroup.clearLayers();

    // When an active route is displayed, hide or mute road overlays so the planned route is the main focus
    if (!showRoadsOverlay) return;

    roads.forEach(road => {
      const fromJ = junctions.find(j => j.id === road.from);
      const toJ = junctions.find(j => j.id === road.to);
      if (!fromJ || !toJ || !fromJ.lat || !toJ.lat) return;

      const latlngs = [
        [fromJ.lat, fromJ.lng],
        [toJ.lat, toJ.lng]
      ];

      // Subtle, clean styling
      let color = '#10B981';
      let dashArray = null;
      let opacity = activeRoute ? 0.35 : 0.6;
      let weight = activeRoute ? 2.5 : 3.5;

      if (road.blocked) {
        color = '#DC2626';
        dashArray = '5, 5';
        opacity = 0.85;
        weight = 4;
      } else if (road.currentSpeed < road.baseSpeed * 0.45) {
        color = '#EF4444';
      } else if (road.currentSpeed < road.baseSpeed * 0.75) {
        color = '#F59E0B';
      }

      const polyline = L.polyline(latlngs, {
        color,
        weight,
        opacity,
        dashArray
      });

      polyline.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 170px;">
          <div style="font-weight: 700; color: #0A2540; margin-bottom: 2px;">${road.name}</div>
          <div style="color: #64748B; font-size: 11px; margin-bottom: 4px;">
            Link: ${fromJ.id} ➔ ${toJ.id} • ${road.lengthKm} km
          </div>
          <div>
            ${road.blocked ? `<strong style="color: #DC2626;">BLOCKED (${road.blockReason})</strong>` : `Speed: <strong>${road.currentSpeed} km/h</strong>`}
          </div>
        </div>
      `, { maxWidth: 220 });

      polyline.addTo(roadGroup);
    });
  }, [roads, junctions, showRoadsOverlay, activeRoute]);

  // 5. Render Junction Markers (Compact, minimalist vector markers)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const junctionGroup = layersGroupRef.current.junctions;
    junctionGroup.clearLayers();

    junctions.forEach(j => {
      if (!j.lat || !j.lng) return;

      const isSelected = selectedJunction?.id === j.id;
      const isGreen = j.signalState.startsWith('GREEN');
      const isOverride = j.manualOverride;

      let congestionColor = '#10B981';
      if (j.congestionLevel === 'HIGH') congestionColor = '#EF4444';
      else if (j.congestionLevel === 'MEDIUM') congestionColor = '#F59E0B';

      const signalDotColor = isOverride ? '#8B5CF6' : isGreen ? '#10B981' : '#EF4444';

      // Clean, compact 26px circle marker
      const customIcon = L.divIcon({
        className: 'custom-traffic-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isSelected ? '28px' : '24px'};
            height: ${isSelected ? '28px' : '24px'};
            background: #0A2540;
            border-radius: 50%;
            border: 2px solid ${congestionColor};
            box-shadow: 0 2px 6px rgba(10, 37, 64, 0.25)${isSelected ? `, 0 0 0 3px rgba(37, 99, 235, 0.4)` : ''};
            cursor: pointer;
            transition: all 0.15s ease;
          ">
            <div style="
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: ${signalDotColor};
              box-shadow: 0 0 4px ${signalDotColor};
            "></div>
            <span style="
              position: absolute;
              bottom: -15px;
              white-space: nowrap;
              background: rgba(15, 23, 42, 0.85);
              color: #FFFFFF;
              font-size: 9px;
              font-weight: 700;
              padding: 0 4px;
              border-radius: 6px;
              pointer-events: none;
            ">
              ${j.id}
            </span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16]
      });

      const marker = L.marker([j.lat, j.lng], { icon: customIcon });

      const adminBtn = isAdmin ? `
        <div style="margin-top: 8px; border-top: 1px solid #E2E8F0; padding-top: 6px;">
          <button data-admin-action="MANAGE_SIGNAL" data-junction-id="${j.id}" style="
            width: 100%;
            background: #0A3963;
            color: #FFF;
            border: none;
            border-radius: 5px;
            padding: 5px 8px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
          ">
            Manage Signal
          </button>
        </div>
      ` : '';

      // Compact popup that doesn't block the view
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 190px; max-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <strong style="color: #0A2540; font-size: 13px;">${j.id} - ${j.name}</strong>
            <span style="font-size: 9.5px; font-weight: 700; color: ${congestionColor};">
              ${j.congestionLevel}
            </span>
          </div>
          <div style="font-size: 10.5px; color: #64748B; margin-bottom: 5px;">
            ${j.district} • ${j.landmark || 'Intersection'}
          </div>
          <div style="font-size: 11px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 5px; padding: 5px 8px; margin-bottom: 4px;">
            <div>Phase: <strong style="color: ${signalDotColor};">${isOverride ? 'OVERRIDE' : j.signalState}</strong></div>
            <div>Queue: <strong>${j.queue} vehicles</strong></div>
          </div>
          ${adminBtn}
        </div>
      `, { maxWidth: 240 });

      marker.on('click', () => onSelectJunction(j));
      marker.addTo(junctionGroup);

      if (isSelected && !activeRoute) {
        marker.openPopup();
      }
    });
  }, [junctions, selectedJunction, isAdmin, activeRoute, onSelectJunction]);

  // 6. Render Incidents & Roadblocks (Only when toggled on)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const incGroup = layersGroupRef.current.incidents;
    incGroup.clearLayers();

    if (!showIncidentsOverlay) return;

    roadBlocks.filter(r => r.status === 'ACTIVE').forEach(rb => {
      if (!rb.lat || !rb.lng) return;
      const rbIcon = L.divIcon({
        className: 'custom-roadblock-marker',
        html: `<div style="font-size: 16px; cursor: pointer; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🚧</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      const marker = L.marker([rb.lat, rb.lng], { icon: rbIcon });
      marker.bindPopup(`
        <div style="font-size: 12px; line-height: 1.4; min-width: 180px;">
          <strong style="color: #DC2626;">🚧 Roadblock</strong>
          <div style="font-weight: 600;">${rb.roadName}</div>
          <div style="color: #64748B; font-size: 11px;">${rb.reason}</div>
        </div>
      `);
      marker.addTo(incGroup);
    });

    incidents.filter(i => i.status === 'VERIFIED_PUBLISHED').forEach(inc => {
      if (!inc.lat || !inc.lng) return;
      const incIcon = L.divIcon({
        className: 'custom-incident-marker',
        html: `<div style="font-size: 15px; cursor: pointer;">⚠️</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      const marker = L.marker([inc.lat, inc.lng], { icon: incIcon });
      marker.bindPopup(`
        <div style="font-size: 12px; line-height: 1.4; min-width: 180px;">
          <strong style="color: #D97706;">⚠️ ${inc.title}</strong>
          <div style="font-size: 11px; color: #64748B;">${inc.location}</div>
        </div>
      `);
      marker.addTo(incGroup);
    });
  }, [roadBlocks, incidents, showIncidentsOverlay]);

  // 7. Render Road-Following Route & Origin/Destination Markers (The Main Focus!)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const routeGroup = layersGroupRef.current.route;
    const endGroup = layersGroupRef.current.endpoints;
    routeGroup.clearLayers();
    endGroup.clearLayers();

    const currentRoute = activeRoute || highlightedRoute;
    if (!currentRoute) return;

    // Resolve coordinates: genuine road-following coordinates or fallback to junction coordinates
    let coords = currentRoute.coordinates;
    if ((!coords || coords.length < 2) && currentRoute.path && currentRoute.path.length >= 2) {
      coords = currentRoute.path
        .map(id => junctions.find(j => j.id === id))
        .filter(Boolean)
        .map(j => [j.lat, j.lng]);
    }

    if (!coords || coords.length < 2) {
      return;
    }

    // 7A. Alternative Routes (if present, rendered in muted soft gray)
    if (alternativeRoutes && alternativeRoutes.length > 0) {
      alternativeRoutes.forEach((alt, idx) => {
        const altCoords = alt.coordinates || (
          alt.path && alt.path.length >= 2
            ? alt.path.map(id => junctions.find(j => j.id === id)).filter(Boolean).map(j => [j.lat, j.lng])
            : null
        );
        if (!altCoords || altCoords.length < 2) return;
        const altLine = L.polyline(altCoords, {
          color: '#94A3B8',
          weight: 4,
          opacity: 0.75,
          dashArray: '6, 6'
        });
        altLine.bindPopup(`
          <div style="font-size: 12px;">
            <strong>${alt.name}</strong>
            <div>${alt.distanceKm || alt.distance} km • ${alt.durationMins || alt.duration} mins</div>
            <button id="switch-route-${idx}" style="background: #2563EB; color: #FFF; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px; cursor: pointer;">
              Select This Route
            </button>
          </div>
        `);
        altLine.on('popupopen', () => {
          const btn = document.getElementById(`switch-route-${idx}`);
          if (btn) btn.onclick = () => onSelectAlternativeRoute(alt);
        });
        altLine.addTo(routeGroup);
      });
    }

    // 7B. Active Recommended Route (High-contrast, road-following blue line with soft cyan glow)
    const haloGlow = L.polyline(coords, {
      color: '#60A5FA',
      weight: 10,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    });
    haloGlow.addTo(routeGroup);

    const primaryRouteLine = L.polyline(coords, {
      color: '#2563EB',
      weight: 5.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });

    const routeDistance = currentRoute.distanceKm !== undefined ? currentRoute.distanceKm : currentRoute.distance;
    const routeDuration = currentRoute.durationMins !== undefined ? currentRoute.durationMins : currentRoute.duration;

    primaryRouteLine.bindPopup(`
      <div style="font-family: inherit; font-size: 13px; line-height: 1.4; min-width: 200px;">
        <div style="font-weight: 700; color: #1D4ED8; font-size: 14px; margin-bottom: 2px;">
          ${currentRoute.name || 'Calculated Road Route'}
        </div>
        <div style="font-size: 13px; color: #0F172A; margin-bottom: 4px;">
          <strong>${routeDistance} km</strong> • <strong>${routeDuration} mins</strong>
        </div>
        <div style="font-size: 11.5px; color: #64748B;">
          ${currentRoute.summary ? `Via ${currentRoute.summary}` : 'Optimal road routing'}
        </div>
      </div>
    `);
    primaryRouteLine.addTo(routeGroup);

    // 7C. Distinct Origin & Destination Markers
    const startCoord = originPoint ? [originPoint.lat, originPoint.lng] : coords[0];
    const endCoord = destPoint ? [destPoint.lat, destPoint.lng] : coords[coords.length - 1];

    if (startCoord) {
      const originIcon = L.divIcon({
        className: 'route-pin-origin',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: #10B981;
            color: #FFFFFF;
            border-radius: 50%;
            border: 2px solid #FFFFFF;
            box-shadow: 0 3px 8px rgba(16, 185, 129, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 800;
          ">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const originMarker = L.marker(startCoord, { icon: originIcon });
      originMarker.bindPopup(`<strong>Origin:</strong> ${originPoint?.label || 'Start Point'}`);
      originMarker.addTo(endGroup);
    }

    if (endCoord) {
      const destIcon = L.divIcon({
        className: 'route-pin-dest',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: #EF4444;
            color: #FFFFFF;
            border-radius: 50%;
            border: 2px solid #FFFFFF;
            box-shadow: 0 3px 8px rgba(239, 68, 68, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 800;
          ">
            B
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const destMarker = L.marker(endCoord, { icon: destIcon });
      destMarker.bindPopup(`<strong>Destination:</strong> ${destPoint?.label || 'End Point'}`);
      destMarker.addTo(endGroup);
    }

    // 7D. Automatically zoom and pan to fit the entire route
    try {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } catch (e) {
      // Ignore if bounds are degenerate
    }
  }, [activeRoute, highlightedRoute, alternativeRoutes, originPoint, destPoint, junctions, onSelectAlternativeRoute]);

  // Handle Location Search
  const handleSearchInput = async (val) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const places = await searchPlaces(val, junctions);
      setSearchResults(places);
    } catch (err) {
      console.warn('Search query error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (place) => {
    setSearchQuery('');
    setSearchResults([]);
    const map = mapInstanceRef.current;
    if (map && place.lat && place.lng) {
      map.flyTo([place.lat, place.lng], 15, { duration: 1.2 });

      if (place.isJunction) {
        const j = junctions.find(item => item.id === place.junctionId);
        if (j) onSelectJunction(j);
      }
    }
  };

  // Browser Geolocation: "Use My Location"
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        if (!map) return;

        map.flyTo([latitude, longitude], 15, { duration: 1.2 });

        // Place pulsing user location marker
        const userGroup = layersGroupRef.current.userLocation;
        userGroup.clearLayers();

        const userPin = L.divIcon({
          className: 'user-geo-pin',
          html: `
            <div style="
              width: 18px;
              height: 18px;
              background: #2563EB;
              border-radius: 50%;
              border: 3px solid #FFFFFF;
              box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.35);
            "></div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker([latitude, longitude], { icon: userPin });
        marker.bindPopup(`<strong>Your Current Location</strong><br/>${latitude.toFixed(4)}, ${longitude.toFixed(4)}`).openPopup();
        marker.addTo(userGroup);
      },
      (err) => {
        setLocatingUser(false);
        alert(`Location access denied or unavailable (${err.message}). You can still search any address or city manually.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Reset/Fit view
  const handleResetCenter = () => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo(initialCenter, initialZoom, { duration: 1.0 });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: height, overflow: 'hidden' }}>
      {/* 1. Leaflet Map DOM Node */}
      <div
        ref={mapContainerRef}
        id={containerId || undefined}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      />

      {/* 2. Top-Left: Clean Universal Search Bar & My Location */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxWidth: 340,
          width: 'calc(100% - 28px)'
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '7px 12px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)'
              }}
            >
              <Search size={16} color="#64748B" style={{ marginRight: 8, flexShrink: 0 }} />
              <input
                id="map-places-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search city, address, landmark, or junction..."
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  width: '100%',
                  color: '#0F172A',
                  fontFamily: 'inherit',
                  background: 'transparent'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  boxShadow: '0 8px 18px rgba(15, 23, 42, 0.18)',
                  maxHeight: 240,
                  overflowY: 'auto'
                }}
              >
                {searchResults.map((place, idx) => (
                  <div
                    key={place.id || idx}
                    onClick={() => handleSelectPlace(place)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      fontSize: 12.5
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={13} color={place.isJunction ? '#0A3963' : '#2563EB'} />
                      <strong style={{ color: '#0A2540' }}>{place.label}</strong>
                    </div>
                    <div style={{ color: '#64748B', fontSize: 11, marginLeft: 19 }}>
                      {place.subtitle}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Use My Location Button */}
          <button
            id="map-my-location-btn"
            type="button"
            onClick={handleUseMyLocation}
            disabled={locatingUser}
            title="Use My Location"
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#1E293B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)'
            }}
          >
            <Navigation size={15} color={locatingUser ? '#94A3B8' : '#2563EB'} />
          </button>

          {/* Reset / Center Map */}
          <button
            type="button"
            onClick={handleResetCenter}
            title="Center Map"
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#1E293B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)'
            }}
          >
            <Crosshair size={15} color="#475569" />
          </button>
        </div>

        {/* Clear Route Floating Pill (When route is active) */}
        {(activeRoute || highlightedRoute) && onClearRoute && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0F172A',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <div>
              <span style={{ color: '#38BDF8', fontWeight: 700 }}>Active Route:</span> {(activeRoute || highlightedRoute).distanceKm !== undefined ? (activeRoute || highlightedRoute).distanceKm : (activeRoute || highlightedRoute).distance} km ({(activeRoute || highlightedRoute).durationMins !== undefined ? (activeRoute || highlightedRoute).durationMins : (activeRoute || highlightedRoute).duration} mins)
            </div>
            <button
              type="button"
              id="traffic-map-clear-route-btn"
              onClick={onClearRoute}
              style={{
                background: '#EF4444',
                color: '#FFF',
                border: 'none',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: 10
              }}
            >
              Clear Route
            </button>
          </div>
        )}
      </div>

      {/* 3. Top-Right: Compact Layer Controls & Provider Picker */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6
        }}
      >
        <button
          type="button"
          onClick={() => setShowControlsMenu(!showControlsMenu)}
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: '#1E293B',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)'
          }}
        >
          <Layers size={14} color="#0A2540" />
          <span>Map Overlays</span>
          <span style={{ fontSize: 10, color: '#64748B' }}>{showControlsMenu ? '▲' : '▼'}</span>
        </button>

        {showControlsMenu && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '10px 14px',
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12,
              minWidth: 190
            }}
          >
            {/* Tile Style Picker */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>MAP TILE STYLE</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { id: 'osm', label: 'Street' },
                  { id: 'cartoLight', label: 'Light' },
                  { id: 'cartoDark', label: 'Dark' }
                ].map(p => {
                  const isActive = activeTileId === p.id ||
                    (p.id === 'osm' && activeTileId === 'street') ||
                    (p.id === 'cartoLight' && activeTileId === 'light') ||
                    (p.id === 'cartoDark' && activeTileId === 'dark');
                  return (
                    <button
                      key={p.id}
                      id={`map-style-${p.label.toLowerCase()}`}
                      type="button"
                      onClick={() => setActiveTileId(p.id)}
                      style={{
                        background: isActive ? '#0A3963' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#475569',
                        border: 'none',
                        borderRadius: 4,
                        padding: '3px 7px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Toggles */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={showRoadsOverlay}
                  onChange={(e) => setShowRoadsOverlay(e.target.checked)}
                  style={{ accentColor: '#0A3963' }}
                />
                <span>Traffic Density</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={showIncidentsOverlay}
                  onChange={(e) => setShowIncidentsOverlay(e.target.checked)}
                  style={{ accentColor: '#DC2626' }}
                />
                <span>Incidents & Roadblocks</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
