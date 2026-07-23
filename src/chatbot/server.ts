import * as http from 'http';
import * as crypto from 'crypto';
import * as os from 'os';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { setAuthToken, setTenantPath, setLogonAs } from '../utils/tokenStore.js';
import { TOOL_DEFINITIONS, TOOL_HANDLERS } from './tools.js';

const envFile = process.env.ENV_FILE ?? '.env.dev';
dotenv.config({ path: envFile });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT   = parseInt(process.env.PORT ?? '3000');
const APIKEY = process.env.ANTHROPIC_API_KEY ?? '';
const ENVNAME = envFile.replace('.env.', '').toUpperCase();

if (!APIKEY) {
  console.error('\n❌  ANTHROPIC_API_KEY is not set. Run:\n   $env:ANTHROPIC_API_KEY = "sk-ant-..."\n');
  process.exit(1);
}

const SYSTEM_PROMPT = `You are an expert event planning assistant for AutomateEvents, a professional event management platform. You help users create a complete event setup by gathering their requirements conversationally and calling the appropriate API tools in the correct sequence.

The full event creation flow you must follow in order:
1. Event — Collect: event name, guest count, start/end date, daily bar open/close times
2. Bar Setup — Create the physical bar configuration (ask for bar name and style)
3. Item Served — Create at least one signature drink or item (ask what to feature)
4. Menu — Create the event menu
5. Menu Items — Link each item served to the menu with a per-person or per-person-per-hour rate
6. BarCard — Link the event, bar setup, and menu together
7. AutoPreplan — Trigger the execution plan

Guidelines:
- Ask naturally, 1-2 questions at a time
- Suggest professional, elegant names if the user is unsure
- After each successful API call, briefly confirm (1 sentence) then move to the next step
- Keep all created IDs in memory — you will need them for later steps
- If the user wants multiple items served, create each one and add each as a menu item
- Be warm, professional, and concise
- When complete, show a clean summary of all created records with their IDs

Start by greeting the user and asking for the key event details.`;

// ── Auth ──────────────────────────────────────────────────────────────────────
async function login(): Promise<void> {
  const res = await fetch(`${process.env.BASE_API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-automate-secret': process.env.AUTOMATE_SECRET ?? '' },
    body: JSON.stringify({ email: process.env.API_EMAIL, password: process.env.API_PASSWORD, tenant_name: process.env.TENANT_NAME }),
  });
  const body: any = await res.json();
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${JSON.stringify(body)}`);
  setAuthToken(body.token);
  setTenantPath(body.tenant_cname);
  setLogonAs(body.logon_as);
}

// ── Session store ─────────────────────────────────────────────────────────────
const sessions = new Map<string, Anthropic.MessageParam[]>();
const client   = new Anthropic({ apiKey: APIKEY });

async function initSession(sessionId: string): Promise<string> {
  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 512, system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: "Hello, I'd like to set up a new event." }],
    tools: TOOL_DEFINITIONS as any,
  });
  sessions.set(sessionId, [
    { role: 'user',      content: "Hello, I'd like to set up a new event." },
    { role: 'assistant', content: resp.content },
  ]);
  return resp.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
}

async function processMessage(sessionId: string, userMessage: string): Promise<{ text: string; tools: { name: string; status: string; message: string }[] }> {
  const messages = sessions.get(sessionId) ?? [];
  messages.push({ role: 'user', content: userMessage });

  const toolLog: { name: string; status: string; message: string }[] = [];
  let running = true;
  let finalText = '';

  while (running) {
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 4096, system: SYSTEM_PROMPT,
      messages, tools: TOOL_DEFINITIONS as any,
    });
    messages.push({ role: 'assistant', content: resp.content });

    if (resp.stop_reason === 'tool_use') {
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of resp.content) {
        if (block.type !== 'tool_use') continue;
        try {
          const result = await TOOL_HANDLERS[block.name](block.input);
          toolLog.push({ name: block.name, status: 'success', message: result.message });
          results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
        } catch (err: any) {
          const msg = String(err?.message ?? err).slice(0, 300);
          toolLog.push({ name: block.name, status: 'error', message: msg });
          results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: msg }), is_error: true });
        }
      }
      messages.push({ role: 'user', content: results });
    } else {
      finalText = resp.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
      running = false;
    }
  }

  sessions.set(sessionId, messages);
  return { text: finalText, tools: toolLog };
}

