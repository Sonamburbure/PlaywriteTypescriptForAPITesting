/**
 * Wizard UI Server — interactive event creation without ANTHROPIC_API_KEY
 * Uses a scripted step-by-step flow that calls AutomateEvents APIs directly.
 */
import * as http from 'http';
import * as crypto from 'crypto';
import * as os from 'os';
import dotenv from 'dotenv';
import { setAuthToken, setTenantPath, setLogonAs } from '../utils/tokenStore.js';
import {
  toolCreateEvent, toolCreateBarsetup, toolCreateItemserved,
  toolCreateMenu, toolAddMenuItem, toolCreateBarcard, toolRunAutopreplan,
} from './tools.js';

const envFile = process.env.ENV_FILE ?? '.env.dev';
dotenv.config({ path: envFile });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT    = parseInt(process.env.PORT ?? '3000');
const ENVNAME = envFile.replace('.env.', '').toUpperCase();

// ── Auth ──────────────────────────────────────────────────────────────────────
async function login(): Promise<void> {
  const email    = process.env.API_EMAIL    ?? process.env.EMAIL    ?? '';
  const password = process.env.API_PASSWORD ?? process.env.PASSWORD ?? '';
  const tenant   = process.env.TENANT_NAME  ?? process.env.LOGON_AS ?? '';
  const secret   = process.env.AUTOMATE_SECRET ?? '';

  const res = await fetch(`${process.env.BASE_API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-automate-secret': secret },
    body: JSON.stringify({ email, password, tenant_name: tenant }),
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { throw new Error(`Login failed — invalid JSON response: ${text.slice(0, 200)}`); }
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${JSON.stringify(body)}`);
  setAuthToken(body.token);
  setTenantPath(body.tenant_cname);
  setLogonAs(body.logon_as);
}

// ── Session state ─────────────────────────────────────────────────────────────
interface Session {
  step: number;
  data: Record<string, any>;
  ids:  Record<string, any>;
}
const sessions = new Map<string, Session>();

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { ask: "👋 Welcome to **AutomateEvents**! I'll guide you through creating a complete event setup.\n\nLet's start — what's the **event name**?" },
  { ask: "How many **guests** are expected?" },
  { ask: "What's the **start date**? _(format: YYYY-MM-DD, e.g. 2026-07-15)_" },
  { ask: "What's the **end date**? _(format: YYYY-MM-DD)_" },
  { ask: "What time does the **bar open** each day? _(format: HH:MM, e.g. 18:00)_" },
  { ask: "What time does the **bar close** each day? _(format: HH:MM, e.g. 23:00)_" },
  // step 6: create event (API call)
  { ask: "⚙️ Creating your event…" },
  { ask: "What would you like to name the **bar setup**?\n_(e.g. \"Signature Cocktail Bar\")_" },
  // step 8: create bar setup (API call)
  { ask: "⚙️ Creating bar setup…" },
  { ask: "What is the main **drink or item** to be served?\n_(e.g. \"Classic Negroni Service\")_" },
  // step 10: create item served (API call)
  { ask: "⚙️ Creating item served…" },
  { ask: "What should we call the **event menu**?\n_(e.g. \"Premium Cocktail Collection\")_" },
  // step 12: create menu (API call)
  { ask: "⚙️ Creating menu…" },
  { ask: "How many **drinks per guest** (per-person rate)? _(e.g. 5)_" },
  // step 14: create menu item + barcard + autopreplan (API calls)
  { ask: "⚙️ Finalising event setup…" },
];

