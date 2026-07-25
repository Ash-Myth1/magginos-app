//imports
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

//connection
const firebaseConfig = {
  apiKey: 'AIzaSyDiZzAO7cJ33reDh73uobzkYuIEleSvLY8',
  authDomain: 'magginos.firebaseapp.com',
  projectId: 'magginos',
  storageBucket: 'magginos.firebasestorage.app',
  messagingSenderId: '700997011726',
  appId: '1:700997011726:web:0c1bcb38a1ccd5d5e0ef5f',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

//google Oauth
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
