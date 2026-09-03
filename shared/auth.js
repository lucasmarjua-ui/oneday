import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { firebaseApp } from './firebase-config.js';

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const DATA_KEYS = ['oneday.character', 'oneday.progress', 'oneday.stats', 'oneday.achievements'];
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,16}$/;
let currentUser = null;
let listeners = [];
let syncing = false;

function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_PATTERN.test(username.trim());
}
function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@oneday.local`;
}
function readLocal() {
  return DATA_KEYS.reduce((data, key) => { const value = localStorage.getItem(key); if (value !== null) data[key] = value; return data; }, {});
}
function writeLocal(data) { Object.entries(data || {}).forEach(([key, value]) => localStorage.setItem(key, String(value))); }
function mergeJson(local, cloud, merger) {
  try { return JSON.stringify(merger(JSON.parse(local ?? '{}'), JSON.parse(cloud ?? '{}'))); }
  catch { return cloud ?? local ?? '{}'; }
}
function mergeProgress(local, cloud) {
  const eraIds = new Set([...Object.keys(local || {}), ...Object.keys(cloud || {})]);
  const result = {};
  eraIds.forEach(eraId => {
    const l = local?.[eraId] || {}; const c = cloud?.[eraId] || {};
    const accumulated = { ...(c.accumulated || {}) };
    Object.entries(l.accumulated || {}).forEach(([key, value]) => { accumulated[key] = Math.max(value || 0, accumulated[key] || 0); });
    result[eraId] = { accumulated, achievementsUnlocked: [...new Set([...(c.achievementsUnlocked || []), ...(l.achievementsUnlocked || [])])] };
  });
  return result;
}
function mergeCharacter(local, cloud) { return { ...(cloud || {}), ...(local || {}) }; }
function mergeStats(local, cloud) {
  const eraIds = new Set([...Object.keys(local || {}), ...Object.keys(cloud || {})]);
  const result = {};
  eraIds.forEach(eraId => {
    const l = local?.[eraId] || {}; const c = cloud?.[eraId] || {};
    result[eraId] = { daysPlayed: (l.daysPlayed || 0) + (c.daysPlayed || 0), objectivesCompleted: (l.objectivesCompleted || 0) + (c.objectivesCompleted || 0) };
  });
  return result;
}
function mergeAchievements(local, cloud) { return [...new Set([...(Array.isArray(cloud) ? cloud : []), ...(Array.isArray(local) ? local : [])])]; }
function mergeData(local, cloud) {
  return {
    'oneday.character': mergeJson(local['oneday.character'], cloud['oneday.character'], mergeCharacter),
    'oneday.progress': mergeJson(local['oneday.progress'], cloud['oneday.progress'], mergeProgress),
    'oneday.stats': mergeJson(local['oneday.stats'], cloud['oneday.stats'], mergeStats),
    'oneday.achievements': mergeJson(local['oneday.achievements'] ?? '[]', cloud['oneday.achievements'] ?? '[]', mergeAchievements),
  };
}
async function loadUserData(user) {
  const local = readLocal();
  const hasLocalProgress = Object.keys(local).length > 0;
  const snapshot = await getDoc(doc(db, 'users', user.uid));
  if (!snapshot.exists()) { await saveUserData(user); return; }
  const cloud = snapshot.data().data || {};
  const keepLocal = hasLocalProgress && window.confirm('Keep and merge your local progress with this account?');
  const merged = keepLocal ? mergeData(local, cloud) : cloud;
  writeLocal(merged);
  window.dispatchEvent(new CustomEvent('cloudsync', { detail: merged }));
  if (keepLocal) await setDoc(doc(db, 'users', user.uid), { data: merged, username: user.displayName }, { merge: true });
}
async function saveUserData(user = currentUser) {
  if (!user || syncing) return;
  syncing = true;
  try { await setDoc(doc(db, 'users', user.uid), { data: readLocal(), username: user.displayName, updatedAt: Date.now() }, { merge: true }); }
  catch (error) { console.warn('OneDay: cloud sync failed', error); }
  finally { syncing = false; }
}
export async function registerUser(username, password) {
  if (!isValidUsername(username)) { const error = new Error('Invalid username'); error.code = 'auth/invalid-username'; throw error; }
  const credential = await createUserWithEmailAndPassword(auth, usernameToEmail(username), password);
  await updateProfile(credential.user, { displayName: username.trim() });
  return credential;
}
export async function loginUser(username, password) {
  if (!isValidUsername(username)) { const error = new Error('Invalid username'); error.code = 'auth/invalid-username'; throw error; }
  return signInWithEmailAndPassword(auth, usernameToEmail(username), password);
}
export async function logoutUser() { return signOut(auth); }
export function getCurrentUser() { return currentUser; }
export function onUserChange(listener) { listeners.push(listener); listener(currentUser); return () => { listeners = listeners.filter(item => item !== listener); }; }
export function syncCurrentUser() { return saveUserData(); }
window.addEventListener('progresschange', () => saveUserData());
window.addEventListener('characterchange', () => saveUserData());
window.addEventListener('statschange', () => saveUserData());
window.addEventListener('achievementchange', () => saveUserData());
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) { try { await loadUserData(user); } catch (error) { console.warn('OneDay: failed to load progress', error); } }
  listeners.forEach(listener => listener(currentUser));
});
