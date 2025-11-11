import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBoinA_sHttIsfE9sbvaPD31jsqf6h6Z_E",
  authDomain: "catchat-9ae50.firebaseapp.com",
  projectId: "catchat-9ae50",
  storageBucket: "catchat-9ae50.firebasestorage.app",
  messagingSenderId: "255537216461",
  appId: "1:255537216461:web:91ab116299de8dd29b2284"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;