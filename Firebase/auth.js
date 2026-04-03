/* Firebase/auth.js
   Auth de administrador único con persistencia de sesión.
*/
(function authModule(global) {
  const gh = global.GHFirebase;

  function requireFirebaseAuth() {
    if (!gh || !gh.ready || !gh.auth) throw new Error('Firebase Auth no está disponible');
  }

  async function signInAdmin(email, password) {
    requireFirebaseAuth();
    await gh.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    const cred = await gh.auth.signInWithEmailAndPassword(email, password);
    if ((cred.user?.email || '').toLowerCase() !== gh.ADMIN_EMAIL) {
      await gh.auth.signOut();
      throw new Error('Solo el administrador autorizado puede iniciar sesión.');
    }
    return cred.user;
  }

  async function signOutAdmin() {
    requireFirebaseAuth();
    return gh.auth.signOut();
  }

  function onAuthChange(callback) {
    if (!gh.ready || !gh.auth) {
      callback(null);
      return () => {};
    }
    return gh.auth.onAuthStateChanged((user) => {
      if (!user || (user.email || '').toLowerCase() !== gh.ADMIN_EMAIL) {
        callback(null);
        return;
      }
      callback(user);
    });
  }

  global.GHAuth = {
    signInAdmin,
    signOutAdmin,
    onAuthChange
  };
})(window);