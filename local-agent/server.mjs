#!/usr/bin/env node
/**
 * Optional local companion for Ollama GUI.
 *
 * This service intentionally has no direct "execute now" endpoint. Mutating requests
 * are staged, then consumed by a separate one-shot approval call from the UI.
 * Run as the logged-in user, never with sudo/root.
 */
import { createServer } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { spawn } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

const HOST = '127.0.0.1'
const PORT = Number(process.env.OLLAMA_GUI_AGENT_PORT || 3210)
const TOKEN = process.env.OLLAMA_GUI_AGENT_TOKEN || randomBytes(32).toString('hex')
const MAX_BODY = 1024 * 1024
const MAX_OUTPUT = 256 * 1024
const COMMAND_TIMEOUT = 120_000
const pending = new Map()
const running = new Map()

const json = (res, status, value) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}
const safeEqual = (a, b) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
async function body(req) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (Buffer.byteLength(raw) > MAX_BODY) throw new Error('Request body too large')
  }
  return raw ? JSON.parse(raw) : {}
}
function authorized(req) {
  const auth = req.headers.authorization || ''
  const origin = req.headers.origin
  // Browser requests must originate from localhost. Non-browser CLI use has no Origin.
  if (origin) {
    let u
    try { u = new URL(origin) } catch { return false }
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.hostname !== '[::1]') return false
  }
  return auth.startsWith('Bearer ') && safeEqual(auth.slice(7), TOKEN)
}
function commandResult(command, cwd, signal) {
  return new Promise((resolve) => {
    const shell = process.env.SHELL || '/bin/bash'
    const child = spawn(shell, ['-lc', command], {
      cwd: cwd || homedir(),
      env: { ...process.env, TERM: 'dumb' },
      signal,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let truncated = false
    const collect = (target, chunk) => {
      const remaining = MAX_OUTPUT - Buffer.byteLength(stdout) - Buffer.byteLength(stderr)
      if (remaining <= 0) { truncated = true; return }
      const piece = chunk.toString('utf8')
      target(piece.slice(0, remaining))
      if (Buffer.byteLength(piece) > remaining) truncated = true
    }
    child.stdout.on('data', (c) => collect((s) => { stdout += s }, c))
    child.stderr.on('data', (c) => collect((s) => { stderr += s }, c))
    child.once('error', (error) => resolve({ stdout, stderr: error.message, exitCode: null, truncated }))
    child.once('close', (code, signalName) => resolve({ stdout, stderr, exitCode: code, signal: signalName, truncated }))
  })
}
function privateAddress(hostname) {
  return hostname === 'localhost' || hostname.endsWith('.localhost') ||
    /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) ||
    hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80:')
}
async function handle(req, res) {
  if (!authorized(req)) return json(res, 401, { error: 'Unauthorized. Configure the local companion token.' })
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (req.method === 'GET' && url.pathname === '/v1/health')
    return json(res, 200, { ok: true, version: 1, platform: process.platform, home: homedir() })

  if (req.method === 'POST' && url.pathname === '/v1/inspect') {
    const input = await body(req)
    const target = path.resolve(input.path || homedir())
    const info = await stat(target)
    if (info.isDirectory) {
      const entries = await readdir(target, { withFileTypes: true })
      return json(res, 200, { path: target, entries: entries.slice(0, 500).map((e) => ({ name: e.name, type: e.isDirectory() ? 'directory' : e.isFile() ? 'file' : 'other' })) })
    }
    if (info.isFile()) {
      if (info.size > MAX_BODY) return json(res, 413, { error: 'File exceeds 1 MiB read limit' })
      return json(res, 200, { path: target, content: await readFile(target, 'utf8') })
    }
    return json(res, 400, { error: 'Unsupported filesystem object' })
  }

  if (req.method === 'POST' && url.pathname === '/v1/actions') {
    const input = await body(req)
    if (input.tool !== 'shell' || typeof input.command !== 'string' || !input.command.trim())
      return json(res, 400, { error: 'Expected tool=shell and a non-empty command' })
    if (input.command.length > 20_000) return json(res, 413, { error: 'Command too long' })
    const cwd = path.resolve(input.cwd || homedir())
    const id = randomBytes(18).toString('hex')
    const item = { id, tool: 'shell', command: input.command, cwd, createdAt: Date.now(), state: 'awaiting-approval' }
    pending.set(id, item)
    return json(res, 202, { ...item, warning: 'This command has not run. Approve this exact command to execute it.' })
  }

  const approval = url.pathname.match(/^\/v1\/actions\/([a-f0-9]+)\/approve$/)
  if (req.method === 'POST' && approval) {
    const item = pending.get(approval[1])
    if (!item) return json(res, 404, { error: 'Approval request missing, expired or already consumed' })
    pending.delete(item.id) // consume before any asynchronous work: approval cannot be replayed
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new Error('Command timed out')), COMMAND_TIMEOUT)
    running.set(item.id, controller)
    try {
      item.state = 'running'
      const result = await commandResult(item.command, item.cwd, controller.signal)
      item.state = controller.signal.aborted ? 'cancelled' : 'completed'
      return json(res, 200, { ...item, ...result })
    } finally {
      clearTimeout(timeout)
      running.delete(item.id)
    }
  }

  const cancel = url.pathname.match(/^\/v1\/actions\/([a-f0-9]+)\/cancel$/)
  if (req.method === 'POST' && cancel) {
    const id = cancel[1]
    if (pending.delete(id)) return json(res, 200, { id, state: 'cancelled' })
    const controller = running.get(id)
    if (controller) { controller.abort(); return json(res, 200, { id, state: 'cancelling' }) }
    return json(res, 404, { error: 'Action not found' })
  }

  if (req.method === 'POST' && url.pathname === '/v1/web-search') {
    const input = await body(req)
    const key = process.env.BRAVE_SEARCH_API_KEY
    if (!key) return json(res, 501, { error: 'Configure BRAVE_SEARCH_API_KEY to enable web search.' })
    if (typeof input.query !== 'string' || !input.query.trim()) return json(res, 400, { error: 'query is required' })
    const response = await fetch('https://api.search.brave.com/res/v1/web/search?q=' + encodeURIComponent(input.query), {
      headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
    })
    if (!response.ok) return json(res, 502, { error: 'Search provider returned ' + response.status })
    const data = await response.json()
    return json(res, 200, { results: (data.web?.results || []).slice(0, 8).map(({ title, url, description, age }) => ({ title, url, description, age })) })
  }

  if (req.method === 'POST' && url.pathname === '/v1/open-url') {
    const input = await body(req)
    let target
    try { target = new URL(input.url) } catch { return json(res, 400, { error: 'Invalid URL' }) }
    if (!['http:', 'https:'].includes(target.protocol) || privateAddress(target.hostname))
      return json(res, 400, { error: 'Only public HTTP(S) URLs are allowed' })
    const response = await fetch(target, { redirect: 'error', signal: AbortSignal.timeout(15_000) })
    const type = response.headers.get('content-type') || ''
    if (!type.includes('text/') && !type.includes('json') && !type.includes('xml'))
      return json(res, 415, { error: 'URL did not return readable text' })
    const text = (await response.text()).slice(0, 100_000)
    return json(res, 200, { url: target.href, contentType: type, content: text })
  }

  return json(res, 404, { error: 'Not found' })
}
const server = createServer((req, res) => {
  handle(req, res).catch((error) => json(res, 500, { error: error.message }))
})
server.listen(PORT, HOST, () => {
  console.log(`Ollama GUI local companion listening on http://${HOST}:${PORT}`)
  console.log('Pairing token (keep private): ' + TOKEN)
  console.log('Run as your normal user. Do not run with sudo.')
})
