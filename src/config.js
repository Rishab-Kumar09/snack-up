const config = {
  apiBaseUrl: process.env.NODE_ENV === 'production'
    ? 'https://snack-up.netlify.app/api'  // Update this with your Netlify domain
    : 'http://localhost:3000/api',
  authEndpoints: {
    login: '/auth/login',
    register: '/auth/register'
  }
};

export default config; 