import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nextPath = location.state?.from?.pathname || "/";

  if (!loading && isAuthenticated) {
    return <Navigate to={nextPath} replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      await login(form);
      navigate(nextPath, { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <span className="login-kicker">Pagos</span>
        <h1>Acceso al sistema</h1>
        <p className="login-copy">Ingresa con tu usuario para gestionar ventas y cobranza.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-stack">
            <span>Usuario</span>
            <input
              className="form-control"
              name="username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </label>
          <label className="field-stack">
            <span>Contrasena</span>
            <input
              className="form-control"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="error-text mb-0">{error}</p> : null}

          <button type="submit" className="btn btn-primary login-button" disabled={submitting}>
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="login-hint">
          <strong>Credenciales iniciales</strong>
          <span>admin / admin123</span>
          <span>usuario / usuario123</span>
        </div>
      </section>
    </main>
  );
}
