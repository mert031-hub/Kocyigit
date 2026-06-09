const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 🛡️ Auth middleware'in çökmemesi için
process.env.JWT_SECRET = 'test_secret';

const reviewRoutes = require('../routes/reviewRoutes');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/reviews', reviewRoutes);

let mongoServer;

describe('LUXE BERLIN - Yorum/Review Güvenlik Testleri', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    afterAll(async () => {
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    it('GET /api/reviews - Yorumlar listelenebilmeli', async () => {
        const res = await request(app).get('/api/reviews');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('DELETE /api/reviews/:id - Admin olmadan silme reddedilmeli (401)', async () => {
        const res = await request(app).delete('/api/reviews/12345');
        expect(res.statusCode).toEqual(401);
    });
});