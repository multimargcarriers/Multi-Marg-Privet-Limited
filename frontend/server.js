import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

// Serve static assets from dist
app.use(express.static(distPath));

// Fallback all routes to index.html for React Router SPA behavior
app.use((req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('<h1>Page not found</h1>');
  }
});

app.listen(PORT, () => {
  console.log(`Frontend server is running on port ${PORT}`);
});


