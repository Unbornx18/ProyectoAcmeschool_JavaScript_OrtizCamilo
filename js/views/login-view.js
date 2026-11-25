import { AcmeView } from '../components/acme-view.js';
import { auth } from '../services/auth.js';
import { DEMO_ADMIN } from '../services/seed.js';
import { toast } from '../components/acme-toast.js';
import { navigate } from '../router.js';
import { esc } from '../utils.js';

class LoginView extends AcmeView {
  connectedCallback() {
    this.innerHTML = `
      <section class="page narrow auth-page">
        <div class="card auth-card">
          <div class="auth-icon" aria-hidden="true">🔐</div>
          <h1 tabindex="-1">Iniciar sesión</h1>
          <p class="muted">Acceso para personal administrativo y docentes de Acme School.</p>

          <form id="login-form" novalidate>
            <div class="field">
              <label for="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autocomplete="username" required placeholder="usuario@acme.edu">
            </div>
            <div class="field">
              <label for="password">Contraseña</label>
              <div class="input-group">
                <input id="password" name="password" type="password" autocomplete="current-password" required minlength="6">
                <button type="button" class="btn btn-ghost btn-sm" id="toggle-pass" aria-pressed="false">Mostrar</button>
              </div>
            </div>
            <p id="msg" class="form-message" role="alert"></p>
            <button class="btn btn-primary btn-block" type="submit">Ingresar</button>
          </form>

          <aside class="hint" aria-label="Credenciales de demostración">
            <strong>Cuenta de demostración</strong>
            <span>Correo: <code>${esc(DEMO_ADMIN.email)}</code></span>
            <span>Contraseña: <code>${esc(DEMO_ADMIN.password)}</code></span>
          </aside>
          <p class="center"><a href="#/">← Volver a los exámenes</a></p>
        </div>
      </section>`;

    const form = this.$('#login-form');
    const msg = this.$('#msg');
    const pass = this.$('#password');

    this.$('#toggle-pass').addEventListener('click', (e) => {
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      e.currentTarget.textContent = show ? 'Ocultar' : 'Mostrar';
      e.currentTarget.setAttribute('aria-pressed', String(show));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.setMessage(msg, '');
      if (!form.email.value.trim() || !form.password.value) {
        this.setMessage(msg, 'Ingresa tu correo y contraseña.');
        (form.email.value.trim() ? form.password : form.email).focus();
        return;
      }
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const user = await auth.login(form.email.value, form.password.value);
        toast(`¡Bienvenido, ${user.nombre.split(' ')[0]}!`, 'success');
        const target = sessionStorage.getItem('acme:redirect') || '/admin/examenes';
        sessionStorage.removeItem('acme:redirect');
        navigate(target);
      } catch (err) {
        this.setMessage(msg, err.message);
        form.password.select();
      } finally {
        btn.disabled = false;
      }
    });
  }
}

customElements.define('login-view', LoginView);