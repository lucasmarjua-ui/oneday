import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { firebaseApp } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { dateKey } from './rng.js';
import { hasPlayedToday } from './daily-challenge-logic.js';

const db = getFirestore(firebaseApp);
const LOCAL_KEY = 'oneday.dailyChallenge';

export const todayDateKey = dateKey;
export { hasPlayedToday };

function readAllLocal() {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    return typeof value === 'object' && value ? value : {};
  } catch { return {}; }
}

export function getLocalDailyResult(eraId) {
  return readAllLocal()[eraId] || null;
}

export function saveLocalDailyResult(eraId, result) {
  const all = readAllLocal();
  all[eraId] = result;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
}

function leaderboardId(eraId, todayKey) {
  return `${eraId}-${todayKey}`;
}

const FIRESTORE_TIMEOUT_MS = 8000;

// Against an unconfigured/invalid Firebase project (the placeholder in
// firebase-config.js until a real project is wired up), the Firestore SDK's
// promises can hang indefinitely instead of rejecting -- so every call here
// races against a timeout rather than trusting the SDK to fail fast.
function withTimeout(promise, fallback) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), FIRESTORE_TIMEOUT_MS)),
  ]);
}

// Firestore is the tamper-resistant source of truth for logged-in players:
// firestore.rules allows create but never update/delete on an entry, so a
// second submission for the same (era, day, uid) is rejected server-side
// regardless of what a client's localStorage says.
export async function checkRemoteDailyEntry(eraId, todayKey) {
  const user = getCurrentUser();
  if (!user) return null;
  const ref = doc(db, 'dailyLeaderboards', leaderboardId(eraId, todayKey), 'entries', user.uid);
  try {
    const snapshot = await withTimeout(getDoc(ref), null);
    return snapshot && snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.warn('OneDay: could not check remote daily entry', error);
    return null;
  }
}

export async function submitDailyScore(eraId, todayKey, scoreData) {
  const user = getCurrentUser();
  if (!user) return false;
  const ref = doc(db, 'dailyLeaderboards', leaderboardId(eraId, todayKey), 'entries', user.uid);
  try {
    const result = await withTimeout(
      setDoc(ref, { ...scoreData, username: user.displayName, updatedAt: Date.now() }).then(() => true),
      false,
    );
    return result;
  } catch (error) {
    console.warn('OneDay: daily score submission failed (already submitted today?)', error);
    return false;
  }
}

export async function getDailyLeaderboard(eraId, todayKey, topN = 10) {
  const entriesRef = collection(db, 'dailyLeaderboards', leaderboardId(eraId, todayKey), 'entries');
  const rankedQuery = query(entriesRef, orderBy('score', 'desc'), limit(topN));
  try {
    const snapshot = await withTimeout(getDocs(rankedQuery), null);
    return snapshot ? snapshot.docs.map(entry => entry.data()) : [];
  } catch (error) {
    console.warn('OneDay: could not load daily leaderboard', error);
    return [];
  }
}
