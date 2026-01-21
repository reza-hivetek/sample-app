const express = require('express');
const app = express();
const port = 80;

app.get('/', (req, res) => {
  res.send('Hello from your Node.js API!');
});

app.get('/lambda', async (req, res) => {
  // This endpoint will be configured to call the lambda function via API Gateway
  // For now, it just returns a static response.
  res.send('This endpoint will eventually call a lambda function.');
});

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
