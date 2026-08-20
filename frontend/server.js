import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

// Auto-build dist on startup if missing on Hostinger
if (!fs.existsSync(indexPath)) {
  console.log('[Frontend Server] dist/index.html not found. Running vite build...');
  try {
    execSync('npx vite build', { stdio: 'inherit', cwd: __dirname });
    console.log('[Frontend Server] Vite build completed successfully.');
  } catch (err) {
    console.error('[Frontend Server] Vite build failed:', err.message);
  }
}

// Serve static assets from the dist directory
app.use(express.static(distPath));

// Fallback all routes to index.html for React Router SPA behavior
app.use((req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    try {
      execSync('npx vite build', { stdio: 'inherit', cwd: __dirname });
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    } catch (e) {}
    res.status(500).send('<h1>Application is building or dist not found. Please refresh.</h1>');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


