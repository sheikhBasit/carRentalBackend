const mongoose = require('mongoose');
const Driver = require('./models/driver.model.js');
const RentalCompany = require('./models/rentalCompany.model.js');
const User = require('./models/user.model.js');
const Vehicle = require('./models/vehicle.model.js');
const Feedback = require('./models/feedback.model.js');
const Booking = require('./models/booking.model.js');
const Transaction = require('./models/transaction.model.js');
const Payment = require('./models/payment.model.js');
const DamageReport = require('./models/damagereport.model.js');
const Notification = require('./models/notification.model.js');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/carRental', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Sample data for rental companies
const sampleCompanies = [
  {
    companyName: "Speedy Rides",
    address: "123 Main St, Karachi",
    contactNumber: "+923001234567",
    email: "info@speedyrides.com",
    website: "https://speedyrides.com"
  },
  {
    companyName: "City Wheels",
    address: "456 Business Ave, Lahore",
    contactNumber: "+923123456789",
    email: "contact@citywheels.com",
    website: "https://citywheels.com"
  }
];

// Sample data for users
const sampleUsers = [
  {
    name: "John Doe",
    email: "john@example.com",
    password: "hashed_password_123",
    role: "customer",
    phoneNumber: "+923001234567",
    address: "123 Customer St, Karachi",
    profilePicture: "https://randomuser.me/api/portraits/men/1.jpg",
    verificationStatus: "verified"
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "hashed_password_456",
    role: "customer",
    phoneNumber: "+923123456789",
    address: "456 Customer Ave, Lahore",
    profilePicture: "https://randomuser.me/api/portraits/women/2.jpg",
    verificationStatus: "verified"
  }
];

// Sample data for vehicles
const sampleVehicles = [
  {
    manufacturer: "Toyota",
    model: "Corolla",
    year: 2022,
    licensePlate: "KA-1234",
    vehicleType: "Sedan",
    color: "White",
    mileage: 10000,
    fuelType: "Petrol",
    transmission: "Automatic",
    dailyRate: 8000,
    hourlyRate: 500,
    status: "available",
    features: ["Air Conditioning", "Power Windows", "GPS Navigation"]
  },
  {
    manufacturer: "Honda",
    model: "Civic",
    year: 2023,
    licensePlate: "LA-5678",
    vehicleType: "Sedan",
    color: "Black",
    mileage: 5000,
    fuelType: "Petrol",
    transmission: "Manual",
    dailyRate: 7500,
    hourlyRate: 450,
    status: "available",
    features: ["Sunroof", "Leather Seats", "Bluetooth"]
  }
];



// Sample data for feedback
const sampleFeedback = [
  {
    user: "john@example.com",
    rating: 5,
    comment: "Excellent service! The car was clean and the driver was very professional.",
    bookingId: "booking_123",
    createdAt: new Date()
  },
  {
    user: "jane@example.com",
    rating: 4,
    comment: "Good experience overall. The car was a bit late but everything else was fine.",
    bookingId: "booking_456",
    createdAt: new Date()
  }
];

// Sample data for bookings
const sampleBookings = [
  {
    user: "john@example.com",
    vehicle: "KA-1234",
    driver: "PKD123456",
    rentalCompany: "Speedy Rides",
    pickupLocation: "123 Main St, Karachi",
    dropoffLocation: "456 Business Ave, Lahore",
    pickupDate: new Date(),
    dropoffDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: "confirmed",
    totalAmount: 8000,
    paymentStatus: "pending"
  },
  {
    user: "jane@example.com",
    vehicle: "LA-5678",
    driver: "PKD654321",
    rentalCompany: "City Wheels",
    pickupLocation: "789 Market St, Islamabad",
    dropoffLocation: "101123 Park Ave, Rawalpindi",
    pickupDate: new Date(),
    dropoffDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    status: "confirmed",
    totalAmount: 15000,
    paymentStatus: "pending"
  }
];

// Sample data for transactions
const sampleTransactions = [
  {
    bookingId: "booking_123",
    amount: 8000,
    type: "rental",
    status: "pending",
    createdAt: new Date()
  },
  {
    bookingId: "booking_456",
    amount: 15000,
    type: "rental",
    status: "pending",
    createdAt: new Date()
  }
];

// Sample data for payments
const samplePayments = [
  {
    transactionId: "transaction_123",
    amount: 8000,
    paymentMethod: "credit_card",
    status: "pending",
    createdAt: new Date()
  },
  {
    transactionId: "transaction_456",
    amount: 15000,
    paymentMethod: "bank_transfer",
    status: "pending",
    createdAt: new Date()
  }
];

// Sample data for damage reports
const sampleDamageReports = [
  {
    bookingId: "booking_123",
    vehicle: "KA-1234",
    description: "Scratch on passenger side door",
    severity: "minor",
    images: ["https://example.com/damage1.jpg"],
    reportedBy: "john@example.com",
    createdAt: new Date()
  }
];

// Sample data for notifications
const sampleNotifications = [
  {
    user: "john@example.com",
    title: "Booking Confirmed",
    message: "Your booking has been successfully confirmed!",
    type: "booking",
    bookingId: "booking_123",
    read: false,
    createdAt: new Date()
  },
  {
    user: "jane@example.com",
    title: "Payment Due",
    message: "Your payment is due for booking 456",
    type: "payment",
    bookingId: "booking_456",
    read: false,
    createdAt: new Date()
  }
];

