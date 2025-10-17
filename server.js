const express = require('express');
const app = express();
const port = 8000;

// Serve static files
app.use(express.static('.'));

// API routes
app.use('/api', express.json());

app.post('/api/chat', require('./api/chat.js'));
app.get('/api/testmodels', require('./api/testmodels.js'));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
