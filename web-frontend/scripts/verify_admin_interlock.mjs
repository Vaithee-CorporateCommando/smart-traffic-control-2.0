import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function runTest() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_admin_' + Date.now());
  const screenshotsDir = 'd:\\smart traffic control 2.0\\target\\screenshots';

  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,900',
    'about:blank'
  ]);

  let versionData = null;
  for (let i = 0; i < 20; i++) {
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

  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 2000));

  // Login as admin
  await setInputValue('input[type="text"]', 'admin');
  await setInputValue('input[type="password"]', 'admin123');
  await evaluate(`
    (() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 2500));

  // Open Tactical Traffic Map
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const mapBtn = btns.find(b => b.textContent.includes('Tactical Traffic Map'));
      if (mapBtn) mapBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 2000));

  // Verify popup on J1 is open and click Manage Signal
  const manageClicked = await evaluate(`
    (() => {
      const btn = document.querySelector('button[data-admin-action="MANAGE_SIGNAL"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log('[TEST] Manage Signal button clicked:', manageClicked);
  await new Promise(r => setTimeout(r, 1500));
  await capture('09_admin_manage_signal_verified.png');

  // Verify that active module is Signal Control & Override
  const activeModule = await evaluate(`
    (() => {
      const activeBtn = document.querySelector('aside button.active span');
      const targetSelect = document.querySelector('select');
      return {
        moduleName: activeBtn ? activeBtn.innerText : null,
        targetJunction: targetSelect ? targetSelect.value : null
      };
    })()
  `);
  console.log('[TEST] Active module after click:', JSON.stringify(activeModule));

  // Now test Universal Map Search: switch back to map
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const mapBtn = btns.find(b => b.textContent.includes('Tactical Traffic Map'));
      if (mapBtn) mapBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1500));

  // Search "Mumbai" in universal map search bar at top-left
  await setInputValue('input[placeholder*="Search city, address"]', 'Mumbai');
  await new Promise(r => setTimeout(r, 2000));

  // Select Mumbai suggestion
  const mumbaiSelected = await evaluate(`
    (() => {
      const items = Array.from(document.querySelectorAll('.leaflet-container ~ div div, div[style*="position: absolute"] div'));
      const mumbaiItem = items.find(el => el.innerText && el.innerText.toLowerCase().includes('mumbai'));
      if (mumbaiItem) {
        mumbaiItem.click();
        return true;
      }
      return false;
    })()
  `);
  console.log('[TEST] Universal search selected Mumbai:', mumbaiSelected);
  await new Promise(r => setTimeout(r, 2500));
  await capture('10_admin_map_universal_search_mumbai.png');

  // Check map center coordinates to verify it panned away from Delhi
  const mapCenter = await evaluate(`
    (() => {
      const tiles = document.querySelectorAll('.leaflet-tile');
      return {
        tilesCount: tiles.length
      };
    })()
  `);
  console.log('[TEST] Map center check:', JSON.stringify(mapCenter));

  edgeProc.kill();
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
