const DamageReport = require('../models/damagereport.model');
const Booking = require('../models/booking.model');

// Create a damage report (at check-in or check-out)
exports.createDamageReport = async (req, res) => {
  try {
    const { booking, description, images,user } = req.body;
    const bookingDoc = await Booking.findById(booking);
    if (!bookingDoc) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }
    const damageReport = new DamageReport({
      booking,
      vehicle: bookingDoc.idVehicle,
      user,
      description,
      images
    });
    await damageReport.save();
    return res.status(201).json({ success: true, damageReport });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get all damage reports for a vehicle or booking
exports.getDamageReports = async (req, res) => {
  try {
    const { vehicle, booking } = req.query;
    const query = {};
    if (vehicle) query.vehicle = vehicle;
    if (booking) query.booking = booking;
    const reports = await DamageReport.find(query).populate('user', 'name');
    return res.json({ success: true, reports });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update a damage report (e.g., mark as resolved)
exports.updateDamageReport = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const updatedReport = await DamageReport.findByIdAndUpdate(id, update, { new: true });
    if (!updatedReport) {
      return res.status(404).json({ success: false, error: 'Damage report not found.' });
    }
    return res.json({ success: true, damageReport: updatedReport });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