async function processStep(session: Session, input: string): Promise<{ bot: string; done?: boolean }> {
  const { step, data, ids } = session;

  switch (step) {
    case 0: data.event_name    = input.trim();  break;
    case 1: data.no_of_guest   = parseInt(input) || 100; break;
    case 2: data.start_date    = input.trim();  break;
    case 3: data.end_date      = input.trim();  break;
    case 4: data.daily_start   = input.trim();  break;
    case 5: data.daily_end     = input.trim();  break;

    case 6: {
      // Create Event
      try {
        const r = await toolCreateEvent({
          event_name: data.event_name, no_of_guest: data.no_of_guest,
          event_start_date: data.start_date, event_end_date: data.end_date,
          daily_start_time: data.daily_start, daily_end_time: data.daily_end,
        });
        ids.eventid          = r.eventid;
        ids.event_start_date = r.event_start_date;
        ids.event_end_date   = r.event_end_date;
        ids.daily_start_time = r.daily_start_time;
        ids.daily_end_time   = r.daily_end_time;
        session.step++;
        return { bot: `✅ Event **"${data.event_name}"** created (ID: ${r.eventid})\n\n${STEPS[session.step].ask}` };
      } catch (e: any) {
        return { bot: `❌ Failed to create event: ${e.message}\n\nPlease try again — what's the event name?` };
      }
    }

    case 7: data.barsetup_name = input.trim(); break;

    case 8: {
      // Create Bar Setup
      try {
        const r = await toolCreateBarsetup({ name: data.barsetup_name });
        ids.barsetupid = r.barsetupid;
        session.step++;
        return { bot: `✅ Bar Setup **"${data.barsetup_name}"** created (ID: ${r.barsetupid})\n\n${STEPS[session.step].ask}` };
      } catch (e: any) {
        return { bot: `❌ Failed to create bar setup: ${e.message}` };
      }
    }

    case 9: data.itemserved_name = input.trim(); break;

    case 10: {
      // Create Item Served
      try {
        const r = await toolCreateItemserved({ name: data.itemserved_name });
        ids.itemservedid = r.itemservedid;
        session.step++;
        return { bot: `✅ Item Served **"${data.itemserved_name}"** created (ID: ${r.itemservedid})\n\n${STEPS[session.step].ask}` };
      } catch (e: any) {
        return { bot: `❌ Failed to create item served: ${e.message}` };
      }
    }

    case 11: data.menu_name = input.trim(); break;

    case 12: {
      // Create Menu
      try {
        const r = await toolCreateMenu({ menu_name: data.menu_name });
        ids.eventmenuid = r.eventmenuid;
        session.step++;
        return { bot: `✅ Menu **"${data.menu_name}"** created (ID: ${r.eventmenuid})\n\n${STEPS[session.step].ask}` };
      } catch (e: any) {
        return { bot: `❌ Failed to create menu: ${e.message}` };
      }
    }

    case 13: data.conv_person = parseInt(input) || 5; break;

    case 14: {
      // Menu Item + BarCard + AutoPreplan
      const results: string[] = [];
      try {
        const mi = await toolAddMenuItem({
          item_name: `${data.itemserved_name} — per person`,
          eventmenuid: ids.eventmenuid, itemservedid: ids.itemservedid,
          conv_person: data.conv_person,
        });
        ids.menuitemid = mi.eventmenuitemid;
        results.push(`✅ Menu item added (ID: ${mi.eventmenuitemid})`);
      } catch (e: any) { results.push(`❌ Menu item: ${e.message}`); }

      try {
        const bc = await toolCreateBarcard({
          eventid: ids.eventid, barsetupid: ids.barsetupid, eventmenuid: ids.eventmenuid,
          event_start_date: ids.event_start_date, event_end_date: ids.event_end_date,
          daily_start_time: ids.daily_start_time, daily_end_time: ids.daily_end_time,
        });
        ids.barcardid = bc.barcardid;
        results.push(`✅ BarCard created (ID: ${bc.barcardid})`);
      } catch (e: any) { results.push(`❌ BarCard: ${e.message}`); }

      try {
        const ap = await toolRunAutopreplan({ eventid: ids.eventid });
        results.push(`✅ AutoPreplan: ${ap.message}`);
      } catch (e: any) { results.push(`⚠️ AutoPreplan: ${e.message}`); }

      const summary = [
        `\n🎉 **Event setup complete!**\n`,
        `| Record        | Name                        | ID |`,
        `|---------------|-----------------------------|----|`,
        `| Event         | ${data.event_name}          | ${ids.eventid} |`,
        `| Bar Setup     | ${data.barsetup_name}       | ${ids.barsetupid} |`,
        `| Item Served   | ${data.itemserved_name}     | ${ids.itemservedid} |`,
        `| Menu          | ${data.menu_name}           | ${ids.eventmenuid} |`,
        `| BarCard       | Signature Bar Card          | ${ids.barcardid} |`,
        ``,
        ...results,
        `\nYour event is fully configured in AutomateEvents! 🍸`,
      ].join('\n');

      session.step++;
      return { bot: summary, done: true };
    }

    default:
      return { bot: "Your event is already set up! Refresh the page to start a new one. 🍸", done: true };
  }

  session.step++;
  return { bot: STEPS[session.step]?.ask ?? "All done! 🍸" };
}

