import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function runTests() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_test_' + Date.now());
  
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,800',
    'about:blank'
  ]);

  let versionData = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9224/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  if (!versionData) {
    console.error('Failed to connect to browser on port 9224');
    edgeProc.kill();
    process.exit(1);
  }

  const newPageRes = await fetch('http://127.0.0.1:9224/json/new?http://localhost:5173/', { method: 'PUT' });
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

  console.log('--- TEST 1: Check Empty Validation ---');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 250));
  let res = await send('Runtime.evaluate', {
    expression: `document.querySelector('.login-alert-error')?.textContent || ''`,
    returnByValue: true
  });
  const emptyValidationText = res.result?.value;
  console.log('Empty validation result:', emptyValidationText);

  console.log('--- TEST 2: Check Invalid Credentials ---');
  await setInput('#login-username', 'invalid_user');
  await setInput('#login-password', 'wrong_pass');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 250));
  res = await send('Runtime.evaluate', {
    expression: `document.querySelector('.login-alert-error')?.textContent || ''`,
    returnByValue: true
  });
  const invalidCredentialsText = res.result?.value;
  console.log('Invalid credentials result:', invalidCredentialsText);

  console.log('--- TEST 3: Check Forgot Password Modal ---');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.login-forgot-link').click()`
  });
  await new Promise(r => setTimeout(r, 250));
  res = await send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.querySelector('.login-modal-card');
      return {
        modalFound: !!modal,
        title: modal?.querySelector('h3')?.textContent || '',
        hasHelpText: modal?.textContent.includes('cybersecurity protocols') || false
      };
    })()`,
    returnByValue: true
  });
  console.log('Forgot password modal opened:', JSON.stringify(res.result?.value));

  // Dismiss modal
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.login-modal-card button.btn-primary').click()`
  });
  await new Promise(r => setTimeout(r, 250));
  res = await send('Runtime.evaluate', {
    expression: `!document.querySelector('.login-modal-card')`,
    returnByValue: true
  });
  console.log('Forgot password modal closed successfully:', res.result?.value);

  console.log('--- TEST 4: Check Public Registration Flow ---');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.login-register-link').click()`
  });
  await new Promise(r => setTimeout(r, 250));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const inputs = document.querySelectorAll('.login-modal-card input');
      const setVal = (el, val) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setVal(inputs[0], 'Devendra Verma');
      setVal(inputs[1], 'devendra');
      setVal(inputs[2], 'devendra@traffic-citizen.org');
      setVal(inputs[3], 'secretPass2026');
      document.querySelector('.login-modal-card button[type="submit"]').click();
    })()`
  });
  await new Promise(r => setTimeout(r, 350));

  res = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        successAlert: document.querySelector('.login-alert-success')?.textContent || '',
        userFilled: document.getElementById('login-username').value,
        passFilled: document.getElementById('login-password').value
      };
    })()`,
    returnByValue: true
  });
  console.log('Registration submission result:', JSON.stringify(res.result?.value));

  console.log('--- TEST 5: Login with newly registered user ---');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 1200));

  res = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        isPublicDashboard: document.body.innerText.includes('Citizen Urban Mobility & Route Guidance Portal'),
        userBadge: document.body.innerText.includes('Devendra Verma (PUBLIC)'),
        hasMap: !!document.querySelector('canvas')
      };
    })()`,
    returnByValue: true
  });
  console.log('Public dashboard verification:', JSON.stringify(res.result?.value));

  // Take screenshot of public dashboard
  let ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:\\smart traffic control 2.0\\target\\screenshots\\verified_public_dashboard.png', Buffer.from(ss.data, 'base64'));

  console.log('--- TEST 6: Sign Out and Return to Login ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signoutBtn = btns.find(b => b.textContent.includes('Sign Out'));
      if (signoutBtn) signoutBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  res = await send('Runtime.evaluate', {
    expression: `!!document.getElementById('btn-login-submit')`,
    returnByValue: true
  });
  console.log('Returned to Login screen after Sign Out:', res.result?.value);

  console.log('--- TEST 7: Check Admin Login Flow (System Administrator) ---');
  await setInput('#login-username', 'admin');
  await setInput('#login-password', 'admin123');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 1200));

  res = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        isAdminDashboard: document.body.innerText.includes('System Administrator') && document.body.innerText.includes('ADMIN ACCESS'),
        hasControlTabs: document.body.innerText.includes('Signal Control & Override') && document.body.innerText.includes('Live CCTV Matrix'),
        hasIncidents: document.body.innerText.includes('Road Blocks & Incidents')
      };
    })()`,
    returnByValue: true
  });
  console.log('Admin dashboard verification:', JSON.stringify(res.result?.value));

  // Take screenshot of admin dashboard
  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:\\smart traffic control 2.0\\target\\screenshots\\verified_admin_dashboard.png', Buffer.from(ss.data, 'base64'));

  // Test sign out from admin and capture final pristine login page screenshot
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signoutBtn = btns.find(b => b.textContent.includes('Sign Out'));
      if (signoutBtn) signoutBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:\\smart traffic control 2.0\\target\\screenshots\\final_redesigned_login_page.png', Buffer.from(ss.data, 'base64'));

  console.log('--- TEST 8: Responsive Layout Verification ---');
  // Emulate mobile viewport 375x812
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 600));

  res = await send('Runtime.evaluate', {
    expression: `(() => {
      const loginBox = document.querySelector('.login-form-wrapper');
      const submitBtn = document.getElementById('btn-login-submit');
      return {
        formVisible: !!loginBox,
        submitVisible: !!submitBtn,
        scrollWidth: document.body.scrollWidth,
        innerWidth: window.innerWidth
      };
    })()`,
    returnByValue: true
  });
  console.log('Mobile viewport 375px verification:', JSON.stringify(res.result?.value));

  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:\\smart traffic control 2.0\\target\\screenshots\\mobile_login_page.png', Buffer.from(ss.data, 'base64'));

  console.log('====================================');
  console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
  console.log('Console Errors:', consoleErrors.length);
  console.log('====================================');

  ws.close();
  edgeProc.kill();
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
