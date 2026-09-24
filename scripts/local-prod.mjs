#!/usr/bin/env node
// "Production" for local mode: runs `next start` as a detached process that
// outlives the Claude session, tracked by .sdlc/prod.pid.
//
// Usage (cwd = project): node local-prod.mjs start [--port 3100] | stop | restart | status

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const dir = process.cwd();
const pidFile = path.join(dir, '.sdlc', 'prod.pid');
const logFile = path.join(dir, '.sdlc', 'prod.log');
const args = process.argv.slice(2);
const cmd = args[0];
const port = Number(args[args.indexOf('--port') + 1] > 0 ? args[args.indexOf('--port') + 1] : 3100);
const url = `http://localhost:${port}`;

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const readPid = () => { try { return Number(fs.readFileSync(pidFile, 'utf8')); } catch { return 0; } };

async function healthy() {
  try { return (await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) })).status; } catch { return 0; }
}

function stop() {
  const pid = readPid();
  if (pid && alive(pid)) {
    try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch {} }
  }
  fs.rmSync(pidFile, { force: true });
  return pid;
}

async function start() {
  const pid = readPid();
  if (pid && alive(pid)) return console.log(JSON.stringify({ running: true, pid, url, health: await healthy() }));
  if (!fs.existsSync(path.join(dir, '.next'))) throw new Error('No build found. Run `npm run build` first.');
  const out = fs.openSync(logFile, 'a');
  const child = spawn('npx', ['next', 'start', '-p', String(port)], { cwd: dir, detached: true, stdio: ['ignore', out, out] });
  child.unref();
  fs.writeFileSync(pidFile, String(child.pid));
  for (let i = 0; i < 60; i++) {
    const status = await healthy();
    if (status) return console.log(JSON.stringify({ running: true, pid: child.pid, url, health: status }));
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not respond on ${url} within 30s. See .sdlc/prod.log`);
}

try {
  if (cmd === 'start') await start();
  else if (cmd === 'stop') console.log(JSON.stringify({ stopped: stop() || null }));
  else if (cmd === 'restart') { stop(); await new Promise((r) => setTimeout(r, 800)); await start(); }
  else if (cmd === 'status') { const pid = readPid(); console.log(JSON.stringify({ running: !!pid && alive(pid), pid: pid || null, url, health: await healthy() })); }
  else throw new Error('usage: local-prod.mjs start [--port 3100] | stop | restart | status');
} catch (e) {
  console.error(`sdlc: ${e.message}`);
  process.exit(1);
}
