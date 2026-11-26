import { AcmeView } from '../components/acme-view.js';
import { users, CARGOS } from '../services/users.js';
import { auth } from '../services/auth.js';
import { toast } from '../components/acme-toast.js';
import { confirmDialog } from '../components/acme-confirm.js';
import { esc, readForm } from '../utils.js';

class UsersView extends AcmeView {
  #editingId = null;

  connectedCallback() {
    this.innerHTML = `
      <section class="page">
        <header class="page-head">
          <div>
            <h1 tabindex="-1">Gestión de usuarios</h1>
            <p class="muted">Crea, actualiza o elimina las personas que pueden ingresar al panel.</p>
          </div>
          <span class="badge" id="count" aria-live="polite"></span>
        </header>

        <div class="split">
          <div class="card">
            <h2>Usuarios registrados</h2>
            <acme-data-table id="table"></acme-data-table>
          </div>

          <div class="card sticky">
            <h2 id="form-title">Nuevo usuario</h2>
            <form id="form" novalidate>
              <div class="field">
                <label for="identificacion">Número de identificación</label>
                <input id="identificacion" name="identificacion" inputmode="numeric" required pattern="\\d{5,15}" maxlength="15" autocomplete="off">
                <small>Solo números (5 a 15 dígitos).</small>
              </div>
              <div class="field">
                <label for="nombre">Nombre completo</label>
                <input id="nombre" name="nombre" required minlength="3" maxlength="80" autocomplete="off">
              </div>
              <div class="field">
                <label for="email">Email</label>
                <input id="email" name="email" type="email" required autocomplete="off">
              </div>
              <div class="field">
                <label for="telefono">Teléfono</label>
                <input id="telefono" name="telefono" type="tel" inputmode="tel" required pattern="\\+?\\d{7,15}" autocomplete="off">
                <small>Entre 7 y 15 dígitos, puede iniciar con +.</small>
              </div>
              <div class="field">
                <label for="cargo">Cargo</label>
                <select id="cargo" name="cargo" required>
                  <option value="">Selecciona un cargo…</option>
                  ${CARGOS.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="password">Contraseña</label>
                <input id="password" name="password" type="password" minlength="6" autocomplete="new-password">
                <small id="pass-help">Mínimo 6 caracteres.</small>
              </div>
              <p id="msg" class="form-message" role="alert"></p>
              <div class="form-actions">
                <button class="btn btn-primary" type="submit" id="submit">Crear usuario</button>
                <button class="btn btn-ghost" type="button" id="cancel" hidden>Cancelar edición</button>
              </div>
            </form>
          </div>
        </div>
      </section>`;

    this.table = this.$('#table');
    this.table.caption = 'Usuarios registrados';
    this.table.emptyText = 'Aún no hay usuarios registrados.';
    this.table.columns = [
      { key: 'identificacion', label: 'Identificación' },
      { key: 'nombre', label: 'Nombre completo' },
      { key: 'email', label: 'Email' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'cargo', label: 'Cargo', render: (u) => `<span class="badge ${u.cargo === 'Docente' ? 'badge-teal' : ''}">${esc(u.cargo)}</span>` },
    ];
    this.table.addEventListener('row-action', (e) => this.#onAction(e.detail));
    this.$('#form').addEventListener('submit', (e) => this.#onSubmit(e));
    this.$('#cancel').addEventListener('click', () => this.#reset());
    this.#refresh();
  }

  #refresh() {
    const list = users.list();
    this.table.rows = list;
    this.table.selectedId = this.#editingId;
    this.$('#count').textContent = `${list.length} ${list.length === 1 ? 'usuario' : 'usuarios'}`;
  }

  #reset() {
    this.#editingId = null;
    const form = this.$('#form');
    form.reset();
    this.$('#form-title').textContent = 'Nuevo usuario';
    this.$('#submit').textContent = 'Crear usuario';
    this.$('#cancel').hidden = true;
    this.$('#password').required = true;
    this.$('#pass-help').textContent = 'Mínimo 6 caracteres.';
    this.setMessage(this.$('#msg'), '');
    this.table.selectedId = null;
  }

  #startEdit(user) {
    this.#editingId = user.id;
    const form = this.$('#form');
    ['identificacion', 'nombre', 'email', 'telefono', 'cargo'].forEach((k) => { form[k].value = user[k]; });
    form.password.value = '';
    form.password.required = false;
    this.$('#pass-help').textContent = 'Déjala en blanco para conservar la contraseña actual.';
    this.$('#form-title').textContent = `Editando: ${user.nombre}`;
    this.$('#submit').textContent = 'Actualizar usuario';
    this.$('#cancel').hidden = false;
    this.setMessage(this.$('#msg'), '');
    this.table.selectedId = user.id;
    form.nombre.focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async #onAction({ name, id }) {
    const user = users.get(id);
    if (!user) return;
    if (name === 'edit') return this.#startEdit(user);
    if (name === 'delete') {
      const ok = await confirmDialog({
        title: 'Eliminar usuario',
        message: `¿Seguro que deseas eliminar a ${user.nombre}? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar', danger: true,
      });
      if (!ok) return;
      try {
        users.remove(id, auth.current()?.id);
        if (this.#editingId === id) this.#reset();
        toast('Usuario eliminado.', 'success');
        this.#refresh();
      } catch (err) { toast(err.message, 'error'); }
    }
  }

  async #onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const msg = this.$('#msg');
    this.setMessage(msg, '');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = readForm(form);
    data.password = form.password.value; // sin recortar espacios
    try {
      if (this.#editingId) {
        await users.update(this.#editingId, data);
        toast('Usuario actualizado.', 'success');
      } else {
        await users.create(data);
        toast('Usuario creado.', 'success');
      }
      this.#reset();
      this.#refresh();
    } catch (err) {
      this.setMessage(msg, err.message);
    }
  }
}

customElements.define('users-view', UsersView);
