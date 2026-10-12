import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function verifyStreetMaps() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_map_' + Date.now());
  
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1366,860',
    'about:blank'
  ]);

  let versionData = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9225/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  if (!versionData) {
    console.error('Failed to connect to Edge on port 9225');
    edgeProc.kill();
    process.exit(1);
  }

  const newPageRes = await fetch('http://127.0.0.1:9225/json/new?http://localhost:5173/', { method: 'PUT' });
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

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');

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

  console.log('--- TEST 1: Login as Public User ---');
  await setInput('#login-username', 'user');
  await setInput('#login-password', 'user123');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 2000));

  console.log('--- TEST 2: Verify Leaflet in Public Dashboard ---');
  let res = await send('Runtime.evaluate', {
    expression: `(() => {
      const container = document.querySelector('.leaflet-container');
      const tiles = document.querySelectorAll('.leaflet-tile');
      const attribution = document.querySelector('.leaflet-control-attribution')?.innerText || '';
      const markers = document.querySelectorAll('.custom-traffic-marker');
      const polylines = document.querySelectorAll('.leaflet-overlay-pane svg path');
      return {
        hasLeafletContainer: !!container,
        tileCount: tiles.length,
        attributionText: attribution,
        markerCount: markers.length,
        polylineCount: polylines.length
      };
    })()`,
    returnByValue: true
  });
  console.log('Public Map Details:', JSON.stringify(res.result?.value));

  // Click on a marker to test popup
  console.log('--- TEST 3: Click Marker and Check Popup ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const marker = document.querySelector('.custom-traffic-marker');
      if (marker) marker.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  res = await send('Runtime.evaluate', {
    expression: `(() => {
      const popup = document.querySelector('.leaflet-popup-content');
      return {
        popupVisible: !!popup,
        popupContent: popup?.innerText || ''
      };
    })()`,
    returnByValue: true
  });
  console.log('Marker Popup Result:', JSON.stringify(res.result?.value));

  // Test Route Calculation and Corridor on Map
  console.log('--- TEST 4: Calculate Route and Check Map Highlighting ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const routeTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Plan a Route'));
      if (routeTab) routeTab.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const findRouteBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Find Best Route'));
      if (findRouteBtn) findRouteBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Save screenshot of Public Dashboard with real Leaflet street map and route
  let ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:\\smart traffic control 2.0\\target\\screenshots\\public_dashboard_street_map.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved screenshot: public_dashboard_street_map.png');

  // Sign out
  console.log('--- TEST 5: Sign out and Login as Admin ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const signoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign Out'));
      if (signoutBtn) signoutBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  await setInput('#login-username', 'admin');
  await setInput('#login-password', 'admin123');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 1800));

  // Switch to Tactical Traffic Map tab in Admin
  console.log('--- TEST 6: Open Tactical Traffic Map Module in Admin Dashboard ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const mapBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tactical Traffic Map'));
      if (mapBtn) mapBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  res = await send('Runtime.evaluate', {
    expression: `(() => {
      const container = document.querySelector('.leaflet-container');
      const tiles = document.querySelectorAll('.leaflet-tile');
      const markers = document.querySelectorAll('.custom-traffic-marker');
      const rbMarkers = document.querySelectorAll('.custom-roadblock-marker');
      const incMarkers = document.querySelectorAll('.custom-incident-marker');
      return {
        hasLeafletInAdmin: !!container,
        tileCount: tiles.length,
        junctionMarkers: markers.length,
        roadblockMarkers: rbMarkers.length,
        incidentMarkers: incMarkers.length
      };
    })()`,
    returnByValue: true
  });
  console.log('Admin Tactical Map Details:', JSON.stringify(res.result?.value));

  console.log('--- TEST 7: Test Admin Manage Signal action from Map ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const marker = document.querySelector('.custom-traffic-marker');
      if (marker) marker.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const manageBtn = document.querySelector('[data-admin-action="MANAGE_SIGNAL"]');
      if (manageBtn) manageBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  res = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        navigatedToSignalControl: document.body.innerText.includes('Signal Phasing & Manual Override Console')
      };
    })()`,
    returnByValue: true
  });
  console.log('Admin Action Navigation Result:', JSON.stringify(res.result?.value));

  // Switch back to Tactical Traffic Map to capture admin map screenshot
  await send('Runtime.evaluate', {
    expression: `(() => {
      const mapBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tactical Traffic Map'));
      if (mapBtn) mapBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:\\smart traffic control 2.0\\target\\screenshots\\admin_dashboard_street_map.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved screenshot: admin_dashboard_street_map.png');

  console.log('====================================');
  console.log('STREET MAP TESTS COMPLETED!');
  console.log('Console Errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Console Error Details:', JSON.stringify(consoleErrors));
  }
  console.log('====================================');

  ws.close();
  edgeProc.kill();
}

verifyStreetMaps().catch(err => {
  console.error('Street map verification failed:', err);
  process.exit(1);
});
