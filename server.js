const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.txt':'text/plain'};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(PUB, path.normalize(p));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': (ext === '.html' || p === '/sw.js') ? 'no-cache' : 'public, max-age=86400'
    });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const rooms = new Map();   // invite code -> host socket
let waiting = null;        // socket waiting for a random match
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const makeCode = () => { let c; do { c = Array.from({length:4}, () => CHARS[crypto.randomInt(CHARS.length)]).join(''); } while (rooms.has(c)); return c; };

function begin(match) {
  match.rematch.clear();
  const seed = crypto.randomInt(2 ** 31);
  match.players.forEach(p => send(p, { t: 'start', slot: p.slot, seed }));
}
function pair(a, b) {
  leave(a); leave(b);
  const match = { players: [a, b], rematch: new Set() };
  a.match = b.match = match; a.slot = 1; b.slot = 2;
  begin(match);
}
function leave(ws) {
  if (waiting === ws) waiting = null;
  if (ws.code) { rooms.delete(ws.code); ws.code = null; }
  if (ws.match) {
    const other = ws.match.players.find(p => p !== ws);
    if (other) { other.match = null; send(other, { t: 'opp_left' }); }
    ws.match = null;
  }
}

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    switch (m.t) {
      case 'queue':
        leave(ws);
        if (waiting && waiting !== ws && waiting.readyState === 1) { const w = waiting; waiting = null; pair(w, ws); }
        else waiting = ws;
        break;
      case 'create':
        leave(ws); ws.code = makeCode(); rooms.set(ws.code, ws);
        send(ws, { t: 'room', code: ws.code });
        break;
      case 'join': {
        const host = rooms.get(String(m.code || '').toUpperCase());
        if (!host || host === ws || host.readyState !== 1) return send(ws, { t: 'error', msg: 'That invite link has expired or the room is full.' });
        rooms.delete(host.code); host.code = null;
        pair(host, ws);
        break;
      }
      case 'in': case 'commit': {
        const other = ws.match && ws.match.players.find(p => p !== ws);
        if (!other) return;
        if (m.t === 'in' && Number.isInteger(m.tick) && 'NSEW'.includes(m.dir) && m.dir.length === 1) send(other, { t: 'in', tick: m.tick, dir: m.dir });
        if (m.t === 'commit' && Number.isInteger(m.c)) send(other, { t: 'commit', c: m.c });
        break;
      }
      case 'rematch':
        if (ws.match) { ws.match.rematch.add(ws); if (ws.match.rematch.size === 2) begin(ws.match); }
        break;
    }
  });
  ws.on('close', () => leave(ws));
  ws.on('error', () => {});
});

// keep connections alive on hosts that drop idle sockets, and clear out dead ones
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 25000);

server.listen(PORT, () => console.log('Border Wars online on port ' + PORT));
