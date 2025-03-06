// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRdt0GG4W4v_qCBIrgdhdXaa0enJy8ek0",
  authDomain: "spenzy-3840e.firebaseapp.com",
  projectId: "spenzy-3840e",
  storageBucket: "spenzy-3840e.appspot.com",
  messagingSenderId: "582521805910",
  appId: "1:582521805910:web:4574210a06e3728cec2ff7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

export { auth, db };
