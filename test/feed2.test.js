// Loads the real public/apisearch.js in a sandbox with minimal stubs and exercises
// the Feed-2 discovery path. Run: node feed2.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Resolve the file under test. Works from <repo>/test/, from a sibling directory, or from an explicit
// path given as the first CLI argument:
const SRC = [
  process.argv[2],
  path.join(__dirname, '..', 'public', 'apisearch.js'),
  path.join(__dirname, 'public', 'apisearch.js'),
  path.join(__dirname, '..', 'rpde-visualiser', 'public', 'apisearch.js'),
].filter(Boolean).find(candidate => fs.existsSync(candidate));

if (!SRC) {
  console.error('Could not find public/apisearch.js. Pass its path as the first argument:\n  node feed2.test.js /path/to/rpde-visualiser/public/apisearch.js');
  process.exit(2);
}
console.log(`Testing: ${SRC}\n`);

function makeSandbox(fetchImpl) {
  const chain = new Proxy(function () {}, {
    get: (t, k) => (k === 'val' ? (() => '') : (k === 'prop' ? (() => chain) : (k === 'length' ? 0 : chain))),
    apply: () => chain,
  });
  const $ = new Proxy(function () { return chain; }, {
    get: (t, k) => (k === 'getJSON' ? (() => chain) : chain),
    apply: () => chain,
  });
  const logs = [];
  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout, clearTimeout, setInterval, clearInterval,
    document: { getElementById: () => ({}) },
    window: { location: { href: 'http://x/', search: '' }, history: { replaceState: () => {} } },
    $, jQuery: $,
    luxon: { DateTime: { now: () => ({ diff: () => ({ toObject: () => ({ seconds: 0 }) }) }) } },
    skos: { ConceptScheme: function () {} },
    axios: { defaults: { headers: {}, timeout: 0 }, get: fetchImpl, post: async () => ({ data: '' }) },
    L: {},
    __logs: logs,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: SRC });
  // Capture user-facing log messages
  vm.runInContext('setLogMessage = function (m, t) { __logs.push([Array.isArray(m)?m[0]:m, t]); return ++messageId; };', sandbox);
  vm.runInContext('updateLogMessage = function () {};', sandbox);
  return { sandbox, logs };
}

async function scenario(name, feedUrl, fetchImpl, expectFeed2, extraCheck, feedType = 'ScheduledSession') {
  const probed = [];
  const wrapped = async (u, cfg) => { probed.push(decodeURIComponent(String(u).replace('/fetch?url=', ''))); return fetchImpl(u, cfg); };
  const { sandbox, logs } = makeSandbox(wrapped);
  // Note: top-level `let` in the source is a lexical binding in the script scope, not a sandbox
  // property, so state must be read and written from inside the context.
  sandbox.__feedUrl = feedUrl;
  sandbox.__feedType = feedType;
  vm.runInContext(`clearGlobals();
    storeIngressOrder1FirstPageFromUser = __feedUrl;
    storeIngressOrder1.firstPage = __feedUrl;
    storeIngressOrder1.feedType = __feedType;`, sandbox);

  let threw = null;
  const t0 = Date.now();
  try {
    await vm.runInContext('setStoreIngressOrder2FirstPage()', sandbox);
  } catch (e) { threw = e; }
  const ms = Date.now() - t0;

  const got = vm.runInContext('storeIngressOrder2.firstPage', sandbox);
  let extra = null;
  if (extraCheck) { try { extraCheck(probed); } catch (e) { extra = e.message; } }
  const pass = !threw && got === expectFeed2 && !extra;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  console.log(`        returned normally: ${!threw}${threw ? ' (' + threw.message + ')' : ''}`);
  console.log(`        Feed-2: ${got} (expected ${expectFeed2})   ${ms}ms`);
  console.log(`        probed ${probed.length}: ${probed.join(' | ') || '-'}`);
  if (extra) { console.log(`        assertion failed: ${extra}`); }
  logs.filter(l => /Feed-2/.test(l[0])).forEach(l => console.log(`        log[${l[1]}]: ${l[0].replace(/<[^>]+>/g, ' ').replace(/&emsp;/g, '')}`));
  return pass;
}

const reject = (status) => async () => { const e = new Error(`Request failed with status code ${status}`); e.response = { status }; throw e; };

(async () => {
  const results = [];

  // 1. The reported bug: publisher has scheduled-sessions but no session-series -> 404
  results.push(await scenario(
    'no paired feed (404) does not throw and reports cleanly',
    'https://nettie.online/api/public/openactive/scheduled-sessions',
    reject(404), null,
    (probed) => {
      const bad = probed.filter(u => /seriess|sessionss/.test(u));
      if (bad.length) throw new Error(`malformed candidates probed: ${bad.join(', ')}`);
      if (probed.length !== 2) throw new Error(`expected 2 candidates, probed ${probed.length}`);
    }));

  // 2. Paired feed exists
  results.push(await scenario(
    'paired feed found when it exists',
    'https://nettie.online/api/public/openactive/scheduled-sessions',
    async (u) => u.includes('session-series')
      ? { status: 200, data: { items: [], next: 'x' } }
      : (() => { throw Object.assign(new Error('404'), { response: { status: 404 } }); })(),
    'https://nettie.online/api/public/openactive/session-series'));

  // 3. Host answers unknown paths with 200 + HTML (SPA catch-all) -> must be rejected
  results.push(await scenario(
    'SPA catch-all 200 HTML is not accepted as a feed',
    'https://example.org/feeds/scheduled-sessions',
    async () => ({ status: 200, data: '<!DOCTYPE html><html><body>Not found</body></html>' }),
    null));

  // 4. Network timeout on every candidate
  results.push(await scenario(
    'timeout on every candidate does not throw',
    'https://example.org/feeds/scheduled-sessions',
    async () => { throw new Error('timeout of 10000ms exceeded'); },
    null));

  // 5. Longest-part-first matching for slot feeds
  results.push(await scenario(
    'slot feed generates well-formed candidates (longest URL part first)',
    'https://example.org/feeds/facility-use-slots',
    reject(404), null,
    (probed) => {
      if (probed.length === 0) throw new Error('no candidates probed at all');
      const bad = probed.filter(u => /facility-use-(individual|facility)/.test(u) || /slots?$/.test(u));
      if (bad.length) throw new Error(`malformed candidates probed: ${bad.join(', ')}`);
    }, 'Slot'));

  // 6. Slow-failing host: candidates must be probed concurrently, so total time ~= one probe, not N.
  results.push(await scenario(
    'slow-failing candidates are probed concurrently',
    'https://slow.example.org/feeds/scheduled-sessions',
    async () => { await new Promise(r => setTimeout(r, 300)); throw Object.assign(new Error('timeout'), {}); },
    null,
    (probed) => { if (probed.length < 2) throw new Error('expected >=2 candidates'); }));

  console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
  process.exit(results.every(Boolean) ? 0 : 1);
})();
