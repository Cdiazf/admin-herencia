import { useEffect, useState } from "react";

import { createEvent, getEvents, getProducts } from "../services/api";

const initialEventForm = {
  name: "",
  product_id: ""
};

export default function EventsPage() {
  const [products, setProducts] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(initialEventForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadCatalog() {
    try {
      setError("");
      const [productsData, eventsData] = await Promise.all([getProducts(), getEvents()]);
      setProducts(productsData);
      setEvents(eventsData);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "product_id" && value !== "" ? Number(value) : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setError("");
      setMessage("");
      await createEvent({
        name: form.name,
        product_id: form.product_id || null
      });
      setForm(initialEventForm);
      setMessage("Evento creado");
      await loadCatalog();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <section className="page-card">
      <h2 className="h3 mb-2">Eventos</h2>
      <p className="text-body-secondary">Crea eventos aquí y luego aparecerán en el selector de la pestaña de ventas.</p>

      <form className="form-grid compact-grid" onSubmit={handleSubmit}>
        <input
          className="form-control"
          name="name"
          placeholder="Nombre del evento"
          value={form.name}
          onChange={handleChange}
          required
        />
        <select className="form-select" name="product_id" value={form.product_id} onChange={handleChange}>
          <option value="">Asociar producto</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">Crear evento</button>
      </form>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="mini-list">
        {events.map((item) => (
          <article key={item.id} className="mini-card shadow-sm">
            <strong>{item.name}</strong>
            <span>
              Producto: {products.find((product) => product.id === item.product_id)?.name || "Sin producto"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
