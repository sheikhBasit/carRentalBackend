const { body, validationResult } = require('express-validator');

const bookingValidationRules = () => [
  body('user').notEmpty().withMessage('User is required'),
  body('idVehicle').notEmpty().withMessage('Vehicle is required'),
  body('from').notEmpty().withMessage('From date is required'),
  body('to').notEmpty().withMessage('To date is required'),
  body('fromTime').notEmpty().withMessage('From time is required'),
  body('toTime').notEmpty().withMessage('To time is required'),
  body('termsAccepted').isBoolean().withMessage('Terms acceptance must be boolean'),
  body('paymentStatus').isIn(['pending', 'paid']).withMessage('Invalid payment status'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

module.exports = { bookingValidationRules, validate };
