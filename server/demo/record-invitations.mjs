// Browser walkthrough of the real frontend against npm run demo:invitations.
// Uses an installed Chromium browser; no npm browser dependency is needed.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const links = await (await fetch("http://localhost:5055/demo/links")).json();
const signInOnly = process.argv.includes("--sign-in-only");
const matchPostOnly = process.argv.includes("--match-post-only");
const output = resolve(matchPostOnly ? "docs/demo/match-requests" : signInOnly ? "docs/demo/sign-in" : "docs/demo/invitations");
const profile = resolve(".cache/invitation-demo-browser");
await mkdir(output, { recursive: true });
await mkdir(profile, { recursive: true });
const browser = spawn(process.env.DEMO_BROWSER ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--remote-debugging-port=9223", `--user-data-dir=${profile}`, "about:blank",
], { windowsHide: true, stdio: "ignore" });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
const shots = [];
try {
  let page;
  for (let tries = 0; tries < 100; tries++) {
    try { page = await (await fetch("http://127.0.0.1:9223/json/new?about:blank", { method: "PUT" })).json(); break; }
    catch { await pause(100); }
  }
  if (!page) throw new Error("Browser debugging port did not start");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const hydrationErrors = [];
  const requests = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === "Network.requestWillBeSent") requests.push(message.params.request);
    if (message.method === "Runtime.consoleAPICalled" && /hydrated|hydration|server rendered/i.test(JSON.stringify(message.params.args))) hydrationErrors.push(message.params.args);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    }
  };
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const value = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
    return value.result.value;
  };
  async function wait(expression) {
    for (let tries = 0; tries < 300; tries++) {
      if (await evaluate(expression)) return;
      await pause(100);
    }
    throw new Error(`Timed out: ${expression}; text: ${await evaluate("document.body.innerText")}`);
  }
  const navigate = async url => { await command("Page.navigate", { url }); await wait("document.readyState === 'complete'"); };
  const click = async label => {
    const expression = `Array.from((document.querySelector('[role=dialog]') ?? document).querySelectorAll('button,a')).find(el => el.textContent.trim() === ${JSON.stringify(label)})`;
    await wait(`!!(${expression})`);
    await wait(`!(${expression}).disabled`);
    const point = await evaluate(`(() => {const el = ${expression}; el.scrollIntoView({block:'center'}); const rect = el.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};})()`);
    await command("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
    await command("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
  };
  const fill = async (label, text) => {
    await evaluate(`(() => { const label = Array.from(document.querySelectorAll('label')).find(el => el.textContent.trim() === ${JSON.stringify(label)}); const input = label.querySelector('input') ?? document.getElementById(label.htmlFor); input.focus(); input.select(); })()`);
    await command("Input.insertText", { text });
  };
  async function screenshot(name, caption) {
    await pause(300);
    const { data } = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(resolve(output, `${name}.png`), Buffer.from(data, "base64"));
    shots.push({ name, caption });
    console.log(`Verified: ${caption}`);
  }
  const clearAuth = async () => { await evaluate("localStorage.removeItem('token')"); };
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Network.enable");
  await command("Browser.grantPermissions", { origin: "http://localhost:3100", permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
  await command("Emulation.setFocusEmulationEnabled", { enabled: true });
  // Reproduce Grammarly's body-attribute mutation before React hydrates.
  await command("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
    const inject = () => { if (!document.body) return false;
      document.body.setAttribute('data-new-gr-c-s-check-loaded', '14.1336.0');
      document.body.setAttribute('data-gr-ext-installed', ''); return true; };
    if (!inject()) { const observer = new MutationObserver(() => { if (inject()) observer.disconnect(); }); observer.observe(document, {childList:true,subtree:true}); }
  })();` });
  await command("Storage.clearDataForOrigin", { origin: "http://localhost:3100", storageTypes: "local_storage" });
  await command("Emulation.setDeviceMetricsOverride", { width: 1100, height: 850, deviceScaleFactor: 1, mobile: false });
  if (matchPostOnly) {
    await command("Emulation.setTimezoneOverride", { timezoneId: "America/Indiana/Indianapolis" });
    await navigate("http://localhost:3100/login?next=%2Fmatching");
    await wait("document.body.innerText.includes('Username or email')");
    await fill("Username or email", "owner"); await fill("Password", "demo123"); await click("Sign in");
    await wait("location.pathname === '/matching' && document.body.innerText.includes('Central Pitch')");
    await wait("!!document.querySelector('select option[value=field]') && !!document.querySelector('input[readonly]') && document.querySelector('input[readonly]').value.includes('/invite/')");
    await pause(300);
    await evaluate(`(() => {const el = document.querySelector('input[type=date]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'2099-10-20');
      el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await pause(200);
    await click("18:30-19:00"); await click("20:00-20:30");
    await wait("document.body.innerText.includes('18:30 – 20:30')");
    await click("Post request");
    await wait("document.body.innerText.includes('18:30-20:30') && Array.from(document.querySelectorAll('input[readonly]')).some(el => el.value.includes('/invite/'))");
    await wait("!document.body.innerText.includes('Posting')");
    const matchingPosts = requests.filter(req => req.method === "POST" && req.url.endsWith('/api/match-posts'));
    assert.equal(matchingPosts.length, 1);
    const payload = JSON.parse(matchingPosts[0].postData);
    assert.equal(payload.preferredStartTime, "2099-10-20T18:30:00.000Z");
    assert.equal(payload.preferredEndTime, "2099-10-20T20:30:00.000Z");
    assert.equal(Object.hasOwn(payload, "timeZone"), false);
    assert.equal(requests.some(req => req.method === "POST" && /\/(accept|respond)$/.test(req.url)), false);
    assert.equal(await evaluate("!!document.querySelector('[role=dialog]')"), false);
    await screenshot("01-posted-open", "Posting 18:30–20:30 creates an open request, uses the field timezone without extra database columns, and does not accept it.");
    const invitationUrl = await evaluate("document.querySelector('input[readonly]').value");
    await click("20:30-21:00"); await click("21:00-21:30"); await click("Post request");
    await wait("document.body.innerText.includes('20:30-21:30') && document.body.innerText.includes('18:30-20:30')");
    await screenshot("02-multiple-requests", "The same team can post a second request immediately next to the first one.");
    await click("19:00-19:30"); await click("19:30-20:00"); await click("Post request");
    await wait("document.body.innerText.includes('overlapping match request')");
    await screenshot("03-overlap-blocked", "An overlapping request is rejected without changing the existing requests.");
    await clearAuth(); await navigate(invitationUrl);
    await wait("document.body.innerText.includes('Create account') && document.body.innerText.includes('18:30-20:30')");
    assert.equal(await evaluate("document.body.innerText.includes('invitation is canceled')"), false);
    await screenshot("04-fresh-invitation", "The freshly posted request link remains available and offers login or registration.");
    await click("Log in"); await wait("document.body.innerText.includes('Username or email')");
    await fill("Username or email", "player"); await fill("Password", "demo123"); await click("Sign in");
    await wait("location.pathname.startsWith('/invite/') && document.body.innerText.includes('Accept match')");
    await screenshot("05-waiting-for-acceptance", "The other team must explicitly accept; opening the link and signing in do not confirm a match.");
    await evaluate("(() => { const select = document.querySelector('select'); select.value = 'opponent'; select.dispatchEvent(new Event('change', {bubbles:true})); })()");
    await click("Accept match"); await wait("document.body.innerText.includes('Match accepted.')");
    await screenshot("06-explicitly-accepted", "Only the opposing team's explicit acceptance confirms the match.");
  } else if (signInOnly) {
    await navigate("http://localhost:3100/login?next=%2Fteams");
    await wait("document.body.innerText.includes('sample accounts only')");
    await fill("Username or email", "not-a-demo-account");
    await fill("Password", "not-a-demo-password");
    await click("Sign in");
    await wait("document.body.innerText.includes('This demo uses separate accounts')");
    await screenshot("01-account-explanation", "A non-demo account is rejected with an explanation and sample sign-in details.");
    for (const username of ["player", "owner"]) {
      await navigate("http://localhost:3100/login?next=%2Fteams");
      await wait("document.body.innerText.includes('Username or email')");
      await fill("Username or email", username);
      await fill("Password", "demo123");
      await click("Sign in");
      await wait("location.pathname === '/teams' && document.body.innerText.includes('Team invitation link')");
      await screenshot(`02-${username}-signed-in`, `${username} / demo123 signs in successfully and opens My teams.`);
      await clearAuth();
    }
  } else {
  await navigate(links.team);
  await wait("document.body.innerText.includes('Create account')");
  await screenshot("01-guest", "A signed-out visitor sees the team invitation and login/register choices.");
  await click("Create account");
  await wait("document.body.innerText.includes('Confirm password')");
  await fill("Full name", "New Invite Player");
  await fill("Username", `invite_demo_${Date.now()}`);
  await fill("Email address", `invite_${Date.now()}@example.test`);
  await fill("Password", "demo123");
  await fill("Confirm password", "demo123");
  await click("Create Account");
  await wait("location.pathname.startsWith('/invite/') && document.body.innerText.includes('Accept invitation')");
  await screenshot("02-after-registration", "Registration signs the visitor in and returns directly to Accept or Decline.");
  await click("Accept invitation");
  await wait("document.body.innerText.includes('You joined the team.')");
  await screenshot("03-team-accepted", "An explicit acceptance adds the new account to the team.");
  await navigate("http://localhost:3100/teams");
  await wait("document.body.innerText.includes('Team invitation link') && document.body.innerText.includes('New Invite Player') && !!document.querySelector('input[readonly]') && document.querySelector('input[readonly]').value.length > 0");
  assert.equal(await evaluate("/share the team ID|Team ID/.test(document.body.innerText)"), false);
  assert.equal(await evaluate("document.querySelector('input[readonly]').value"), links.team);
  await screenshot("03a-team-management", "Team details show the single permanent invitation link with a Copy button.");
  await click("Copy");
  await wait("document.body.innerText.includes('Copied')");
  assert.equal(await evaluate("navigator.clipboard.readText()"), links.team);
  await evaluate("window.demoClipboard = navigator.clipboard; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })");
  await click("Copied");
  assert.equal(await evaluate("window.demoClipboard.readText()"), links.team);
  await evaluate("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: window.demoClipboard })");
  assert.equal(await evaluate("document.body.innerText.includes('Create invitation link')"), false);
  await navigate(links.newTeamMatch);
  await wait("document.body.innerText.includes('Team name')");
  await fill("Team name", "New Player FC");
  await click("Create team");
  await wait("document.body.innerText.includes('New Player FC') && !!document.querySelector('select')");
  await screenshot("03b-new-team", "A new user without a team creates one within the match invitation, then can accept.");
  await click("Accept match");
  await wait("document.body.innerText.includes('Match accepted.')");
  await clearAuth();
  await navigate(links.match);
  await wait("document.body.innerText.includes('Log in')");
  await click("Log in");
  await wait("document.body.innerText.includes('Username or email')");
  await fill("Username or email", "player");
  await fill("Password", "demo123");
  await click("Sign in");
  await wait("location.pathname.startsWith('/invite/') && !!document.querySelector('select option[value=opponent]')");
  await evaluate("(() => { const select = document.querySelector('select'); select.value = 'opponent'; select.dispatchEvent(new Event('change', {bubbles:true})); })()");
  await screenshot("04-match-choice", "An existing user logs in, returns to the match request, and chooses a team they lead.");
  await click("Accept match");
  await wait("document.body.innerText.includes('Match accepted.')");
  await screenshot("05-match-accepted", "Accepting the request creates the match and participant bookings.");
  await navigate(links.lobby);
  await wait("document.body.innerText.includes('Join lobby')");
  await click("Join lobby");
  await wait("document.body.innerText.includes('You joined the lobby.')");
  await screenshot("06-lobby-joined", "The lobby link joins the signed-in player using the normal capacity checks.");
  await navigate(links.decline);
  await wait("document.body.innerText.includes('Decline invitation')");
  await click("Decline invitation");
  await wait("document.body.innerText.includes('Invitation declined.')");
  await screenshot("07-declined", "Declining records the response without creating a membership or booking.");
  await navigate(links.closed);
  await wait("document.body.innerText.includes('invitation is canceled')");
  await screenshot("08-closed", "Links keep their URL but a canceled match request blocks acceptance.");
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await clearAuth();
  await navigate(links.lobby);
  await wait("document.body.innerText.includes('Create account')");
  assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
  await screenshot("09-mobile", "The invitation is usable on a narrow mobile screen.");
  await command("Emulation.setDeviceMetricsOverride", { width: 1100, height: 850, deviceScaleFactor: 1, mobile: false });
  await navigate("http://localhost:3100/login?next=%2Fteams");
  await wait("document.body.innerText.includes('Username or email')");
  await fill("Username or email", "owner");
  await fill("Password", "demo123");
  await click("Sign in");
  await wait("location.pathname === '/teams' && document.body.innerText.includes('Team invitation link')");
  await wait("!!document.querySelector('input[readonly]') && document.querySelector('input[readonly]').value.includes('/invite/')");
  assert.equal(await evaluate("document.querySelector('input[readonly]').value"), links.team);
  assert.equal(await evaluate("/Manage invitation links|Create invitation link|Revoke/.test(document.body.innerText)"), false);
  await screenshot("10-owner-link", "The owner sees the same permanent team URL; there is no invitation management dialog.");
  await navigate("http://localhost:3100/lobbies");
  await wait("document.body.innerText.includes('Lobby join link') && !!document.querySelector('input[readonly]') && document.querySelector('input[readonly]').value.length > 0");
  assert.equal(await evaluate("document.querySelector('input[readonly]').value"), links.lobby);
  await screenshot("11-lobby-link", "The lobby creator sees one stable join URL with a Copy button.");
  await navigate("http://localhost:3100/matching");
  await wait("document.body.innerText.includes('Match request link') && !!document.querySelector('input[readonly]') && document.querySelector('input[readonly]').value.length > 0");
  assert.ok(await evaluate(`Array.from(document.querySelectorAll('input[readonly]')).some(input => input.value === ${JSON.stringify(links.match)})`));
  await screenshot("12-match-link", "The posting team's leader sees one stable match-request URL with a Copy button.");
  await click("Cancel request");
  await wait("!!document.querySelector('[role=dialog]') && document.body.innerText.includes('Other teams will no longer be able to accept it.')");
  await screenshot("13-cancel-confirmation", "The posting team's leader can cancel an open request after confirmation.");
  await click("Cancel request");
  await wait("!document.querySelector('[role=dialog]') && document.body.innerText.includes('Match request canceled.')");
  await screenshot("14-request-canceled", "The request becomes canceled and can no longer be accepted.");
  assert.equal(hydrationErrors.length, 0, "Injected Grammarly body attributes must not trigger a hydration warning");
  }
  await writeFile(resolve(output, "walkthrough.html"), `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invitation walkthrough</title><style>body{font:16px system-ui;margin:30px auto;max-width:1100px;padding:0 20px;background:#f5f5f4;color:#171717}figure{margin:30px 0;background:white;padding:20px;border-radius:12px}img{max-width:100%;height:auto;border:1px solid #ddd}figcaption{font-weight:600;margin-bottom:12px}</style><h1>PitchBook invitation demo</h1><p>Recorded from the actual app with isolated sample data. No remote database changes.</p>${shots.map(({name,caption}) => `<figure><figcaption>${caption}</figcaption><img src="${name}.png" alt="${caption}"></figure>`).join("")}</html>`);
  await writeFile(resolve(output, "verification.json"), JSON.stringify({ screenshots: shots, passed: true }, null, 2));
} finally {
  socket?.close(); browser.kill();
}
