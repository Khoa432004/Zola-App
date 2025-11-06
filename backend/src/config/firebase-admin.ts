import admin from 'firebase-admin';

/**
 * Khởi tạo Firebase Admin SDK (Auth + Firestore)
 */
let adminAuth: admin.auth.Auth | null = null;
let firestore: admin.firestore.Firestore | null = null;

if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      adminAuth = admin.auth();
      firestore = admin.firestore();
      console.log('✅ Firebase Admin initialized (Auth + Firestore)');
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      // Fallback: use environment variables
      try {
        // Handle private key - replace escaped newlines with actual newlines
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        // Replace both \\n and \n with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // Ensure the private key starts and ends correctly
        if (!privateKey.includes('BEGIN PRIVATE KEY')) {
          console.warn('⚠️ Private key format may be incorrect');
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          } as admin.ServiceAccount),
        });
        adminAuth = admin.auth();
        firestore = admin.firestore();
        console.log('✅ Firebase Admin initialized (Auth + Firestore)');
        console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
      } catch (initError: any) {
        console.error('❌ Firebase Admin initialization error:', initError.message);
        throw initError;
      }
    } else {
      const missingVars = [];
      if (!process.env.FIREBASE_PROJECT_ID) missingVars.push('FIREBASE_PROJECT_ID');
      if (!process.env.FIREBASE_CLIENT_EMAIL) missingVars.push('FIREBASE_CLIENT_EMAIL');
      if (!process.env.FIREBASE_PRIVATE_KEY) missingVars.push('FIREBASE_PRIVATE_KEY');
      console.warn('⚠️ Firebase Admin not configured - Missing:', missingVars.join(', '));
    }
  } catch (error) {
    console.warn('⚠️ Firebase Admin initialization failed:', error);
    console.warn('⚠️ Authentication and database will not work without Firebase Admin setup');
  }
} else {
  adminAuth = admin.auth();
  firestore = admin.firestore();
}

if (!firestore) {
  console.error('❌ Firestore not initialized');
}

export { adminAuth, firestore };

