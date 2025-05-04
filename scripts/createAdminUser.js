// Script to create an admin user via the deployed API
import axios from 'axios';

const BASE_URL = 'https://car-rental-backend-black.vercel.app';

async function createAdminUser() {
  try {
    // 1. Sign up a new user
    const signupRes = await axios.post(`${BASE_URL}/api/auth/signup`, {
      name: 'Admin User',
      email: 'admin@admin.com',
      password: 'admin123',
      confirmPassword: 'admin123',
    });
    console.log('Signup response:', signupRes.data);

    // 2. Manually update the user role to admin (requires backend endpoint or DB access)
    // If you have a /users/updateRole endpoint, use it here; otherwise, update directly in DB.
    // Example (pseudo):
    // await axios.patch(`${BASE_URL}/api/users/updateRole`, { email: 'admin@admin.com', role: 'admin' });
    // console.log('Role updated to admin.');

    console.log('Now, set the user role to "admin" in your database for email admin@admin.com.');
    console.log('Then you can log in with:');
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
