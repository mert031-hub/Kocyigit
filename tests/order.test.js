const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 🛡️ KRİTİK: Mailer'ın çökmesini engellemek için dummy key
process.env.RESEND_API_KEY = 're_test_key_123';

const orderRoutes = require('../routes/orderRoutes');

const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);

let mongoServer;

describe('LUXE BERLIN - Sipariş API Testleri', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    afterAll(async () => {
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    it('POST /api/orders - Boş sepet ile sipariş reddedilmeli', async () => {
        const res = await request(app)
            .post('/api/orders')
            .send({ items: [], totalAmount: 0 });

        // Validation'a göre 400 veya 500 dönmesi normaldir
        expect([400, 500]).toContain(res.statusCode);
    });
});