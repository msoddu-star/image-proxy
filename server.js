const express = require('express');
const https = require('https');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Image proxy attivo. Usa /image?url=...' });
});

app.get('/image', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Parametro url mancante' });

  try { new URL(url); } catch {
    return res.status(400).json({ error: 'URL non valido' });
  }

  const fetchImage = (targetUrl, redirectCount = 0) => {
    if (redirectCount > 5) return res.status(500).json({ error: 'Troppi redirect' });
    const client = targetUrl.startsWith('https') ? https : http;
    client.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://store.lemanicasa.com/',
      }
    }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const location = response.headers.location;
        if (!location) return res.status(500).json({ error: 'Redirect senza location' });
        const nextUrl = location.startsWith('http') ? location : new URL(location, targetUrl).href;
        return fetchImage(nextUrl, redirectCount + 1);
      }
      const contentType = response.headers['content-type'] || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      response.pipe(res);
    }).on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
  };

  fetchImage(url);
});

app.listen(PORT, () => console.log(`Image proxy avviato su porta ${PORT}`));
