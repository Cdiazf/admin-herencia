import { useEffect, useState } from "react";

import { createOrigin, getOrigins } from "../services/api";

const initialOriginForm = {
  name: ""
};

export default function OriginsPage() {
  const [origins, setOrigins] = useState([]);
  const [form, setForm] = useState(initialOriginForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadOrigins() {
    try {
      setError("");
      const data = await getOrigins();
      setOrigins(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadOrigins();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setError("");
      setMessage("");
      await createOrigin(form);
      setForm(initialOriginForm);
      setMessage("Origen creado");
      await loadOrigins();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <section className="page-card">
      <h2 className="h3 mb-2">Origenes</h2>
      <p className="text-body-secondary">Crea origenes aquí y luego aparecerán en el selector de ventas.</p>

      <form className="form-grid compact-grid" onSubmit={handleSubmit}>
        <input
          className="form-control"
          name="name"
          placeholder="Nombre del origen"
          value={form.name}
          onChange={(event) => setForm({ name: event.target.value })}
          required
        />
        <button type="submit" className="btn btn-primary">Crear origen</button>
      </form>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="mini-list">
        {origins.map((origin) => (
          <article key={origin.id} className="mini-card shadow-sm">
            <strong>{origin.name}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
