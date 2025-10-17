const path = require('path');
const express = require('express');

const app = express();
const port = process.env.PORT || 8000;

// Serve static assets
app.use(express.static(path.join(__dirname, '.')));

const chatHandler = require('./api/chat.js');
const transcribeHandler = require('./api/transcribe.js');

app.post('/api/chat', (req, res) => chatHandler(req, res));
app.post('/api/transcribe', (req, res) => transcribeHandler(req, res));

app.listen(port, () => {
  console.log(`AssistMe dev server running at http://localhost:${port}`);
});
