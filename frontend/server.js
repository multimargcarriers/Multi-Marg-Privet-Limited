import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Serve static assets from the dist directory
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Fallback all routes to index.html for React Router SPA behavior
app.use((req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send('<!DOCTYPE html><html><head><meta http-equiv="refresh" content="3"><title>Building App</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Building application...</h2><p>Page will refresh automatically in 3 seconds.</p></body></html>');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

