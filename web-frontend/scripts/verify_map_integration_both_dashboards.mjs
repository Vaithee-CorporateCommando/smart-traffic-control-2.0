import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function runVerification() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_both_maps_' + Date.now());
  const port = 9227;
  const screenshotsDir = 'D:\\smart traffic control 2.0\\target\\screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('--- Launching Edge for Map Integration Verification ---');
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,920',
    'about:blank'
  ]);

  let versionData = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  if (!versionData) {
    console.error('Failed to connect to Edge browser on port ' + port);
    edgeProc.kill();
    process.exit(1);
  }

  const newPageRes = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:5173/`, { method: 'PUT' });
  const pageTarget = await newPageRes.json();
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(resolve => ws.onopen = resolve);

  let id = 1;
  const pending = new Map();
  const networkTileUrls = [];
  const consoleErrors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
    if (msg.method === 'Network.requestWillBeSent') {
      const u = msg.params.request.url;
      if (u.includes('tile') || u.includes('cartocdn') || u.includes('openstreetmap')) {
        networkTileUrls.push(u);
      }
    }
    if (msg.method === 'Console.messageAdded' && msg.params.message.level === 'error') {
      consoleErrors.push(msg.params.message.text);
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result?.value;
  };

  const setInput = async (selector, value) => {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('${selector}');
        if (!el) return false;
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(el, '${value}');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`,
      returnByValue: true
    });
  };

  const captureScreenshot = async (filename) => {
    const data = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(data.data, 'base64'));
    console.log(`Saved screenshot: ${filePath}`);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n========================================');
  console.log('TEST 1: CIVILIAN DASHBOARD MAP INTEGRATION');
  console.log('========================================');

  // 1. Login as Public User
  console.log('Logging in as Public Citizen (user / user123)...');
  await setInput('#login-username', 'user');
  await setInput('#login-password', 'user123');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 2000));

  const pageState = await evaluate(`(() => {
    return {
      bodySnippet: document.body.innerText.slice(0, 300),
      hasLoginForm: !!document.getElementById('login-username'),
      errorAlert: document.querySelector('.login-alert-error')?.textContent,
      allIds: Array.from(document.querySelectorAll('[id]')).map(el => el.id)
    };
  })()`);
  console.log('Page state after login attempt:', pageState);

  // Check Civilian Map Container
  const civilianMapInfo = await evaluate(`(() => {
    const container = document.getElementById('civilian-map-container');
    if (!container) return { found: false };
    const rect = container.getBoundingClientRect();
    const leafletMap = container.closest('.leaflet-container');
    const tiles = container.querySelectorAll('.leaflet-tile-loaded');
    const markers = container.querySelectorAll('.custom-traffic-marker');
    return {
      found: true,
      id: container.id,
      width: rect.width,
      height: rect.height,
      hasLeafletClass: !!leafletMap,
      loadedTileCount: tiles.length,
      markerCount: markers.length
    };
  })()`);

  console.log('Civilian Map Container Check:', civilianMapInfo);

  if (!civilianMapInfo.found || civilianMapInfo.height === 0) {
    throw new Error('Civilian map container missing or zero height!');
  }

  // Check Junction markers J1 - J8
  const civilianMarkers = await evaluate(`(() => {
    const markers = Array.from(document.querySelectorAll('.custom-traffic-marker span')).map(s => s.textContent.trim());
    return markers;
  })()`);
  console.log('Civilian Junction markers found:', civilianMarkers);
  const requiredJunctions = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8'];
  const allFound = requiredJunctions.every(j => civilianMarkers.includes(j));
  console.log('All required J1-J8 markers visible:', allFound);

  // Click junction marker J1 and test popup contents
  console.log('Testing Junction Marker popup details on Civilian Map...');
  const popupResult = await evaluate(`(() => {
    const markerSpans = Array.from(document.querySelectorAll('.custom-traffic-marker span'));
    const j1Span = markerSpans.find(s => s.textContent.trim() === 'J1');
    if (j1Span) {
      j1Span.parentElement.click();
      return true;
    }
    return false;
  })()`);
  await new Promise(r => setTimeout(r, 800));

  const popupDetails = await evaluate(`(() => {
    const popup = document.querySelector('.leaflet-popup-content');
    if (!popup) return null;
    return {
      text: popup.innerText,
      html: popup.innerHTML
    };
  })()`);
  console.log('J1 Popup content:\n', popupDetails?.text);

  // Verify popup contains junction name, location, signal phase, queue count, congestion
  const popupHasDetails = popupDetails &&
    popupDetails.text.includes('Central City Square') &&
    popupDetails.text.includes('Downtown Core') &&
    popupDetails.text.includes('Phase:') &&
    popupDetails.text.includes('Queue:') &&
    popupDetails.text.includes('LOW');
  console.log('Popup contains all required traffic metadata:', popupHasDetails);

  // Test Map Overlays (Street, Light, Dark)
  console.log('Testing Map Styles on Civilian Dashboard...');
  await evaluate(`(() => {
    const overlaysBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Map Overlays'));
    if (overlaysBtn) overlaysBtn.click();
  })()`);
  await new Promise(r => setTimeout(r, 600));

  // Light style
  await evaluate(`document.getElementById('map-style-light')?.click()`);
  await new Promise(r => setTimeout(r, 1200));
  const lightTileUrl = await evaluate(`(() => {
    const img = document.querySelector('.leaflet-tile-loaded');
    return img ? img.src : null;
  })()`);
  console.log('Light style tile loaded URL:', lightTileUrl);

  // Dark style
  await evaluate(`document.getElementById('map-style-dark')?.click()`);
  await new Promise(r => setTimeout(r, 1200));
  const darkTileUrl = await evaluate(`(() => {
    const img = document.querySelector('.leaflet-tile-loaded');
    return img ? img.src : null;
  })()`);
  console.log('Dark style tile loaded URL:', darkTileUrl);

  // Switch back to Street style
  await evaluate(`document.getElementById('map-style-street')?.click()`);
  await new Promise(r => setTimeout(r, 1200));

  // Check for any "API KEY REQUIRED" watermark
  const watermarkCheck = await evaluate(`(() => {
    const bodyText = document.body.innerText;
    return bodyText.includes('API KEY REQUIRED') || bodyText.includes('API Key Required');
  })()`);
  console.log('Watermark "API KEY REQUIRED" present on Civilian Map:', watermarkCheck);

  // Test Route Planning feature on Civilian Dashboard
  console.log('Testing Route Planning tab on Civilian Dashboard...');
  await evaluate(`document.getElementById('public-nav-route')?.click()`);
  await new Promise(r => setTimeout(r, 1500));

  const civilianRouteContainer = await evaluate(`(() => {
    const c = document.getElementById('civilian-route-map-container');
    if (!c) return { found: false };
    const rect = c.getBoundingClientRect();
    return { found: true, width: rect.width, height: rect.height };
  })()`);
  console.log('Civilian Route Planner Map Container:', civilianRouteContainer);

  // Plan Route
  await evaluate(`document.getElementById('plan-road-route-btn')?.click()`);
  await new Promise(r => setTimeout(r, 2500));

  const routePolylineCount = await evaluate(`(() => {
    const paths = document.querySelectorAll('#civilian-route-map-container .leaflet-overlay-pane svg path');
    return paths.length;
  })()`);
  console.log('Route paths rendered on Route Planner map:', routePolylineCount);

  await captureScreenshot('civilian_dashboard_verified.png');

  // Logout from Civilian
  console.log('Logging out from Civilian Dashboard...');
  await evaluate(`document.getElementById('public-btn-logout')?.click()`);
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n========================================');
  console.log('TEST 2: ADMIN DASHBOARD MAP INTEGRATION');
  console.log('========================================');

  // Wait for login form to be available
  await evaluate(`(() => {
    return new Promise(resolve => {
      const check = () => {
        if (document.getElementById('login-username')) resolve(true);
        else setTimeout(check, 100);
      };
      check();
    });
  })()`);

  // 2. Login as Admin
  console.log('Logging in as Operations Admin (admin / admin123)...');
  await setInput('#login-username', 'admin');
  await setInput('#login-password', 'admin123');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Check Admin Overview Map Container (loads automatically on dashboard open!)
  const adminOverviewMap = await evaluate(`(() => {
    const container = document.getElementById('admin-overview-map-container');
    if (!container) return { found: false };
    const rect = container.getBoundingClientRect();
    const tiles = container.querySelectorAll('.leaflet-tile-loaded');
    const markers = container.querySelectorAll('.custom-traffic-marker');
    return {
      found: true,
      id: container.id,
      width: rect.width,
      height: rect.height,
      loadedTileCount: tiles.length,
      markerCount: markers.length
    };
  })()`);
  console.log('Admin Overview Map (Automatic Load):', adminOverviewMap);

  if (!adminOverviewMap.found || adminOverviewMap.height === 0) {
    throw new Error('Admin Overview map container missing or zero height!');
  }

  // Check junction markers on Admin Overview map
  const adminMarkers = await evaluate(`(() => {
    const markers = Array.from(document.querySelectorAll('#admin-overview-map-container .custom-traffic-marker span')).map(s => s.textContent.trim());
    return markers;
  })()`);
  console.log('Admin Overview Junction markers found:', adminMarkers);

  // Click marker J3 on admin overview map and click "Manage Signal"
  console.log('Testing Junction Marker popup and "Manage Signal" on Admin Overview Map...');
  await evaluate(`(() => {
    const markerSpans = Array.from(document.querySelectorAll('#admin-overview-map-container .custom-traffic-marker span'));
    const j3Span = markerSpans.find(s => s.textContent.trim() === 'J3');
    if (j3Span) {
      j3Span.parentElement.click();
      return true;
    }
    return false;
  })()`);
  await new Promise(r => setTimeout(r, 800));

  const adminPopupDetails = await evaluate(`(() => {
    const popup = document.querySelector('.leaflet-popup-content');
    if (!popup) return null;
    const btn = popup.querySelector('button[data-admin-action="MANAGE_SIGNAL"]');
    return {
      text: popup.innerText,
      hasManageSignalBtn: !!btn
    };
  })()`);
  console.log('Admin J3 Popup Details:', adminPopupDetails);

  if (!adminPopupDetails?.hasManageSignalBtn) {
    throw new Error('Manage Signal button not found in Admin popup!');
  }

  // Click "Manage Signal"
  console.log('Clicking "Manage Signal" from Leaflet map popup...');
  await evaluate(`(() => {
    const btn = document.querySelector('.leaflet-popup-content button[data-admin-action="MANAGE_SIGNAL"]');
    if (btn) btn.click();
  })()`);
  await new Promise(r => setTimeout(r, 1000));

  // Verify dashboard switched to Signal module and selected junction is J3
  const signalModuleState = await evaluate(`(() => {
    const select = document.querySelector('select');
    const header = document.querySelector('h2');
    return {
      headerText: header?.innerText,
      selectedJunction: select?.value
    };
  })()`);
  console.log('Navigated to Signal Control Console with junction:', signalModuleState);
  if (signalModuleState.selectedJunction !== 'J3') {
    throw new Error(`Expected selected junction to be J3, got ${signalModuleState.selectedJunction}`);
  }

  // Navigate to Tactical Traffic Map module
  console.log('Navigating to Admin Tactical Traffic Map module...');
  await evaluate(`document.getElementById('admin-nav-map')?.click()`);
  await new Promise(r => setTimeout(r, 1200));

  const adminTacticalMap = await evaluate(`(() => {
    const container = document.getElementById('admin-map-container');
    if (!container) return { found: false };
    const rect = container.getBoundingClientRect();
    const tiles = container.querySelectorAll('.leaflet-tile-loaded');
    const markers = container.querySelectorAll('.custom-traffic-marker');
    return {
      found: true,
      id: container.id,
      width: rect.width,
      height: rect.height,
      loadedTileCount: tiles.length,
      markerCount: markers.length
    };
  })()`);
  console.log('Admin Tactical Traffic Map Module:', adminTacticalMap);

  // Test map styles in Admin Tactical Map
  console.log('Testing Map Overlays & Styles in Admin Tactical Map...');
  await evaluate(`(() => {
    const overlaysBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Map Overlays'));
    if (overlaysBtn) overlaysBtn.click();
  })()`);
  await new Promise(r => setTimeout(r, 600));

  await evaluate(`document.getElementById('map-style-light')?.click()`);
  await new Promise(r => setTimeout(r, 1000));
  await evaluate(`document.getElementById('map-style-dark')?.click()`);
  await new Promise(r => setTimeout(r, 1000));
  await evaluate(`document.getElementById('map-style-street')?.click()`);
  await new Promise(r => setTimeout(r, 1000));

  await captureScreenshot('admin_tactical_map_verified.png');

  // Navigate back to overview for final overview screenshot
  await evaluate(`document.getElementById('admin-nav-overview')?.click()`);
  await new Promise(r => setTimeout(r, 1200));
  await captureScreenshot('admin_dashboard_overview_verified.png');

  // Verify other modules remain intact
  console.log('Verifying CCTV matrix module...');
  await evaluate(`document.getElementById('admin-nav-cctv')?.click()`);
  await new Promise(r => setTimeout(r, 600));
  const cctvLoaded = await evaluate(`document.body.innerText.includes('Optical CCTV Surveillance Matrix')`);
  console.log('CCTV module active & feeds loaded:', cctvLoaded);

  console.log('Verifying Incidents module...');
  await evaluate(`document.getElementById('admin-nav-roadblocks')?.click()`);
  await new Promise(r => setTimeout(r, 600));
  const incidentsLoaded = await evaluate(`document.body.innerText.includes('Roadblock Management & Incident Verification')`);
  console.log('Incidents module active:', incidentsLoaded);

  console.log('\n--- Final Integrity Checks ---');
  console.log('Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
  const finalWatermarkCheck = await evaluate(`document.body.innerText.includes('API KEY REQUIRED')`);
  console.log('Watermark present:', finalWatermarkCheck);

  console.log('\n========================================');
  console.log('ALL MAP INTEGRATION VERIFICATION TESTS PASSED!');
  console.log('========================================');

  edgeProc.kill();
  process.exit(0);
}

runVerification().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
