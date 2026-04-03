/* Firebase/config.js
   Inicialización centralizada de Firebase App/Auth/Firestore.
*/
(function initFirebaseConfig(global) {
  const DEFAULTS = {
    apiKey: 'REEMPLAZAR_API_KEY',
    authDomain: 'REEMPLAZAR.firebaseapp.com',
    projectId: 'REEMPLAZAR_PROJECT_ID',
    storageBucket: 'REEMPLAZAR.appspot.com',
    messagingSenderId: 'REEMPLAZAR_SENDER_ID',
    appId: 'REEMPLAZAR_APP_ID'
  };

  const ADMIN_EMAIL = 'gyozahouseadmin@gmail.com';
  const cfg = global.__GH_FIREBASE_CONFIG__ || DEFAULTS;
  const hasRealConfig = cfg.apiKey && !cfg.apiKey.startsWith('REEMPLAZAR_');

  const GHFirebase = {
    ADMIN_EMAIL,
    config: cfg,
    hasRealConfig,
    app: null,
    auth: null,
    db: null,
    ready: false
  };

  if (hasRealConfig && global.firebase) {
    GHFirebase.app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    GHFirebase.auth = firebase.auth();
    GHFirebase.db = firebase.firestore();
    GHFirebase.ready = true;
  } else {
    console.warn('[Gyoza] Firebase no está configurado. Usando fallback local temporal.');
  }

  global.GHFirebase = GHFirebase;
})(window);