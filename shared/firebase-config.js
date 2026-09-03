import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';

export const firebaseConfig = {
  apiKey: 'REPLACE_WITH_YOUR_API_KEY',
  authDomain: 'oneday-game.firebaseapp.com',
  projectId: 'oneday-game',
  storageBucket: 'oneday-game.firebasestorage.app',
  messagingSenderId: 'REPLACE_WITH_YOUR_SENDER_ID',
  appId: 'REPLACE_WITH_YOUR_APP_ID',
};

export const firebaseApp = initializeApp(firebaseConfig);
