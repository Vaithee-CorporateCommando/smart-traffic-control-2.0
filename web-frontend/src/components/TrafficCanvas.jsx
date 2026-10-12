import React, { useRef, useEffect, useState } from 'react';

export default function TrafficCanvas({
  junctions,
  roads,
  selectedJunction,
  onSelectJunction,
  highlightedRoute,
  onResetView
}) {
  const canvasRef = useRef(null);
  const [transform, setTransform] = useState({ panX: 40, panY: 30, zoom: 1.0 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Animated traffic particles along roads
  const particlesRef = useRef([]);

  useEffect(() => {
    // Initialize particles
    const list = [];
    roads.forEach(r => {
      if (r.blocked) return;
      const count = Math.max(1, Math.floor(r.lanes / 2));
      for (let i = 0; i < count; i++) {
        list.push({
          roadId: r.id,
          progress: Math.random(),
          speed: 0.08 + (r.currentSpeed / 150.0) * 0.15
        });
      }
    });
    particlesRef.current = list;
  }, [roads]);

  // Main 60 FPS animation loop
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const render = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Update particle positions
      particlesRef.current.forEach(p => {
        const road = roads.find(r => r.id === p.roadId);
        if (road && !road.blocked) {
          const speedFactor = Math.max(0.04, road.currentSpeed / 70.0);
          p.progress += dt * (p.speed * speedFactor);
          if (p.progress > 1.0) p.progress -= 1.0;
        }
      });

      draw();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [junctions, roads, selectedJunction, highlightedRoute, transform]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const { panX, panY, zoom } = transform;

    // 1. Subtle Background Grid
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.lineWidth = 1;
    const gridSize = 40 * zoom;
    const startX = panX % gridSize;
    const startY = panY % gridSize;
    for (let x = startX; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = startY; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const jMap = {};
    junctions.forEach(j => { jMap[j.id] = j; });

    // 2. Active Route Highlight Halo
    if (highlightedRoute && highlightedRoute.pathRoads && highlightedRoute.pathRoads.length > 0) {
      ctx.lineWidth = 16 * zoom;
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.45)';
      ctx.lineCap = 'round';
      highlightedRoute.pathRoads.forEach(r => {
        const from = jMap[r.from];
        const to = jMap[r.to];
        if (from && to) {
          ctx.beginPath();
          ctx.moveTo(panX + from.x * zoom, panY + from.y * zoom);
          ctx.lineTo(panX + to.x * zoom, panY + to.y * zoom);
          ctx.stroke();
        }
      });
    }

    // 3. Draw Roads
    roads.forEach(r => {
      const from = jMap[r.from];
      const to = jMap[r.to];
      if (!from || !to) return;

      const x1 = panX + from.x * zoom;
      const y1 = panY + from.y * zoom;
      const x2 = panX + to.x * zoom;
      const y2 = panY + to.y * zoom;

      const roadWidth = (5.0 + r.lanes * 1.5) * zoom;

      // Dark Border
      ctx.lineWidth = roadWidth + 3 * zoom;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Flow Color
      let flowColor = '#10B981'; // Green
      if (r.blocked) {
        flowColor = '#DC2626'; // Blocked
      } else if (r.currentSpeed < r.baseSpeed * 0.45) {
        flowColor = '#EF4444'; // Red
      } else if (r.currentSpeed < r.baseSpeed * 0.75) {
        flowColor = '#F59E0B'; // Amber
      }

      ctx.lineWidth = roadWidth;
      ctx.strokeStyle = flowColor;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Blocked Dashes
      if (r.blocked) {
        ctx.lineWidth = roadWidth * 0.4;
        ctx.strokeStyle = '#FFFFFF';
        ctx.setLineDash([8 * zoom, 8 * zoom]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
      }
    });

    // 4. Moving Vehicle Particles
    particlesRef.current.forEach(p => {
      const road = roads.find(r => r.id === p.roadId);
      if (!road || road.blocked) return;
      const from = jMap[road.from];
      const to = jMap[road.to];
      if (!from || !to) return;

      const x1 = panX + from.x * zoom;
      const y1 = panY + from.y * zoom;
      const x2 = panX + to.x * zoom;
      const y2 = panY + to.y * zoom;

      const px = x1 + (x2 - x1) * p.progress;
      const py = y1 + (y2 - y1) * p.progress;
      const pR = 3.2 * zoom;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px, py, pR, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#0F172A';
      ctx.stroke();
    });

    // 5. Draw Junction Nodes
    junctions.forEach(j => {
      const jx = panX + j.x * zoom;
      const jy = panY + j.y * zoom;
      const jR = 13.0 * zoom;
      const isSelected = selectedJunction && selectedJunction.id === j.id;

      // Selection Halo
      if (isSelected) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.beginPath();
        ctx.arc(jx, jy, jR + 7 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.5 * zoom;
        ctx.strokeStyle = '#2563EB';
        ctx.stroke();
      }

      // Outer Body
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(jx, jy, jR, 0, Math.PI * 2);
      ctx.fill();

      // Signal Dot
      let sigColor = '#10B981';
      if (j.manualOverride) {
        sigColor = '#8B5CF6'; // Override Purple
      } else if (j.signalState === 'GREEN_NORTH_SOUTH' || j.signalState === 'GREEN_EAST_WEST') {
        sigColor = '#10B981';
      } else {
        sigColor = '#EF4444';
      }

      ctx.fillStyle = sigColor;
      ctx.beginPath();
      ctx.arc(jx, jy, 6.0 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // Label Text
      ctx.font = `bold ${Math.max(10, 11 * zoom)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#0F172A';
      ctx.fillText(`${j.id} - ${j.name}`, jx + jR + 6 * zoom, jy + 4 * zoom);

      // Queue length
      ctx.font = `normal ${Math.max(9, 9.5 * zoom)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#64748B';
      ctx.fillText(`Queue: ${j.queue} veh`, jx + jR + 6 * zoom, jy + 18 * zoom);
    });
  };

  // Mouse handlers for pan & zoom
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setTransform(prev => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform(prev => {
      const mouseWorldX = (mouseX - prev.panX) / prev.zoom;
      const mouseWorldY = (mouseY - prev.panY) / prev.zoom;
      const newZoom = Math.max(0.5, Math.min(2.5, prev.zoom * factor));
      return {
        zoom: newZoom,
        panX: mouseX - mouseWorldX * newZoom,
        panY: mouseY - mouseWorldY * newZoom
      };
    });
  };

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { panX, panY, zoom } = transform;
    const clickWorldX = (clickX - panX) / zoom;
    const clickWorldY = (clickY - panY) / zoom;

    let found = null;
    let minD = 22.0;

    junctions.forEach(j => {
      const d = Math.hypot(j.x - clickWorldX, j.y - clickWorldY);
      if (d < minD) {
        minD = d;
        found = j;
      }
    });

    if (found && onSelectJunction) {
      onSelectJunction(found);
    }
  };

  const handleReset = () => {
    setTransform({ panX: 40, panY: 30, zoom: 1.0 });
    if (onResetView) onResetView();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={960}
        height={680}
        style={{ width: '100%', height: '100%', display: 'block', cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* Floating Center & Fit Map Button */}
      <button
        onClick={handleReset}
        className="btn-secondary"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}
      >
        Center & Fit Map
      </button>

      {/* Floating Map Legend */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #CBD5E1',
          borderRadius: 10,
          padding: '12px 14px',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
          width: 200,
          pointerEvents: 'none'
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 'bold', color: '#0F172A', marginBottom: 8, letterSpacing: '0.04em' }}>
          TRAFFIC FLOW OVERLAY
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11, color: '#334155' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
          <span>Green — Low Congestion</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11, color: '#334155' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
          <span>Amber — Medium Congestion</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11, color: '#334155' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
          <span>Red — High Congestion</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11, color: '#334155' }}>
          <div style={{ width: 12, height: 3, background: '#DC2626', borderTop: '1px dashed #FFF' }} />
          <span>Dashed — Active Roadblock</span>
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 'bold', color: '#0D9488', borderTop: '1px solid #E2E8F0', paddingTop: 6 }}>
          • SIMULATED SENSOR TELEMETRY
        </div>
      </div>
    </div>
  );
}
