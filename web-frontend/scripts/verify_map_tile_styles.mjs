import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_tiles_' + Date.now());
  const port = 9226;

  const edgeProc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,850',
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 2000));

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

  // Login as Public Citizen
  console.log('Logging in as Public Citizen...');
  await setInput('#login-username', 'user');
  await setInput('#login-password', 'user123');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 2000));

  const results = {};
  const outDir = 'd:\\smart traffic control 2.0\\target\\screenshots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Verify Street Style
  console.log('--- Testing Street Style Tiles ---');
  let evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const tiles = Array.from(document.querySelectorAll('.leaflet-tile'));
      const bodyText = document.body.innerText;
      const htmlText = document.documentElement.innerHTML;
      return {
        tileCount: tiles.length,
        hasTiles: tiles.length > 0,
        sampleTileSrc: tiles[0] ? tiles[0].src : null,
        isOsmTile: tiles.some(t => t.src && t.src.includes('openstreetmap.org')),
        hasApiKeyWatermarkText: bodyText.includes('API KEY REQUIRED'),
        hasApiKeyWatermarkHTML: htmlText.includes('API KEY REQUIRED')
      };
    })()`,
    returnByValue: true
  });
  results.street = evalRes.result?.value;
  console.log('Street Style Result:', results.street);

  let ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'tile_style_01_street.png'), Buffer.from(ss.data, 'base64'));

  // 2. Open Map Overlays menu
  console.log('Opening Map Overlays menu...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const overlayBtn = btns.find(b => b.innerText.includes('Map Overlays'));
      if (overlayBtn) overlayBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // 3. Switch to Light Style
  console.log('--- Switching to Light Style Tiles ---');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('map-style-light').click()`
  });
  await new Promise(r => setTimeout(r, 2000));

  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const tiles = Array.from(document.querySelectorAll('.leaflet-tile'));
      const bodyText = document.body.innerText;
      const htmlText = document.documentElement.innerHTML;
      return {
        tileCount: tiles.length,
        hasTiles: tiles.length > 0,
        sampleTileSrc: tiles[0] ? tiles[0].src : null,
        isLightTile: tiles.some(t => t.src && (t.src.includes('light_all') || t.src.includes('cartocdn'))),
        hasApiKeyWatermarkText: bodyText.includes('API KEY REQUIRED'),
        hasApiKeyWatermarkHTML: htmlText.includes('API KEY REQUIRED')
      };
    })()`,
    returnByValue: true
  });
  results.light = evalRes.result?.value;
  console.log('Light Style Result:', results.light);

  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'tile_style_02_light.png'), Buffer.from(ss.data, 'base64'));

  // 4. Switch to Dark Style
  console.log('--- Switching to Dark Style Tiles ---');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('map-style-dark').click()`
  });
  await new Promise(r => setTimeout(r, 2000));

  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const tiles = Array.from(document.querySelectorAll('.leaflet-tile'));
      const bodyText = document.body.innerText;
      const htmlText = document.documentElement.innerHTML;
      return {
        tileCount: tiles.length,
        hasTiles: tiles.length > 0,
        sampleTileSrc: tiles[0] ? tiles[0].src : null,
        isDarkTile: tiles.some(t => t.src && (t.src.includes('dark_all') || t.src.includes('cartocdn'))),
        hasApiKeyWatermarkText: bodyText.includes('API KEY REQUIRED'),
        hasApiKeyWatermarkHTML: htmlText.includes('API KEY REQUIRED')
      };
    })()`,
    returnByValue: true
  });
  results.dark = evalRes.result?.value;
  console.log('Dark Style Result:', results.dark);

  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'tile_style_03_dark.png'), Buffer.from(ss.data, 'base64'));

  // 5. Verify Junction markers J1-J8 / J9 and popup details
  console.log('--- Verifying Junction Markers (J1-J8) and Controls ---');
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const markers = Array.from(document.querySelectorAll('.custom-traffic-marker'));
      const markerLabels = markers.map(m => m.innerText.trim()).filter(Boolean);
      return {
        markerCount: markers.length,
        hasJ1toJ8: ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8'].every(id => markerLabels.includes(id)),
        markerLabels: markerLabels,
        hasSearchInput: !!document.getElementById('map-places-search-input'),
        hasMyLocationBtn: !!document.getElementById('map-my-location-btn'),
        hasTrafficDensityCheckbox: !!document.querySelector('input[type="checkbox"]'),
        hasLeafletZoomControl: !!document.querySelector('.leaflet-control-zoom')
      };
    })()`,
    returnByValue: true
  });
  results.controlsAndMarkers = evalRes.result?.value;
  console.log('Markers and Controls Result:', results.controlsAndMarkers);

  // Click junction marker J1 and test popup
  await send('Runtime.evaluate', {
    expression: `(() => {
      const markers = Array.from(document.querySelectorAll('.custom-traffic-marker'));
      const j1 = markers.find(m => m.innerText.includes('J1'));
      if (j1) j1.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const popup = document.querySelector('.leaflet-popup-content');
      return {
        hasPopup: !!popup,
        popupContent: popup ? popup.innerText : null
      };
    })()`,
    returnByValue: true
  });
  results.junctionPopup = evalRes.result?.value;
  console.log('Junction Popup Result:', results.junctionPopup);

  console.log('\n==========================================');
  console.log('FINAL MAP TILE TEST RESULTS:');
  console.log(JSON.stringify(results, null, 2));
  console.log('Console Errors:', consoleErrors.length);
  console.log('==========================================');

  ws.close();
  try { edgeProc.kill(); } catch (e) {}
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
