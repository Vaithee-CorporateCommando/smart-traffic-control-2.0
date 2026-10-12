import React, { useState, useEffect } from 'react';
import {
  Map,
  Compass,
  AlertTriangle,
  User,
  LogOut,
  CheckCircle2,
  ChevronRight,
  Navigation,
  ShieldCheck,
  Search,
  MapPin,
  X,
  Loader2,
  RotateCcw,
  AlertCircle,
  Menu,
  Car,
  Mail,
  Sliders
} from 'lucide-react';
import TrafficMap from './TrafficMap';
import { searchPlaces, calculateRoadRoute } from '../services/routingService';

function getUserInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PublicDashboard({
  currentUser,
  onLogout,
  junctions,
  roads,
  incidents,
  roadBlocks
}) {
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'route', 'alerts', 'profile'
  const [selectedJunction, setSelectedJunction] = useState(junctions[0]);

  // Profile & Commuter Preferences State
  const [commuteVehicle, setCommuteVehicle] = useState('Private Passenger Car');
  const [prefGreenCorridors, setPrefGreenCorridors] = useState(true);
  const [prefAutoReroute, setPrefAutoReroute] = useState(true);
  const [prefSmsAlerts, setPrefSmsAlerts] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saved'

  const handleSavePreferences = (e) => {
    if (e) e.preventDefault();
    setSaveStatus('saved');
  };

  // Collapsible Menu & Responsive Drawer State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Route Planning State with real OSRM & Geocoding integration
  const defaultOrigin = junctions[1] ? {
    id: `junction-${junctions[1].id}`,
    label: `${junctions[1].id} - ${junctions[1].name}`,
    subtitle: `${junctions[1].district || 'Traffic Node'} • ${junctions[1].landmark || 'Junction'}`,
    lat: junctions[1].lat,
    lng: junctions[1].lng,
    isJunction: true,
    junctionId: junctions[1].id
  } : null;

  const defaultDest = junctions[3] ? {
    id: `junction-${junctions[3].id}`,
    label: `${junctions[3].id} - ${junctions[3].name}`,
    subtitle: `${junctions[3].district || 'Traffic Node'} • ${junctions[3].landmark || 'Junction'}`,
    lat: junctions[3].lat,
    lng: junctions[3].lng,
    isJunction: true,
    junctionId: junctions[3].id
  } : null;

  const [originPlace, setOriginPlace] = useState(defaultOrigin);
  const [originQuery, setOriginQuery] = useState(defaultOrigin?.label || '');
  const [originResults, setOriginResults] = useState([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  const [destPlace, setDestPlace] = useState(defaultDest);
  const [destQuery, setDestQuery] = useState(defaultDest?.label || '');
  const [destResults, setDestResults] = useState([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [activeRoadRoute, setActiveRoadRoute] = useState(null);
  const [alternativeRoadRoutes, setAlternativeRoadRoutes] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const handleOriginSearch = async (val) => {
    setOriginQuery(val);
    if (!val || val.trim().length < 2) {
      setOriginResults([]);
      setShowOriginDropdown(false);
      return;
    }
    setShowOriginDropdown(true);
    setIsSearchingOrigin(true);
    try {
      const results = await searchPlaces(val, junctions);
      setOriginResults(results);
    } catch (e) {
      setOriginResults([]);
    } finally {
      setIsSearchingOrigin(false);
    }
  };

  const handleSelectOrigin = (place) => {
    setOriginPlace(place);
    setOriginQuery(place.label);
    setShowOriginDropdown(false);
    setOriginResults([]);
  };

  const handleDestSearch = async (val) => {
    setDestQuery(val);
    if (!val || val.trim().length < 2) {
      setDestResults([]);
      setShowDestDropdown(false);
      return;
    }
    setShowDestDropdown(true);
    setIsSearchingDest(true);
    try {
      const results = await searchPlaces(val, junctions);
      setDestResults(results);
    } catch (e) {
      setDestResults([]);
    } finally {
      setIsSearchingDest(false);
    }
  };

  const handleSelectDest = (place) => {
    setDestPlace(place);
    setDestQuery(place.label);
    setShowDestDropdown(false);
    setDestResults([]);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const { latitude, longitude } = pos.coords;
        const myLoc = {
          id: 'user-current-gps',
          label: 'My Current Location (GPS)',
          subtitle: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
          isJunction: false
        };
        setOriginPlace(myLoc);
        setOriginQuery(myLoc.label);
        setShowOriginDropdown(false);
      },
      (err) => {
        setLocatingUser(false);
        alert(`Location permission denied or unavailable (${err.message}). You can still search any address or junction.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCalculateRoute = async () => {
    if (!originPlace || !destPlace) {
      setRouteError('Please select both a starting location and a destination.');
      return;
    }
    setRouteLoading(true);
    setRouteError(null);

    try {
      const res = await calculateRoadRoute(
        [originPlace.lat, originPlace.lng],
        [destPlace.lat, destPlace.lng]
      );

      if (!res.success || !res.routes || res.routes.length === 0) {
        setRouteError(res.error || 'No drivable road route found between these locations.');
        setActiveRoadRoute(null);
        setAlternativeRoadRoutes([]);
      } else {
        setActiveRoadRoute(res.routes[0]);
        setAlternativeRoadRoutes(res.routes.slice(1));
        setRouteError(null);
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      setRouteError('Road routing service is currently unreachable. Please check network connection.');
      setActiveRoadRoute(null);
      setAlternativeRoadRoutes([]);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleClearRoute = () => {
    setActiveRoadRoute(null);
    setAlternativeRoadRoutes([]);
    setRouteError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>
      {/* Top Header */}
      <header
        style={{
          height: 64,
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Hamburger Menu Toggle Button */}
          <button
            type="button"
            id="public-header-hamburger-btn"
            onClick={() => setSidebarOpen(prev => !prev)}
            title={sidebarOpen ? "Collapse Menu" : "Expand Menu"}
            aria-label={sidebarOpen ? "Collapse Menu" : "Expand Menu"}
            style={{
              background: 'transparent',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0A2540',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Menu size={20} />
          </button>

          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0A3963', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Map size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A2540', letterSpacing: '-0.01em' }}>
              SMART TRAFFIC CONTROL
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Citizen Urban Mobility & Route Guidance Portal
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Explicit simulated data notice */}
          <div className="badge-simulated">
            <span>• SIMULATION ACTIVE (Sample Telemetry)</span>
          </div>

          {/* User Chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F1F5F9', padding: '6px 14px', borderRadius: 20 }}>
            <User size={15} color="#2563EB" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>
              {currentUser.fullName} ({currentUser.role})
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            id="public-btn-logout"
            onClick={onLogout}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Mobile Drawer Backdrop */}
        {isMobile && sidebarOpen && (
          <div
            id="public-sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 1040
            }}
          />
        )}

        {/* Left Navigation Sidebar with Collapsible Menu */}
        <aside
          id="public-sidebar"
          style={{
            width: isMobile ? 240 : (sidebarOpen ? 240 : 68),
            background: '#FFFFFF',
            borderRight: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            padding: sidebarOpen ? '16px 12px' : '16px 8px',
            gap: 4,
            flexShrink: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            position: isMobile ? 'fixed' : 'relative',
            left: 0,
            top: isMobile ? 64 : 'auto',
            bottom: isMobile ? 0 : 'auto',
            height: isMobile ? 'calc(100vh - 64px)' : 'auto',
            zIndex: isMobile ? 1050 : 10,
            boxShadow: isMobile && sidebarOpen ? '4px 0 20px rgba(0,0,0,0.15)' : 'none',
            transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Top Heading & Hamburger Menu Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              padding: sidebarOpen ? '4px 10px 12px 10px' : '4px 0 12px 0',
              borderBottom: '1px solid #F1F5F9',
              marginBottom: 8
            }}
          >
            {sidebarOpen ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  id="public-sidebar-menu-btn"
                  onClick={() => setSidebarOpen(false)}
                  title="Collapse Menu"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    color: '#0A2540',
                    borderRadius: 6
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Menu size={18} />
                </button>
                <span id="public-menu-heading" style={{ fontSize: 12, fontWeight: 800, color: '#0A2540', letterSpacing: '0.06em' }}>
                  MENU
                </span>
              </div>
            ) : (
              <button
                type="button"
                id="public-sidebar-menu-btn"
                onClick={() => setSidebarOpen(true)}
                title="Expand Menu"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#0A2540',
                  borderRadius: 6
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Menu size={20} />
              </button>
            )}
          </div>

          <button
            id="public-nav-map"
            onClick={() => { setActiveTab('map'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Traffic Map' : undefined}
            className={`btn-secondary ${activeTab === 'map' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeTab === 'map' ? '#EFF6FF' : 'transparent',
              borderColor: activeTab === 'map' ? '#BFDBFE' : 'transparent',
              color: activeTab === 'map' ? '#2563EB' : '#475569',
              fontWeight: activeTab === 'map' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <Map size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Traffic Map</span>}
          </button>

          <button
            id="public-nav-route"
            onClick={() => { setActiveTab('route'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Plan a Route' : undefined}
            className={`btn-secondary ${activeTab === 'route' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeTab === 'route' ? '#EFF6FF' : 'transparent',
              borderColor: activeTab === 'route' ? '#BFDBFE' : 'transparent',
              color: activeTab === 'route' ? '#2563EB' : '#475569',
              fontWeight: activeTab === 'route' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <Compass size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Plan a Route</span>}
          </button>

          <button
            id="public-nav-alerts"
            onClick={() => { setActiveTab('alerts'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Traffic Alerts' : undefined}
            className={`btn-secondary ${activeTab === 'alerts' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeTab === 'alerts' ? '#EFF6FF' : 'transparent',
              borderColor: activeTab === 'alerts' ? '#BFDBFE' : 'transparent',
              color: activeTab === 'alerts' ? '#2563EB' : '#475569',
              fontWeight: activeTab === 'alerts' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Traffic Alerts</span>}
          </button>

          <button
            id="public-nav-profile"
            onClick={() => { setActiveTab('profile'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'My Profile' : undefined}
            className={`btn-secondary ${activeTab === 'profile' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeTab === 'profile' ? '#EFF6FF' : 'transparent',
              borderColor: activeTab === 'profile' ? '#BFDBFE' : 'transparent',
              color: activeTab === 'profile' ? '#2563EB' : '#475569',
              fontWeight: activeTab === 'profile' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <User size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>My Profile</span>}
          </button>
        </aside>

        {/* Main Dashboard Content Area */}
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {/* TAB 1: TRAFFIC MAP & INSPECTOR */}
          {activeTab === 'map' && (
            <div style={{ flex: 1, display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
              <div
                style={{
                  width: 340,
                  background: '#FFFFFF',
                  borderRight: '1px solid #E2E8F0',
                  padding: 16,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  flexShrink: 0
                }}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>City Traffic Network</h3>
                  <p style={{ fontSize: 12, color: '#64748B' }}>Urban road grid and flow status</p>
                </div>

                {/* 4 Mini Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Average Speed</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#10B981' }}>44 km/h</div>
                  </div>
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Congestion Index</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#3B82F6' }}>34% (Normal)</div>
                  </div>
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Active Incidents</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#EF4444' }}>2 Road Issues</div>
                  </div>
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Active Junctions</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#6366F1' }}>9 Operational</div>
                  </div>
                </div>

                {/* Junction Inspector */}
                <div className="card-panel" style={{ padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>
                    Junction Details Inspector
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 12, lineHeight: 1.4 }}>
                    Click any intersection marker on the map to inspect live signal phasing and queue lengths.
                  </div>

                  {selectedJunction ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
                        {selectedJunction.id} - {selectedJunction.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        District: {selectedJunction.district}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: selectedJunction.manualOverride ? '#8B5CF6' : '#10B981' }}>
                        Signal: {selectedJunction.manualOverride ? 'MANUAL OVERRIDE ACTIVE' : selectedJunction.signalState}
                      </div>
                      <div style={{ fontSize: 12, color: '#334155' }}>
                        Approaching Queue: <strong>{selectedJunction.queue} vehicles</strong>
                      </div>
                      <div style={{ fontSize: 12, color: '#059669' }}>
                        Congestion: <strong>{selectedJunction.congestionLevel}</strong>
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginTop: 6 }}>
                        Connected Corridors:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {roads.filter(r => r.from === selectedJunction.id || r.to === selectedJunction.id).map(r => (
                          <div key={r.id} style={{ fontSize: 11.5, color: r.blocked ? '#DC2626' : '#475569' }}>
                            • {r.name} [{r.blocked ? 'BLOCKED' : `${r.currentSpeed} km/h`}]
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>Select a junction on map</div>
                  )}
                </div>
              </div>

              {/* Map Canvas */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <TrafficMap
                  containerId="civilian-map-container"
                  junctions={junctions}
                  roads={roads}
                  incidents={incidents}
                  roadBlocks={roadBlocks}
                  selectedJunction={selectedJunction}
                  onSelectJunction={(j) => setSelectedJunction(j)}
                  activeRoute={activeRoadRoute}
                  alternativeRoutes={alternativeRoadRoutes}
                  onSelectAlternativeRoute={(alt) => {
                    const prevActive = activeRoadRoute;
                    setActiveRoadRoute(alt);
                    setAlternativeRoadRoutes(prev => [prevActive, ...prev.filter(r => r.id !== alt.id)]);
                  }}
                  originPoint={originPlace}
                  destPoint={destPlace}
                  onClearRoute={handleClearRoute}
                  isAdmin={false}
                />
              </div>
            </div>
          )}
          {/* TAB 2: ROUTE PLANNER */}
          {activeTab === 'route' && (
            <div style={{ flex: 1, display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
              <div
                style={{
                  width: 360,
                  background: '#FFFFFF',
                  borderRight: '1px solid #E2E8F0',
                  padding: 16,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  flexShrink: 0
                }}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Smart Road Route Planner</h3>
                  <p style={{ fontSize: 12, color: '#64748B' }}>Real road-following routes via OSRM router bypassing bottlenecks</p>
                </div>

                {/* Starting Location Input */}
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>Starting Location</label>
                    <button
                      type="button"
                      id="use-my-location-route-btn"
                      onClick={handleUseCurrentLocation}
                      disabled={locatingUser}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Navigation size={12} />
                      <span>{locatingUser ? 'Locating...' : 'Use My Location'}</span>
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      id="route-origin-input"
                      value={originQuery}
                      onChange={(e) => handleOriginSearch(e.target.value)}
                      onFocus={() => { if (originResults.length > 0) setShowOriginDropdown(true); }}
                      placeholder="Search origin city, landmark, or junction..."
                      style={{
                        width: '100%',
                        padding: '9px 32px 9px 12px',
                        borderRadius: 6,
                        border: originPlace ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                        fontSize: 13,
                        color: '#0F172A',
                        outline: 'none',
                        background: '#FFFFFF'
                      }}
                    />
                    {originQuery && (
                      <button
                        type="button"
                        onClick={() => { setOriginQuery(''); setOriginPlace(null); setOriginResults([]); }}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Origin Autocomplete Results */}
                  {showOriginDropdown && originResults.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        marginTop: 4,
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: 8,
                        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.16)',
                        maxHeight: 220,
                        overflowY: 'auto'
                      }}
                    >
                      {originResults.map((place, idx) => (
                        <div
                          key={place.id || idx}
                          onClick={() => handleSelectOrigin(place)}
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
                            <MapPin size={13} color={place.isJunction ? '#0A3963' : '#10B981'} />
                            <strong style={{ color: '#0A2540' }}>{place.label}</strong>
                          </div>
                          <div style={{ color: '#64748B', fontSize: 11, marginLeft: 19 }}>
                            {place.subtitle}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {originPlace && (
                    <div style={{ fontSize: 11, color: '#059669', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} />
                      <span>Selected: {originPlace.label}</span>
                    </div>
                  )}
                </div>

                {/* Destination Input */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>
                    Destination
                  </label>

                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      id="route-dest-input"
                      value={destQuery}
                      onChange={(e) => handleDestSearch(e.target.value)}
                      onFocus={() => { if (destResults.length > 0) setShowDestDropdown(true); }}
                      placeholder="Search destination city, landmark, or junction..."
                      style={{
                        width: '100%',
                        padding: '9px 32px 9px 12px',
                        borderRadius: 6,
                        border: destPlace ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        fontSize: 13,
                        color: '#0F172A',
                        outline: 'none',
                        background: '#FFFFFF'
                      }}
                    />
                    {destQuery && (
                      <button
                        type="button"
                        onClick={() => { setDestQuery(''); setDestPlace(null); setDestResults([]); }}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Destination Autocomplete Results */}
                  {showDestDropdown && destResults.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        marginTop: 4,
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: 8,
                        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.16)',
                        maxHeight: 220,
                        overflowY: 'auto'
                      }}
                    >
                      {destResults.map((place, idx) => (
                        <div
                          key={place.id || idx}
                          onClick={() => handleSelectDest(place)}
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
                            <MapPin size={13} color={place.isJunction ? '#0A3963' : '#EF4444'} />
                            <strong style={{ color: '#0A2540' }}>{place.label}</strong>
                          </div>
                          <div style={{ color: '#64748B', fontSize: 11, marginLeft: 19 }}>
                            {place.subtitle}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {destPlace && (
                    <div style={{ fontSize: 11, color: '#DC2626', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} />
                      <span>Selected: {destPlace.label}</span>
                    </div>
                  )}
                </div>

                {/* Quick Junction Selection Buttons */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>QUICK NETWORK JUNCTIONS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {junctions.slice(0, 5).map(j => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => {
                          const p = {
                            id: `junction-${j.id}`,
                            label: `${j.id} - ${j.name}`,
                            subtitle: `${j.district} • ${j.landmark}`,
                            lat: j.lat,
                            lng: j.lng,
                            isJunction: true,
                            junctionId: j.id
                          };
                          if (!originPlace) {
                            handleSelectOrigin(p);
                          } else {
                            handleSelectDest(p);
                          }
                        }}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          borderRadius: 4,
                          padding: '3px 7px',
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        {j.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons: Plan Route & Clear Route */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    id="plan-road-route-btn"
                    onClick={handleCalculateRoute}
                    disabled={routeLoading || !originPlace || !destPlace}
                    className="btn-accent"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: routeLoading || !originPlace || !destPlace ? 0.6 : 1
                    }}
                  >
                    {routeLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Calculating Road Route...</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={16} />
                        <span>Find Road Route</span>
                      </>
                    )}
                  </button>

                  {activeRoadRoute && (
                    <button
                      type="button"
                      id="public-clear-route-btn"
                      onClick={handleClearRoute}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        padding: '10px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <RotateCcw size={14} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Routing Error Notice */}
                {routeError && (
                  <div
                    id="route-error-alert"
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: 8,
                      padding: 10,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      color: '#991B1B',
                      fontSize: 12
                    }}
                  >
                    <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Routing Service Notice:</strong> {routeError}
                    </div>
                  </div>
                )}

                {/* Route Result Cards */}
                {activeRoadRoute && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                    {/* Primary Recommended Road Route Card */}
                    <div
                      id="active-road-route-card"
                      style={{
                        background: '#EFF6FF',
                        border: '1.5px solid #60A5FA',
                        borderRadius: 8,
                        padding: 14,
                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1D4ED8' }}>
                          {activeRoadRoute.name}
                        </span>
                        <span
                          style={{
                            background: '#DBEAFE',
                            color: '#1E40AF',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12
                          }}
                        >
                          RECOMMENDED
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                          {activeRoadRoute.durationMins} mins
                        </div>
                        <div style={{ fontSize: 13, color: '#2563EB', fontWeight: 700 }}>
                          {activeRoadRoute.distanceKm} km
                        </div>
                        <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700, background: '#ECFDF5', padding: '2px 6px', borderRadius: 4 }}>
                          Road-following
                        </div>
                      </div>

                      <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4, marginBottom: 8 }}>
                        {activeRoadRoute.summary ? `Direct corridor via ${activeRoadRoute.summary}` : 'Optimal driving path computed via OpenStreetMap OSRM'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #BFDBFE' }}>
                        <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>
                          Route Active on Map (Auto-focused)
                        </span>
                        <button
                          type="button"
                          onClick={handleClearRoute}
                          style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: 0 }}
                        >
                          Clear Route
                        </button>
                      </div>
                    </div>

                    {/* Alternative Routes (Only rendered if actually returned by service!) */}
                    {alternativeRoadRoutes && alternativeRoadRoutes.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>ALTERNATIVE ROUTES ({alternativeRoadRoutes.length})</div>
                        {alternativeRoadRoutes.map((alt, idx) => (
                          <div
                            key={alt.id || idx}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: 8,
                              padding: 10,
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              // Swap active and this alternative
                              const prevActive = activeRoadRoute;
                              setActiveRoadRoute(alt);
                              setAlternativeRoadRoutes(prev => [prevActive, ...prev.filter(r => r.id !== alt.id)]);
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                                {alt.name}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>
                                ALT
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#475569', fontWeight: 600 }}>
                              <span>{alt.durationMins} mins</span>
                              <span>•</span>
                              <span>{alt.distanceKm} km</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 600, marginTop: 4 }}>
                              Click to select this alternative route ➔
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Map Canvas for Route Planner */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <TrafficMap
                  containerId="civilian-route-map-container"
                  junctions={junctions}
                  roads={roads}
                  incidents={incidents}
                  roadBlocks={roadBlocks}
                  selectedJunction={selectedJunction}
                  onSelectJunction={(j) => setSelectedJunction(j)}
                  activeRoute={activeRoadRoute}
                  alternativeRoutes={alternativeRoadRoutes}
                  onSelectAlternativeRoute={(alt) => {
                    const prevActive = activeRoadRoute;
                    setActiveRoadRoute(alt);
                    setAlternativeRoadRoutes(prev => [prevActive, ...prev.filter(r => r.id !== alt.id)]);
                  }}
                  originPoint={originPlace}
                  destPoint={destPlace}
                  onClearRoute={handleClearRoute}
                  isAdmin={false}
                />
              </div>
            </div>
          )}

          {/* TAB 3: TRAFFIC ALERTS */}
          {activeTab === 'alerts' && (
            <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#F8FAFC' }}>
              <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Traffic Alerts & Roadblocks</h3>
                  <p style={{ fontSize: 13, color: '#64748B' }}>Verified closures, hazards, and real-time roadway notifications</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {roadBlocks.map(rb => (
                    <div key={rb.id} style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>🚧 ROAD CLOSURE</span>
                        <span style={{ background: '#DC2626', color: '#FFF', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>BLOCKED</span>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
                        {rb.roadName}
                      </div>
                      <div style={{ fontSize: 12, color: '#7F1D1D', marginBottom: 6 }}>
                        Reason: {rb.reason}
                      </div>
                      <div style={{ fontSize: 11, color: '#991B1B' }}>
                        Enforced by: {rb.authority} • Est. Clearance: {rb.expectedClearance}
                      </div>
                    </div>
                  ))}

                  {incidents.filter(i => i.status === 'VERIFIED_PUBLISHED').map(inc => (
                    <div key={inc.id} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>⚠️ {inc.title}</span>
                        <span style={{ background: '#D97706', color: '#FFF', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{inc.severity}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                        📍 {inc.location}
                      </div>
                      <div style={{ fontSize: 12, color: '#451A03', marginBottom: 6 }}>
                        {inc.description}
                      </div>
                      <div style={{ fontSize: 11, color: '#059669' }}>
                        Verified by {inc.verifiedBy} • {inc.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MY PROFILE & PREFERENCES */}
          {activeTab === 'profile' && (
            <div className="profile-page-wrapper">
              <div className="profile-container">
                {/* Profile Header */}
                <div className="profile-header">
                  <h2 className="profile-title">My Profile & Preferences</h2>
                  <p className="profile-subtitle">Personal commuter settings and travel habits</p>
                </div>

                {/* Profile Summary Card */}
                <div className="profile-card" id="profile-summary-card">
                  <div className="profile-user-summary">
                    <div
                      className="profile-avatar"
                      id="profile-user-avatar"
                      title={currentUser?.fullName || 'User'}
                    >
                      {getUserInitials(currentUser?.fullName)}
                    </div>
                    <div className="profile-user-details">
                      <div className="profile-user-name" id="profile-user-name">
                        {currentUser?.fullName || 'Commuter'}
                      </div>
                      <div className="profile-user-meta">
                        <div className="profile-meta-item" id="profile-user-email">
                          <Mail size={14} color="#64748B" style={{ flexShrink: 0 }} />
                          <span>{currentUser?.email || 'user@traffic.gov.in'}</span>
                        </div>
                        <div className="profile-tier-badge" id="profile-user-tier" title="Commuter Tier">
                          <ShieldCheck size={13} color="#2563EB" style={{ flexShrink: 0 }} />
                          <span>Tier: {currentUser?.department || 'Daily Commuter'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commute Preferences Card */}
                <div className="profile-card" id="commute-preferences-card">
                  <div className="pref-card-title">
                    <Sliders size={16} color="#0A2540" />
                    <span>Commute Preferences</span>
                  </div>

                  {/* Default Commute Vehicle */}
                  <div className="pref-field-group">
                    <label className="pref-field-label" htmlFor="commute-vehicle-select">
                      <Car size={15} color="#2563EB" />
                      <span>Default Commute Vehicle</span>
                    </label>
                    <select
                      id="commute-vehicle-select"
                      className="pref-select"
                      value={commuteVehicle}
                      onChange={(e) => {
                        setCommuteVehicle(e.target.value);
                        setSaveStatus(null);
                      }}
                    >
                      <option value="Private Passenger Car">Private Passenger Car</option>
                      <option value="Two-Wheeler Motorcycle">Two-Wheeler Motorcycle</option>
                      <option value="Electric Vehicle (EV)">Electric Vehicle (EV)</option>
                      <option value="Public Transit Bus">Public Transit Bus</option>
                    </select>
                  </div>

                  {/* Preference Checkboxes */}
                  <div className="pref-checkbox-list">
                    <label className={`pref-checkbox-row ${prefGreenCorridors ? 'is-checked' : ''}`}>
                      <input
                        type="checkbox"
                        id="pref-green-corridors"
                        checked={prefGreenCorridors}
                        onChange={(e) => {
                          setPrefGreenCorridors(e.target.checked);
                          setSaveStatus(null);
                        }}
                        className="pref-checkbox-input"
                      />
                      <span className="pref-checkbox-label">
                        Prioritize signal-synchronized green corridors
                      </span>
                    </label>

                    <label className={`pref-checkbox-row ${prefAutoReroute ? 'is-checked' : ''}`}>
                      <input
                        type="checkbox"
                        id="pref-auto-reroute"
                        checked={prefAutoReroute}
                        onChange={(e) => {
                          setPrefAutoReroute(e.target.checked);
                          setSaveStatus(null);
                        }}
                        className="pref-checkbox-input"
                      />
                      <span className="pref-checkbox-label">
                        Real-time traffic avoidance auto-rerouting
                      </span>
                    </label>

                    <label className={`pref-checkbox-row ${prefSmsAlerts ? 'is-checked' : ''}`}>
                      <input
                        type="checkbox"
                        id="pref-sms-alerts"
                        checked={prefSmsAlerts}
                        onChange={(e) => {
                          setPrefSmsAlerts(e.target.checked);
                          setSaveStatus(null);
                        }}
                        className="pref-checkbox-input"
                      />
                      <span className="pref-checkbox-label">
                        Receive instant SMS alert on critical bottlenecks
                      </span>
                    </label>
                  </div>

                  {/* Save Commuter Preferences Button */}
                  <button
                    type="button"
                    id="save-commuter-preferences-btn"
                    onClick={handleSavePreferences}
                    className="btn-profile-save"
                  >
                    Save Commuter Preferences
                  </button>

                  {/* Success Alert */}
                  {saveStatus === 'saved' && (
                    <div
                      className="profile-success-alert"
                      id="profile-save-success-banner"
                      role="status"
                    >
                      <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                      <span>Commute navigation preferences saved successfully!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
