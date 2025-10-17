const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express server
const app = express();
const port = 8000;

// Configure body parser with larger limits for API requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from current directory
app.use(express.static(__dirname));

// API routes - simulate Vercel serverless functions
const api = require(path.join(__dirname, 'api', 'testmodels.js'));
app.get('/api/testmodels', (req, res) => api(req, res));

const chatApi = require(path.join(__dirname, 'api', 'chat.js'));
app.post('/api/chat', (req, res) => chatApi(req, res));

const transcribeApi = require(path.join(__dirname, 'api', 'transcribe.js'));
app.post('/api/transcribe', (req, res) => transcribeApi(req, res));

// Serve index.html as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.HTML'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
