const express = require('express');
const app     = express();

app.use(express.json());

// ── Health check (used by Helm livenessProbe / readinessProbe) ──
app.get('/node-app/actuator/health', (req, res) => {
    res.json({ status: 'UP', service: 'poc-node-app' });
});

// ── Sample routes ────────────────────────────────────────────────
app.get('/node-app/products', (req, res) => {
    res.json([
        { id: 1, name: 'Product A', price: 100 },
        { id: 2, name: 'Product B', price: 200 },
    ]);
});

app.get('/node-app/products/:id', (req, res) => {
    res.json({ id: req.params.id, name: 'Product A', price: 100 });
});

module.exports = app;
