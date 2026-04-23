import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3456;

// Serve static files from public directory for the setup wizard
app.use(express.static(join(__dirname, '../public')));

// Setup wizard route - serves setup wizard page
app.get('/setup', (req, res) => {
  const htmlPath = join(__dirname, '../public/setup-wizard.html');
  res.sendFile(htmlPath);
});

// Redirect root to setup wizard
app.get('/', (req, res) => {
  const htmlPath = join(__dirname, '../public/setup-wizard.html');
  res.sendFile(htmlPath);
});

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`\n🚀 LinkedIn Post Setup Wizard`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down setup wizard...');
  server.close(() => {
    console.log('Setup wizard stopped.');
    process.exit(0);
  });
});