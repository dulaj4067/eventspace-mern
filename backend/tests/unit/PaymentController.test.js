jest.mock('stripe', () => jest.fn(() => ({
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
  }
})));

const { createPayment, getPaymentById } = require('../../controllers/PaymentController');
const Payment = require('../../models/Payments');
const Booking = require('../../models/Booking');

jest.mock('../../models/Payments');
jest.mock('../../models/PaymentLogs');
jest.mock('../../models/Booking');
jest.mock('stripe');

describe('PaymentController Unit Tests', () => {
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

    describe('createPayment', () => {
        it('should return 400 if required fields are missing', async () => {
            req.body = { bookingId: 'b1' }; // missing userId, amount, etc.

            await createPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Please provide all required fields" });
        });

        it('should return 400 if amount does not match booking total', async () => {
            req.body = {
                bookingId: 'b1',
                userId: 'user123',
                amount: 100,
                paymentMethod: 'bank'
            };

            Booking.findById.mockResolvedValue({
                pricing: { total: 200 },
                status: 'pending'
            });

            await createPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('does not match booking total')
            }));
        });
    });
});
