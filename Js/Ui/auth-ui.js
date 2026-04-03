/* UI de autenticación para administrador único */
(function authUI(global){
  function qs(id){ return document.getElementById(id); }

  function setAppLocked(locked) {
    qs('auth-screen').style.display = locked ? 'flex' : 'none';
    qs('app-shell').style.display = locked ? 'none' : 'block';
  }

  function setAuthMsg(msg, type = 'err') {
    const el = qs('auth-alert');
    el.innerHTML = msg ? `<div class="alert alert-${type}">${msg}</div>` : '';
  }

  async function doLogin(ev) {
    ev.preventDefault();
    const email = qs('auth-email').value.trim().toLowerCase();
    const pass  = qs('auth-pass').value;

    if (email !== GHFirebase.ADMIN_EMAIL) {
      setAuthMsg('Correo no autorizado para esta instalación.');
      return;
    }

    try {
      await GHAuth.signInAdmin(email, pass);
      setAuthMsg('');
    } catch (err) {
      setAuthMsg(err.message || 'No se pudo iniciar sesión');
    }
  }

  async function doLogout() {
    try {
      await GHAuth.signOutAdmin();
    } catch (err) {
      console.error(err);
    }
  }

  function renderSession(user) {
    const emailEl = qs('session-email');
    if (emailEl) emailEl.textContent = user?.email || 'Sin sesión';
  }

  async function bootAppWithAuth() {
    qs('auth-form').addEventListener('submit', doLogin);
    qs('btn-logout').addEventListener('click', doLogout);

    GHAuth.onAuthChange(async (user) => {
      const validUser = !!user;
      setAppLocked(!validUser);
      renderSession(user);

      if (!validUser) {
        setAuthMsg('Inicia sesión como administrador para continuar.', 'err');
        return;
      }

      setAuthMsg('');
      await bootstrapState();
      if (!prods.length) cargarMenuInicial();
      goTo('dashboard');
      if (!cajaActual && !cajaHistorial.length) {
        setTimeout(() => abrirModalApertura(), 600);
      }
      renderVentas();
    });

    if (!GHFirebase.ready) {
      setAuthMsg('Firebase no configurado. Completa __GH_FIREBASE_CONFIG__ en index.html.', 'err');
    }
  }

  global.bootAppWithAuth = bootAppWithAuth;
})(window);