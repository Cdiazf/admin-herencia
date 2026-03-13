import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import SalesTable from "../components/tables/SalesTable";
import {
  createSale,
  deleteSale,
  getAdvisors,
  getEvents,
  getOrigins,
  getProducts,
  getSales,
  updateSale
} from "../services/api";

const initialForm = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  advisor_name: "",
  product_name: "Mentor",
  product_price_total: 2500,
  initial_required: 1000,
  installment_count: 12,
  event_name: "",
  origin: "agosto",
  agreed_amount: 2500,
  discount: 0,
  initial_paid: 0,
  comments: ""
};

export default function SalesPage() {
  const { isAdmin } = useAuth();
  const [advisors, setAdvisors] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);

  async function loadSales() {
    try {
      setLoading(true);
      setError("");
      const data = await getSales();
      setRows(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalog() {
    try {
      const [advisorsData, originsData, productsData, eventsData] = await Promise.all([
        getAdvisors(),
        getOrigins(),
        getProducts(),
        getEvents()
      ]);
      setAdvisors(advisorsData);
      setOrigins(originsData);
      setProducts(productsData);
      setEvents(eventsData);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadSales();
    loadCatalog();
  }, []);

  function buildFinancialState(product, discountValue, currentInitialPaid = 0) {
    if (!product) {
      return null;
    }

    const discount = Number(discountValue) || 0;
    const basePrice = Number(product.price_total) || 0;
    const agreedAmount = Math.max(basePrice - discount, 0);
    const isRetiro = product.name.toLowerCase() === "retiro";
    const initialRequired = isRetiro ? agreedAmount : Number(product.initial_required) || 0;
    const maxInitialPaid = Math.min(Number(currentInitialPaid) || 0, initialRequired);

    return {
      product_name: product.name,
      product_price_total: basePrice,
      initial_required: initialRequired,
      installment_count: isRetiro ? 0 : Number(product.installment_count) || 0,
      agreed_amount: agreedAmount,
      initial_paid: maxInitialPaid
    };
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const numericFields = new Set(["discount", "initial_paid"]);

    if (name === "discount") {
      setForm((current) => {
        const selectedProduct = products.find((item) => item.name === current.product_name);
        const financialState = buildFinancialState(selectedProduct, value, current.initial_paid);
        return {
          ...current,
          discount: Number(value),
          ...(financialState || {})
        };
      });
      return;
    }

    if (name === "initial_paid") {
      setForm((current) => ({
        ...current,
        initial_paid: Number(value)
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: numericFields.has(name) ? Number(value) : value
    }));
  }

  function handleProductChange(event) {
    const { value } = event.target;
    const selectedProduct = products.find((item) => item.name === value);
    const financialState = buildFinancialState(selectedProduct, form.discount, form.initial_paid);

    setForm((current) => ({
      ...current,
      ...(financialState || { product_name: value })
    }));
  }

  function handleEventSelectChange(event) {
    const selectedEventId = Number(event.target.value);
    const selectedEvent = events.find((item) => item.id === selectedEventId);
    if (!selectedEvent) {
      setForm((current) => ({ ...current, event_name: "" }));
      return;
    }

    const linkedProduct = products.find((item) => item.id === selectedEvent.product_id);
    const financialState = buildFinancialState(linkedProduct, form.discount, form.initial_paid);
    setForm((current) => ({
      ...current,
      event_name: selectedEvent.name,
      ...(financialState || {})
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setError("");
      setMessage("");
      if (editingId) {
        await updateSale(editingId, form);
        setMessage("Venta actualizada");
      } else {
        await createSale(form);
        setMessage("Venta registrada");
      }
      setEditingId(null);
      setForm(initialForm);
      await loadSales();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function handleEdit(row) {
    const [firstName = "", ...lastNameParts] = row.customer_name.split(" ");
    setEditingId(row.id);
    setMessage("");
    setError("");
    setForm({
      first_name: firstName,
      last_name: lastNameParts.join(" "),
      phone: row.phone,
      email: row.email || "",
      advisor_name: row.advisor_name,
      product_name: row.product_name,
      product_price_total: row.agreed_amount + row.discount,
      initial_required: row.initial_required,
      installment_count: row.installment_count,
      event_name: row.event_name || "",
      origin: row.origin,
      agreed_amount: row.agreed_amount,
      discount: row.discount,
      initial_paid: row.initial_paid,
      comments: row.comments || ""
    });
  }

  async function handleDelete(saleId) {
    try {
      setError("");
      setMessage("");
      await deleteSale(saleId);
      if (editingId === saleId) {
        setEditingId(null);
        setForm(initialForm);
      }
      setMessage("Venta eliminada");
      await loadSales();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function handleCancel() {
    setEditingId(null);
    setError("");
    setMessage("");
    setForm(initialForm);
  }

  const filteredRows = rows.filter((row) => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return true;
    }

    const customerName = row.customer_name.toLowerCase();
    const phone = row.phone.toLowerCase();
    return customerName.includes(term) || phone.includes(term);
  });

  return (
    <section className="page-card">
      <h2 className="h3 mb-2">Ventas</h2>
      <p className="text-body-secondary">Registra la venta y escoge el evento; el producto, monto e inicial se cargan automaticamente.</p>

      <form className="sales-form-shell" onSubmit={handleSubmit}>
        <section className="sales-form-panel">
          <div className="sales-form-panel__header">
            <div>
              <span className="sales-form-kicker">Cliente</span>
              <h3>Datos de contacto</h3>
            </div>
            <p>Completa la informacion base del prospecto o cliente.</p>
          </div>

          <div className="form-grid sales-form-grid">
            <label className="field-stack">
              <span>Nombres</span>
              <input className="form-control" name="first_name" value={form.first_name} onChange={handleChange} required />
            </label>
            <label className="field-stack">
              <span>Apellidos</span>
              <input className="form-control" name="last_name" value={form.last_name} onChange={handleChange} />
            </label>
            <label className="field-stack">
              <span>Celular</span>
              <input className="form-control" name="phone" value={form.phone} onChange={handleChange} required />
            </label>
            <label className="field-stack">
              <span>Correo</span>
              <input className="form-control" name="email" type="email" value={form.email} onChange={handleChange} />
            </label>
          </div>
        </section>

        <section className="sales-form-panel">
          <div className="sales-form-panel__header">
            <div>
              <span className="sales-form-kicker">Venta</span>
              <h3>Configuracion comercial</h3>
            </div>
            <p>El evento define el producto, y el sistema calcula automaticamente los montos.</p>
          </div>

          <div className="form-grid sales-form-grid">
            <label className="field-stack">
              <span>Vendedor</span>
              <select className="form-select" name="advisor_name" value={form.advisor_name} onChange={handleChange} required>
                <option value="">Selecciona un vendedor</option>
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.name}>
                    {advisor.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-stack">
              <span>Evento</span>
              <select
                className="form-select"
                value={events.find((item) => item.name === form.event_name)?.id || ""}
                onChange={handleEventSelectChange}
                required
              >
                <option value="">Selecciona un evento</option>
                {events.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-stack">
              <span>Producto asignado</span>
              <input className="form-control sales-readonly-input" value={form.product_name} readOnly />
            </label>

            <label className="field-stack">
              <span>Origen</span>
              <select className="form-select" name="origin" value={form.origin} onChange={handleChange} required>
                <option value="">Selecciona un origen</option>
                {origins.map((origin) => (
                  <option key={origin.id} value={origin.name}>
                    {origin.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-stack">
              <span>Descuento</span>
              <input
                className="form-control"
                name="discount"
                type="number"
                step="0.01"
                min="0"
                value={form.discount}
                onChange={handleChange}
              />
            </label>

            <label className="field-stack">
              <span>Abono inicial</span>
              <input
                className="form-control"
                name="initial_paid"
                type="number"
                step="0.01"
                value={form.initial_paid}
                onChange={handleChange}
                required
              />
            </label>

            <label className="field-stack sales-form-grid-full">
              <span>Comentarios</span>
              <textarea className="form-control" name="comments" value={form.comments} onChange={handleChange} placeholder="Observaciones de la venta" />
            </label>
          </div>
        </section>

        <section className="sales-finance-panel">
          <div className="sales-form-panel__header sales-form-panel__header--compact">
            <div>
              <span className="sales-form-kicker">Resumen</span>
              <h3>Montos calculados</h3>
            </div>
            <p>Estos valores se actualizan segun el evento, producto y descuento aplicado.</p>
          </div>

          <div className="sales-finance-grid">
            <article className="sales-finance-card">
              <span>Precio lista</span>
              <strong>${Number(form.product_price_total || 0).toFixed(2)}</strong>
            </article>
            <article className="sales-finance-card">
              <span>Descuento aplicado</span>
              <strong>${Number(form.discount || 0).toFixed(2)}</strong>
            </article>
            <article className="sales-finance-card sales-finance-card--accent">
              <span>Total a cobrar</span>
              <strong>${Number(form.agreed_amount || 0).toFixed(2)}</strong>
            </article>
            <article className="sales-finance-card">
              <span>Inicial requerida</span>
              <strong>${Number(form.initial_required || 0).toFixed(2)}</strong>
            </article>
            <article className="sales-finance-card">
              <span>Plan de cuotas</span>
              <strong>{form.installment_count ? `${form.installment_count} cuotas` : "Sin cuotas"}</strong>
            </article>
          </div>

          <div className="sales-form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? "Guardar cambios" : "Registrar venta"}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={handleCancel}>
              Limpiar
            </button>
          </div>
        </section>
      </form>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <input
        className="search-input form-control"
        placeholder="Buscar por nombre o telefono"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? <p>Cargando ventas...</p> : (
        <>
          <SalesTable rows={filteredRows} onEdit={handleEdit} onDelete={handleDelete} canDelete={isAdmin} />

          <div className="mobile-only mobile-sales-list">
            {filteredRows.length === 0 ? <p>No hay ventas registradas.</p> : null}
            {filteredRows.map((row) => (
              <article key={row.id} className="sales-mobile-card">
                <div className="sales-mobile-card__header">
                  <div>
                    <strong>{row.customer_name}</strong>
                    <span>#{row.id}</span>
                  </div>
                  <span className="status-chip chip-info">{row.status}</span>
                </div>

                <div className="sales-mobile-card__grid">
                  <span><strong>Telefono:</strong> {row.phone}</span>
                  <span><strong>Asesor:</strong> {row.advisor_name}</span>
                  <span><strong>Producto:</strong> {row.product_name}</span>
                  <span><strong>Evento:</strong> {row.event_name || "-"}</span>
                  <span><strong>Inicial:</strong> ${row.initial_paid.toFixed(2)}</span>
                  <span><strong>Saldo inicial:</strong> ${row.remaining_initial.toFixed(2)}</span>
                  <span><strong>Mensualidad:</strong> ${row.monthly_amount.toFixed(2)}</span>
                </div>

                <div className="sales-mobile-card__actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleEdit(row)}
                  >
                    Editar
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(row.id)}
                    >
                      Eliminar
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
