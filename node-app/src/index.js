const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check - pipeline waitForQualityGate ke baad EKS check karta hai
app.get('/actuator/health', (req, res) => {
  res.json({ status: 'UP', service: 'poc-node-app' });
});

app.get('/poc-node-app/hello', (req, res) => {
  res.json({
    service: 'poc-node-app',
    status:  'running',
    env:     process.env.ENV || 'local',
    version: process.env.APP_VERSION || '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`poc-node-app running on port ${PORT}`);
});
