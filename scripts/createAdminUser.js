// Script to create an admin user via the deployed API
import axios from 'axios';

const BASE_URL = 'https://car-rental-backend-black.vercel.app';

async function createAdminUser() {
  try {
    // 1. Sign up a new user with all required fields
    const signupRes = await axios.post(`${BASE_URL}/api/auth/signup`, {
      name: 'Admin User',
      email: 'admin@admin.com',
      password: 'admin123',
      confirmPassword: 'admin123',
      role: 'admin',
      isBlocked: false,
      isVerified: true,
      phoneNo: '03123456789',
      address: 'Admin HQ',
      city: 'Lahore',
      province: 'Punjab',
      cnic: '42101-1234567-1',
      age: 23,
    });
    console.log('Signup response:', signupRes.data);
    console.log('You can now log in with:');
    console.log('Email: admin@admin.com');
    console.log('Password: admin123');
  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

createAdminUser();
