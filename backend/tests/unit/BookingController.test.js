const { createBooking, getMyBookings } = require('../../controllers/Bookingcontroller');
const Booking = require('../../models/Booking');
const Facility = require('../../models/Facilities');

jest.mock('../../models/Booking');
jest.mock('../../models/Facilities');
jest.mock('../../services/BookingCalendar');

describe('BookingController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            query: {},
            body: {},
            user: { id: 'user123', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('createBooking', () => {
        it('should return 400 if there is an overlapping booking', async () => {
            req.body = {
                facility: 'fac123',
                date: '2026-05-01',
                startTime: '10:00',
                endTime: '12:00'
            };

            Booking.findOne.mockResolvedValue({ _id: 'existingBooking' });

            await createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Facility is already booked for the selected date and time.'
            }));
        });
    });

    describe('getMyBookings', () => {
        it('should return only bookings for the logged-in user', async () => {
            const mockBookings = [{ _id: 'b1', user: 'user123' }];
            Booking.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockBookings)
            });

            await getMyBookings(req, res);

            expect(Booking.find).toHaveBeenCalledWith({ user: 'user123' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockBookings
            });
        });
    });
});
