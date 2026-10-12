import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_' + Date.now());
  
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,800',
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
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (!versionData) {
    console.error('Could not connect to Edge DevTools');
    edgeProc.kill();
    process.exit(1);
  }

  const newPageRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:5173/', { method: 'PUT' });
  const pageTarget = await newPageRes.json();
  const wsUrl = pageTarget.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise(resolve => ws.onopen = resolve);

  let id = 1;
  const pending = new Map();
  const consoleMessages = [];
  const networkRequests = [];

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
    if (msg.method === 'Log.entryAdded') {
      consoleMessages.push(msg.params.entry);
    }
    if (msg.method === 'Network.responseReceived') {
      networkRequests.push({
        url: msg.params.response.url,
        status: msg.params.response.status,
        mimeType: msg.params.response.mimeType
      });
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
  await send('Network.enable');
  await send('Console.enable');
  await send('Log.enable');

  await send('Page.navigate', { url: 'http://localhost:5173/' });

  // Wait 3.5 seconds for all assets and fonts to settle
  await new Promise(r => setTimeout(r, 3500));

  const screenshotResult = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshotResult.data, 'base64');
  const screenshotPath = 'd:\\smart traffic control 2.0\\target\\screenshots\\web_browser_login.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  fs.writeFileSync(screenshotPath, buffer);

  console.log('SCREENSHOT_SAVED:', screenshotPath);
  console.log('CONSOLE_MESSAGES_COUNT:', consoleMessages.length);
  if (consoleMessages.length > 0) {
    console.log('CONSOLE_MESSAGES:', JSON.stringify(consoleMessages, null, 2));
  } else {
    console.log('NO_CONSOLE_ERRORS');
  }
  const imgReqs = networkRequests.filter(r => r.url.includes('image') || r.url.includes('png') || r.url.includes('login'));
  console.log('IMAGE_NETWORK_REQUESTS:', JSON.stringify(imgReqs, null, 2));

  ws.close();
  try { edgeProc.kill(); } catch (e) {}
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