// ── HTML ──────────────────────────────────────────────────────────────────────
function buildHtml(envName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Cache-Control" content="no-store">
  <title>AutomateEvents — Event Wizard</title>
  <style>
    :root{--bg:#0f0e1a;--surface:#1a1929;--surface2:#24233a;--accent:#7c5cfc;--gold:#f5a623;--text:#e8e6f0;--muted:#6b6880;--user-bg:#2d2b52;--bot-bg:#1e1d33;--ok:#22c55e;--err:#ef4444;}
    *{box-sizing:border-box;margin:0;padding:0;}
    html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);}
    body{display:flex;flex-direction:column;}
    header{background:var(--surface);border-bottom:1px solid rgba(124,92,252,.2);padding:14px 24px;display:flex;align-items:center;gap:12px;flex-shrink:0;}
    header .logo{font-size:26px;}
    header .title{font-size:17px;font-weight:700;}
    header .sub{font-size:11px;color:var(--muted);margin-top:2px;}
    header .badge{margin-left:auto;background:rgba(245,166,35,.12);color:var(--gold);border:1px solid rgba(245,166,35,.3);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;}
    #progress{background:var(--surface);border-bottom:1px solid rgba(255,255,255,.05);padding:8px 24px;display:flex;align-items:center;gap:8px;flex-shrink:0;}
    #progressBar{flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;}
    #progressFill{height:100%;background:linear-gradient(90deg,var(--accent),var(--gold));border-radius:2px;transition:width .4s ease;}
    #progressLabel{font-size:11px;color:var(--muted);white-space:nowrap;}
    #chat{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:14px;scroll-behavior:smooth;}
    .msg{display:flex;gap:10px;max-width:80%;animation:fadeUp .25s ease;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .msg.user{align-self:flex-end;flex-direction:row-reverse;}
    .msg.bot{align-self:flex-start;}
    .av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
    .msg.user .av{background:rgba(124,92,252,.18);border:1px solid rgba(124,92,252,.35);}
    .msg.bot  .av{background:rgba(245,166,35,.12);border:1px solid rgba(245,166,35,.3);}
    .bubble{padding:11px 15px;border-radius:14px;font-size:14px;line-height:1.7;white-space:pre-wrap;}
    .msg.user .bubble{background:var(--user-bg);border:1px solid rgba(124,92,252,.18);border-radius:14px 4px 14px 14px;}
    .msg.bot  .bubble{background:var(--bot-bg);border:1px solid rgba(255,255,255,.06);border-radius:4px 14px 14px 14px;}
    .typing{display:flex;gap:5px;padding:12px 14px;}
    .typing span{width:7px;height:7px;background:var(--muted);border-radius:50%;animation:dot 1.2s infinite;}
    .typing span:nth-child(2){animation-delay:.2s}.typing span:nth-child(3){animation-delay:.4s}
    @keyframes dot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}
    footer{background:var(--surface);border-top:1px solid rgba(255,255,255,.06);padding:14px 20px;flex-shrink:0;}
    .row{display:flex;gap:10px;align-items:flex-end;}
    #inp{flex:1;background:var(--surface2);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:var(--text);font-size:14px;resize:none;outline:none;min-height:44px;max-height:100px;line-height:1.5;transition:border-color .2s;font-family:inherit;}
    #inp:focus{border-color:var(--accent);}#inp::placeholder{color:var(--muted);}
    #btn{background:var(--accent);color:#fff;border:none;border-radius:12px;padding:11px 22px;cursor:pointer;font-size:14px;font-weight:600;transition:opacity .2s,transform .1s;}
    #btn:hover{opacity:.88;}#btn:active{transform:scale(.97);}#btn:disabled{opacity:.35;cursor:not-allowed;}
    .hint{font-size:11px;color:var(--muted);margin-top:6px;text-align:center;}
    ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px;}
  </style>
