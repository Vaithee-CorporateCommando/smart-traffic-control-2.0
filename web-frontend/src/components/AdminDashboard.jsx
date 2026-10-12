import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Map,
  TrafficCone,
  Video,
  Sliders,
  Siren,
  ShieldAlert,
  FileSpreadsheet,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Clock,
  Download,
  Navigation,
  Search,
  MapPin,
  X,
  Loader2,
  RotateCcw,
  AlertCircle,
  Menu,
  Camera
} from 'lucide-react';
import TrafficMap from './TrafficMap';
import CctvSimulationFeed from './CctvSimulationFeed';
import { searchPlaces, calculateRoadRoute } from '../services/routingService';

export default function AdminDashboard({
  currentUser,
  onLogout,
  junctions,
  setJunctions,
  roads,
  setRoads,
  cctvFeeds,
  setCctvFeeds,
  incidents,
  setIncidents,
  roadBlocks,
  setRoadBlocks,
  emergencyDispatches,
  setEmergencyDispatches,
  auditLog,
  setAuditLog
}) {
  const [activeModule, setActiveModule] = useState('overview');
  const [selectedJunction, setSelectedJunction] = useState(junctions[0]);

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

  // Tactical Route Planning & Inspection State
  const [adminOrigin, setAdminOrigin] = useState(null);
  const [adminOriginQuery, setAdminOriginQuery] = useState('');
  const [adminOriginResults, setAdminOriginResults] = useState([]);
  const [showAdminOriginDropdown, setShowAdminOriginDropdown] = useState(false);

  const [adminDest, setAdminDest] = useState(null);
  const [adminDestQuery, setAdminDestQuery] = useState('');
  const [adminDestResults, setAdminDestResults] = useState([]);
  const [showAdminDestDropdown, setShowAdminDestDropdown] = useState(false);

  const [adminActiveRoute, setAdminActiveRoute] = useState(null);
  const [adminAlternativeRoutes, setAdminAlternativeRoutes] = useState([]);
  const [adminRouteLoading, setAdminRouteLoading] = useState(false);
  const [adminRouteError, setAdminRouteError] = useState(null);
  const [showTacticalRouteBar, setShowTacticalRouteBar] = useState(false);

  const handleAdminOriginSearch = async (val) => {
    setAdminOriginQuery(val);
    if (!val || val.trim().length < 2) {
      setAdminOriginResults([]);
      setShowAdminOriginDropdown(false);
      return;
    }
    setShowAdminOriginDropdown(true);
    try {
      const res = await searchPlaces(val, junctions);
      setAdminOriginResults(res);
    } catch (e) {
      setAdminOriginResults([]);
    }
  };

  const handleAdminDestSearch = async (val) => {
    setAdminDestQuery(val);
    if (!val || val.trim().length < 2) {
      setAdminDestResults([]);
      setShowAdminDestDropdown(false);
      return;
    }
    setShowAdminDestDropdown(true);
    try {
      const res = await searchPlaces(val, junctions);
      setAdminDestResults(res);
    } catch (e) {
      setAdminDestResults([]);
    }
  };

  const handleAdminCalculateRoute = async () => {
    if (!adminOrigin || !adminDest) {
      setAdminRouteError('Please select both origin and destination.');
      return;
    }
    setAdminRouteLoading(true);
    setAdminRouteError(null);
    try {
      const res = await calculateRoadRoute(
        [adminOrigin.lat, adminOrigin.lng],
        [adminDest.lat, adminDest.lng]
      );
      if (!res.success || !res.routes || res.routes.length === 0) {
        setAdminRouteError(res.error || 'No drivable route found between these points.');
        setAdminActiveRoute(null);
        setAdminAlternativeRoutes([]);
      } else {
        setAdminActiveRoute(res.routes[0]);
        setAdminAlternativeRoutes(res.routes.slice(1));
        setAdminRouteError(null);
      }
    } catch (err) {
      setAdminRouteError('Routing service error. Check network connection.');
      setAdminActiveRoute(null);
      setAdminAlternativeRoutes([]);
    } finally {
      setAdminRouteLoading(false);
    }
  };

  const handleAdminClearRoute = () => {
    setAdminActiveRoute(null);
    setAdminAlternativeRoutes([]);
    setAdminRouteError(null);
  };

  // Signal Control State
  const [targetJunctionId, setTargetJunctionId] = useState('J1');
  const [cycleDuration, setCycleDuration] = useState(60);
  const [greenDuration, setGreenDuration] = useState(30);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState('');

  // Dialog Modals
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Form states for modals
  const [newClosureRoad, setNewClosureRoad] = useState(roads[0]?.id || 'R1');
  const [newClosureReason, setNewClosureReason] = useState('Emergency Pavement Resurfacing');
  const [newClosureAuth, setNewClosureAuth] = useState('Civil Works Directorate');
  const [newClosureEst, setNewClosureEst] = useState('22:00 Tonight');

  const [newIncTitle, setNewIncTitle] = useState('Disabled Vehicle on Shoulder');
  const [newIncType, setNewIncType] = useState('VEHICLE_BREAKDOWN');
  const [newIncSev, setNewIncSev] = useState('MEDIUM');
  const [newIncLoc, setNewIncLoc] = useState('West Ring Gateway Approach');

  const [newEmgCode, setNewEmgCode] = useState('FIRE-07');
  const [newEmgType, setNewEmgType] = useState('FIRE_ENGINE');
  const [newEmgMission, setNewEmgMission] = useState('Commercial Plaza Alarm - East Corridor');

  // Live CCTV Matrix State & Forensic Snapshot Handlers
  const [cctvJunctionFilter, setCctvJunctionFilter] = useState('ALL');
  const [activeCctvSnapshot, setActiveCctvSnapshot] = useState(null);

  const handleCaptureSnapshot = (dataUrl, feed, meta) => {
    setActiveCctvSnapshot({ dataUrl, feed, meta });
    addAudit('CCTV_SNAPSHOT', feed.name, `Forensic frame captured for ${feed.id} (${feed.junctionName})`);
  };

  const handleToggleFeedStatus = (feedId, isOnline) => {
    setCctvFeeds(prev => prev.map(f => f.id === feedId ? { ...f, online: isOnline } : f));
    const feed = cctvFeeds.find(f => f.id === feedId);
    addAudit('CCTV_STATUS_CHANGE', feed?.name || feedId, `Status changed to ${isOnline ? 'ONLINE' : 'MAINTENANCE'}`);
  };

  const handleDownloadSnapshot = () => {
    if (!activeCctvSnapshot) return;
    const link = document.createElement('a');
    link.download = `CCTV_${activeCctvSnapshot.feed.id}_${Date.now()}.png`;
    link.href = activeCctvSnapshot.dataUrl;
    link.click();
  };

  const addAudit = (action, target, reason, result = 'SUCCESS') => {
    const id = `LOG-${105 + auditLog.length}`;
    const time = new Date().toTimeString().split(' ')[0];
    const newRecord = { id, time, admin: currentUser.username, action, target, reason, result };
    setAuditLog(prev => [newRecord, ...prev]);
  };

  // Signal Override Handlers
  const handleApplyOverride = (state) => {
    if (!overrideReason.trim() || overrideReason.trim().length < 4) {
      setOverrideError('Mandatory justification reason required (minimum 4 characters).');
      return;
    }
    setOverrideError('');

    setJunctions(prev => prev.map(j => {
      if (j.id === targetJunctionId) {
        return {
          ...j,
          manualOverride: true,
          overrideReason: overrideReason.trim(),
          signalState: state
        };
      }
      return j;
    }));

    const jName = junctions.find(j => j.id === targetJunctionId)?.name || targetJunctionId;
    addAudit('MANUAL_OVERRIDE_APPLIED', jName, `Force state ${state} - Reason: ${overrideReason}`);
    alert(`Manual override applied to ${jName} [${state}]. Action recorded to official audit log.`);
  };

  const handleRevertAuto = () => {
    setJunctions(prev => prev.map(j => {
      if (j.id === targetJunctionId) {
        return {
          ...j,
          manualOverride: false,
          overrideReason: '',
          signalState: 'GREEN_NORTH_SOUTH'
        };
      }
      return j;
    }));
    setOverrideReason('');
    setOverrideError('');
    const jName = junctions.find(j => j.id === targetJunctionId)?.name || targetJunctionId;
    addAudit('AUTO_CYCLE_RESTORED', jName, 'Manual override released; adaptive cycle resumed');
    alert(`Automatic adaptive cycle restored for ${jName}.`);
  };

  // Emergency Preemption
  const handleActivateGreenWave = (disp) => {
    setJunctions(prev => prev.map(j => {
      if (disp.corridor.includes(j.id)) {
        return {
          ...j,
          manualOverride: true,
          overrideReason: `EMERGENCY GREEN WAVE: ${disp.vehicleCode}`,
          signalState: 'GREEN_NORTH_SOUTH'
        };
      }
      return j;
    }));
    setEmergencyDispatches(prev => prev.map(d => d.id === disp.id ? { ...d, status: 'CORRIDOR_ACTIVE' } : d));
    addAudit('EMERGENCY_GREEN_WAVE_ACTIVATED', disp.vehicleCode, `Corridor locked for ${disp.corridor.join(' ➔ ')}`);
  };

  const handleReleaseEmergency = (disp) => {
    setJunctions(prev => prev.map(j => {
      if (disp.corridor.includes(j.id)) {
        return {
          ...j,
          manualOverride: false,
          overrideReason: '',
          signalState: 'GREEN_NORTH_SOUTH'
        };
      }
      return j;
    }));
    setEmergencyDispatches(prev => prev.map(d => d.id === disp.id ? { ...d, status: 'ARRIVED' } : d));
    addAudit('EMERGENCY_PREEMPTION_RELEASED', disp.vehicleCode, 'Vehicle reached scene; corridors restored');
  };

  // Roadblock handlers
  const handleCreateClosure = (e) => {
    e.preventDefault();
    const r = roads.find(r => r.id === newClosureRoad);
    if (!r) return;

    setRoads(prev => prev.map(road => road.id === r.id ? { ...road, blocked: true, blockReason: newClosureReason } : road));
    const newRb = {
      id: `RB-${200 + roadBlocks.length + 1}`,
      roadId: r.id,
      roadName: r.name,
      reason: newClosureReason,
      authority: newClosureAuth,
      time: new Date().toTimeString().split(' ')[0],
      expectedClearance: newClosureEst,
      status: 'ACTIVE'
    };
    setRoadBlocks(prev => [newRb, ...prev]);
    addAudit('ROAD_BLOCK_CREATED', r.name, newClosureReason);
    setShowClosureModal(false);
  };

  const handleClearClosure = (rb) => {
    setRoads(prev => prev.map(road => road.id === rb.roadId ? { ...road, blocked: false, blockReason: '' } : road));
    setRoadBlocks(prev => prev.map(b => b.id === rb.id ? { ...b, status: 'CLEARED' } : b));
    addAudit('ROAD_BLOCK_CLEARED', rb.roadName, 'Carriageway reopened');
  };

  // Incident Handlers
  const handleVerifyIncident = (inc) => {
    setIncidents(prev => prev.map(i => i.id === inc.id ? { ...i, status: 'VERIFIED_PUBLISHED', verifiedBy: currentUser.fullName } : i));
    addAudit('INCIDENT_VERIFIED', inc.title, 'Validated via camera feeds and published alert');
  };

  const handleResolveIncident = (inc) => {
    setIncidents(prev => prev.map(i => i.id === inc.id ? { ...i, status: 'RESOLVED' } : i));
    addAudit('INCIDENT_RESOLVED', inc.title, 'Incident cleared from roadway');
  };

  const exportAuditCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'Administrator', 'Action Type', 'Target', 'Reason', 'Result'];
    const rows = auditLog.map(l => [l.id, l.time, l.admin, l.action, `"${l.target}"`, `"${l.reason}"`, l.result]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `traffic_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>
      {/* Top Operations Header */}
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
            id="admin-header-hamburger-btn"
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

          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0A2540', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutDashboard size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A2540', letterSpacing: '-0.01em' }}>
              SMART TRAFFIC CONTROL
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Central Operations & Authority Command Center
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12 }}>
            AUTHORITY LEVEL: ADMIN ACCESS
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F1F5F9', padding: '6px 14px', borderRadius: 20 }}>
            <ShieldCheck size={16} color="#10B981" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>
              {currentUser.fullName} ({currentUser.department})
            </span>
          </div>

          <button id="admin-btn-logout" onClick={onLogout} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
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
            id="admin-sidebar-backdrop"
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

        {/* Left Command Sidebar with Collapsible Menu */}
        <aside
          id="admin-sidebar"
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
                  id="admin-sidebar-menu-btn"
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
                <span id="admin-menu-heading" style={{ fontSize: 12, fontWeight: 800, color: '#0A2540', letterSpacing: '0.06em' }}>
                  MENU
                </span>
              </div>
            ) : (
              <button
                type="button"
                id="admin-sidebar-menu-btn"
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
            id="admin-nav-overview"
            onClick={() => { setActiveModule('overview'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Overview' : undefined}
            className={`btn-secondary ${activeModule === 'overview' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeModule === 'overview' ? '#EFF6FF' : 'transparent',
              borderColor: activeModule === 'overview' ? '#BFDBFE' : 'transparent',
              color: activeModule === 'overview' ? '#2563EB' : '#475569',
              fontWeight: activeModule === 'overview' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutDashboard size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Overview</span>}
          </button>

          <button
            id="admin-nav-map"
            onClick={() => { setActiveModule('map'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Tactical Traffic Map' : undefined}
            className={`btn-secondary ${activeModule === 'map' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeModule === 'map' ? '#EFF6FF' : 'transparent',
              borderColor: activeModule === 'overview' ? '#BFDBFE' : 'transparent',
              color: activeModule === 'map' ? '#2563EB' : '#475569',
              fontWeight: activeModule === 'map' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <Map size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Tactical Traffic Map</span>}
          </button>

          <button
            id="admin-nav-junctions"
            onClick={() => { setActiveModule('junctions'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Junction Management' : undefined}
            className={`btn-secondary ${activeModule === 'junctions' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeModule === 'junctions' ? '#EFF6FF' : 'transparent',
              borderColor: activeModule === 'junctions' ? '#BFDBFE' : 'transparent',
              color: activeModule === 'junctions' ? '#2563EB' : '#475569',
              fontWeight: activeModule === 'junctions' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <TrafficCone size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Junction Management</span>}
          </button>

          <button
            id="admin-nav-cctv"
            onClick={() => { setActiveModule('cctv'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Live CCTV Matrix' : undefined}
            className={`btn-secondary ${activeModule === 'cctv' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeModule === 'cctv' ? '#EFF6FF' : 'transparent',
              borderColor: activeModule === 'cctv' ? '#BFDBFE' : 'transparent',
              color: activeModule === 'cctv' ? '#2563EB' : '#475569',
              fontWeight: activeModule === 'cctv' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <Video size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Live CCTV Matrix</span>}
          </button>

          <button
            id="admin-nav-signals"
            onClick={() => { setActiveModule('signal'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Signal Control & Override' : undefined}
            className={`btn-secondary ${activeModule === 'signal' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeModule === 'signal' ? '#EFF6FF' : 'transparent',
              borderColor: activeModule === 'signal' ? '#BFDBFE' : 'transparent',
              color: activeModule === 'signal' ? '#2563EB' : '#475569',
              fontWeight: activeModule === 'signal' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <Sliders size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Signal Control & Override</span>}
          </button>

          <button
            id="admin-nav-emergency"
            onClick={() => { setActiveModule('emergency'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Emergency Priority' : undefined}
            className={`btn-secondary ${activeModule === 'emergency' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeModule === 'emergency' ? '#EFF6FF' : 'transparent',
              borderColor: activeModule === 'emergency' ? '#BFDBFE' : 'transparent',
              color: activeModule === 'emergency' ? '#2563EB' : '#475569',
              fontWeight: activeModule === 'emergency' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <Siren size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Emergency Priority</span>}
          </button>

          <button
            id="admin-nav-roadblocks"
            onClick={() => { setActiveModule('roadblocks'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Road Blocks & Incidents' : undefined}
            className={`btn-secondary ${activeModule === 'roadblocks' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeModule === 'roadblocks' ? '#EFF6FF' : 'transparent',
              borderColor: activeModule === 'roadblocks' ? '#BFDBFE' : 'transparent',
              color: activeModule === 'roadblocks' ? '#2563EB' : '#475569',
              fontWeight: activeModule === 'roadblocks' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Road Blocks & Incidents</span>}
          </button>

          <button
            id="admin-nav-reports"
            onClick={() => { setActiveModule('reports'); if (isMobile) setSidebarOpen(false); }}
            title={!sidebarOpen ? 'Reports & Audit Log' : undefined}
            className={`btn-secondary ${activeModule === 'reports' ? 'active' : ''}`}
            style={{
              width: '100%',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '10px 14px' : '10px 0',
              background: activeModule === 'reports' ? '#EFF6FF' : 'transparent',
              borderColor: activeModule === 'reports' ? '#BFDBFE' : 'transparent',
              color: activeModule === 'reports' ? '#2563EB' : '#475569',
              fontWeight: activeModule === 'reports' ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: sidebarOpen ? 12 : 0,
              borderRadius: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <FileSpreadsheet size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Reports & Audit Log</span>}
          </button>
        </aside>

        {/* Dynamic Center Panel */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* MODULE 1: OVERVIEW */}
          {activeModule === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0A2540' }}>
                  Traffic Operations Center — System Overview
                </h2>
                <p style={{ fontSize: 13, color: '#64748B' }}>
                  Real-time citywide traffic metrics, controller telemetry, and automated incident monitoring.
                </p>
              </div>

              {/* 5 KPI Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                <div className="card-panel" style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Citywide Congestion</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#3B82F6', margin: '4px 0' }}>35%</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Normal flow in most sectors</div>
                </div>

                <div className="card-panel" style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Active Junctions</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981', margin: '4px 0' }}>9 / 9</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>100% telemetry online</div>
                </div>

                <div className="card-panel" style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Active Incidents</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#EF4444', margin: '4px 0' }}>3 Reported</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>2 verified, 1 pending</div>
                </div>

                <div className="card-panel" style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Emergency Preemptions</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#8B5CF6', margin: '4px 0' }}>1 Active</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>AMB-108 Priority Green</div>
                </div>

                <div className="card-panel" style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>CCTV Stream Health</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0D9488', margin: '4px 0' }}>8 / 9 Online</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>1 feed in maintenance</div>
                </div>
              </div>

              {/* Congestion Gauge & Availability */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                <div className="card-panel" style={{ padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
                    Citywide Network Congestion Index
                  </div>
                  <div style={{ background: '#E2E8F0', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ width: '35%', height: '100%', background: 'linear-gradient(90deg, #10B981, #F59E0B)', borderRadius: 6 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11.5, marginBottom: 10 }}>
                    <span style={{ color: '#059669', fontWeight: 600 }}>🟢 0-40% Free Flow</span>
                    <span style={{ color: '#D97706', fontWeight: 600 }}>🟡 41-70% Moderate Queue</span>
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>🔴 71-100% Severe Delay</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                    Synthesized from inductive loop sensors, camera flow detectors, and reported queues across all 9 connected junctions.
                  </div>
                </div>

                <div className="card-panel" style={{ padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
                    Infrastructure Subsystem Availability
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#334155' }}>Roadside Controllers (NEMA TS2):</span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>Online (9 / 9 Sync)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#334155' }}>CCTV Optical Surveillance:</span>
                      <span style={{ color: '#F59E0B', fontWeight: 700 }}>Degraded (8/9 Online)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#334155' }}>Green Wave Transponders:</span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>Active & Listening (100%)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#334155' }}>Public VMS Digital Signs:</span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>Operational (4 Displays)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tactical Live Traffic Map Section */}
              <div className="card-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                      Tactical Urban Traffic & Junction Map
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      Real-time interactive Leaflet street map across all intersections with signal states and live queue telemetry
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModule('map')}
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Map size={14} />
                    <span>Open Tactical Router</span>
                  </button>
                </div>
                <div style={{ height: 480, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0', position: 'relative' }}>
                  <TrafficMap
                    containerId="admin-overview-map-container"
                    junctions={junctions}
                    roads={roads}
                    incidents={incidents}
                    roadBlocks={roadBlocks}
                    selectedJunction={selectedJunction}
                    onSelectJunction={(j) => {
                      setSelectedJunction(j);
                      if (j?.id) setTargetJunctionId(j.id);
                    }}
                    activeRoute={adminActiveRoute}
                    alternativeRoutes={adminAlternativeRoutes}
                    onSelectAlternativeRoute={(alt) => {
                      const prevActive = adminActiveRoute;
                      setAdminActiveRoute(alt);
                      setAdminAlternativeRoutes(prev => [prevActive, ...prev.filter(r => r.id !== alt.id)]);
                    }}
                    originPoint={adminOrigin}
                    destPoint={adminDest}
                    onClearRoute={handleAdminClearRoute}
                    isAdmin={true}
                    onAdminAction={(action) => {
                      if (action.type === 'MANAGE_SIGNAL') {
                        setTargetJunctionId(action.junctionId);
                        setActiveModule('signal');
                      }
                    }}
                    height="100%"
                  />
                </div>
              </div>

              {/* Active Alerts Summary */}
              <div className="card-panel" style={{ padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
                  Active High-Priority Incidents & Roadblocks
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {roadBlocks.filter(r => r.status === 'ACTIVE').map(rb => (
                    <div key={rb.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FEF2F2', padding: '8px 12px', borderRadius: 6 }}>
                      <span style={{ background: '#DC2626', color: '#FFF', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>ROADBLOCK</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#991B1B' }}>
                        {rb.roadName} — {rb.reason} (Est: {rb.expectedClearance})
                      </span>
                    </div>
                  ))}
                  {incidents.filter(i => i.status === 'VERIFIED_PUBLISHED').map(inc => (
                    <div key={inc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFBEB', padding: '8px 12px', borderRadius: 6 }}>
                      <span style={{ background: '#D97706', color: '#FFF', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{inc.type}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>
                        {inc.title} at {inc.location} ({inc.time})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODULE 2: TACTICAL TRAFFIC MAP (OpenStreetMap Leaflet) */}
          {activeModule === 'map' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 650, height: '100%' }}>
              {/* Tactical Route Inspector Toolbar */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Navigation size={16} color="#0A3963" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0A2540' }}>
                      Tactical Corridor & Road Route Inspector
                    </span>
                    <span style={{ fontSize: 11, background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                      OSRM Real Highway Geometry
                    </span>
                  </div>

                  {adminActiveRoute && (
                    <button
                      type="button"
                      id="admin-clear-route-btn"
                      onClick={handleAdminClearRoute}
                      style={{
                        background: '#FEE2E2',
                        border: '1px solid #FCA5A5',
                        color: '#DC2626',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>Clear Route</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr auto', gap: 10, alignItems: 'center' }}>
                  {/* Tactical Origin Input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      id="admin-route-origin-input"
                      value={adminOriginQuery}
                      onChange={(e) => handleAdminOriginSearch(e.target.value)}
                      onFocus={() => { if (adminOriginResults.length > 0) setShowAdminOriginDropdown(true); }}
                      placeholder="Origin node, address, or city..."
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        fontSize: 12,
                        borderRadius: 6,
                        border: adminOrigin ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                        outline: 'none'
                      }}
                    />
                    {showAdminOriginDropdown && adminOriginResults.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 100,
                          marginTop: 4,
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                          maxHeight: 180,
                          overflowY: 'auto'
                        }}
                      >
                        {adminOriginResults.map((p, idx) => (
                          <div
                            key={p.id || idx}
                            onClick={() => {
                              setAdminOrigin(p);
                              setAdminOriginQuery(p.label);
                              setShowAdminOriginDropdown(false);
                            }}
                            style={{ padding: '6px 10px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', fontSize: 11.5 }}
                          >
                            <strong style={{ color: '#0A2540' }}>{p.label}</strong>
                            <div style={{ color: '#64748B', fontSize: 10.5 }}>{p.subtitle}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tactical Dest Input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      id="admin-route-dest-input"
                      value={adminDestQuery}
                      onChange={(e) => handleAdminDestSearch(e.target.value)}
                      onFocus={() => { if (adminDestResults.length > 0) setShowAdminDestDropdown(true); }}
                      placeholder="Destination node, address, or city..."
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        fontSize: 12,
                        borderRadius: 6,
                        border: adminDest ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        outline: 'none'
                      }}
                    />
                    {showAdminDestDropdown && adminDestResults.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 100,
                          marginTop: 4,
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                          maxHeight: 180,
                          overflowY: 'auto'
                        }}
                      >
                        {adminDestResults.map((p, idx) => (
                          <div
                            key={p.id || idx}
                            onClick={() => {
                              setAdminDest(p);
                              setAdminDestQuery(p.label);
                              setShowAdminDestDropdown(false);
                            }}
                            style={{ padding: '6px 10px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', fontSize: 11.5 }}
                          >
                            <strong style={{ color: '#0A2540' }}>{p.label}</strong>
                            <div style={{ color: '#64748B', fontSize: 10.5 }}>{p.subtitle}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    id="admin-plan-route-btn"
                    onClick={handleAdminCalculateRoute}
                    disabled={adminRouteLoading || !adminOrigin || !adminDest}
                    className="btn-accent"
                    style={{
                      padding: '7px 14px',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: adminRouteLoading || !adminOrigin || !adminDest ? 0.6 : 1
                    }}
                  >
                    {adminRouteLoading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Computing...</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={13} />
                        <span>Inspect Road Route</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Routing Notice / Results Strip */}
                {adminRouteError && (
                  <div style={{ color: '#DC2626', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={14} />
                    <span>{adminRouteError}</span>
                  </div>
                )}

                {adminActiveRoute && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <strong style={{ color: '#1D4ED8' }}>{adminActiveRoute.name}</strong>
                      <span style={{ color: '#0F172A', fontWeight: 700 }}>{adminActiveRoute.distanceKm} km</span>
                      <span style={{ color: '#0F172A', fontWeight: 700 }}>{adminActiveRoute.durationMins} mins</span>
                      <span style={{ color: '#64748B', fontSize: 11 }}>Via {adminActiveRoute.summary}</span>
                    </div>
                    {adminAlternativeRoutes && adminAlternativeRoutes.length > 0 && (
                      <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 600 }}>
                        +{adminAlternativeRoutes.length} alternative route(s) available on map
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Leaflet Street Map Container */}
              <div style={{ flex: 1, position: 'relative', minHeight: 520, borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                <TrafficMap
                  containerId="admin-map-container"
                  junctions={junctions}
                  roads={roads}
                  incidents={incidents}
                  roadBlocks={roadBlocks}
                  selectedJunction={selectedJunction}
                  onSelectJunction={(j) => {
                    setSelectedJunction(j);
                    if (j?.id) setTargetJunctionId(j.id);
                  }}
                  activeRoute={adminActiveRoute}
                  alternativeRoutes={adminAlternativeRoutes}
                  onSelectAlternativeRoute={(alt) => {
                    const prevActive = adminActiveRoute;
                    setAdminActiveRoute(alt);
                    setAdminAlternativeRoutes(prev => [prevActive, ...prev.filter(r => r.id !== alt.id)]);
                  }}
                  originPoint={adminOrigin}
                  destPoint={adminDest}
                  onClearRoute={handleAdminClearRoute}
                  isAdmin={true}
                  onAdminAction={(action) => {
                    if (action.type === 'MANAGE_SIGNAL') {
                      setTargetJunctionId(action.junctionId);
                      setActiveModule('signal');
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* MODULE 3: JUNCTION MANAGEMENT */}
          {activeModule === 'junctions' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, height: '100%' }}>
              <div className="card-panel" style={{ padding: 16, overflowY: 'auto' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
                  Intersection Network & Signal Management
                </h3>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Junction Name</th>
                      <th>District</th>
                      <th>Current Signal</th>
                      <th>Queue</th>
                      <th>Congestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {junctions.map(j => (
                      <tr
                        key={j.id}
                        onClick={() => setSelectedJunction(j)}
                        style={{ background: selectedJunction?.id === j.id ? '#EFF6FF' : 'transparent', cursor: 'pointer' }}
                      >
                        <td style={{ fontWeight: 700 }}>{j.id}</td>
                        <td>{j.name}</td>
                        <td style={{ color: '#64748B' }}>{j.district}</td>
                        <td style={{ fontWeight: 600, color: j.manualOverride ? '#8B5CF6' : '#10B981' }}>
                          {j.manualOverride ? 'OVERRIDE' : j.signalState}
                        </td>
                        <td>{j.queue} veh</td>
                        <td>
                          <span className={j.congestionLevel === 'HIGH' ? 'badge-high' : j.congestionLevel === 'MEDIUM' ? 'badge-medium' : 'badge-low'}>
                            {j.congestionLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detail Inspector */}
              <div className="card-panel" style={{ padding: 18 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>Intersection Inspector</h3>
                {selectedJunction && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{selectedJunction.id} - {selectedJunction.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>District: {selectedJunction.district}</div>
                    <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0' }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: selectedJunction.manualOverride ? '#DC2626' : '#10B981' }}>
                      Signal State: {selectedJunction.manualOverride ? `OVERRIDE: ${selectedJunction.overrideReason}` : selectedJunction.signalState}
                    </div>
                    <div style={{ fontSize: 13, color: '#334155' }}>
                      Queue Length: <strong>{selectedJunction.queue} vehicles</strong>
                    </div>
                    <div style={{ fontSize: 13, color: '#334155' }}>
                      Adaptive Cycle: {selectedJunction.cycle}s (Split: {selectedJunction.green}s/{selectedJunction.cycle - selectedJunction.green}s)
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginTop: 8 }}>Connected Corridors:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {roads.filter(r => r.from === selectedJunction.id || r.to === selectedJunction.id).map(r => (
                        <div key={r.id} style={{ fontSize: 12, color: r.blocked ? '#DC2626' : '#334155' }}>
                          • {r.name} [{r.blocked ? 'BLOCKED' : `${r.currentSpeed} km/h`}]
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODULE 4: LIVE CCTV SURVEILLANCE MATRIX */}
          {activeModule === 'cctv' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A2540' }}>Optical CCTV Surveillance Matrix</h2>
                  <p style={{ fontSize: 12, color: '#64748B' }}>
                    Live optical telemetry with autonomous traffic signal physics, vehicle queuing, and multi-angle scenes.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Filter by Junction */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label htmlFor="cctv-junction-filter" style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                      Filter by Junction:
                    </label>
                    <select
                      id="cctv-junction-filter"
                      value={cctvJunctionFilter}
                      onChange={(e) => setCctvJunctionFilter(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#1E293B',
                        background: '#FFFFFF',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="ALL">All Intersections ({cctvFeeds.length} Feeds)</option>
                      {junctions.map(j => (
                        <option key={j.id} value={j.id}>{j.id} - {j.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Security Level & Demo Mode Badge */}
                  <div
                    style={{
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '6px 12px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#065F46'
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>SIMULATED LIVE FEED — DEMO MODE</span>
                  </div>
                </div>
              </div>

              {/* CCTV Camera Grid */}
              <div
                id="cctv-matrix-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: 16
                }}
              >
                {(cctvJunctionFilter === 'ALL'
                  ? cctvFeeds
                  : cctvFeeds.filter(feed => feed.junctionId === cctvJunctionFilter)
                ).map(feed => {
                  const assocJunction = junctions.find(j => j.id === feed.junctionId) || junctions[0];
                  return (
                    <CctvSimulationFeed
                      key={feed.id}
                      feed={feed}
                      junction={assocJunction}
                      onCaptureSnapshot={handleCaptureSnapshot}
                      onToggleStatus={handleToggleFeedStatus}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* MODULE 5: SIGNAL CONTROL & OVERRIDE */}
          {activeModule === 'signal' && (
            <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A2540' }}>Signal Phasing & Manual Override Console</h2>
                <p style={{ fontSize: 12, color: '#64748B' }}>Authorized interface for adjusting cycle timing and enforcing emergency overrides.</p>
              </div>

              {/* Target Junction Picker */}
              <div className="card-panel" style={{ padding: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
                  Target Intersection
                </label>
                <select
                  value={targetJunctionId}
                  onChange={(e) => setTargetJunctionId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                >
                  {junctions.map(j => (
                    <option key={j.id} value={j.id}>{j.id} - {j.name}</option>
                  ))}
                </select>
              </div>

              {/* Timing Sliders */}
              <div className="card-panel" style={{ padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Adaptive Cycle Timing Configuration</div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    <span>Total Cycle Duration:</span>
                    <span>{cycleDuration} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="150"
                    value={cycleDuration}
                    onChange={(e) => setCycleDuration(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#2563EB' }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    <span>North-South Green Phase Split:</span>
                    <span>{greenDuration} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="90"
                    value={greenDuration}
                    onChange={(e) => setGreenDuration(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#2563EB' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const jName = junctions.find(j => j.id === targetJunctionId)?.name;
                    addAudit('TIMING_UPDATE', jName, `Cycle: ${cycleDuration}s, Green: ${greenDuration}s`);
                    alert(`Timings synchronized to controller for ${jName}`);
                  }}
                  className="btn-accent"
                >
                  Update Controller Timings
                </button>
              </div>

              {/* Authorized Manual Override Interlock */}
              <div className="card-panel" style={{ padding: 16, border: '1.5px solid #FCA5A5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>Authorized Manual Phase Override</span>
                  <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                    AUDITED INTERLOCK
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#7F1D1D', marginBottom: 12 }}>
                  Manual overrides disengage adaptive cycle algorithms. All actions require a mandatory operational justification logged to the official audit archive.
                </p>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
                    Operational Justification (Mandatory):
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. VIP motorcade clearance / Police dispatch directive"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                  />
                  {overrideError && (
                    <div style={{ color: '#EF4444', fontSize: 11.5, fontWeight: 600, marginTop: 4 }}>{overrideError}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => handleApplyOverride('GREEN_NORTH_SOUTH')} className="btn-success">
                    Force Green (North-South)
                  </button>
                  <button onClick={() => handleApplyOverride('GREEN_EAST_WEST')} className="btn-accent">
                    Force Green (East-West)
                  </button>
                  <button onClick={() => handleApplyOverride('ALL_RED')} className="btn-danger">
                    Force All-Red (Stop All)
                  </button>
                  <button onClick={handleRevertAuto} className="btn-secondary">
                    Revert to Automatic Cycle
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 6: EMERGENCY PRIORITY */}
          {activeModule === 'emergency' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A2540' }}>Emergency Corridor & Green-Wave Preemption</h2>
                  <p style={{ fontSize: 12, color: '#64748B' }}>Automated priority synchronization for ambulances, fire engines, and rapid response units.</p>
                </div>
                <button onClick={() => setShowEmergencyModal(true)} className="btn-accent">
                  <PlusCircle size={15} />
                  <span>Register Emergency Vehicle</span>
                </button>
              </div>

              <div className="card-panel" style={{ padding: 16 }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Vehicle Code</th>
                      <th>Type</th>
                      <th>Mission Reference</th>
                      <th>Corridor</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emergencyDispatches.map(disp => (
                      <tr key={disp.id}>
                        <td style={{ fontWeight: 800, color: '#1E293B' }}>{disp.vehicleCode}</td>
                        <td>{disp.type}</td>
                        <td>{disp.mission}</td>
                        <td style={{ fontWeight: 600 }}>{disp.corridor.join(' ➔ ')}</td>
                        <td>
                          <span className={disp.status === 'CORRIDOR_ACTIVE' ? 'badge-low' : 'badge-medium'}>
                            {disp.status}
                          </span>
                        </td>
                        <td>
                          {disp.status === 'CORRIDOR_ACTIVE' ? (
                            <button onClick={() => handleReleaseEmergency(disp)} className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}>
                              Release Corridor
                            </button>
                          ) : (
                            <button onClick={() => handleActivateGreenWave(disp)} className="btn-success" style={{ fontSize: 11, padding: '4px 8px' }}>
                              Enforce Green Wave
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODULE 7: ROADBLOCKS & INCIDENTS */}
          {activeModule === 'roadblocks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A2540' }}>Roadblock Management & Incident Verification</h2>
                <p style={{ fontSize: 12, color: '#64748B' }}>Review citizen reports and authorize official carriageway closures.</p>
              </div>

              {/* Road Closures Section */}
              <div className="card-panel" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A2540' }}>Verified Road Closures</h3>
                  <button onClick={() => setShowClosureModal(true)} className="btn-accent">
                    + Establish Road Closure
                  </button>
                </div>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Affected Road</th>
                      <th>Closure Justification</th>
                      <th>Enforcing Authority</th>
                      <th>Est. Clearance</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roadBlocks.map(rb => (
                      <tr key={rb.id}>
                        <td style={{ fontWeight: 700 }}>{rb.id}</td>
                        <td style={{ fontWeight: 600 }}>{rb.roadName}</td>
                        <td>{rb.reason}</td>
                        <td>{rb.authority}</td>
                        <td>{rb.expectedClearance}</td>
                        <td>
                          <span className={rb.status === 'ACTIVE' ? 'badge-high' : 'badge-low'}>
                            {rb.status}
                          </span>
                        </td>
                        <td>
                          {rb.status === 'ACTIVE' && (
                            <button onClick={() => handleClearClosure(rb)} className="btn-success" style={{ fontSize: 11, padding: '4px 8px' }}>
                              Reopen
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Incident Queue Section */}
              <div className="card-panel" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A2540' }}>Incident Verification Queue</h3>
                  <button onClick={() => setShowIncidentModal(true)} className="btn-secondary">
                    + Log Incident
                  </button>
                </div>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Incident Title</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Location</th>
                      <th>Reported By</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map(inc => (
                      <tr key={inc.id}>
                        <td style={{ fontWeight: 700 }}>{inc.id}</td>
                        <td style={{ fontWeight: 600 }}>{inc.title}</td>
                        <td>{inc.type}</td>
                        <td>
                          <span className={inc.severity === 'HIGH' ? 'badge-high' : 'badge-medium'}>{inc.severity}</span>
                        </td>
                        <td>{inc.location}</td>
                        <td>{inc.reportedBy}</td>
                        <td>
                          <span className={inc.status === 'VERIFIED_PUBLISHED' ? 'badge-low' : 'badge-medium'}>
                            {inc.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {inc.status === 'PENDING_REVIEW' && (
                              <button onClick={() => handleVerifyIncident(inc)} className="btn-accent" style={{ fontSize: 11, padding: '4px 8px' }}>
                                Verify & Alert
                              </button>
                            )}
                            {inc.status !== 'RESOLVED' && (
                              <button onClick={() => handleResolveIncident(inc)} className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}>
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODULE 8: REPORTS & AUDIT LOG */}
          {activeModule === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A2540' }}>Audit Trail & Operational Control History</h2>
                  <p style={{ fontSize: 12, color: '#64748B' }}>Cryptographically sequenced, immutable audit records of all manual interventions.</p>
                </div>
                <button onClick={exportAuditCSV} className="btn-secondary">
                  <Download size={15} />
                  <span>Export Audit Archive (.CSV)</span>
                </button>
              </div>

              <div className="card-panel" style={{ padding: 16 }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>Timestamp</th>
                      <th>Administrator</th>
                      <th>Action Type</th>
                      <th>Target Subsystem</th>
                      <th>Operational Reason / Payload</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{log.id}</td>
                        <td style={{ fontFamily: 'monospace', color: '#64748B' }}>{log.time}</td>
                        <td style={{ fontWeight: 600 }}>{log.admin}</td>
                        <td><code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{log.action}</code></td>
                        <td>{log.target}</td>
                        <td>{log.reason}</td>
                        <td><span className="badge-low">{log.result}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Establish Road Closure */}
      {showClosureModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFF', borderRadius: 12, width: 450, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0A2540', marginBottom: 12 }}>Authorize Official Carriageway Closure</h3>
            <form onSubmit={handleCreateClosure} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Select Road</label>
                <select
                  value={newClosureRoad}
                  onChange={(e) => setNewClosureRoad(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                >
                  {roads.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Closure Justification</label>
                <input
                  type="text"
                  required
                  value={newClosureReason}
                  onChange={(e) => setNewClosureReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Enforcing Authority</label>
                <input
                  type="text"
                  required
                  value={newClosureAuth}
                  onChange={(e) => setNewClosureAuth(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Est. Reopening</label>
                <input
                  type="text"
                  required
                  value={newClosureEst}
                  onChange={(e) => setNewClosureEst(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowClosureModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-danger">Authorize Closure</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Log Citizen Incident */}
      {showIncidentModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFF', borderRadius: 12, width: 450, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0A2540', marginBottom: 12 }}>Log Road Obstruction Incident</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const newInc = {
                id: `INC-${100 + incidents.length + 1}`,
                title: newIncTitle,
                type: newIncType,
                severity: newIncSev,
                location: newIncLoc,
                reportedBy: 'Field Operations Unit',
                description: 'Obstruction noted on carriageway; patrol officer attending.',
                status: 'PENDING_REVIEW',
                time: new Date().toTimeString().split(' ')[0],
                verifiedBy: ''
              };
              setIncidents(prev => [newInc, ...prev]);
              addAudit('INCIDENT_LOGGED', newIncTitle, newIncLoc);
              setShowIncidentModal(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Incident Title</label>
                <input
                  type="text"
                  required
                  value={newIncTitle}
                  onChange={(e) => setNewIncTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Location</label>
                <input
                  type="text"
                  required
                  value={newIncLoc}
                  onChange={(e) => setNewIncLoc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowIncidentModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-accent">Submit Incident</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Register Emergency Dispatch */}
      {showEmergencyModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFF', borderRadius: 12, width: 450, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0A2540', marginBottom: 12 }}>Register Emergency Dispatch</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const newDisp = {
                id: `EMG-${400 + emergencyDispatches.length + 1}`,
                vehicleCode: newEmgCode,
                type: newEmgType,
                mission: newEmgMission,
                origin: 'Headquarters Station (J1)',
                destination: 'Tech Innovation Park (J3)',
                corridor: ['J1', 'J3'],
                status: 'CORRIDOR_ACTIVE',
                timeSaved: 5
              };
              setEmergencyDispatches(prev => [newDisp, ...prev]);
              handleActivateGreenWave(newDisp);
              setShowEmergencyModal(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Vehicle Code</label>
                <input
                  type="text"
                  required
                  value={newEmgCode}
                  onChange={(e) => setNewEmgCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mission Reference</label>
                <input
                  type="text"
                  required
                  value={newEmgMission}
                  onChange={(e) => setNewEmgMission(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowEmergencyModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-success">Authorize & Preempt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Forensic Frame Snapshot Viewer */}
      {activeCctvSnapshot && (
        <div
          id="cctv-snapshot-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 16
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              maxWidth: 580,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera size={18} color="#0A3963" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                  Forensic Frame Snapshot — {activeCctvSnapshot.feed.name}
                </h3>
              </div>
              <button
                type="button"
                id="close-snapshot-btn"
                onClick={() => setActiveCctvSnapshot(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Snapshot Image Preview */}
              <div style={{ width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #CBD5E1', background: '#000' }}>
                <img
                  id="snapshot-image-preview"
                  src={activeCctvSnapshot.dataUrl}
                  alt="Forensic Frame Preview"
                  style={{ width: '100%', display: 'block' }}
                />
              </div>

              {/* Metadata Details */}
              <div style={{ background: '#F1F5F9', borderRadius: 8, padding: 12, fontSize: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <div><strong style={{ color: '#475569' }}>Camera ID:</strong> <span style={{ color: '#0F172A', fontWeight: 600 }}>{activeCctvSnapshot.feed.id}</span></div>
                <div><strong style={{ color: '#475569' }}>Intersection:</strong> <span style={{ color: '#0F172A', fontWeight: 600 }}>{activeCctvSnapshot.feed.junctionName}</span></div>
                <div><strong style={{ color: '#475569' }}>Approach:</strong> <span style={{ color: '#0F172A', fontWeight: 600 }}>{activeCctvSnapshot.feed.direction}</span></div>
                <div><strong style={{ color: '#475569' }}>Signal State:</strong> <span style={{ color: activeCctvSnapshot.meta.signalState === 'GREEN' ? '#10B981' : '#EF4444', fontWeight: 700 }}>{activeCctvSnapshot.meta.signalState}</span></div>
                <div><strong style={{ color: '#475569' }}>Resolution:</strong> <span style={{ color: '#0F172A', fontWeight: 600 }}>{activeCctvSnapshot.feed.resolution}</span></div>
                <div><strong style={{ color: '#475569' }}>Timestamp:</strong> <span style={{ color: '#0F172A', fontWeight: 600 }}>{new Date(activeCctvSnapshot.meta.timestamp).toLocaleTimeString()}</span></div>
              </div>
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#F8FAFC' }}>
              <button
                type="button"
                onClick={() => setActiveCctvSnapshot(null)}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: 13 }}
              >
                Close
              </button>
              <button
                type="button"
                id="download-snapshot-btn"
                onClick={handleDownloadSnapshot}
                className="btn-accent"
                style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} />
                <span>Download Snapshot PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
