// ============================================================
// STUDIOSTAFF macOS — Express Server
// ============================================================
// Serves the STUDIOSTAFF static frontend and proxies all API
// calls to the live Vercel backend (studiostaff.houseofexp.com).
// ============================================================

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3100;
const PUBLIC_DIR = path.join(__dirname, 'public');
const API_TARGET = 'https://studiostaff.houseofexp.com';

// ============================================================
// Static files from STUDIOSTAFF public/
// ============================================================
app.use(express.static(PUBLIC_DIR, {
  setHeaders: (res, filePath) => {
    // Service worker needs correct MIME type
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    // No caching in dev
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));

// ============================================================
// Proxy API calls to live Vercel backend
// ============================================================
app.use('/api', createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  secure: true,
  logLevel: 'debug',
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: (path) => '/api' + path,
  on: {
    proxyReq: (proxyReq, req, res) => {
      // Forward all headers from the client
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
      if (req.headers['x-api-key']) {
        proxyReq.setHeader('X-API-Key', req.headers['x-api-key']);
      }
      if (req.headers['content-type']) {
        proxyReq.setHeader('Content-Type', req.headers['content-type']);
      }
    },
    proxyRes: (proxyRes, req, res) => {
      // Log non-200 responses for debugging
      if (proxyRes.statusCode >= 400) {
        console.error(`[proxy] ${req.method} ${req.url} → ${proxyRes.statusCode}`);
      }
    },
    error: (err, req, res) => {
      console.error(`[proxy] ERROR ${req.method} ${req.url}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Backend unreachable', detail: err.message });
      }
    },
  },
}));

// ============================================================
// SPA fallback — all other routes go to public/index.html
// ============================================================
app.get('*', (req, res) => {
  // Skip API routes (already handled)
  if (req.path.startsWith('/api/')) return;
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Not found');
    }
  });
});

// ============================================================
// Start
// ============================================================
function startServer(preferredPort) {
  const port = preferredPort || PORT;
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      console.log(`[server] STUDIOSTAFF running on http://127.0.0.1:${port}`);
      console.log(`[server] API proxy → ${API_TARGET}`);
      resolve({ server, port });
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[server] Port ${port} in use, trying ${port + 1}...`);
        server.close();
        startServer(port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// If run directly (not as module)
if (require.main === module) {
  startServer().catch((err) => {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  });
}

module.exports = { startServer, PORT };