// ── HTML UI ───────────────────────────────────────────────────────────────────
function buildHtml(envName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AutomateEvents — AI Assistant</title>
  <style>
    :root{--bg:#0f0e1a;--surface:#1a1929;--surface2:#24233a;--accent:#7c5cfc;--gold:#f5a623;--text:#e8e6f0;--muted:#6b6880;--user-bg:#2d2b52;--bot-bg:#1e1d33;--ok:#22c55e;--err:#ef4444;}
    *{box-sizing:border-box;margin:0;padding:0;}
    html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);}
    body{display:flex;flex-direction:column;}
    header{background:var(--surface);border-bottom:1px solid rgba(124,92,252,.2);padding:14px 24px;display:flex;align-items:center;gap:12px;flex-shrink:0;}
    header .logo{font-size:26px;}
    header .title{font-size:17px;font-weight:700;}
    header .sub{font-size:11px;color:var(--muted);margin-top:2px;}
    header .badge{margin-left:auto;background:rgba(124,92,252,.12);color:var(--accent);border:1px solid rgba(124,92,252,.3);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;}
    #chat{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:14px;scroll-behavior:smooth;}
    .msg{display:flex;gap:10px;max-width:78%;animation:fadeUp .25s ease;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .msg.user{align-self:flex-end;flex-direction:row-reverse;}
    .msg.bot{align-self:flex-start;}
    .av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
    .msg.user .av{background:rgba(124,92,252,.18);border:1px solid rgba(124,92,252,.35);}
    .msg.bot  .av{background:rgba(245,166,35,.12);border:1px solid rgba(245,166,35,.3);}
    .bubble{padding:11px 15px;border-radius:14px;font-size:14px;line-height:1.65;}
    .msg.user .bubble{background:var(--user-bg);border:1px solid rgba(124,92,252,.18);border-radius:14px 4px 14px 14px;}
    .msg.bot  .bubble{background:var(--bot-bg);border:1px solid rgba(255,255,255,.06);border-radius:4px 14px 14px 14px;}
    .tools{display:flex;flex-direction:column;gap:4px;margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);}
    .tc{font-size:11px;padding:4px 8px;border-radius:6px;background:rgba(0,0,0,.25);}
    .tc.ok{color:var(--ok);}.tc.err{color:var(--err);}
    .typing{display:flex;gap:5px;padding:12px 14px;}
    .typing span{width:7px;height:7px;background:var(--muted);border-radius:50%;animation:dot 1.2s infinite;}
    .typing span:nth-child(2){animation-delay:.2s}.typing span:nth-child(3){animation-delay:.4s}
    @keyframes dot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}
    footer{background:var(--surface);border-top:1px solid rgba(255,255,255,.06);padding:14px 20px;flex-shrink:0;}
    #statusBar{font-size:12px;color:var(--muted);margin-bottom:10px;padding:7px 12px;border-radius:8px;background:rgba(245,166,35,.07);border:1px solid rgba(245,166,35,.15);display:flex;align-items:center;gap:8px;}
    #statusBar.ok{color:var(--ok);background:rgba(34,197,94,.07);border-color:rgba(34,197,94,.2);}
    #statusBar.err{color:var(--err);background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.2);}
    .row{display:flex;gap:10px;align-items:flex-end;}
    #inp{flex:1;background:var(--surface2);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:var(--text);font-size:14px;resize:none;outline:none;min-height:44px;max-height:120px;line-height:1.5;transition:border-color .2s;font-family:inherit;}
    #inp:focus{border-color:var(--accent);}#inp::placeholder{color:var(--muted);}
    #btn{background:var(--accent);color:#fff;border:none;border-radius:12px;padding:11px 20px;cursor:pointer;font-size:14px;font-weight:600;transition:opacity .2s,transform .1s;white-space:nowrap;}
    #btn:hover{opacity:.88;}#btn:active{transform:scale(.97);}#btn:disabled{opacity:.35;cursor:not-allowed;}
    .hint{font-size:11px;color:var(--muted);margin-top:6px;text-align:center;}
    .spin{display:inline-block;animation:spin 1s linear infinite;}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px;}
  </style>
