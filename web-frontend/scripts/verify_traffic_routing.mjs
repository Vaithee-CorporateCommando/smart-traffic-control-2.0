import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function runVerification() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_traffic_' + Date.now());
  const screenshotsDir = 'd:\\smart traffic control 2.0\\target\\screenshots';
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,900',
    'about:blank'
  ]);

  let versionData = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  if (!versionData) {
    console.error('Could not connect to Edge DevTools');
    edgeProc.kill();
    process.exit(1);
  }

  const newPageRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:5173/', { method: 'PUT' });
  const pageTarget = await newPageRes.json();
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(resolve => ws.onopen = resolve);

  let id = 1;
  const pending = new Map();
  const consoleMessages = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
    if (msg.method === 'Console.messageAdded') {
      consoleMessages.push(msg.params.message);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleMessages.push(msg.params);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  };

  const setInputValue = async (selector, value) => {
    return evaluate(`
      (() => {
        const input = document.querySelector(${JSON.stringify(selector)});
        if (!input) return false;
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, ${JSON.stringify(value)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
  };

  const capture = async (name) => {
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');
    const outPath = path.join(screenshotsDir, name);
    fs.writeFileSync(outPath, buffer);
    console.log(`[SNAPSHOT] Saved: ${outPath}`);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');

  console.log('--- Step 1: Navigating to Web Application ---');
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 2000));

  // Login as Public Citizen
  console.log('--- Step 2: Logging in as Public Citizen ---');
  await setInputValue('input[type="text"]', 'citizen');
  await setInputValue('input[type="password"]', 'citizen123');
  await evaluate(`
    (() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 2500));
  await capture('01_public_dashboard_clean_map.png');

  // Verify Leaflet Map container and elements
  const mapCheck = await evaluate(`
    (() => {
      const mapContainer = document.querySelector('.leaflet-container');
      const tiles = document.querySelectorAll('.leaflet-tile');
      const markers = document.querySelectorAll('.custom-traffic-marker');
      const roadOverlays = document.querySelectorAll('.leaflet-overlay-pane svg path');
      return {
        hasLeaflet: !!mapContainer,
        tilesCount: tiles.length,
        markersCount: markers.length,
        roadLinesCount: roadOverlays.length
      };
    })()
  `);
  console.log('[TEST] Public Map check:', JSON.stringify(mapCheck));

  // Switch to Tab 2: "Plan a Route"
  console.log('--- Step 3: Navigating to Plan a Route tab ---');
  await evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const routeTab = buttons.find(b => b.textContent.includes('Plan a Route'));
      if (routeTab) routeTab.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1200));
  await capture('02_public_route_tab.png');

  // Search origin location: "Karol Bagh"
  console.log('--- Step 4: Testing Search Places (Origin: Karol Bagh) ---');
  await setInputValue('#route-origin-input', 'Karol Bagh');
  await new Promise(r => setTimeout(r, 2000));

  // Select suggestion for origin
  const originSelected = await evaluate(`
    (() => {
      const dropdownItems = Array.from(document.querySelectorAll('#route-origin-input ~ div div'));
      const item = dropdownItems.find(el => el.innerText && el.innerText.includes('Karol Bagh'));
      if (item) {
        item.click();
        return true;
      }
      if (dropdownItems.length > 0) {
        dropdownItems[0].click();
        return true;
      }
      return false;
    })()
  `);
  console.log('[TEST] Origin selected from autocomplete:', originSelected);
  await new Promise(r => setTimeout(r, 800));

  // Search destination location: "India Gate"
  console.log('--- Step 5: Testing Search Places (Destination: India Gate) ---');
  await setInputValue('#route-dest-input', 'India Gate');
  await new Promise(r => setTimeout(r, 2000));

  // Select suggestion for destination
  const destSelected = await evaluate(`
    (() => {
      const dropdownItems = Array.from(document.querySelectorAll('#route-dest-input ~ div div'));
      const item = dropdownItems.find(el => el.innerText && el.innerText.includes('India Gate'));
      if (item) {
        item.click();
        return true;
      }
      if (dropdownItems.length > 0) {
        dropdownItems[0].click();
        return true;
      }
      return false;
    })()
  `);
  console.log('[TEST] Destination selected from autocomplete:', destSelected);
  await new Promise(r => setTimeout(r, 800));
  await capture('03_public_places_selected.png');

  // Click "Find Road Route" button
  console.log('--- Step 6: Calculating Road Route via OSRM ---');
  await evaluate(`
    (() => {
      const btn = document.getElementById('plan-road-route-btn');
      if (btn) btn.click();
    })()
  `);

  // Wait for OSRM network response and map rendering
  await new Promise(r => setTimeout(r, 4000));
  await capture('04_public_road_route_active.png');

  // Verify Route Results & Road Polyline
  const routeVerification = await evaluate(`
    (() => {
      const routeCard = document.getElementById('active-road-route-card');
      const routePaths = document.querySelectorAll('.leaflet-overlay-pane svg path');
      const originPin = document.querySelector('.route-pin-origin');
      const destPin = document.querySelector('.route-pin-dest');
      const clearPill = document.getElementById('traffic-map-clear-route-btn');

      return {
        hasRouteCard: !!routeCard,
        cardText: routeCard ? routeCard.innerText : null,
        pathsCount: routePaths.length,
        hasOriginPin: !!originPin,
        hasDestPin: !!destPin,
        hasClearPill: !!clearPill
      };
    })()
  `);
  console.log('[TEST] Route verification:', JSON.stringify(routeVerification));

  // Test Clear Route
  console.log('--- Step 7: Testing Clear Route ---');
  await evaluate(`
    (() => {
      const clearBtn = document.getElementById('public-clear-route-btn') || document.getElementById('traffic-map-clear-route-btn');
      if (clearBtn) clearBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1200));
  await capture('05_public_route_cleared.png');

  const afterClear = await evaluate(`
    (() => {
      const routeCard = document.getElementById('active-road-route-card');
      const originPin = document.querySelector('.route-pin-origin');
      return {
        cardCleared: !routeCard,
        pinCleared: !originPin
      };
    })()
  `);
  console.log('[TEST] After Clear check:', JSON.stringify(afterClear));

  // Sign out public user
  console.log('--- Step 8: Signing Out Public User ---');
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signOut = btns.find(b => b.textContent.includes('Sign Out'));
      if (signOut) signOut.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 2000));

  // Login as Admin
  console.log('--- Step 9: Logging in as Administrator ---');
  await setInputValue('input[type="text"]', 'admin');
  await setInputValue('input[type="password"]', 'admin123');
  await evaluate(`
    (() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 2500));

  // Switch to Tactical Traffic Map
  console.log('--- Step 10: Opening Tactical Traffic Map in Admin ---');
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const mapBtn = btns.find(b => b.textContent.includes('Tactical Traffic Map'));
      if (mapBtn) mapBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 2000));
  await capture('06_admin_tactical_map.png');

  // Test Admin Tactical Road Route Inspector
  console.log('--- Step 11: Testing Admin Tactical Road Route Inspector ---');
  await setInputValue('#admin-route-origin-input', 'Connaught');
  await new Promise(r => setTimeout(r, 1500));

  await evaluate(`
    (() => {
      const items = document.querySelectorAll('#admin-route-origin-input ~ div div');
      if (items.length > 0) items[0].click();
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  await setInputValue('#admin-route-dest-input', 'AIIMS');
  await new Promise(r => setTimeout(r, 1500));

  await evaluate(`
    (() => {
      const items = document.querySelectorAll('#admin-route-dest-input ~ div div');
      if (items.length > 0) items[0].click();
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  // Click Inspect Road Route
  await evaluate(`
    (() => {
      const btn = document.getElementById('admin-plan-route-btn');
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 4000));
  await capture('07_admin_tactical_route_active.png');

  const adminRouteVerification = await evaluate(`
    (() => {
      const originPin = document.querySelector('.route-pin-origin');
      const destPin = document.querySelector('.route-pin-dest');
      const clearBtn = document.getElementById('admin-clear-route-btn');
      const paths = document.querySelectorAll('.leaflet-overlay-pane svg path');
      return {
        hasOriginPin: !!originPin,
        hasDestPin: !!destPin,
        hasClearBtn: !!clearBtn,
        pathsCount: paths.length
      };
    })()
  `);
  console.log('[TEST] Admin route verification:', JSON.stringify(adminRouteVerification));

  // Step 12: Click Junction Marker and Test "Manage Signal" navigation
  console.log('--- Step 12: Testing Marker Click & Manage Signal Navigation ---');
  await evaluate(`
    (() => {
      const markers = document.querySelectorAll('.custom-traffic-marker');
      if (markers.length > 0) {
        markers[0].click();
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 1200));

  const popupOpened = await evaluate(`
    (() => {
      const manageBtn = document.querySelector('button[data-admin-action="MANAGE_SIGNAL"]');
      if (manageBtn) {
        manageBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log('[TEST] Popup Manage Signal clicked:', popupOpened);
  await new Promise(r => setTimeout(r, 1500));
  await capture('08_admin_manage_signal_navigated.png');

  const activeModuleAfter = await evaluate(`
    (() => {
      const heading = document.querySelector('h2');
      return heading ? heading.innerText : null;
    })()
  `);
  console.log('[TEST] Active module after Manage Signal:', activeModuleAfter);

  // Filter console messages for actual errors
  const realErrors = consoleMessages.filter(m => {
    const text = typeof m === 'string' ? m : (m.text || m.args?.[0]?.value || '');
    return m.level === 'error' || (typeof text === 'string' && text.toLowerCase().includes('uncaught'));
  });

  console.log('--- Verification Complete ---');
  console.log(`REAL_CONSOLE_ERRORS: ${realErrors.length}`);
  if (realErrors.length > 0) {
    console.log(JSON.stringify(realErrors, null, 2));
  }

  edgeProc.kill();
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
