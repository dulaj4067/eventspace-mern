const { createEvent, getAllEvents } = require('../../controllers/EventController');
const Event = require('../../models/Event');

jest.mock('../../models/Event');
jest.mock('../../models/Booking');
jest.mock('../../models/User');
jest.mock('../../services/emailService');

describe('EventController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            query: {},
            body: {},
            user: { _id: 'user123', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('createEvent', () => {
        it('should return 400 if validation fails (e.g., short name)', async () => {
            req.body = {
                name: 'ab', // too short
                type: 'conference',
                facility: '64f1a2b3c4d5e6f7a8b9c0d1',
                schedule: { date: new Date(Date.now() + 86400000) }
            };

            await createEvent(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Validation failed'
            }));
        });

        it('should create an event successfully with valid data', async () => {
            const validData = {
                name: 'Valid Event Name',
                type: 'conference',
                facility: '64f1a2b3c4d5e6f7a8b9c0d1',
                schedule: { 
                    date: new Date(Date.now() + 86400000), // tomorrow
                    startTime: '10:00',
                    endTime: '12:00'
                }
            };
            req.body = validData;
            
            Event.create.mockResolvedValue({ ...validData, organizer: 'user123' });

            await createEvent(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Event created successfully'
            }));
        });
    });

    describe('getAllEvents', () => {
        it('should return events with metadata', async () => {
            Event.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ name: 'Event 1' }])
            });
            Event.countDocuments.mockResolvedValue(1);

            await getAllEvents(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.any(Array),
                meta: expect.any(Object)
            }));
        });
    });
});
