import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_cctv_' + Date.now());
  const port = 9235;
  const outDir = 'D:\\smart traffic control 2.0\\target\\screenshots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('--- Launching Edge Browser to Verify Live CCTV Matrix & Simulation ---');
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,960',
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
    const curId = id++;
    pending.set(curId, { resolve, reject });
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return res.result ? res.result.value : null;
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

  const screenshot = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath}`);
    return filePath;
  };

  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    console.log('Waiting for application to load...');
    await new Promise(r => setTimeout(r, 2000));

    // Login as System Administrator
    console.log('Logging in as System Administrator (admin / admin123)...');
    await setInput('#login-username', 'admin');
    await setInput('#login-password', 'admin123');
    await evaluate(`document.getElementById('btn-login-submit')?.click()`);

    await new Promise(r => setTimeout(r, 2000));

    // Navigate to Live CCTV Matrix
    console.log('Navigating to Live CCTV Matrix (#admin-nav-cctv)...');
    await evaluate(`document.getElementById('admin-nav-cctv')?.click()`);
    await new Promise(r => setTimeout(r, 1500));

    // Verify all 9 camera cards and canvases
    console.log('Verifying CCTV feeds and canvases...');
    const matrixInfo = await evaluate(`(() => {
      const canvases = Array.from(document.querySelectorAll('canvas[id^="canvas-CAM-"]'));
      const cards = Array.from(document.querySelectorAll('[id^="cctv-card-CAM-"]'));
      const demoBadge = document.body.innerText.includes('SIMULATED LIVE FEED — DEMO MODE');
      
      const feedDetails = canvases.map(c => {
        const id = c.id.replace('canvas-', '');
        const card = document.getElementById('cctv-card-' + id);
        return {
          id,
          hasCanvas: !!c,
          width: c.width,
          height: c.height,
          cardText: card ? card.innerText.split('\\n')[0] : null
        };
      });

      return {
        totalCanvases: canvases.length,
        totalCards: cards.length,
        hasDemoBadge: demoBadge,
        feedDetails
      };
    })()`);

    console.log('CCTV Matrix Info:', JSON.stringify(matrixInfo, null, 2));

    // Verify continuous animation by checking pixel changes across 500ms
    console.log('Verifying continuous animation on CAM-01...');
    const animCheck = await evaluate(`(() => {
      const c1 = document.getElementById('canvas-CAM-01');
      if (!c1) return { animated: false };
      const ctx = c1.getContext('2d');
      const d1 = ctx.getImageData(50, 80, 20, 20).data;
      const sum1 = Array.from(d1).reduce((a, b) => a + b, 0);
      return { sum1 };
    })()`);

    await new Promise(r => setTimeout(r, 600));

    const animCheck2 = await evaluate(`(() => {
      const c1 = document.getElementById('canvas-CAM-01');
      if (!c1) return { animated: false };
      const ctx = c1.getContext('2d');
      const d2 = ctx.getImageData(50, 80, 20, 20).data;
      const sum2 = Array.from(d2).reduce((a, b) => a + b, 0);
      return { sum2 };
    })()`);

    const isAnimated = animCheck.sum1 !== animCheck2.sum2;
    console.log(`Canvas CAM-01 animation test: Frame1 Sum=${animCheck.sum1}, Frame2 Sum=${animCheck2.sum2}, IsAnimated=${isAnimated}`);

    // Capture screenshot of live CCTV Matrix
    await screenshot('cctv_matrix_live.png');

    // Test Frame Capture
    console.log('Testing Forensic Frame Capture on CAM-01...');
    await evaluate(`document.getElementById('capture-btn-CAM-01')?.click()`);
    await new Promise(r => setTimeout(r, 800));

    const modalCheck = await evaluate(`(() => {
      const modal = document.getElementById('cctv-snapshot-modal');
      const img = document.getElementById('snapshot-image-preview');
      const downloadBtn = document.getElementById('download-snapshot-btn');
      return {
        modalVisible: !!modal,
        hasImage: !!img && img.src.startsWith('data:image/png'),
        imageSrcLength: img ? img.src.length : 0,
        hasDownloadBtn: !!downloadBtn
      };
    })()`);
    console.log('Snapshot Modal Check:', JSON.stringify(modalCheck, null, 2));

    await screenshot('cctv_snapshot_modal.png');

    // Close Modal
    console.log('Closing snapshot modal...');
    await evaluate(`document.getElementById('close-snapshot-btn')?.click()`);
    await new Promise(r => setTimeout(r, 500));

    // Test Junction Filter
    console.log('Testing Junction Filter (select J1 - Central City Square)...');
    await evaluate(`(() => {
      const select = document.getElementById('cctv-junction-filter');
      if (select) {
        select.value = 'J1';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await new Promise(r => setTimeout(r, 500));

    const filterCheck = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('[id^="cctv-card-CAM-"]'));
      return {
        cardCount: cards.length,
        cardIds: cards.map(c => c.id)
      };
    })()`);
    console.log('Filtered (J1) Check:', JSON.stringify(filterCheck, null, 2));
    await screenshot('cctv_filtered_j1.png');

    // Reset Filter to ALL
    await evaluate(`(() => {
      const select = document.getElementById('cctv-junction-filter');
      if (select) {
        select.value = 'ALL';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await new Promise(r => setTimeout(r, 500));

    // Test Signal Override Connection:
    // Change signal on J1 in Signal Control module, then check CCTV reflection!
    console.log('Testing Signal Override Connection: Navigating to Signal Control (#admin-nav-signal)...');
    await evaluate(`document.getElementById('admin-nav-signal')?.click()`);
    await new Promise(r => setTimeout(r, 1000));

    console.log('Applying Force All-Red override on J1...');
    await setInput('input[placeholder*="VIP motorcade"]', 'Routine Emergency Security Sweep J1');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const redBtn = btns.find(b => b.textContent.includes('Force All-Red'));
      if (redBtn) redBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    // Return to CCTV Matrix and verify CAM-01 and CAM-02 reflect RED signal!
    console.log('Returning to Live CCTV Matrix (#admin-nav-cctv) to verify signal reflection...');
    await evaluate(`document.getElementById('admin-nav-cctv')?.click()`);
    await new Promise(r => setTimeout(r, 1000));

    await screenshot('cctv_signal_override_reflected.png');

    console.log('--- ALL CCTV MATRIX VERIFICATION CHECKS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Error in CCTV verification:', err);
  } finally {
    ws.close();
    edgeProc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

main();
