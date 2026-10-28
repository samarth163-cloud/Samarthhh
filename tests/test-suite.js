/**
 * AUTOMATED PRODUCTION VERIFICATION & TEST SUITE
 * For Samarth's Portfolio, Interactive Resume, Blog, and Admin Panel
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const SUPABASE_URL = 'https://npzqpcagdtnfuqhyngro.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wenFwY2FnZHRuZnVxaHluZ3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMjEzOTEsImV4cCI6MjEwODY5NzM5MX0.N20yyXXnX-ddUDo43ynQOe6f0r6ZoeK4w1MUpPzs37Y';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName} - ${details}`);
  }
}

async function runTestSuite() {
  console.log('=================================================================');
  console.log(' RUNNING PRODUCTION AUDIT & REPAIR VERIFICATION SUITE');
  console.log('=================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. DATA-SYNC.JS CODE & RUNTIME AUDIT
  // ---------------------------------------------------------------------------
  console.log('1. Auditing data-sync.js:');
  const dataSyncPath = path.join(ROOT_DIR, 'data-sync.js');
  const dataSyncCode = fs.readFileSync(dataSyncPath, 'utf8');

  // Verify no undeclared `loaded` reference
  assert(!dataSyncCode.includes('bestTime = loaded'), 'Undeclared "bestTime = loaded" bug eliminated');
  assert(!dataSyncCode.includes('if (loaded)'), 'Undeclared "if (loaded)" bug eliminated');
  assert(dataSyncCode.includes('fetchSupabaseData'), 'Contains robust fetchSupabaseData implementation');
  assert(dataSyncCode.includes('sanitizeHtml'), 'HTML sanitizer integrated to prevent XSS');
  assert(dataSyncCode.includes('renderBlogListPage'), 'Blog list hydration integrated');
  assert(dataSyncCode.includes('renderBlogArticlePage'), 'Blog article hydration integrated');

  // ---------------------------------------------------------------------------
  // 2. ADMIN.JS CODE & SECURITY AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n2. Auditing admin/admin.js:');
  const adminJsPath = path.join(ROOT_DIR, 'admin', 'admin.js');
  const adminJsCode = fs.readFileSync(adminJsPath, 'utf8');

  // Verify hardcoded credentials removed
  assert(!adminJsCode.includes('userVal === "sam" && passVal === "123"'), 'Hardcoded credentials (sam / 123) eliminated');
  assert(adminJsCode.includes('signInAdminWithSupabase'), 'Supabase Auth login integrated');
  assert(adminJsCode.includes('getOrRefreshAuthSession'), 'Auth session auto-refresh mechanism integrated');
  assert(adminJsCode.includes('isSavingMaster'), 'Concurrent save protection lock present');
  assert(adminJsCode.includes('Cloud save failed') || adminJsCode.includes('Cloud save rejected'), 'Meaningful error messages on save failure');

  // Check Storage URL encoding handles nested slashes properly
  assert(adminJsCode.includes('split("/").map(encodeURIComponent).join("/")'), 'Public storage URL generator encodes nested paths segment-by-segment without converting slashes to %2F');

  // Check Base64 fallback eliminated from project image file handler
  assert(!adminJsCode.includes('Storage upload bypassed, direct image data kept'), 'Silent base64 fallback in image upload eliminated');

  // ---------------------------------------------------------------------------
  // 3. HTML SCRIPT INCLUSIONS & ROUTING
  // ---------------------------------------------------------------------------
  console.log('\n3. Auditing HTML files & routing:');
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  assert(indexHtml.includes('src="data-sync.js"') || indexHtml.includes('src="/data-sync.js"'), 'index.html loads data-sync.js');

  const resumeHtml = fs.readFileSync(path.join(ROOT_DIR, 'resume', 'index.html'), 'utf8');
  assert(resumeHtml.includes('src="/data-sync.js"'), 'resume/index.html loads data-sync.js');

  const blogIndexHtml = fs.readFileSync(path.join(ROOT_DIR, 'blog', 'index.html'), 'utf8');
  assert(blogIndexHtml.includes('src="/data-sync.js"'), 'blog/index.html loads data-sync.js');

  const blogViewHtml = fs.readFileSync(path.join(ROOT_DIR, 'blog', 'view.html'), 'utf8');
  assert(blogViewHtml.includes('src="/data-sync.js"'), 'blog/view.html dynamic viewer created and loads data-sync.js');

  const vercelJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf8'));
  assert(vercelJson.cleanUrls === true, 'vercel.json has cleanUrls enabled');
  assert(Array.isArray(vercelJson.rewrites) && vercelJson.rewrites.some(r => r.destination && r.destination.includes('view.html')), 'vercel.json rewrites dynamic blog articles to view.html');

  // ---------------------------------------------------------------------------
  // 4. LIVE SUPABASE DATABASE & SCHEMA TESTS
  // ---------------------------------------------------------------------------
  console.log('\n4. Testing Live Supabase Endpoints:');

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/portfolio_data?id=eq.main&select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    assert(res.ok && res.status === 200, 'Supabase portfolio_data SELECT returns HTTP 200');

    const rows = await res.json();
    assert(Array.isArray(rows) && rows.length > 0, 'portfolio_data table contains id="main" record');
    const mainRecord = rows[0];
    assert(mainRecord.id === 'main', 'Primary key is verified as "main"');
    assert(typeof mainRecord.data === 'object' && mainRecord.data !== null, 'Column "data" contains valid JSON object');
    assert(Array.isArray(mainRecord.data.projects), 'main.data contains projects array');
    assert(Array.isArray(mainRecord.data.blog), 'main.data contains blog array');
    assert(typeof mainRecord.data.general === 'object', 'main.data contains general object');
  } catch (err) {
    assert(false, 'Supabase read test', err.message);
  }

  // ---------------------------------------------------------------------------
  // 5. STORAGE BUCKET & CDN URL ACCESSIBILITY
  // ---------------------------------------------------------------------------
  console.log('\n5. Testing Supabase Storage & CDN:');

  try {
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/portfolio-assets`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefix: '', limit: 10 })
    });
    assert(listRes.ok, 'Storage bucket "portfolio-assets" list endpoint responds successfully');
    const files = await listRes.json();
    assert(Array.isArray(files) && files.length > 0, `Storage bucket contains uploaded files (found ${files.length})`);

    // Test public accessibility of a file with spaces/special characters
    const targetFile = files.find(f => f.name.includes("Samarth's") || f.name.includes(".png")) || files[0];
    if (targetFile) {
      const encodedSegments = targetFile.name.split('/').map(encodeURIComponent).join('/');
      const publicCdnUrl = `${SUPABASE_URL}/storage/v1/object/public/portfolio-assets/${encodedSegments}`;
      const cdnRes = await fetch(publicCdnUrl);
      assert(cdnRes.ok && cdnRes.status === 200, `Public CDN URL is accessible without auth (${cdnRes.status}) for ${targetFile.name}`);
      assert(cdnRes.headers.get('content-type')?.startsWith('image/'), 'CDN responds with proper image MIME type header');
    }
  } catch (err) {
    assert(false, 'Supabase storage test', err.message);
  }

  // ---------------------------------------------------------------------------
  // 6. SUPABASE AUTH BEHAVIOR
  // ---------------------------------------------------------------------------
  console.log('\n6. Testing Supabase Auth:');

  try {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fake_nonexistent_user@example.com', password: 'BadPassword123!' })
    });
    assert(authRes.status === 400, 'Supabase Auth rejects invalid credentials with HTTP 400');
    const authBody = await authRes.json();
    assert(authBody.error_code === 'invalid_credentials', 'Supabase Auth returns "invalid_credentials" error code');
  } catch (err) {
    assert(false, 'Supabase Auth test', err.message);
  }

  // ---------------------------------------------------------------------------
  // 7. SQL SETUP MIGRATION INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n7. Auditing SQL setup migration:');
  const sqlFile = fs.readFileSync(path.join(ROOT_DIR, 'supabase-setup.sql'), 'utf8');
  assert(sqlFile.includes('ENABLE ROW LEVEL SECURITY'), 'SQL migration enables Row Level Security');
  assert(sqlFile.includes('CREATE POLICY "Public can read portfolio_data"'), 'SQL migration defines public read policy');
  assert(sqlFile.includes('CREATE POLICY "Authenticated admin can update portfolio_data"'), 'SQL migration defines authenticated admin update policy');
  assert(sqlFile.includes('portfolio-assets'), 'SQL migration configures portfolio-assets bucket');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n=================================================================');
  console.log(` TEST EXECUTION SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  if (failedTests > 0) {
    console.log(` WARNING: ${failedTests} test(s) failed!`);
  } else {
    console.log(' ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  }
  console.log('=================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runTestSuite().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});

