const config = {
  apiBaseUrl: process.env.NODE_ENV === 'production'
    ? '/.netlify/functions/api'
    : 'http://localhost:5000/api',
  authEndpoints: {
    login: '/auth/login',
    register: '/auth/register'
  }
};

export default config; 