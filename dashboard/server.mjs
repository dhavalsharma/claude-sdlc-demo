#!/usr/bin/env node
// Live SDLC dashboard. Zero dependencies.
//   node server.mjs --dir <project> [--port 4321]
// Serves index.html, /api/state (snapshot) and /api/events (Server-Sent Events
// streaming new lines of .sdlc/events.jsonl plus state changes).
// Writes the chosen URL to <project>/.sdlc/dashboard.json.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHASES, ROLES } from '../scripts/phases.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const dir = path.resolve(flag('dir', process.cwd()));
let port = Number(flag('port', 4321));

const sdlc = path.join(dir, '.sdlc');
const statePath = path.join(sdlc, 'state.json');
const eventsPath = path.join(sdlc, 'events.jsonl');
const html = () => fs.readFileSync(path.join(here, 'index.html'));

function readState() {
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { return null; }
}

function readEvents(from = 0) {
  try {
    const buf = fs.readFileSync(eventsPath);
    const text = buf.subarray(from).toString('utf8');
    const lastNl = text.lastIndexOf('\n');
    if (lastNl < 0) return { events: [], offset: from };
    const events = text.slice(0, lastNl).split('\n').filter(Boolean).flatMap((l) => {
      try { return [JSON.parse(l)]; } catch { return []; }
    });
    return { events, offset: from + Buffer.byteLength(text.slice(0, lastNl + 1)) };
  } catch {
    return { events: [], offset: from };
  }
}

const snapshot = () => ({ state: readState(), phases: PHASES, roles: ROLES });

const clients = new Set();
let offset = 0;
let stateMtime = 0;

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}

setInterval(() => {
  if (!clients.size) return;
  const { events, offset: next } = readEvents(offset);
  offset = next;
  for (const e of events) broadcast('evt', e);
  try {
    const m = fs.statSync(statePath).mtimeMs;
    if (m !== stateMtime) { stateMtime = m; broadcast('state', readState()); }
  } catch {}
}, 600);

setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 15_000);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(html());
  }
  if (url.pathname === '/api/state') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(snapshot()));
  }
  if (url.pathname === '/api/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    const all = readEvents(0);
    if (!clients.size) offset = all.offset;
    res.write(`event: init\ndata: ${JSON.stringify({ ...snapshot(), events: all.events })}\n\n`);
    // A late joiner may have missed lines between offset and now; init covers them.
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  res.writeHead(404).end('not found');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && port < 4340) { port += 1; server.listen(port, '127.0.0.1'); }
  else { console.error(e.message); process.exit(1); }
});

server.on('listening', () => {
  const url = `http://localhost:${port}`;
  try {
    fs.mkdirSync(sdlc, { recursive: true });
    fs.writeFileSync(path.join(sdlc, 'dashboard.json'), JSON.stringify({ url, pid: process.pid, startedAt: new Date().toISOString() }, null, 2));
  } catch {}
  console.log(`SDLC dashboard: ${url}  (project: ${dir})`);
});

server.listen(port, '127.0.0.1');
