const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3333;
const serverProcess = spawn('node', ['admin/server.js'], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, PORT: PORT.toString() }
});

function get(pathUrl) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${pathUrl}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, length: data.length }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Starting local test server on port', PORT);
  // Give server 1.5s to start
  await new Promise(r => setTimeout(r, 1500));

  const routes = ['/', '/resume/', '/blog/', '/admin/', '/api/data', '/data-sync.js'];
  let passed = 0;

  for (const r of routes) {
    try {
      const res = await get(r);
      if (res.status === 200) {
        console.log(`[PASS] Route ${r} returned HTTP 200 (size: ${res.length} bytes)`);
        passed++;
      } else {
        console.error(`[FAIL] Route ${r} returned HTTP ${res.status}`);
      }
    } catch (e) {
      console.error(`[FAIL] Route ${r} error: ${e.message}`);
    }
  }

  serverProcess.kill();
  console.log(`\nLocal Server Test: ${passed} / ${routes.length} routes responded with HTTP 200 OK.`);
  process.exit(passed === routes.length ? 0 : 1);
}

run().catch(err => {
  serverProcess.kill();
  console.error(err);
  process.exit(1);
});

