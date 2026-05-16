import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// SPA routing: catch-all middleware serves index.html
// Uses app.use instead of a route pattern
// because Express v4.21+ removes bare * wildcard support
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Weave frontend server running on port ${PORT}`);
});