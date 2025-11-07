import dotenv from 'dotenv';

dotenv.config();

/**
 * Kiểm tra các biến môi trường đã được load (debug)
 */
export const checkEnv = () => {
  console.log('Environment variables loaded:');
  console.log('  PORT:', process.env.PORT ? '✓' : '✗');
  console.log('  CORS_ORIGIN:', process.env.CORS_ORIGIN ? '✓' : '✗');
  console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✓' : '✗');
  console.log('  FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓' : '✗');
  console.log('  FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✓' : '✗');
  console.log('  FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✓ (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : '✗');
};

