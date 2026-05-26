import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAPL1_H_Riku1xSMfF2vMLrSKa6ctLELTQ",
  authDomain: "lifetracker-7b752.firebaseapp.com",
  databaseURL: "https://lifetracker-7b752-default-rtdb.firebaseio.com",
  projectId: "lifetracker-7b752",
  storageBucket: "lifetracker-7b752.firebasestorage.app",
  messagingSenderId: "882858925842",
  appId: "1:882858925842:web:4738a3b52ce68484ad5dcb",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
