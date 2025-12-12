// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAW4n_HRdaBzt4hkmqAH6zWvtfBCZgajwI",
  authDomain: "dormitory-item-lending-system.firebaseapp.com",
  projectId: "dormitory-item-lending-system",
  storageBucket: "dormitory-item-lending-system.firebasestorage.app",
  messagingSenderId: "941395629842",
  appId: "1:941395629842:web:1263da224d7bb0575045cb",
  measurementId: "G-N9SDNTVJZP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);