import { useEffect, useState } from "react";

import { createPayment, getSales, markSaleNotInterested } from "../services/api";

export default function InitialCollectionsPage() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [paymentSale, setPaymentSale] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paid_at: "",
    amount: "",
    payment_method: "transferencia",
    notes: ""
  });
  const today = new Date().toISOString().slice(0, 10);

  async function loadSales() {
    try {
      setError("");
      const data = await getSales();
      setSales(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  function handlePaymentFormChange(event) {
    const { name, value } = event.target;
    setPaymentForm((current) => ({
      ...current,
      [name]: name === "amount" && value !== "" ? Number(value) : value
    }));
  }

  function openPaymentModal(sale) {
    setPaymentSale(sale);
    setPaymentForm({
      paid_at: today,
      amount: "",
      payment_method: "transferencia",
      notes: ""
    });
    setError("");
    setMessage("");
  }

  function isPaymentAmountInvalid() {
    if (!paymentSale) {
      return true;
    }

    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      return true;
    }

    return amount > paymentSale.remaining_initial;
  }

  async function handleSubmitPayment() {
    if (!paymentSale || isPaymentAmountInvalid()) {
      setError("Revisa el monto del pago inicial");
      return;
    }

    try {
      setError("");
      setMessage("");
      await createPayment({
        sale_id: paymentSale.id,
        applies_to: "initial",
        amount: Number(paymentForm.amount),
        currency: "USD",
        payment_method: paymentForm.payment_method || "transferencia",
        notes: paymentForm.notes || "",
        paid_at: `${paymentForm.paid_at || today}T12:00:00`
      });
      setPaymentSale(null);
      setMessage("Pago inicial registrado");
      await loadSales();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function handleMarkNotInterested(sale) {
    const confirmed = window.confirm(
      `Marcar a ${sale.first_name} ${sale.last_name} como no interesado?`
    );
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");
      await markSaleNotInterested(sale.id);
      setMessage("Cliente marcado como no interesado");
      await loadSales();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const activeSales = sales.filter(
    (sale) => sale.remaining_initial > 0 && sale.status !== "no_interesado"
  );

  const filteredSales = activeSales.filter((sale) => {
    const fullName = `${sale.first_name} ${sale.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  return (
    <section className="page-card">
      <h2 className="h3 mb-2">Cobro Inicial</h2>
      <p className="text-body-secondary">Registra abonos de inicial antes de que el cliente pase a cobranza.</p>

      <input
        className="search-input form-control"
        placeholder="Buscar por nombre o apellido"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <table className="table table-striped table-hover align-middle desktop-only">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Numero</th>
            <th>Producto</th>
            <th>Evento</th>
            <th>Inicial abonada</th>
            <th>Saldo inicial</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredSales.length === 0 ? (
            <tr>
              <td colSpan="9">No hay clientes pendientes de inicial.</td>
            </tr>
          ) : null}
          {filteredSales.map((sale) => {
            const canMarkNotInterested = sale.initial_paid > 0 && sale.remaining_initial > 0;

            return (
              <tr key={sale.id}>
                <td>{sale.first_name}</td>
                <td>{sale.last_name || "-"}</td>
                <td>{sale.phone}</td>
                <td>{sale.product_name}</td>
                <td>{sale.event_name || "-"}</td>
                <td>${sale.initial_paid.toFixed(2)}</td>
                <td>${sale.remaining_initial.toFixed(2)}</td>
                <td>{sale.status}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary icon-button"
                    onClick={() => openPaymentModal(sale)}
                    aria-label="Registrar inicial"
                    title="Registrar inicial"
                  >
                    <i className="bi bi-cash-stack" />
                  </button>
                  {canMarkNotInterested ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger icon-button"
                      onClick={() => handleMarkNotInterested(sale)}
                      aria-label="Marcar no interesado"
                      title="Marcar no interesado"
                    >
                      <i className="bi bi-person-x" />
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mobile-only mobile-list">
        {filteredSales.length === 0 ? <p>No hay clientes pendientes de inicial.</p> : null}
        {filteredSales.map((sale) => {
          const canMarkNotInterested = sale.initial_paid > 0 && sale.remaining_initial > 0;

          return (
            <article key={sale.id} className="card shadow-sm">
              <div className="card-body">
                <h3 className="h6 mb-3">
                  {sale.first_name} {sale.last_name}
                </h3>
                <ul className="list-group list-group-flush mb-3">
                  <li className="list-group-item px-0">
                    <strong>Producto:</strong> {sale.product_name}
                  </li>
                  <li className="list-group-item px-0">
                    <strong>Evento:</strong> {sale.event_name || "-"}
                  </li>
                  <li className="list-group-item px-0">
                    <strong>Saldo inicial:</strong> ${sale.remaining_initial.toFixed(2)}
                  </li>
                </ul>
                <div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary icon-button"
                    onClick={() => openPaymentModal(sale)}
                    aria-label="Registrar inicial"
                    title="Registrar inicial"
                  >
                    <i className="bi bi-cash-stack" />
                  </button>
                  {canMarkNotInterested ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger icon-button"
                      onClick={() => handleMarkNotInterested(sale)}
                      aria-label="Marcar no interesado"
                      title="Marcar no interesado"
                    >
                      <i className="bi bi-person-x" />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {paymentSale ? (
        <div className="modal-backdrop" onClick={() => setPaymentSale(null)}>
          <div className="modal-dialog-shell modal-dialog-shell-small" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card">
            <div className="modal-header">
              <h3>
                Cobro inicial: {paymentSale.first_name} {paymentSale.last_name}
              </h3>
              <button type="button" className="btn-close" onClick={() => setPaymentSale(null)} aria-label="Cerrar" />
            </div>

            <div className="modal-body-stack">
              <div className="mini-list mt-0">
                <article className="card">
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item px-0">Producto: {paymentSale.product_name}</li>
                      <li className="list-group-item px-0">Inicial pendiente: ${paymentSale.remaining_initial.toFixed(2)}</li>
                    </ul>
                  </div>
                </article>
              </div>

              <form className="form-grid compact-grid mt-0" onSubmit={(event) => event.preventDefault()}>
                <input
                  className="form-control"
                  type="date"
                  name="paid_at"
                  value={paymentForm.paid_at}
                  onChange={handlePaymentFormChange}
                />
                <input
                  className="form-control"
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0"
                  max={paymentSale.remaining_initial}
                  placeholder="Monto"
                  value={paymentForm.amount}
                  onChange={handlePaymentFormChange}
                />
                <select
                  className="form-select"
                  name="payment_method"
                  value={paymentForm.payment_method}
                  onChange={handlePaymentFormChange}
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                </select>
                <textarea
                  className="form-control"
                  name="notes"
                  placeholder="Comentario"
                  value={paymentForm.notes}
                  onChange={handlePaymentFormChange}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmitPayment}
                  disabled={isPaymentAmountInvalid()}
                >
                  Guardar pago inicial
                </button>
              </form>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
