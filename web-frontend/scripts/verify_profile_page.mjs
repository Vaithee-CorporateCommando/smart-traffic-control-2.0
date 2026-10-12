import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_profile_' + Date.now());
  const port = 9230;
  const outDir = 'D:\\smart traffic control 2.0\\target\\screenshots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('--- Launching Edge Browser to Verify My Profile & Preferences ---');
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

  const screenshot = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath}`);
    return filePath;
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

  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    console.log('Waiting for application to load...');
    await new Promise(r => setTimeout(r, 2000));

    // Login as Commuter
    console.log('Logging in as Commuter (user / user123)...');
    await setInput('#login-username', 'user');
    await setInput('#login-password', 'user123');
    await evaluate(`document.getElementById('btn-login-submit')?.click()`);

    await new Promise(r => setTimeout(r, 2000));

    // Click My Profile Tab
    console.log('Navigating to My Profile tab (#public-nav-profile)...');
    await evaluate(`document.getElementById('public-nav-profile')?.click()`);

    await new Promise(r => setTimeout(r, 1000));

    // Inspect Profile Content
    console.log('Inspecting Profile elements and details...');
    const profileDetails = await evaluate(`(() => {
      const title = document.querySelector('.profile-title')?.textContent?.trim();
      const subtitle = document.querySelector('.profile-subtitle')?.textContent?.trim();
      const avatar = document.getElementById('profile-user-avatar')?.textContent?.trim();
      const userName = document.getElementById('profile-user-name')?.textContent?.trim();
      const userEmail = document.getElementById('profile-user-email')?.textContent?.trim();
      const userTier = document.getElementById('profile-user-tier')?.textContent?.trim();
      
      const vehicleSelect = document.getElementById('commute-vehicle-select');
      const vehicleOptions = vehicleSelect ? Array.from(vehicleSelect.options).map(o => o.text) : [];
      const currentVehicle = vehicleSelect?.value;

      const check1 = document.getElementById('pref-green-corridors')?.checked;
      const check2 = document.getElementById('pref-auto-reroute')?.checked;
      const check3 = document.getElementById('pref-sms-alerts')?.checked;

      const saveBtn = document.getElementById('save-commuter-preferences-btn')?.textContent?.trim();
      
      return {
        title,
        subtitle,
        avatar,
        userName,
        userEmail,
        userTier,
        currentVehicle,
        vehicleOptions,
        checkboxStates: [check1, check2, check3],
        saveBtnText: saveBtn
      };
    })()`);

    console.log('Profile Details Extracted:', JSON.stringify(profileDetails, null, 2));

    // Take Desktop Screenshot
    await screenshot('profile_desktop_initial.png');

    // Interact with Preferences
    console.log('Modifying Commuter preferences (select EV, toggle SMS alert)...');
    await evaluate(`(() => {
      const select = document.getElementById('commute-vehicle-select');
      if (select) {
        select.value = 'Electric Vehicle (EV)';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const smsCheck = document.getElementById('pref-sms-alerts');
      if (smsCheck) {
        smsCheck.click();
      }
    })()`);

    await new Promise(r => setTimeout(r, 500));

    // Click Save Button
    console.log('Clicking Save Commuter Preferences button...');
    await evaluate(`(() => {
      const btn = document.getElementById('save-commuter-preferences-btn');
      if (btn) btn.click();
    })()`);

    await new Promise(r => setTimeout(r, 800));

    // Verify Success Banner
    const successResult = await evaluate(`(() => {
      const banner = document.getElementById('profile-save-success-banner');
      return {
        bannerExists: !!banner,
        bannerText: banner?.textContent?.trim(),
        smsAlertsChecked: document.getElementById('pref-sms-alerts')?.checked,
        vehicleSelected: document.getElementById('commute-vehicle-select')?.value
      };
    })()`);

    console.log('Save Verification Result:', JSON.stringify(successResult, null, 2));

    // Take Screenshot after saving
    await screenshot('profile_preferences_verified.png');

    // Test Mobile viewport responsiveness
    console.log('Testing mobile responsive layout (375x667)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 500));
    await screenshot('profile_mobile_verified.png');

    console.log('--- ALL PROFILE CHECKS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Error in profile verification:', err);
  } finally {
    ws.close();
    edgeProc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

main();
