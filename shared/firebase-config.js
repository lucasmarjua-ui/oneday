// The Firebase SDK is loaded from Google's CDN with a *dynamic* import, never a
// static one: if gstatic.com is blocked (ad blockers, corporate proxies,
// offline play) a static import would fail the whole module graph and leave a
// blank page. Loading it lazily keeps the game fully playable as a guest and
// only disables accounts, cloud sync and leaderboards.
const SDK = 'https://www.gstatic.com/firebasejs/10.13.0';

export const firebaseConfig = {
  apiKey: 'AIzaSyCCwefxXY0LPK8y13oB125eubjPJo0YSAY',
  authDomain: 'oneday-game.firebaseapp.com',
  projectId: 'oneday-game',
  storageBucket: 'oneday-game.firebasestorage.app',
  messagingSenderId: '904915013549',
  appId: '1:904915013549:web:64198fdd399e45e2829b24',
};

let firebasePromise = null;

// Resolves to { auth, db, authApi, firestoreApi }, or null when the SDK cannot
// be loaded. Cached, so every caller shares one SDK instance.
export function loadFirebase() {
  if (!firebasePromise) {
    firebasePromise = Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ])
      .then(([appApi, authApi, firestoreApi]) => {
        const app = appApi.initializeApp(firebaseConfig);
        return { auth: authApi.getAuth(app), db: firestoreApi.getFirestore(app), authApi, firestoreApi };
      })
      .catch(error => {
        console.warn('OneDay: Firebase unavailable, playing as guest only', error);
        return null;
      });
  }
  return firebasePromise;
}
