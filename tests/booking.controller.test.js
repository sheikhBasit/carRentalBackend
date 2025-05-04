const request = require('supertest');
const app = require('../app'); // Adjust if your Express app is exported elsewhere
const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const Vehicle = require('../models/vehicle.model');
const User = require('../models/user.model');

// Integration tests for booking controller
// Assumes a test database or in-memory MongoDB is configured

describe('Booking Controller Integration', () => {
  let userId, vehicleId;

  beforeAll(async () => {
    // Create a test user
    const user = await User.create({
      name: 'Test User',
      email: 'bookingtest@example.com',
      password: 'Test123!',
      phone: '03001234567',
      cnicVerified: true,
      licenseVerified: true,
      age: 25,
      termsAccepted: true
    });
    userId = user._id;
    // Create a test vehicle
    const vehicle = await Vehicle.create({
      company: mongoose.Types.ObjectId(),
      manufacturer: 'Toyota',
      model: 'Corolla',
      year: 2022,
      numberPlate: 'ABC-123',
      dynamicPricing: { baseRate: 1000 },
      status: 'available',
      features: { transmission: 'automatic', fuelType: 'petrol', seats: 4 },
      cities: [{ name: 'lahore', additionalFee: 0 }],
      availability: { days: ['monday'], startTime: '09:00', endTime: '18:00' }
    });
    vehicleId = vehicle._id;
  });

  afterAll(async () => {
    await Booking.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it('should create a booking', async () => {
    const res = await request(app)
      .post('/api/booking/postBooking')
      .send({
        user: userId,
        idVehicle: vehicleId,
        from: 'Lahore',
        to: 'Islamabad',
        fromTime: new Date(Date.now() + 3600000).toISOString(),
        toTime: new Date(Date.now() + 7200000).toISOString(),
        intercity: true,
        cityName: 'lahore',
        termsAccepted: true,
        paymentStatus: 'pending',
        bookingChannel: 'web'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.user).toBe(String(userId));
    expect(res.body.booking.idVehicle).toBe(String(vehicleId));
  });

  it('should not double-book the same vehicle (buffer conflict)', async () => {
    const res = await request(app)
      .post('/api/booking/postBooking')
      .send({
        user: userId,
        idVehicle: vehicleId,
        from: 'Lahore',
        to: 'Islamabad',
        fromTime: new Date(Date.now() + 3600000).toISOString(),
        toTime: new Date(Date.now() + 7200000).toISOString(),
        intercity: true,
        cityName: 'lahore',
        termsAccepted: true,
        paymentStatus: 'pending',
        bookingChannel: 'web'
      });
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
