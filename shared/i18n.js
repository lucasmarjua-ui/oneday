const LANG_KEY = 'oneday.lang';
const SUPPORTED = ['en', 'es'];

let currentLang = (typeof localStorage !== 'undefined' && localStorage.getItem(LANG_KEY)) || 'en';
let strings = { en: {}, es: {} };
let listeners = [];
let loadPromise = null;

export function getLanguage() {
  return currentLang;
}

export function loadStrings() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    fetch('./data/i18n/en.json').then(response => response.json()),
    fetch('./data/i18n/es.json').then(response => response.json()),
  ]).then(([en, es]) => { strings = { en, es }; });
  return loadPromise;
}

export function setLanguage(lang) {
  if (!SUPPORTED.includes(lang) || lang === currentLang) return;
  currentLang = lang;
  if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang);
  listeners.forEach(listener => listener(lang));
}

export function onLanguageChange(listener) {
  listeners.push(listener);
  return () => { listeners = listeners.filter(item => item !== listener); };
}

export function t(key, vars) {
  let value = strings[currentLang]?.[key] ?? strings.en?.[key] ?? key;
  if (vars) Object.entries(vars).forEach(([name, replacement]) => { value = value.replace(`{${name}}`, replacement); });
  return value;
}

export function localize(field) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[currentLang] ?? field.en ?? Object.values(field)[0] ?? '';
}
