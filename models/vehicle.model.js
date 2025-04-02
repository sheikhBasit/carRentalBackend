  const mongoose = require('mongoose');
  const { Schema } = mongoose;
  const mongooseAggregatePaginate =require ( "mongoose-aggregate-paginate-v2");

  const vehicleSchema = new mongoose.Schema({
    company: { 
      type: Schema.Types.ObjectId,
      ref:"RentalCompany",
      required: true }, // Rental company name
    manufacturer: { type: String, required: true, lowercase: true  }, // Car manufacturer (e.g., Toyota, Honda)
    model: { type: String, required: true, lowercase: true  }, // Car model (e.g., Corolla, Civic)
    numberPlate: { type: String, required: true, unique: true }, // Unique vehicle registration number
    carImageUrls: [{ type: String }], 
    trips: { type: Number, default: 0 }, // Number of trips made by the vehicle

    rent: { type: Number, required: true }, // Rental price
    capacity: { type: Number, required: true }, // Seating capacity
    transmission: { type: String, enum: ['Auto', 'Manual'], required: true } // Defines transmission type
  }, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
  });

  vehicleSchema.plugin(mongooseAggregatePaginate)
  const Vehicle = mongoose.model('Vehicle', vehicleSchema);

  module.exports = Vehicle;
