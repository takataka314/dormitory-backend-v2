// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGz-8yp2xOmKuRYndJQCoKczeaBnQ6Z7E",
  authDomain: "keiteki-lend.firebaseapp.com",
  projectId: "keiteki-lend",
  storageBucket: "keiteki-lend.firebasestorage.app",
  messagingSenderId: "694823978848",
  appId: "1:694823978848:web:d617e26a93ff59ead54005"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
