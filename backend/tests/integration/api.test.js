const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Disconnect from real DB if connected
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('API Integration Tests', () => {
    describe('GET /', () => {
        it('should return welcome message', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Welcome to Event Management System API');
        });
    });

    describe('Facilities API', () => {
        it('should return empty list when no facilities exist', async () => {
            const res = await request(app).get('/api/facilities');
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });
    });
});
