// API Configuration for different environments
const getApiConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Check if we're on Vercel, Render, or localhost
  const hostname = window.location.hostname;
  const isVercel = hostname.includes('vercel.app');
  const isRender = hostname.includes('onrender.com');
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  
  if (isVercel || isRender) {
    return {
      API_BASE_URL: 'https://postworq.onrender.com/api', // Your actual backend URL
      // API_BASE_URL:'https://216.24.57.7/api',
      ENVIRONMENT: 'production'
    };
  } else if (isLocalhost) {
    return {
      API_BASE_URL: 'http://localhost:8000/api',
      ENVIRONMENT: 'development'
    };
  } else {
    return {
      API_BASE_URL: 'https://postworq.onrender.com/api', // Fallback
      ENVIRONMENT: 'production'
    };
  }
};

const config = getApiConfig();

export default config;




