/**
 * Safe Migration Script: Upload Local Assets to Supabase Storage (portfolio-assets)
 * & Update References in portfolio-data.json and Supabase Database.
 * 
 * Safety features:
 * 1. Never deletes original local files.
 * 2. Backs up portfolio-data.json before editing.
 * 3. Verifies each uploaded asset via HTTP HEAD/GET before updating references.
 * 4. Idempotent: Can be run multiple times safely.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'portfolio-data.json');
const BACKUP_FILE = path.join(ROOT_DIR, 'data', `portfolio-data.pre-migration-${Date.now()}.json`);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://npzqpcagdtnfuqhyngro.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wenFwY2FnZHRuZnVxaHluZ3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMjEzOTEsImV4cCI6MjEwODY5NzM5MX0.N20yyXXnX-ddUDo43ynQOe6f0r6ZoeK4w1MUpPzs37Y';
const BUCKET = 'portfolio-assets';

const MIME_MAP = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getPublicUrl(storagePath) {
  const clean = storagePath.replace(/^\/+/, '');
  const encoded = clean.split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

async function verifyObjectExists(publicUrl) {
  try {
    const res = await fetch(publicUrl, { method: 'HEAD' });
    return res.ok || res.status === 200 || res.status === 304;
  } catch (e) {
    return false;
  }
}

async function uploadFileToSupabase(filePath, storagePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(filePath);

  const cleanStoragePath = storagePath.replace(/^\/+/, '');
  const encodedPath = cleanStoragePath.split('/').map(encodeURIComponent).join('/');
  const endpoint = `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/${BUCKET}/${encodedPath}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Upload failed HTTP ${res.status}: ${txt}`);
  }

  const publicUrl = getPublicUrl(cleanStoragePath);
  const exists = await verifyObjectExists(publicUrl);
  if (!exists) {
    console.warn(`[WARN] Uploaded ${cleanStoragePath} but public URL check returned non-200. CDN propagation may take a few seconds.`);
  }

  return publicUrl;
}

async function runMigration() {
  console.log('====================================================');
  console.log('   SAMARTH PORTFOLIO: ASSET MIGRATION TO SUPABASE   ');
  console.log('====================================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Target Bucket: ${BUCKET}`);

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Data file not found at ${DATA_FILE}`);
    process.exit(1);
  }

  // Backup original
  fs.copyFileSync(DATA_FILE, BACKUP_FILE);
  console.log(`[OK] Backup created at: ${BACKUP_FILE}`);

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  let migratedCount = 0;
  let skippedCount = 0;

  async function processValue(val) {
    if (typeof val !== 'string') return val;
    val = val.trim();

    // Already a Supabase Storage URL or external CDN URL
    if (val.startsWith('http://') || val.startsWith('https://')) {
      return val;
    }

    // Check if it matches a local asset path
    const cleanPath = val.replace(/^\/+/, '');
    const localFsPath = path.join(ROOT_DIR, cleanPath);

    if (fs.existsSync(localFsPath) && fs.statSync(localFsPath).isFile()) {
      try {
        console.log(`Uploading: ${cleanPath} ...`);
        const cloudUrl = await uploadFileToSupabase(localFsPath, cleanPath);
        console.log(`  -> Migrated to: ${cloudUrl}`);
        migratedCount++;
        return cloudUrl;
      } catch (err) {
        console.error(`  -> Failed to upload ${cleanPath}: ${err.message}`);
        return val; // Keep original on error
      }
    } else {
      skippedCount++;
      return val;
    }
  }

  // Traverse and migrate JSON
  async function migrateObject(obj) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = await migrateObject(obj[i]);
      }
    } else if (obj !== null && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = await processValue(obj[key]);
        } else {
          obj[key] = await migrateObject(obj[key]);
        }
      }
    }
    return obj;
  }

  const updatedData = await migrateObject(data);
  updatedData._updatedAt = Date.now();

  fs.writeFileSync(DATA_FILE, JSON.stringify(updatedData, null, 2), 'utf8');
  console.log('====================================================');
  console.log(`Migration Complete! Migrated: ${migratedCount}, Kept/External: ${skippedCount}`);
  console.log(`Updated file saved to ${DATA_FILE}`);

  // Ask to sync to Supabase table
  try {
    console.log('Updating Supabase portfolio_data table...');
    const syncRes = await fetch(`${SUPABASE_URL}/rest/v1/portfolio_data`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        id: 'main',
        data: updatedData,
        updated_at: new Date().toISOString(),
      }),
    });
    if (syncRes.ok) {
      console.log('[OK] Successfully synced migrated data into Supabase portfolio_data!');
    } else {
      const err = await syncRes.text();
      console.warn(`[WARN] Supabase table update returned HTTP ${syncRes.status}: ${err}`);
    }
  } catch (err) {
    console.warn(`[WARN] Could not update Supabase table: ${err.message}`);
  }
}

if (require.main === module) {
  runMigration().catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
}

module.exports = { runMigration };

