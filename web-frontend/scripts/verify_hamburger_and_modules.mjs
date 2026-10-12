import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function runVerification() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(process.env.TEMP, 'edge_cdp_verify_' + Date.now());
  const port = 9225;

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
    console.error('Failed to launch and connect to Edge on port ' + port);
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');

  await send('Page.navigate', { url: 'http://localhost:5173/' });
  console.log('Waiting for login view to load...');
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

  const results = {};

  // ==========================================
  // PART 1: PUBLIC USER DASHBOARD VERIFICATION
  // ==========================================
  console.log('\n==========================================');
  console.log('PART 1: PUBLIC USER DASHBOARD VERIFICATION');
  console.log('==========================================');

  // Fill public commuter credentials
  await setInput('#login-username', 'user');
  await setInput('#login-password', 'user123');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // 1.1 Check Public Sidebar heading
  let evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const heading = document.getElementById('public-menu-heading');
      const sidebar = document.getElementById('public-sidebar');
      const headerHamburger = document.getElementById('public-header-hamburger-btn');
      const sidebarHamburger = document.getElementById('public-sidebar-menu-btn');
      return {
        headingText: heading ? heading.innerText.trim() : null,
        hasSidebar: !!sidebar,
        hasHeaderHamburger: !!headerHamburger,
        hasSidebarHamburger: !!sidebarHamburger,
        initialWidth: sidebar ? sidebar.offsetWidth : null
      };
    })()`,
    returnByValue: true
  });
  results.publicMenuInitial = evalRes.result?.value;
  console.log('Public Menu Initial State:', results.publicMenuInitial);

  // 1.2 Toggle hamburger menu collapsed
  await send('Runtime.evaluate', {
    expression: `document.getElementById('public-sidebar-menu-btn').click()`
  });
  await new Promise(r => setTimeout(r, 400));

  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const sidebar = document.getElementById('public-sidebar');
      return {
        collapsedWidth: sidebar ? sidebar.offsetWidth : null
      };
    })()`,
    returnByValue: true
  });
  results.publicMenuCollapsed = evalRes.result?.value;
  console.log('Public Menu Collapsed State:', results.publicMenuCollapsed);

  // 1.3 Toggle hamburger menu expanded again via header hamburger
  await send('Runtime.evaluate', {
    expression: `document.getElementById('public-header-hamburger-btn').click()`
  });
  await new Promise(r => setTimeout(r, 400));

  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const sidebar = document.getElementById('public-sidebar');
      const heading = document.getElementById('public-menu-heading');
      return {
        reExpandedWidth: sidebar ? sidebar.offsetWidth : null,
        headingText: heading ? heading.innerText.trim() : null
      };
    })()`,
    returnByValue: true
  });
  results.publicMenuReExpanded = evalRes.result?.value;
  console.log('Public Menu Re-expanded State:', results.publicMenuReExpanded);

  // 1.4 Test every Public Module accessible
  // Module: Traffic Map
  await send('Runtime.evaluate', {
    expression: `document.getElementById('public-nav-map').click()`
  });
  await new Promise(r => setTimeout(r, 500));
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        hasCityNetworkHeader: document.body.innerText.includes('City Traffic Network'),
        hasJunctionInspector: document.body.innerText.includes('Junction Details Inspector'),
        hasLeafletMap: !!document.querySelector('.leaflet-container')
      };
    })()`,
    returnByValue: true
  });
  results.publicModuleMap = evalRes.result?.value;
  console.log('Public Module [Traffic Map]:', results.publicModuleMap);

  // Module: Plan a Route
  await send('Runtime.evaluate', {
    expression: `document.getElementById('public-nav-route').click()`
  });
  await new Promise(r => setTimeout(r, 500));
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        hasRouteHeader: document.body.innerText.includes('Smart Road Route Planner'),
        hasOriginInput: !!document.getElementById('route-origin-input'),
        hasDestInput: !!document.getElementById('route-dest-input'),
        hasPlanBtn: !!document.getElementById('plan-road-route-btn'),
        hasLeafletMap: !!document.querySelector('.leaflet-container')
      };
    })()`,
    returnByValue: true
  });
  results.publicModuleRoute = evalRes.result?.value;
  console.log('Public Module [Plan a Route]:', results.publicModuleRoute);

  // Module: Traffic Alerts
  await send('Runtime.evaluate', {
    expression: `document.getElementById('public-nav-alerts').click()`
  });
  await new Promise(r => setTimeout(r, 500));
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        hasAlertsHeader: document.body.innerText.includes('Traffic Alerts & Roadblocks'),
        hasRoadClosureBadge: document.body.innerText.includes('ROAD CLOSURE'),
        hasWaterloggingNotice: document.body.innerText.includes('Water Pipe Fracture') || document.body.innerText.includes('Flooding')
      };
    })()`,
    returnByValue: true
  });
  results.publicModuleAlerts = evalRes.result?.value;
  console.log('Public Module [Traffic Alerts]:', results.publicModuleAlerts);

  // Module: My Profile
  await send('Runtime.evaluate', {
    expression: `document.getElementById('public-nav-profile').click()`
  });
  await new Promise(r => setTimeout(r, 500));
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        hasProfileHeader: document.body.innerText.includes('My Profile & Preferences'),
        hasCommuterVehicle: document.body.innerText.includes('Default Commute Vehicle'),
        hasGreenCorridorsCheckbox: document.body.innerText.includes('signal-synchronized green corridors')
      };
    })()`,
    returnByValue: true
  });
  results.publicModuleProfile = evalRes.result?.value;
  console.log('Public Module [My Profile]:', results.publicModuleProfile);

  // 1.5 Confirm Admin-only modules are NOT exposed to Public User
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasNoAdminOverride: !text.includes('Signal Control & Override'),
        hasNoAdminCCTV: !text.includes('Live CCTV Matrix'),
        hasNoAdminAudit: !text.includes('Reports & Audit Log'),
        hasNoAdminEmergency: !text.includes('Emergency Priority')
      };
    })()`,
    returnByValue: true
  });
  results.publicRoleRestrictions = evalRes.result?.value;
  console.log('Public Role Permissions Protected:', results.publicRoleRestrictions);

  // Sign out from public
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signout = btns.find(b => b.innerText.includes('Sign Out'));
      if (signout) signout.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // ==========================================
  // PART 2: ADMIN DASHBOARD VERIFICATION
  // ==========================================
  console.log('\n==========================================');
  console.log('PART 2: ADMIN DASHBOARD VERIFICATION');
  console.log('==========================================');

  // Fill admin credentials
  await setInput('#login-username', 'admin');
  await setInput('#login-password', 'admin123');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-login-submit').click()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // 2.1 Verify "Inspector Rajesh" is completely removed
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const bodyText = document.body.innerText;
      const htmlText = document.documentElement.innerHTML;
      return {
        hasInspectorRajeshText: bodyText.includes('Inspector Rajesh') || bodyText.includes('Rajesh Varma') || bodyText.includes('Rajesh'),
        hasInspectorRajeshHTML: htmlText.includes('Inspector Rajesh') || htmlText.includes('Rajesh Varma'),
        userDisplay: bodyText.includes('System Administrator') ? 'System Administrator' : 'UNKNOWN',
        hasAdminAccessBadge: bodyText.includes('AUTHORITY LEVEL: ADMIN ACCESS')
      };
    })()`,
    returnByValue: true
  });
  results.adminIdentity = evalRes.result?.value;
  console.log('Admin Identity Verification (Inspector Rajesh check):', results.adminIdentity);

  // 2.2 Verify Admin Menu & Hamburger button
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const heading = document.getElementById('admin-menu-heading');
      const sidebar = document.getElementById('admin-sidebar');
      const headerHamburger = document.getElementById('admin-header-hamburger-btn');
      const sidebarHamburger = document.getElementById('admin-sidebar-menu-btn');
      return {
        headingText: heading ? heading.innerText.trim() : null,
        hasSidebar: !!sidebar,
        hasHeaderHamburger: !!headerHamburger,
        hasSidebarHamburger: !!sidebarHamburger,
        initialWidth: sidebar ? sidebar.offsetWidth : null
      };
    })()`,
    returnByValue: true
  });
  results.adminMenuInitial = evalRes.result?.value;
  console.log('Admin Menu Initial State:', results.adminMenuInitial);

  // 2.3 Toggle admin hamburger menu collapsed
  await send('Runtime.evaluate', {
    expression: `document.getElementById('admin-sidebar-menu-btn').click()`
  });
  await new Promise(r => setTimeout(r, 400));

  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const sidebar = document.getElementById('admin-sidebar');
      return {
        collapsedWidth: sidebar ? sidebar.offsetWidth : null
      };
    })()`,
    returnByValue: true
  });
  results.adminMenuCollapsed = evalRes.result?.value;
  console.log('Admin Menu Collapsed State:', results.adminMenuCollapsed);

  // 2.4 Toggle admin hamburger menu expanded via header hamburger
  await send('Runtime.evaluate', {
    expression: `document.getElementById('admin-header-hamburger-btn').click()`
  });
  await new Promise(r => setTimeout(r, 400));

  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const sidebar = document.getElementById('admin-sidebar');
      const heading = document.getElementById('admin-menu-heading');
      return {
        reExpandedWidth: sidebar ? sidebar.offsetWidth : null,
        headingText: heading ? heading.innerText.trim() : null
      };
    })()`,
    returnByValue: true
  });
  results.adminMenuReExpanded = evalRes.result?.value;
  console.log('Admin Menu Re-expanded State:', results.adminMenuReExpanded);

  // 2.5 Test all 8 Admin Modules Accessible & Functional
  const adminModules = [
    { id: 'admin-nav-overview', name: 'Overview', textMarker: 'Traffic Operations Center — System Overview' },
    { id: 'admin-nav-map', name: 'Tactical Traffic Map', textMarker: 'Tactical Corridor & Road Route Inspector' },
    { id: 'admin-nav-junctions', name: 'Junction Management', textMarker: 'Intersection Network & Signal Management' },
    { id: 'admin-nav-cctv', name: 'Live CCTV Matrix', textMarker: 'Optical CCTV Surveillance Matrix' },
    { id: 'admin-nav-signals', name: 'Signal Control & Override', textMarker: 'Signal Phasing & Manual Override Console' },
    { id: 'admin-nav-emergency', name: 'Emergency Priority', textMarker: 'Emergency Corridor & Green-Wave Preemption' },
    { id: 'admin-nav-roadblocks', name: 'Road Blocks & Incidents', textMarker: 'Roadblock Management & Incident Verification' },
    { id: 'admin-nav-reports', name: 'Reports & Audit Log', textMarker: 'Audit Trail & Operational Control History' }
  ];

  results.adminModules = {};
  for (const mod of adminModules) {
    await send('Runtime.evaluate', {
      expression: `document.getElementById('${mod.id}').click()`
    });
    await new Promise(r => setTimeout(r, 450));
    const modRes = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          displayed: document.body.innerText.includes('${mod.textMarker}')
        };
      })()`,
      returnByValue: true
    });
    results.adminModules[mod.name] = modRes.result?.value?.displayed;
    console.log(`Admin Module [${mod.name}]: Accessible =`, modRes.result?.value?.displayed);
  }

  // 2.6 Responsive Drawer Test (Resize viewport to mobile 600px width)
  console.log('\n--- Responsive Drawer Test (600px width) ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 600,
    height: 850,
    deviceScaleFactor: 1,
    mobile: true
  });
  await send('Runtime.evaluate', {
    expression: `window.dispatchEvent(new Event('resize'))`
  });
  await new Promise(r => setTimeout(r, 500));

  // Open drawer via header hamburger
  await send('Runtime.evaluate', {
    expression: `document.getElementById('admin-header-hamburger-btn').click()`
  });
  await new Promise(r => setTimeout(r, 500));

  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const backdrop = document.getElementById('admin-sidebar-backdrop');
      const sidebar = document.getElementById('admin-sidebar');
      const rect = sidebar ? sidebar.getBoundingClientRect() : null;
      return {
        hasBackdrop: !!backdrop,
        sidebarVisible: !!sidebar && rect && rect.left >= 0 && rect.width > 0
      };
    })()`,
    returnByValue: true
  });
  results.mobileDrawerOpen = evalRes.result?.value;
  console.log('Mobile Drawer Open & Backdrop:', results.mobileDrawerOpen);

  // Click backdrop to close drawer
  await send('Runtime.evaluate', {
    expression: `document.getElementById('admin-sidebar-backdrop').click()`
  });
  await new Promise(r => setTimeout(r, 500));

  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const backdrop = document.getElementById('admin-sidebar-backdrop');
      return {
        backdropGone: !backdrop
      };
    })()`,
    returnByValue: true
  });
  results.mobileDrawerClosed = evalRes.result?.value;
  console.log('Mobile Drawer Closed via Backdrop Click:', results.mobileDrawerClosed);

  // Reset viewport back to desktop
  await send('Emulation.clearDeviceMetricsOverride');
  await send('Runtime.evaluate', {
    expression: `window.dispatchEvent(new Event('resize'))`
  });
  await new Promise(r => setTimeout(r, 500));

  // Capture final screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const outDir = 'd:\\smart traffic control 2.0\\target\\screenshots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'verified_admin_final.png'), Buffer.from(screenshot.data, 'base64'));

  console.log('\n==========================================');
  console.log('VERIFICATION SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('Console Errors Detected:', consoleErrors.length, consoleErrors);
  console.log('==========================================');

  ws.close();
  try { edgeProc.kill(); } catch (e) {}
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
