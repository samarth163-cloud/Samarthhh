const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'portfolio-data.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

const server = http.createServer((req, res) => {
  // CORS headers for local tools
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // API Route: Save Data to Disk
  if (req.method === 'POST' && pathname === '/api/save') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) { // 20MB limit for image uploads/data
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const jsonData = JSON.parse(body);
        const dataDir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(jsonData, null, 2), 'utf-8');

        // Sync browser title and favicon into index.html on disk
        // Sync browser title into index.html on disk
        if (jsonData.general) {
          try {
            const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
            if (fs.existsSync(indexHtmlPath)) {
              let html = fs.readFileSync(indexHtmlPath, 'utf-8');
              if (jsonData.general.siteTitle) {
                if (/<title>.*?<\/title>/i.test(html)) {
                  html = html.replace(/<title>.*?<\/title>/i, `<title>${jsonData.general.siteTitle}</title>`);
                } else {
                  html = html.replace(/<head>/i, `<head>\n    <title>${jsonData.general.siteTitle}</title>`);
                }
                html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/>/i, `<meta property="og:title" content="${jsonData.general.siteTitle}" />`);
                html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/>/i, `<meta name="twitter:title" content="${jsonData.general.siteTitle}" />`);
              }
              fs.writeFileSync(indexHtmlPath, html, 'utf-8');
            }
          } catch (syncErr) {
            console.warn('Could not update index.html on disk', syncErr);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Saved to disk successfully' }));
        console.log(`[${new Date().toLocaleTimeString()}] Successfully updated portfolio-data.json on disk!`);
      } catch (err) {
        console.error('Failed to parse or save JSON:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON', details: err.message }));
      }
    });
    return;
  }

  // API Route: Upload Image to Disk (supports keeping exact standard filenames)
  if (req.method === 'POST' && pathname === '/api/upload-image') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Image too large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const { filename, base64Data, folder } = JSON.parse(body);
        const subFolder = (folder === undefined || folder === null) ? 'assets/profile' : folder.trim();
        const targetDir = subFolder ? path.join(ROOT_DIR, subFolder) : ROOT_DIR;
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const safeName = (filename || `avatar-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filePath = path.join(targetDir, safeName);
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        const relPath = subFolder ? `${subFolder}/${safeName}`.replace(/\\/g, '/') : safeName;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, path: relPath }));
        console.log(`[${new Date().toLocaleTimeString()}] Saved image: ${relPath}`);
      } catch (err) {
        console.error('Failed to upload image:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API Route: Get Data
  if (req.method === 'GET' && pathname === '/api/data') {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Data file not found' }));
    }
    return;
  }

  // Static File Serving
  let relativePath = pathname;
  if (relativePath === '/' || relativePath === '') {
    relativePath = '/index.html';
  }

  let filePath = path.join(ROOT_DIR, relativePath);

  // If path is a directory, check for index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath)) {
    // Check if appending .html works (clean URLs)
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Disable caching for dev files to ensure instant updates
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.writeHead(200, { 'Content-Type': contentType });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>404 Not Found</h1><p>The file ${pathname} was not found on this server.</p>`);
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  SAMARTH PORTFOLIO & ADMIN SERVER RUNNING!`);
  console.log(`  Portfolio:    http://localhost:${PORT}/`);
  console.log(`  Resume:       http://localhost:${PORT}/resume/`);
  console.log(`  Admin Panel:  http://localhost:${PORT}/admin/`);
  console.log(`=======================================================`);
});