</head>
<body>
  <header>
    <div class="logo">🍸</div>
    <div><div class="title">AutomateEvents</div><div class="sub">AI Event Planning Assistant</div></div>
    <div class="badge">Claude · ${envName}</div>
  </header>
  <div id="chat"></div>
  <footer>
    <div id="statusBar"><span class="spin">↻</span>&nbsp;Connecting to AutomateEvents ${envName}…</div>
    <div class="row">
      <textarea id="inp" placeholder="Type your message…" rows="1" disabled></textarea>
      <button id="btn" disabled>Send ↑</button>
    </div>
    <div class="hint">Enter to send · Shift+Enter for new line</div>
  </footer>
  <script>
    let sid=null;
    const chat=document.getElementById('chat'),inp=document.getElementById('inp'),btn=document.getElementById('btn'),sb=document.getElementById('statusBar');
    function md(text){return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');}
    function addMsg(role,text,tools=[]){
      const d=document.createElement('div');d.className='msg '+role;
      const av=document.createElement('div');av.className='av';av.textContent=role==='user'?'👤':'🍸';
      const b=document.createElement('div');b.className='bubble';b.innerHTML=md(text);
      if(tools.length){
        const tc=document.createElement('div');tc.className='tools';
        tools.forEach(t=>{const i=document.createElement('div');i.className='tc '+(t.status==='success'?'ok':'err');i.textContent=(t.status==='success'?'✅ ':'❌ ')+t.name.replace(/_/g,' ')+' — '+t.message;tc.appendChild(i);});
        b.appendChild(tc);
      }
      d.appendChild(av);d.appendChild(b);chat.appendChild(d);chat.scrollTop=9999;
    }
    function showTyping(){const d=document.createElement('div');d.className='msg bot';d.id='typing';d.innerHTML='<div class="av">🍸</div><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>';chat.appendChild(d);chat.scrollTop=9999;}
    function hideTyping(){const t=document.getElementById('typing');if(t)t.remove();}
    async function init(){
      try{
        const r=await fetch('/api/init',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
        const d=await r.json();
        sid=d.sessionId;addMsg('bot',d.text);
        inp.disabled=false;btn.disabled=false;inp.focus();
        sb.className='ok';sb.innerHTML='✅ Connected to AutomateEvents — ${envName}';
      }catch(e){sb.className='err';sb.innerHTML='❌ '+e.message;}
    }
    async function send(){
      const txt=inp.value.trim();if(!txt||!sid)return;
      inp.value='';inp.style.height='auto';btn.disabled=true;inp.disabled=true;
      addMsg('user',txt);showTyping();
      try{
        const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sid,message:txt})});
        const d=await r.json();hideTyping();addMsg('bot',d.text,d.tools??[]);
      }catch(e){hideTyping();addMsg('bot','❌ Error: '+e.message);}
      finally{btn.disabled=false;inp.disabled=false;inp.focus();}
    }
    btn.addEventListener('click',send);
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
    inp.addEventListener('input',()=>{inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,120)+'px';});
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
    req.on('end', () => resolve(data));
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
      const text = await initSession(sessionId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessionId, text }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const body  = await readBody(req);
      const { sessionId, message } = JSON.parse(body);
      if (!sessionId || !message) { res.writeHead(400); res.end('Bad Request'); return; }
      const result = await processMessage(sessionId, message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  } catch (err: any) {
    console.error('Server error:', err?.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err?.message ?? 'Internal error' }));
  }
});

// ── Startup ───────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🍸  AutomateEvents AI Chat UI  [${ENVNAME}]`);
  console.log('   Logging in…');
  try {
    await login();
    console.log('   ✅ Authenticated');
  } catch (err: any) {
    console.error('   ❌ Login failed:', err.message);
    process.exit(1);
  }
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌  Port ${PORT} is already in use. Try:\n   $env:PORT=3001; npm run chatbot:ui\n`);
    } else {
      console.error('\n❌  Server error:', err.message);
    }
    process.exit(1);
  });

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
