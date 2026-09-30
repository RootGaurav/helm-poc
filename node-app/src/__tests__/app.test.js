const request = require('supertest');
const app     = require('../app');

describe('POC Node App', () => {

    test('GET /node-app/actuator/health → 200', async () => {
        const res = await request(app).get('/node-app/actuator/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('UP');
    });

    test('GET /node-app/products → array', async () => {
        const res = await request(app).get('/node-app/products');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /node-app/products/:id → single product', async () => {
        const res = await request(app).get('/node-app/products/1');
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe('1');
    });
});
