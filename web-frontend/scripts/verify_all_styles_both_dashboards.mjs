import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_styles_' + Date.now());
  const port = 9228;
  const outDir = 'D:\\smart traffic control 2.0\\target\\screenshots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('--- Launching Edge Browser for Style Verification ---');
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
    console.error('Failed to connect to browser on port ' + port);
    edgeProc.kill();
    process.exit(1);
  }

  const newPageRes = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:5173/`, { method: 'PUT' });
  const pageTarget = await newPageRes.json();
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(resolve => ws.onopen = resolve);

  let id = 1;
  const pending = new Map();
  const consoleErrors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
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
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, Buffer.from(data.data, 'base64'));
    console.log(`Saved screenshot: ${filePath}`);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n======================================================');
  console.log('PART 1: CIVILIAN DASHBOARD — STREET, LIGHT & DARK STYLES');
  console.log('======================================================');

  // Login as Public Citizen
  console.log('Logging in as Public Citizen...');
  await setInput('#login-username', 'user');
  await setInput('#login-password', 'user123');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Check Initial Street Style
  console.log('Checking Civilian Street Style...');
  const civilianStreetInfo = await evaluate(`(() => {
    const tiles = Array.from(document.querySelectorAll('#civilian-map-container .leaflet-tile-loaded'));
    const markers = document.querySelectorAll('#civilian-map-container .custom-traffic-marker');
    return {
      tileCount: tiles.length,
      sampleSrc: tiles[0]?.src || null,
      isOsm: tiles.some(t => t.src.includes('openstreetmap.org')),
      markerCount: markers.length
    };
  })()`);
  console.log('Civilian Street Style:', civilianStreetInfo);
  await captureScreenshot('civilian_style_street.png');

  // Open Map Overlays menu
  console.log('Opening Map Overlays menu on Civilian Dashboard...');
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('#civilian-map-container ~ div button, button'));
    const b = btns.find(btn => btn.textContent.includes('Map Overlays'));
    if (b) b.click();
  })()`);
  await new Promise(r => setTimeout(r, 600));

  // 2. Switch to Light Style
  console.log('Switching to Civilian Light Style...');
  await evaluate(`document.getElementById('map-style-light')?.click()`);
  await new Promise(r => setTimeout(r, 2500));

  const civilianLightInfo = await evaluate(`(() => {
    const tiles = Array.from(document.querySelectorAll('#civilian-map-container .leaflet-tile-loaded'));
    const markers = document.querySelectorAll('#civilian-map-container .custom-traffic-marker');
    return {
      tileCount: tiles.length,
      sampleSrc: tiles[0]?.src || null,
      isEsriLight: tiles.some(t => t.src.includes('World_Light_Gray_Base')),
      markerCount: markers.length
    };
  })()`);
  console.log('Civilian Light Style:', civilianLightInfo);
  if (!civilianLightInfo.isEsriLight || civilianLightInfo.tileCount === 0) {
    throw new Error('Civilian Light map tiles failed to load!');
  }
  await captureScreenshot('civilian_style_light.png');

  // 3. Switch to Dark Style
  console.log('Switching to Civilian Dark Style...');
  await evaluate(`document.getElementById('map-style-dark')?.click()`);
  await new Promise(r => setTimeout(r, 2500));

  const civilianDarkInfo = await evaluate(`(() => {
    const tiles = Array.from(document.querySelectorAll('#civilian-map-container .leaflet-tile-loaded'));
    const markers = document.querySelectorAll('#civilian-map-container .custom-traffic-marker');
    return {
      tileCount: tiles.length,
      sampleSrc: tiles[0]?.src || null,
      isEsriDark: tiles.some(t => t.src.includes('World_Dark_Gray_Base')),
      markerCount: markers.length
    };
  })()`);
  console.log('Civilian Dark Style:', civilianDarkInfo);
  if (!civilianDarkInfo.isEsriDark || civilianDarkInfo.tileCount === 0) {
    throw new Error('Civilian Dark map tiles failed to load!');
  }
  await captureScreenshot('civilian_style_dark.png');

  // 4. Switch back to Street Style
  console.log('Switching back to Civilian Street Style...');
  await evaluate(`document.getElementById('map-style-street')?.click()`);
  await new Promise(r => setTimeout(r, 2000));

  // Verify markers J1-J8 still work after all style switches
  const j1PopupContent = await evaluate(`(() => {
    const markerSpans = Array.from(document.querySelectorAll('#civilian-map-container .custom-traffic-marker span'));
    const j1Span = markerSpans.find(s => s.textContent.trim() === 'J1');
    if (j1Span) j1Span.parentElement.click();
    const popup = document.querySelector('.leaflet-popup-content');
    return popup?.innerText || '';
  })()`);
  console.log('Civilian J1 Popup after style switches:\n', j1PopupContent);

  // Logout from Civilian
  console.log('Logging out from Civilian Dashboard...');
  await evaluate(`document.getElementById('public-btn-logout')?.click()`);
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n===================================================');
  console.log('PART 2: ADMIN DASHBOARD — STREET, LIGHT & DARK STYLES');
  console.log('===================================================');

  // Login as Admin
  console.log('Logging in as Operations Admin...');
  await setInput('#login-username', 'admin');
  await setInput('#login-password', 'admin123');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Verify Admin Overview Initial Street Style
  console.log('Checking Admin Overview Street Style (Auto-loaded on open)...');
  const adminOverviewStreet = await evaluate(`(() => {
    const tiles = Array.from(document.querySelectorAll('#admin-overview-map-container .leaflet-tile-loaded'));
    const markers = document.querySelectorAll('#admin-overview-map-container .custom-traffic-marker');
    return {
      tileCount: tiles.length,
      sampleSrc: tiles[0]?.src || null,
      isOsm: tiles.some(t => t.src.includes('openstreetmap.org')),
      markerCount: markers.length
    };
  })()`);
  console.log('Admin Overview Street Style:', adminOverviewStreet);

  // Open Overlays on Admin Overview map
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('#admin-overview-map-container ~ div button, button'));
    const b = btns.find(btn => btn.textContent.includes('Map Overlays'));
    if (b) b.click();
  })()`);
  await new Promise(r => setTimeout(r, 600));

  // 2. Switch Admin Overview to Light Style
  console.log('Switching Admin Overview to Light Style...');
  await evaluate(`document.getElementById('map-style-light')?.click()`);
  await new Promise(r => setTimeout(r, 2500));

  const adminOverviewLight = await evaluate(`(() => {
    const tiles = Array.from(document.querySelectorAll('#admin-overview-map-container .leaflet-tile-loaded'));
    const markers = document.querySelectorAll('#admin-overview-map-container .custom-traffic-marker');
    return {
      tileCount: tiles.length,
      sampleSrc: tiles[0]?.src || null,
      isEsriLight: tiles.some(t => t.src.includes('World_Light_Gray_Base')),
      markerCount: markers.length
    };
  })()`);
  console.log('Admin Overview Light Style:', adminOverviewLight);
  if (!adminOverviewLight.isEsriLight || adminOverviewLight.tileCount === 0) {
    throw new Error('Admin Overview Light map tiles failed to load!');
  }
  await captureScreenshot('admin_overview_light.png');

  // 3. Switch Admin Overview to Dark Style
  console.log('Switching Admin Overview to Dark Style...');
  await evaluate(`document.getElementById('map-style-dark')?.click()`);
  await new Promise(r => setTimeout(r, 2500));

  const adminOverviewDark = await evaluate(`(() => {
    const tiles = Array.from(document.querySelectorAll('#admin-overview-map-container .leaflet-tile-loaded'));
    const markers = document.querySelectorAll('#admin-overview-map-container .custom-traffic-marker');
    return {
      tileCount: tiles.length,
      sampleSrc: tiles[0]?.src || null,
      isEsriDark: tiles.some(t => t.src.includes('World_Dark_Gray_Base')),
      markerCount: markers.length
    };
  })()`);
  console.log('Admin Overview Dark Style:', adminOverviewDark);
  if (!adminOverviewDark.isEsriDark || adminOverviewDark.tileCount === 0) {
    throw new Error('Admin Overview Dark map tiles failed to load!');
  }
  await captureScreenshot('admin_overview_dark.png');

  // 4. Switch Admin Overview back to Street Style
  console.log('Switching Admin Overview back to Street Style...');
  await evaluate(`document.getElementById('map-style-street')?.click()`);
  await new Promise(r => setTimeout(r, 2000));

  // Verify Admin Signal Control from Map
  console.log('Verifying Admin Signal Control button on map marker...');
  await evaluate(`(() => {
    const markerSpans = Array.from(document.querySelectorAll('#admin-overview-map-container .custom-traffic-marker span'));
    const j3Span = markerSpans.find(s => s.textContent.trim() === 'J3');
    if (j3Span) j3Span.parentElement.click();
  })()`);
  await new Promise(r => setTimeout(r, 1000));

  await evaluate(`(() => {
    const btn = document.querySelector('.leaflet-popup-content button[data-junction-id="J3"]') ||
      document.querySelector('.leaflet-popup-content button[data-admin-action="MANAGE_SIGNAL"]');
    if (btn) btn.click();
  })()`);
  await new Promise(r => setTimeout(r, 1200));

  const signalState = await evaluate(`(() => {
    return {
      header: document.querySelector('h2')?.innerText,
      selectedJunction: document.querySelector('select')?.value
    };
  })()`);
  console.log('Signal Control Navigation Result:', signalState);
  if (signalState.selectedJunction !== 'J3') {
    throw new Error('Manage Signal failed to select junction J3!');
  }

  // 5. Test Tactical Traffic Map module
  console.log('Navigating to Tactical Traffic Map module...');
  await evaluate(`document.getElementById('admin-nav-map')?.click()`);
  await new Promise(r => setTimeout(r, 1500));

  // Switch to Dark on Tactical Map
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('#admin-map-container ~ div button, button'));
    const b = btns.find(btn => btn.textContent.includes('Map Overlays'));
    if (b) b.click();
  })()`);
  await new Promise(r => setTimeout(r, 600));

  await evaluate(`document.getElementById('map-style-dark')?.click()`);
  await new Promise(r => setTimeout(r, 2000));

  const tacticalDarkInfo = await evaluate(`(() => {
    const tiles = Array.from(document.querySelectorAll('#admin-map-container .leaflet-tile-loaded'));
    return {
      tileCount: tiles.length,
      sampleSrc: tiles[0]?.src || null,
      isEsriDark: tiles.some(t => t.src.includes('World_Dark_Gray_Base'))
    };
  })()`);
  console.log('Tactical Map Dark Style:', tacticalDarkInfo);
  if (!tacticalDarkInfo.isEsriDark || tacticalDarkInfo.tileCount === 0) {
    throw new Error('Tactical Map Dark tiles failed to load!');
  }
  await captureScreenshot('admin_tactical_dark.png');

  console.log('\n--- Final Checks ---');
  console.log('Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  console.log('\n======================================================');
  console.log('ALL STYLE SWITCHING VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================');

  edgeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('STYLE VERIFICATION FAILED:', err);
  process.exit(1);
});
