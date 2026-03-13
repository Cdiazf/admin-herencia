import { useEffect, useState } from "react";

import { createAdvisor, getAdvisors } from "../services/api";

const initialAdvisorForm = {
  name: ""
};

export default function AdvisorsPage() {
  const [advisors, setAdvisors] = useState([]);
  const [form, setForm] = useState(initialAdvisorForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAdvisors() {
    try {
      setError("");
      const data = await getAdvisors();
      setAdvisors(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadAdvisors();
  }, []);

  function handleChange(event) {
    setForm({ name: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setError("");
      setMessage("");
      await createAdvisor(form);
      setForm(initialAdvisorForm);
      setMessage("Vendedor creado");
      await loadAdvisors();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <section className="page-card">
      <h2 className="h3 mb-2">Vendedores</h2>
      <p className="text-body-secondary">Crea vendedores aquí y luego aparecerán en el selector de la pestaña de ventas.</p>

      <form className="form-grid compact-grid" onSubmit={handleSubmit}>
        <input
          className="form-control"
          name="name"
          placeholder="Nombre del vendedor"
          value={form.name}
          onChange={handleChange}
          required
        />
        <button type="submit" className="btn btn-primary">Crear vendedor</button>
      </form>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="mini-list">
        {advisors.map((advisor) => (
          <article key={advisor.id} className="mini-card shadow-sm">
            <strong>{advisor.name}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
