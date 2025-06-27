// Firebase configuration and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAH-bRP4c5Mu0TGMk9uV5JHtHxf3dRETgM",
  authDomain: "sos-mobile-app-2ad58.firebaseapp.com",
  projectId: "sos-mobile-app-2ad58",
  storageBucket: "sos-mobile-app-2ad58.firebasestorage.app",
  messagingSenderId: "368320773799",
  appId: "1:368320773799:web:8fd199b7c7c5e5ff412582",
  measurementId: "G-XRM72V0VDM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Export Firebase services
export { app, auth, db, analytics, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence, browserLocalPersistence };
