const Feedback = require('../models/feedback.model');
const Booking = require('../models/booking.model');

// Create feedback after booking completion
exports.createFeedback = async (req, res) => {
  try {
    const { booking, rating, comment } = req.body;
    const user = req.user._id;
    const bookingDoc = await Booking.findById(booking);
    if (!bookingDoc || bookingDoc.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Feedback allowed only after completed booking.' });
    }
    const feedback = new Feedback({
      booking,
      user,
      vehicle: bookingDoc.idVehicle,
      company: bookingDoc.company,
      rating,
      comment
    });
    await feedback.save();
    return res.status(201).json({ success: true, feedback });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get feedback for a vehicle or company
exports.getFeedback = async (req, res) => {
  try {
    const { vehicle, company } = req.query;
    const query = {};
    if (vehicle) query.vehicle = vehicle;
    if (company) query.company = company;
    const feedbacks = await Feedback.find(query).populate('user', 'name');
    return res.json({ success: true, feedbacks });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
