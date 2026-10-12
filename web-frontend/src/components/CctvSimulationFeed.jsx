import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw, Download, X, Eye, ShieldCheck, AlertCircle } from 'lucide-react';

/**
 * CctvSimulationFeed
 * Real-time HTML5 Canvas simulated live traffic camera feed.
 * Features:
 * - Distinct animated scenes for every camera (CAM-01 through CAM-09)
 * - Vehicles (cars, buses, trucks, bikes, taxis, shuttles) and pedestrians
 * - Independent traffic signal simulation obeying the junction's signal state (RED, YELLOW, GREEN)
 * - Vehicle stopline queue physics and realistic smooth acceleration
 * - Surveillance HUD with blinking REC indicator, live timestamp, simulated FPS, and DEMO MODE watermark
 * - OFFLINE and MAINTENANCE diagnostic test patterns
 * - Forensic snapshot frame capture with preview and download
 */
export default function CctvSimulationFeed({
  feed,
  junction,
  onCaptureSnapshot,
  onToggleStatus
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [fps, setFps] = useState(feed.fps || 30);
  const [activeVehiclesCount, setActiveVehiclesCount] = useState(0);
  const [cameraOnline, setCameraOnline] = useState(feed.online !== false);

  // Synchronize with prop changes if feed.online changes externally
  useEffect(() => {
    setCameraOnline(feed.online !== false);
  }, [feed.online]);

  // Determine effective traffic signal for this camera's approach
  // Directions: North/South vs East/West
  const getApproachSignal = () => {
    if (!junction) return 'GREEN';
    const state = junction.signalState || 'GREEN_NORTH_SOUTH';
    if (state === 'ALL_RED') return 'RED';

    const dir = (feed.direction || '').toLowerCase();
    const isEastWest = dir.includes('east') || dir.includes('west');

    if (isEastWest) {
      return state === 'GREEN_EAST_WEST' ? 'GREEN' : 'RED';
    } else {
      return state === 'GREEN_NORTH_SOUTH' ? 'GREEN' : 'RED';
    }
  };

  const currentSignal = getApproachSignal();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 380;
    const height = 210;
    canvas.width = width;
    canvas.height = height;

    // Simulation entity storage per feed instance
    const id = feed.id;
    let vehicles = [];
    let pedestrians = [];
    let trainProgress = -100;
    let tollScanTicks = 0;
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let currentFpsDisplay = feed.fps || 30;

    // Initialize scene entities based on camera type
    const carColors = ['#E2E8F0', '#94A3B8', '#38BDF8', '#F87171', '#FBBF24', '#34D399', '#A78BFA', '#CBD5E1', '#F43F5E'];
    const taxiColor = '#F59E0B';
    const busColor = '#2563EB';

    const createVehicle = (x, y, vx, vy, type = 'car', length = 28, width = 14, color = null) => ({
      x,
      y,
      vx,
      vy,
      baseSpeed: vx !== 0 ? vx : vy,
      currentSpeed: vx !== 0 ? vx : vy,
      type,
      length,
      width,
      color: color || carColors[Math.floor(Math.random() * carColors.length)],
      stopping: false,
      stopped: false,
      waitingTicks: 0
    });

    // Populate initial traffic based on camera ID
    if (id === 'CAM-01') {
      // Central Square North PTZ: 4-Way Urban Crossroads
      vehicles = [
        createVehicle(40, 80, 1.8, 0, 'car', 26, 13),
        createVehicle(160, 80, 2.0, 0, 'taxi', 26, 13, taxiColor),
        createVehicle(290, 80, 2.2, 0, 'car', 28, 14),
        createVehicle(100, 105, 1.5, 0, 'bus', 48, 16, busColor),
        createVehicle(220, 105, 1.7, 0, 'car', 24, 12),
        // Cross traffic
        createVehicle(200, -30, 0, 1.6, 'car', 14, 26),
        createVehicle(225, 40, 0, 1.8, 'car', 14, 26)
      ];
      pedestrians = [
        { x: 130, y: 155, vy: -0.6, color: '#38BDF8' },
        { x: 135, y: 175, vy: -0.5, color: '#F472B6' },
        { x: 260, y: 55, vy: 0.6, color: '#FCD34D' }
      ];
    } else if (id === 'CAM-02') {
      // Central Square South High-Angle Rooftop
      vehicles = [
        createVehicle(30, 95, 2.0, 0, 'car', 28, 14),
        createVehicle(120, 95, 2.1, 0, 'suv', 30, 15),
        createVehicle(230, 95, 2.4, 0, 'taxi', 26, 13, taxiColor),
        createVehicle(70, 125, 1.6, 0, 'bus', 50, 17, busColor),
        createVehicle(180, 125, 1.9, 0, 'car', 26, 13),
        createVehicle(310, 125, 2.2, 0, 'bike', 16, 8, '#F59E0B')
      ];
    } else if (id === 'CAM-03') {
      // Metro Interchange Gantry: 3-Lane Highway + Overhead Metro Viaduct
      vehicles = [
        createVehicle(20, 75, 2.8, 0, 'car', 26, 13),
        createVehicle(140, 75, 3.0, 0, 'car', 28, 14),
        createVehicle(60, 105, 2.4, 0, 'truck', 44, 16, '#64748B'),
        createVehicle(190, 105, 2.6, 0, 'bus', 52, 17, busColor),
        createVehicle(100, 135, 3.2, 0, 'car', 28, 14),
        createVehicle(240, 135, 3.4, 0, 'suv', 32, 15)
      ];
    } else if (id === 'CAM-04') {
      // Tech Park East Gate: Corridor + Bike Lane + Shuttles
      vehicles = [
        createVehicle(30, 90, 1.9, 0, 'ev', 28, 14, '#38BDF8'),
        createVehicle(150, 90, 2.1, 0, 'car', 26, 13),
        createVehicle(80, 120, 1.5, 0, 'shuttle', 42, 16, '#10B981'),
        createVehicle(220, 120, 2.0, 0, 'ev', 28, 14, '#60A5FA'),
        // Bicycles in bike lane
        createVehicle(50, 55, 1.2, 0, 'bike', 16, 7, '#34D399'),
        createVehicle(170, 55, 1.1, 0, 'bike', 16, 7, '#FBBF24')
      ];
    } else if (id === 'CAM-05') {
      // Harbour Gateway Waterfront: Bridge Approach & Container Logistics
      vehicles = [
        createVehicle(30, 95, 2.2, 0, 'truck', 48, 17, '#0D9488'),
        createVehicle(140, 95, 2.4, 0, 'car', 26, 13),
        createVehicle(70, 125, 2.1, 0, 'truck', 52, 17, '#475569'),
        createVehicle(210, 125, 2.5, 0, 'car', 28, 14)
      ];
    } else if (id === 'CAM-06') {
      // West Ring Overpass: Dual-Level Flyover
      vehicles = [
        // Upper flyover level
        createVehicle(20, 55, 3.0, 0, 'car', 26, 13),
        createVehicle(140, 55, 3.2, 0, 'suv', 28, 14),
        createVehicle(260, 55, 3.4, 0, 'car', 26, 13),
        // Lower arterial surface level
        createVehicle(50, 135, 1.8, 0, 'truck', 46, 16, '#E11D48'),
        createVehicle(170, 135, 2.0, 0, 'car', 26, 13),
        createVehicle(290, 135, 2.2, 0, 'bus', 48, 16, busColor)
      ];
    } else if (id === 'CAM-07') {
      // University Circle Roundabout: Rotary Interlock
      vehicles = [
        createVehicle(20, 85, 1.8, 0, 'car', 24, 12),
        createVehicle(110, 85, 1.6, 0, 'car', 26, 13),
        createVehicle(220, 85, 1.9, 0, 'bike', 16, 7, '#F59E0B'),
        createVehicle(70, 130, -1.7, 0, 'car', 26, 13),
        createVehicle(200, 130, -1.8, 0, 'bus', 46, 15, busColor)
      ];
      pedestrians = [
        { x: 300, y: 60, vy: 0.5, color: '#38BDF8' },
        { x: 310, y: 150, vy: -0.5, color: '#A78BFA' }
      ];
    } else if (id === 'CAM-08') {
      // Airport Expressway Toll Plaza: Toll Booths & FASTag Gates
      vehicles = [
        createVehicle(20, 60, 1.6, 0, 'taxi', 26, 13, taxiColor),
        createVehicle(110, 60, 1.8, 0, 'car', 28, 14),
        createVehicle(40, 95, 1.4, 0, 'bus', 50, 16, busColor),
        createVehicle(150, 95, 1.7, 0, 'car', 26, 13),
        createVehicle(60, 130, 1.8, 0, 'car', 26, 13),
        createVehicle(180, 130, 2.0, 0, 'suv', 30, 14),
        createVehicle(90, 165, 1.7, 0, 'taxi', 26, 13, taxiColor)
      ];
    } else {
      // CAM-09: Grand Station Multimodal Hub
      vehicles = [
        createVehicle(30, 80, 1.7, 0, 'bus', 48, 16, busColor),
        createVehicle(140, 80, 1.9, 0, 'taxi', 26, 13, taxiColor),
        createVehicle(60, 115, 1.6, 0, 'taxi', 26, 13, taxiColor),
        createVehicle(180, 115, 1.8, 0, 'car', 26, 13),
        createVehicle(90, 150, 1.5, 0, 'bus', 52, 17, '#059669')
      ];
      pedestrians = [
        { x: 40, y: 185, vx: 0.6, vy: 0, color: '#E2E8F0' },
        { x: 90, y: 188, vx: 0.5, vy: 0, color: '#F472B6' },
        { x: 180, y: 185, vx: -0.6, vy: 0, color: '#38BDF8' }
      ];
    }

    let isRunning = true;

    // Simulation render loop
    const render = (time) => {
      if (!isRunning) return;

      // Calculate dynamic FPS display
      frameCount++;
      if (time - lastFpsUpdate >= 1000) {
        const measured = Math.round((frameCount * 1000) / (time - lastFpsUpdate));
        // Add subtle realistic fluctuation (e.g. 29.8 - 30.2)
        const jitter = (Math.random() * 0.6 - 0.3);
        const targetFps = feed.fps || 30;
        currentFpsDisplay = Math.max(15, Math.min(65, Number((targetFps + jitter).toFixed(1))));
        setFps(currentFpsDisplay);
        setActiveVehiclesCount(vehicles.length);
        frameCount = 0;
        lastFpsUpdate = time;
      }

      // ----------------------------------------------------
      // CASE 1: OFFLINE / MAINTENANCE TEST PATTERN
      // ----------------------------------------------------
      if (!cameraOnline) {
        ctx.fillStyle = '#050B14';
        ctx.fillRect(0, 0, width, height);

        // Surveillance Static Scanlines & Noise
        const noiseCount = 350;
        for (let i = 0; i < noiseCount; i++) {
          const nx = Math.random() * width;
          const ny = Math.random() * height;
          const nw = Math.random() * 8 + 2;
          const nh = Math.random() * 2 + 1;
          const gray = Math.floor(Math.random() * 90);
          ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
          ctx.fillRect(nx, ny, nw, nh);
        }

        // SMPTE Diagnostic Color Bars at bottom
        const barColors = ['#E2E8F0', '#FACC15', '#06B6D4', '#22C55E', '#EC4899', '#EF4444', '#1D4ED8'];
        const barWidth = width / barColors.length;
        for (let b = 0; b < barColors.length; b++) {
          ctx.fillStyle = barColors[b];
          ctx.fillRect(b * barWidth, height - 32, barWidth, 12);
        }

        // Diagnostic Alert Banner
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(25, 65, width - 50, 65);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(25, 65, width - 50, 65);

        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('STREAM OFFLINE — SCHEDULED MAINTENANCE', width / 2, 88);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px monospace';
        ctx.fillText(`IP: ${feed.ip} • Awaiting Signal Controller Re-Sync`, width / 2, 105);
        ctx.fillText(`ID: ${feed.id} • ${feed.junctionName}`, width / 2, 118);

        // Top HUD
        renderHud(ctx, width, height, currentFpsDisplay, 'OFFLINE', feed);

        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // ----------------------------------------------------
      // CASE 2: ONLINE SIMULATED TRAFFIC SCENE
      // ----------------------------------------------------
      ctx.clearRect(0, 0, width, height);

      // Draw background environment and road geometry
      drawRoadLayout(ctx, id, width, height);

      // Traffic Signal Reaction Logic
      // Active stopline X coordinate (default ~ 190)
      const stopLineX = (id === 'CAM-08') ? 140 : 185;
      const signalState = getApproachSignal();

      // Update & Draw Vehicles
      vehicles.forEach((veh, index) => {
        // Vehicle queuing and stop physics
        if (veh.vx > 0) {
          // Right-moving vehicles approaching stopline
          const isApproachingStopLine = veh.x + veh.length < stopLineX && veh.x + veh.length > stopLineX - 95;
          const leadVehicle = vehicles.find((other, oi) =>
            oi !== index &&
            other.vx > 0 &&
            Math.abs(other.y - veh.y) < 12 &&
            other.x > veh.x &&
            other.x - (veh.x + veh.length) < 28
          );

          if (leadVehicle) {
            // Decelerate behind lead vehicle in queue
            veh.currentSpeed = Math.max(0, leadVehicle.currentSpeed * 0.6);
            veh.stopping = true;
          } else if (isApproachingStopLine && (signalState === 'RED' || signalState === 'YELLOW')) {
            // Distance to stopline
            const dist = stopLineX - (veh.x + veh.length);
            if (dist > 4) {
              veh.currentSpeed = Math.max(0.2, (dist / 95) * veh.baseSpeed);
              veh.stopping = true;
            } else {
              veh.currentSpeed = 0;
              veh.stopped = true;
              veh.stopping = true;
            }
          } else {
            // Signal is green or vehicle passed stopline -> accelerate to normal speed
            veh.currentSpeed = Math.min(veh.baseSpeed, veh.currentSpeed + 0.08);
            veh.stopping = false;
            veh.stopped = false;
          }

          veh.x += veh.currentSpeed;

          // Wrap around after exiting view
          if (veh.x > width + 40) {
            veh.x = -60 - Math.random() * 40;
            veh.currentSpeed = veh.baseSpeed;
          }
        } else if (veh.vx < 0) {
          // Left-moving vehicles (e.g. CAM-07 roundabout bottom arm)
          veh.x += veh.currentSpeed;
          if (veh.x < -60) {
            veh.x = width + 40;
          }
        } else if (veh.vy > 0) {
          // Cross-traffic North-to-South (e.g. CAM-01 cross street)
          // Cross street moves freely when main arterial is RED!
          const crossGreen = signalState === 'RED';
          if (!crossGreen && veh.y > 20 && veh.y < 70) {
            veh.currentSpeed = Math.max(0, veh.currentSpeed * 0.85);
          } else {
            veh.currentSpeed = Math.min(veh.baseSpeed, veh.currentSpeed + 0.08);
          }
          veh.y += veh.currentSpeed;
          if (veh.y > height + 40) {
            veh.y = -50 - Math.random() * 30;
          }
        }

        // Draw vehicle body
        drawVehicle(ctx, veh);
      });

      // Special Scene Dynamics
      if (id === 'CAM-03') {
        // Metro Train crossing on overhead viaduct every ~10s
        trainProgress += 3.2;
        if (trainProgress > width + 200) trainProgress = -160;
        drawMetroTrain(ctx, trainProgress);
      }

      if (id === 'CAM-08') {
        // Electronic FASTag Toll Scan Flash
        tollScanTicks = (tollScanTicks + 1) % 60;
        if (tollScanTicks < 18) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
          ctx.beginPath();
          ctx.arc(142, 70, 8, 0, Math.PI * 2);
          ctx.arc(142, 105, 8, 0, Math.PI * 2);
          ctx.arc(142, 140, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Pedestrians
      pedestrians.forEach(ped => {
        if (ped.vy) {
          // Pedestrians cross when vehicle signal is RED!
          if (signalState === 'RED') {
            ped.y += ped.vy;
            if (ped.y < 35 || ped.y > 175) ped.vy *= -1;
          }
        } else if (ped.vx) {
          ped.x += ped.vx;
          if (ped.x > width + 20) ped.x = -20;
          if (ped.x < -20) ped.x = width + 20;
        }
        drawPedestrian(ctx, ped);
      });

      // Render Camera Specific Overlays & Stop Lights
      drawSignalPoles(ctx, id, signalState, stopLineX);

      // Render Lens Vignette & Professional Surveillance HUD
      renderHud(ctx, width, height, currentFpsDisplay, signalState, feed);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [feed.id, cameraOnline, currentSignal, junction?.signalState]);

  // Capture frame function
  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString();
      const meta = {
        cameraId: feed.id,
        cameraName: feed.name,
        junctionName: feed.junctionName,
        direction: feed.direction,
        signalState: currentSignal,
        resolution: feed.resolution,
        fps,
        vehiclesCount: activeVehiclesCount,
        timestamp
      };
      if (onCaptureSnapshot) {
        onCaptureSnapshot(dataUrl, feed, meta);
      }
    } catch (err) {
      console.error('Frame capture failed:', err);
    }
  };

  // Toggle stream status (ONLINE <-> MAINTENANCE)
  const handleToggleOnline = () => {
    const nextState = !cameraOnline;
    setCameraOnline(nextState);
    if (onToggleStatus) {
      onToggleStatus(feed.id, nextState);
    }
  };

  return (
    <div
      className="card-panel"
      id={`cctv-card-${feed.id}`}
      style={{
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: cameraOnline ? '#10B981' : '#EF4444',
              boxShadow: cameraOnline ? '0 0 6px #10B981' : '0 0 6px #EF4444'
            }}
          />
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: '#0F172A',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={feed.name}
          >
            {feed.name}
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggleOnline}
          title="Click to toggle Stream Status (Simulation Testing)"
          style={{
            background: cameraOnline ? '#ECFDF5' : '#FEE2E2',
            border: `1px solid ${cameraOnline ? '#A7F3D0' : '#FECACA'}`,
            color: cameraOnline ? '#059669' : '#DC2626',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span>{cameraOnline ? 'ONLINE' : 'MAINTENANCE'}</span>
          <RefreshCw size={10} style={{ opacity: 0.7 }} />
        </button>
      </div>

      {/* Simulated Video Canvas Container */}
      <div
        style={{
          width: '100%',
          height: 170,
          background: '#050B14',
          borderRadius: 6,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 16px rgba(0,0,0,0.8)',
          border: '1px solid #1E293B'
        }}
      >
        <canvas
          ref={canvasRef}
          id={`canvas-${feed.id}`}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover'
          }}
        />
      </div>

      {/* Card Footer Details & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>
            {feed.junctionName}
          </span>
          <span style={{ fontSize: 10, color: '#64748B' }}>
            {feed.direction} • {feed.resolution}
          </span>
        </div>

        <button
          type="button"
          id={`capture-btn-${feed.id}`}
          onClick={handleCapture}
          className="btn-secondary"
          style={{
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5
          }}
          title="Capture forensic frame"
        >
          <Camera size={12} color="#0A3963" />
          <span>Capture</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Canvas Helper Functions: Scenes, Vehicles, Roadways, Signals & HUD
// ============================================================================

function drawRoadLayout(ctx, id, width, height) {
  // Base asphalt background
  ctx.fillStyle = '#1A2232';
  ctx.fillRect(0, 0, width, height);

  if (id === 'CAM-01') {
    // 4-Way Urban Intersection: Connaught Place Radial Crossroads
    // Sidewalks
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 150, 50);
    ctx.fillRect(230, 0, 150, 50);
    ctx.fillRect(0, 150, 150, 60);
    ctx.fillRect(230, 150, 150, 60);

    // Main East-West roadway lanes
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 95);
    ctx.lineTo(150, 95);
    ctx.moveTo(230, 95);
    ctx.lineTo(width, 95);
    ctx.stroke();

    // North-South cross avenue
    ctx.beginPath();
    ctx.moveTo(190, 0);
    ctx.lineTo(190, 50);
    ctx.moveTo(190, 150);
    ctx.lineTo(190, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stoplines & Zebra crosswalks
    drawZebraCrosswalk(ctx, 142, 50, 8, 100);
    drawZebraCrosswalk(ctx, 230, 50, 8, 100);
  } else if (id === 'CAM-02') {
    // High-Angle Plaza Approach
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 45, width, 120);

    // Green median planter
    ctx.fillStyle = '#065F46';
    ctx.fillRect(0, 108, width, 5);

    // Curbs & Sidewalks
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, width, 45);
    ctx.fillRect(0, 165, width, 45);

    // Tree planter circles
    ctx.fillStyle = '#047857';
    for (let x = 30; x < width; x += 75) {
      ctx.beginPath();
      ctx.arc(x, 24, 9, 0, Math.PI * 2);
      ctx.arc(x, 185, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lane dashes
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 78);
    ctx.lineTo(width, 78);
    ctx.moveTo(0, 138);
    ctx.lineTo(width, 138);
    ctx.stroke();
    ctx.setLineDash([]);

    drawZebraCrosswalk(ctx, 185, 45, 8, 120);
  } else if (id === 'CAM-03') {
    // Metro Interchange: Overhead Metro Viaduct + 3-Lane Highway
    // Asphalt highway (3 lanes)
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 55, width, 115);

    // Overhead Metro Viaduct concrete structure
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 12, width, 30);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 22, width, 4);

    // Concrete Viaduct support pillars
    ctx.fillStyle = '#64748B';
    ctx.fillRect(60, 42, 14, 18);
    ctx.fillRect(200, 42, 14, 18);
    ctx.fillRect(320, 42, 14, 18);

    // Highway Lane Dividers
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(0, 92);
    ctx.lineTo(width, 92);
    ctx.moveTo(0, 130);
    ctx.lineTo(width, 130);
    ctx.stroke();
    ctx.setLineDash([]);

    // Overhead steel gantry bar
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(180, 55, 6, 115);
    ctx.fillStyle = '#0369A1';
    ctx.fillRect(177, 52, 12, 6);
    ctx.fillRect(177, 166, 12, 6);

    // Stopline
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(185, 55, 4, 115);
  } else if (id === 'CAM-04') {
    // Tech Park Innovation Corridor: Dedicated Green Bike Lane + Boulevard
    // Sidewalk & Modern Tech Facade
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, 40);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(40, 6, 30, 26);
    ctx.fillRect(120, 6, 40, 26);
    ctx.fillRect(220, 6, 35, 26);
    ctx.fillRect(300, 6, 45, 26);

    // Green Painted Cycle Lane
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, 42, width, 26);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, 55);
    ctx.lineTo(width, 55);
    ctx.stroke();
    ctx.setLineDash([]);

    // Car Arterial Lanes
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 70, width, 95);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 118);
    ctx.lineTo(width, 118);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pedestrian promenade
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 167, width, 43);

    drawZebraCrosswalk(ctx, 185, 42, 8, 123);
  } else if (id === 'CAM-05') {
    // Harbour Gateway Waterfront & Bridge Approach
    // Sea / Bay water in background
    ctx.fillStyle = '#0369A1';
    ctx.fillRect(0, 0, width, 60);

    // Water wave highlights
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1;
    for (let wy = 12; wy < 55; wy += 10) {
      ctx.beginPath();
      ctx.arc(60, wy, 25, 0, Math.PI);
      ctx.arc(180, wy, 35, 0, Math.PI);
      ctx.arc(300, wy, 30, 0, Math.PI);
      ctx.stroke();
    }

    // Suspension Bridge Cables
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(80, 0);
    ctx.lineTo(80, 60);
    ctx.moveTo(300, 0);
    ctx.lineTo(300, 60);
    ctx.stroke();

    // Expressway Bridge Deck
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 60, width, 115);
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(0, 115);
    ctx.lineTo(width, 115);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bridge Guardrail
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 58, width, 4);
    ctx.fillRect(0, 175, width, 6);

    drawZebraCrosswalk(ctx, 185, 60, 6, 115);
  } else if (id === 'CAM-06') {
    // West Ring Overpass: Dual-Level Elevated Flyover
    // Lower surface roadway
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 110, width, 75);

    // Concrete Overpass Bridge (Upper Deck)
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 30, width, 65);
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 36, width, 52);

    // Overpass Lane Divider
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 62);
    ctx.lineTo(width, 62);
    ctx.stroke();
    ctx.setLineDash([]);

    // Flyover Support Pillars
    ctx.fillStyle = '#64748B';
    ctx.fillRect(50, 88, 16, 22);
    ctx.fillRect(190, 88, 16, 22);
    ctx.fillRect(310, 88, 16, 22);

    // Lower Stopline
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(185, 110, 4, 75);
  } else if (id === 'CAM-07') {
    // University Circle Roundabout
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);

    // Center Rotary Green Island
    ctx.fillStyle = '#065F46';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 42, 0, Math.PI * 2);
    ctx.fill();

    // Central Monument / Fountain
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 14, 0, Math.PI * 2);
    ctx.fill();

    // Roundabout circulatory dashed lane
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    drawZebraCrosswalk(ctx, 80, 20, 8, 45);
    drawZebraCrosswalk(ctx, 280, 140, 8, 45);
  } else if (id === 'CAM-08') {
    // Airport Expressway Toll Plaza
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 35, width, 150);

    // Toll Lanes Dividers
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 78, 140, 4);
    ctx.fillRect(0, 113, 140, 4);
    ctx.fillRect(0, 148, 140, 4);

    // Toll Booth Cabins
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(135, 42, 12, 18);
    ctx.fillRect(135, 78, 12, 18);
    ctx.fillRect(135, 114, 12, 18);
    ctx.fillRect(135, 150, 12, 18);

    // FASTag LED Canopy Bar
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(128, 30, 24, 160);

    // Green Arrow LEDs on Booths
    ctx.fillStyle = '#10B981';
    ctx.fillRect(138, 38, 4, 4);
    ctx.fillRect(138, 74, 4, 4);
    ctx.fillRect(138, 110, 4, 4);
    ctx.fillRect(138, 146, 4, 4);

    // Stop Bar
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(148, 35, 2, 150);
  } else {
    // CAM-09: Grand Central Station Terminal Plaza
    // Station Front Walkway & Drop-off
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, width, 45);
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 175, width, 35);

    // Taxi & Bus Drop-off Roadway
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 45, width, 130);

    // Bus Bay Markings
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 95);
    ctx.lineTo(width, 95);
    ctx.moveTo(0, 135);
    ctx.lineTo(width, 135);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stopline
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(185, 45, 4, 130);
  }
}

function drawZebraCrosswalk(ctx, x, y, width, height) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (let dy = y; dy < y + height; dy += 12) {
    ctx.fillRect(x, dy, width, 6);
  }
}

function drawVehicle(ctx, veh) {
  ctx.save();
  ctx.fillStyle = veh.color;

  // Vehicle shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  // Rounded vehicle body
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(veh.x, veh.y, veh.length, veh.width, 3);
    ctx.fill();
  } else {
    ctx.fillRect(veh.x, veh.y, veh.length, veh.width);
  }
  ctx.shadowColor = 'transparent';

  // Windshield & Roof details
  ctx.fillStyle = '#0F172A';
  if (veh.length > 35) {
    // Bus / Truck Windows
    ctx.fillRect(veh.x + 4, veh.y + 2, 10, Math.max(2, veh.width - 4));
    ctx.fillStyle = '#475569';
    ctx.fillRect(veh.x + 18, veh.y + 2, Math.max(4, veh.length - 24), Math.max(2, veh.width - 4));
  } else if (veh.type === 'bike') {
    // Bicycle / Scooter Rider
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(veh.x + veh.length / 2, veh.y + veh.width / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Passenger Car / Taxi / SUV
    ctx.fillRect(veh.x + 4, veh.y + 2, Math.min(8, veh.length - 8), Math.max(2, veh.width - 4));
    if (veh.length > 20) {
      ctx.fillRect(veh.x + 15, veh.y + 2, Math.min(5, veh.length - 17), Math.max(2, veh.width - 4));
    }
  }

  // Headlights Beam
  ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
  ctx.beginPath();
  ctx.moveTo(veh.x + veh.length, veh.y + veh.width / 2);
  ctx.lineTo(veh.x + veh.length + 32, veh.y - 4);
  ctx.lineTo(veh.x + veh.length + 32, veh.y + veh.width + 4);
  ctx.closePath();
  ctx.fill();

  // Red Tail brake lights when slowing or stopped
  if (veh.stopping || veh.stopped) {
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(veh.x - 2, veh.y + 1, 2, 3);
    ctx.fillRect(veh.x - 2, veh.y + veh.width - 4, 2, 3);
  }

  ctx.restore();
}

function drawPedestrian(ctx, ped) {
  ctx.save();
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(ped.x, ped.y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMetroTrain(ctx, x) {
  ctx.save();
  ctx.fillStyle = '#0284C7';
  ctx.fillRect(x, 18, 140, 16);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 6, 22, 12, 8);
  ctx.fillRect(x + 24, 22, 12, 8);
  ctx.fillRect(x + 42, 22, 12, 8);
  ctx.fillRect(x + 60, 22, 12, 8);
  ctx.fillRect(x + 78, 22, 12, 8);
  ctx.fillRect(x + 96, 22, 12, 8);
  ctx.fillRect(x + 114, 22, 12, 8);
  // Red front stripe
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(x + 134, 18, 6, 16);
  ctx.restore();
}

function drawSignalPoles(ctx, id, signalState, stopLineX) {
  // Physical signal lamp assembly positioned near the stopline
  const poleX = stopLineX - 4;
  const poleY = 32;

  ctx.save();
  // Signal housing box
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(poleX, poleY, 12, 28);
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1;
  ctx.strokeRect(poleX, poleY, 12, 28);

  // Red aspect lamp
  ctx.fillStyle = signalState === 'RED' ? '#EF4444' : '#450A0A';
  if (signalState === 'RED') {
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 6;
  }
  ctx.beginPath();
  ctx.arc(poleX + 6, poleY + 6, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Yellow aspect lamp
  ctx.fillStyle = signalState === 'YELLOW' ? '#F59E0B' : '#451A03';
  if (signalState === 'YELLOW') {
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 6;
  }
  ctx.beginPath();
  ctx.arc(poleX + 6, poleY + 14, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Green aspect lamp
  ctx.fillStyle = signalState === 'GREEN' ? '#10B981' : '#064E3B';
  if (signalState === 'GREEN') {
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 6;
  }
  ctx.beginPath();
  ctx.arc(poleX + 6, poleY + 22, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.restore();
}

function renderHud(ctx, width, height, fps, signalState, feed) {
  ctx.save();

  // Top Dark Translucent Vignette Bar
  ctx.fillStyle = 'rgba(6, 15, 28, 0.75)';
  ctx.fillRect(0, 0, width, 24);

  // Bottom Dark Translucent Vignette Bar
  ctx.fillRect(0, height - 22, width, 22);

  // Top-Left: REC indicator and Camera Code
  const isOnline = signalState !== 'OFFLINE';
  ctx.fillStyle = isOnline ? '#EF4444' : '#64748B';
  ctx.beginPath();
  ctx.arc(12, 12, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`REC ${feed.id} [${feed.resolution}]`, 22, 15);

  // Top-Center: DEMO MODE WATERMARK
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SIMULATED LIVE FEED — DEMO MODE', width / 2, 15);

  // Top-Right: Surveillance Live Timestamp + FPS
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + Math.floor(now.getMilliseconds() / 100);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${timeStr} • ${fps} FPS`, width - 8, 15);

  // Bottom-Left: Live Traffic Signal HUD Status
  let sigColor = '#10B981';
  let sigText = 'SIGNAL: GREEN';
  if (signalState === 'RED') {
    sigColor = '#EF4444';
    sigText = 'SIGNAL: RED (STOP)';
  } else if (signalState === 'YELLOW') {
    sigColor = '#F59E0B';
    sigText = 'SIGNAL: YELLOW (SLOW)';
  } else if (signalState === 'OFFLINE') {
    sigColor = '#EF4444';
    sigText = 'SIGNAL: OFFLINE';
  }

  ctx.fillStyle = sigColor;
  ctx.beginPath();
  ctx.arc(12, height - 11, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 9.5px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(sigText, 22, height - 8);

  // Bottom-Right: Camera IP and PTZ Capability
  ctx.fillStyle = '#94A3B8';
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`IP: ${feed.ip} | PTZ: ${feed.ptz ? 'ON' : 'FIXED'}`, width - 8, height - 8);

  ctx.restore();
}
