import { useEffect, useState } from "react";

import { createUser, getUsers } from "../services/api";

const initialForm = {
  username: "",
  full_name: "",
  password: "",
  role: "user",
  is_active: true
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      setError("");
      const data = await getUsers();
      setUsers(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setError("");
      setMessage("");
      await createUser(form);
      setForm(initialForm);
      setMessage("Usuario creado");
      await loadUsers();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <section className="page-card">
      <h2 className="h3 mb-2">Usuarios</h2>
      <p className="text-body-secondary">Solo administradores pueden crear usuarios y asignar roles.</p>

      <form className="form-grid compact-grid" onSubmit={handleSubmit}>
        <input
          className="form-control"
          name="full_name"
          placeholder="Nombre completo"
          value={form.full_name}
          onChange={handleChange}
          required
        />
        <input
          className="form-control"
          name="username"
          placeholder="Usuario"
          value={form.username}
          onChange={handleChange}
          required
        />
        <input
          className="form-control"
          type="password"
          name="password"
          placeholder="Contrasena temporal"
          value={form.password}
          onChange={handleChange}
          required
        />
        <select className="form-select" name="role" value={form.role} onChange={handleChange}>
          <option value="user">Usuario</option>
          <option value="admin">Admin</option>
        </select>
        <label className="checkbox-row">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
          <span>Usuario activo</span>
        </label>
        <button type="submit" className="btn btn-primary">Crear usuario</button>
      </form>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="mini-list">
        {users.map((user) => (
          <article key={user.id} className="mini-card shadow-sm">
            <strong>{user.full_name}</strong>
            <span>@{user.username}</span>
            <span>Rol: {user.role}</span>
            <span>Estado: {user.is_active ? "activo" : "inactivo"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