// Sample data for drivers
const sampleDrivers = [
  {
    name: "Ahmed Khan",
    profileimg: "https://randomuser.me/api/portraits/men/1.jpg",
    company: "Speedy Rides",
    license: "PKD123456",
    cnic: "12345-6789012-3",
    phNo: "+923001234567",
    age: 35,
    experience: 10,
    baseHourlyRate: 500,
    baseDailyRate: 8000,
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startTime: "09:00",
      endTime: "17:00"
    },
    blackoutDates: [],
    rating: 4.8,
    completedTrips: 150
  },
  {
    name: "Fatima Ali",
    profileimg: "https://randomuser.me/api/portraits/women/2.jpg",
    company: "City Wheels",
    license: "PKD654321",
    cnic: "23456-7890123-4",
    phNo: "+923123456789",
    age: 30,
    experience: 8,
    baseHourlyRate: 450,
    baseDailyRate: 7500,
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      startTime: "08:00",
      endTime: "18:00"
    },
    blackoutDates: [],
    rating: 4.9,
    completedTrips: 120
  }
];

async function deleteOldData() {
  try {
    // Delete all drivers
    await Driver.deleteMany({});
    console.log('All drivers deleted successfully');
    
    // Delete all rental companies
    await RentalCompany.deleteMany({});
    console.log('All rental companies deleted successfully');
  } catch (error) {
    console.error('Error deleting old data:', error);
    process.exit(1);
  }
}

async function populateData() {
  try {
    // Delete old data
    await deleteOldData();
    
    // Create rental companies
    const companies = await Promise.all(
      sampleCompanies.map(company => 
        RentalCompany.create(company)
      )
    );
    console.log(`Created ${companies.length} rental companies`);

    // Create users
    const users = await Promise.all(
      sampleUsers.map(user => 
        User.create(user)
      )
    );
    console.log(`Created ${users.length} users`);

    // Create vehicles
    const vehicles = await Promise.all(
      sampleVehicles.map(vehicle => 
        Vehicle.create(vehicle)
      )
    );
    console.log(`Created ${vehicles.length} vehicles`);

    // Create drivers
    const companyMap = companies.reduce((acc, company) => {
      acc[company.companyName] = company._id;
      return acc;
    }, {});

    const drivers = await Promise.all(
      sampleDrivers.map(driver => {
        return Driver.create({
          ...driver,
          company: companyMap[driver.company]
        });
      })
    );
    console.log(`Created ${drivers.length} drivers`);

    // Create feedback
    const feedback = await Promise.all(
      sampleFeedback.map(feedback => 
        Feedback.create(feedback)
      )
    );
    console.log(`Created ${feedback.length} feedback entries`);

    // Create bookings
    const userMap = users.reduce((acc, user) => {
      acc[user.email] = user._id;
      return acc;
    }, {});

    const vehicleMap = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.licensePlate] = vehicle._id;
      return acc;
    }, {});

    const driverMap = drivers.reduce((acc, driver) => {
      acc[driver.license] = driver._id;
      return acc;
    }, {});

    const bookings = await Promise.all(
      sampleBookings.map(booking => {
        return Booking.create({
          ...booking,
          user: userMap[booking.user],
          vehicle: vehicleMap[booking.vehicle],
          driver: driverMap[booking.driver],
          rentalCompany: companyMap[booking.rentalCompany]
        });
      })
    );
    console.log(`Created ${bookings.length} bookings`);

    // Create transactions
    const transactionMap = bookings.reduce((acc, booking) => {
      acc[booking._id] = booking._id;
      return acc;
    }, {});

    const transactions = await Promise.all(
      sampleTransactions.map(transaction => {
        return Transaction.create({
          ...transaction,
          bookingId: transactionMap[transaction.bookingId]
        });
      })
    );
    console.log(`Created ${transactions.length} transactions`);

    // Create payments
    const paymentMap = transactions.reduce((acc, transaction) => {
      acc[transaction._id] = transaction._id;
      return acc;
    }, {});

    const payments = await Promise.all(
      samplePayments.map(payment => {
        return Payment.create({
          ...payment,
          transactionId: paymentMap[payment.transactionId]
        });
      })
    );
    console.log(`Created ${payments.length} payments`);

    // Create damage reports
    const damageReports = await Promise.all(
      sampleDamageReports.map(report => {
        return DamageReport.create({
          ...report,
          vehicle: vehicleMap[report.vehicle],
          reportedBy: userMap[report.reportedBy]
        });
      })
    );
    console.log(`Created ${damageReports.length} damage reports`);

    // Create notifications
    const notifications = await Promise.all(
      sampleNotifications.map(notification => {
        return Notification.create({
          ...notification,
          user: userMap[notification.user],
          bookingId: transactionMap[notification.bookingId]
        });
      })
    );
    console.log(`Created ${notifications.length} notifications`);

    console.log('Data population completed successfully');
  } catch (error) {
    console.error('Error in data population:', error);
    process.exit(1);
  }
}

async function populateDrivers(companies) {
  try {
    // Create drivers
    const companyMap = companies.reduce((acc, company) => {
      acc[company.companyName] = company._id;
      return acc;
    }, {});

    const drivers = await Promise.all(
      sampleDrivers.map(driver => {
        return Driver.create({
          ...driver,
          company: companyMap[driver.company]
        });
      })
    );
    console.log(`Created ${drivers.length} drivers`);
  } catch (error) {
    console.error('Error creating drivers:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    await populateData();
    console.log('All data population completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();