</head>
<body>
  <header>
    <div class="logo">🍸</div>
    <div><div class="title">AutomateEvents</div><div class="sub">Event Setup Wizard</div></div>
    <div class="badge">${envName} · No API Key Required</div>
  </header>
  <div id="progress">
    <div id="progressBar"><div id="progressFill" style="width:0%"></div></div>
    <div id="progressLabel">Step 0 / 14</div>
  </div>
  <div id="chat"></div>
  <footer>
    <div class="row">
      <textarea id="inp" placeholder="Connecting…" rows="1" disabled></textarea>
      <button id="btn" disabled>Send ↑</button>
    </div>
    <div class="hint">Enter to send · Shift+Enter for new line</div>
  </footer>
  <script>
    let sid=null, currentStep=0, totalSteps=14;
    const chat=document.getElementById('chat'),inp=document.getElementById('inp'),btn=document.getElementById('btn');
    const pFill=document.getElementById('progressFill'),pLabel=document.getElementById('progressLabel');

    function updateProgress(step){
      const pct=Math.round((step/totalSteps)*100);
      pFill.style.width=pct+'%';
      pLabel.textContent='Step '+step+' / '+totalSteps;
    }

    function fmt(text){
      return text
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
        .replace(/_(.*?)_/g,'<em>$1</em>')
        .replace(/\n/g,'<br>');
    }

    function addMsg(role,text){
      const d=document.createElement('div');d.className='msg '+role;
      const av=document.createElement('div');av.className='av';av.textContent=role==='user'?'👤':'🍸';
      const b=document.createElement('div');b.className='bubble';b.innerHTML=fmt(text);
      d.appendChild(av);d.appendChild(b);chat.appendChild(d);chat.scrollTop=9999;
    }

    function showTyping(){
      const d=document.createElement('div');d.className='msg bot';d.id='typing';
      d.innerHTML='<div class="av">🍸</div><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
      chat.appendChild(d);chat.scrollTop=9999;
    }
    function hideTyping(){const t=document.getElementById('typing');if(t)t.remove();}

    function setEnabled(on){btn.disabled=!on;inp.disabled=!on;}

    async function init(){
      try{
        const r=await fetch('/api/init',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
        const d=await r.json();
        sid=d.sessionId;
        addMsg('bot', d.text || d.bot || 'Hello! What is the event name?');
        updateProgress(0);
      }catch(e){
        addMsg('bot','❌ Could not connect to server. Please refresh the page.');
      }finally{
        inp.placeholder='Type your answer…';
        setEnabled(true);
        inp.focus();
      }
    }

    async function send(){
      const txt=inp.value.trim();
      if(!txt) return;
      if(!sid){ addMsg('bot','⏳ Still connecting, please wait a moment...'); return; }
      inp.value='';
      inp.style.height='auto';
      setEnabled(false);
      addMsg('user', txt);
      showTyping();
      try{
        const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sid,message:txt})});
        const d = await r.json();
        hideTyping();
        const reply = d.bot || d.text || '(no response)';
        addMsg('bot', reply);
        currentStep = d.step ?? currentStep;
        updateProgress(currentStep);
        if(d.done){
          setEnabled(false);
          inp.placeholder='Event setup complete! 🍸';
        }
      }catch(e){
        hideTyping();
        addMsg('bot','❌ Error: '+(e.message||'unknown'));
      }finally{
        if(!inp.placeholder.includes('complete')){
          setEnabled(true);
          inp.focus();
        }
      }
    }

    btn.addEventListener('click',send);
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
    inp.addEventListener('input',()=>{inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,100)+'px';});

    init();
  </script>
</body>
</html>`;
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end',  () => resolve(data));
    req.on('error', reject);
  });
}

const HTML = buildHtml(ENVNAME);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/init') {
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, { step: 0, data: {}, ids: {} });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessionId, text: STEPS[0].ask }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const body = await readBody(req);
      const { sessionId, message } = JSON.parse(body);
      const session = sessions.get(sessionId);
      if (!session) { res.writeHead(404); res.end('Session not found'); return; }

      const result = await processStep(session, message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...result, step: session.step }));
      return;
    }

    res.writeHead(404); res.end('Not Found');
  } catch (err: any) {
    console.error('Error:', err?.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err?.message ?? 'Internal error' }));
  }
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} already in use. Try:\n   $env:PORT=3001; npm run chatbot:wizard:ui\n`);
  } else {
    console.error('\n❌  Server error:', err.message);
  }
  process.exit(1);
});

// ── Startup ───────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🍸  AutomateEvents Event Wizard UI  [${ENVNAME}]`);
  console.log('   Logging in…');
  try {
    await login();
    console.log('   ✅ Authenticated (no ANTHROPIC_API_KEY needed)');
  } catch (err: any) {
    console.error('   ❌ Login failed:', err.message);
    process.exit(1);
  }

  server.listen(PORT, '0.0.0.0', () => {
    const nets = os.networkInterfaces();
    const ips: string[] = ['localhost'];
    for (const ifaces of Object.values(nets)) {
      for (const iface of (ifaces ?? [])) {
        if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
      }
    }
    console.log('\n   → Open in browser:');
    ips.forEach(ip => console.log(`      http://${ip}:${PORT}`));
    console.log();
  });
})();
