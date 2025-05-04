const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Vehicle = require('../models/vehicle.model');
const User = require('../models/user.model');

describe('Vehicle Controller Integration', () => {
  let companyId, adminToken, vehicleId;

  beforeAll(async () => {
    // Create a test admin/company user
    const company = await User.create({
      name: 'Rental Admin',
      email: 'admin@rental.com',
      password: 'Admin123!',
      role: 'company',
      cnicVerified: true,
      licenseVerified: true,
      age: 30
    });
    companyId = company._id;
    // Optionally, generate a JWT token if auth middleware is present
    // adminToken = ...
  });

  afterAll(async () => {
    await Vehicle.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it('should add a new vehicle', async () => {
    const res = await request(app)
      .post('/api/vehicle/postVehicle')
      .field('companyId', companyId)
      .field('manufacturer', 'Honda')
      .field('model', 'Civic')
      .field('year', 2023)
      .field('numberPlate', 'XYZ-789')
      .field('availability[days][]', 'monday')
      .field('availability[startTime]', '09:00')
      .field('availability[endTime]', '18:00')
      .field('cities[0][name]', 'lahore')
      .field('cities[0][additionalFee]', 0)
      // .attach('carImages', 'path/to/test/image.jpg') // Optionally add images
      // .set('Authorization', `Bearer ${adminToken}`)
      ;
    expect(res.statusCode).toBe(201);
    expect(res.body.success || res.body.message).toBeDefined();
    // Optionally, store vehicleId for further tests
    // vehicleId = res.body.vehicle._id;
  });

  it('should search/filter vehicles', async () => {
    const res = await request(app)
      .get('/api/vehicle/search')
      .query({ status: 'available', manufacturer: 'Honda' });
    expect(res.statusCode).toBe(200);
    expect(res.body.vehicles).toBeDefined();
    expect(Array.isArray(res.body.vehicles)).toBe(true);
  });
});
