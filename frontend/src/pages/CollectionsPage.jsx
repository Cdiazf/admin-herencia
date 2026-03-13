import { useEffect, useState } from "react";

import { createPayment, getPayments, getSales, updatePayment } from "../services/api";

export default function CollectionsPage() {
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentSale, setPaymentSale] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paid_at: "",
    amount: "",
    payment_method: "transferencia",
    notes: ""
  });
  const [editPaymentForm, setEditPaymentForm] = useState({
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
      return data;
    } catch (loadError) {
      setError(loadError.message);
      return [];
    }
  }

  async function loadPayments() {
    try {
      const data = await getPayments();
      setPayments(data);
      return data;
    } catch (loadError) {
      setError(loadError.message);
      return [];
    }
  }

  useEffect(() => {
    loadSales();
    loadPayments();
  }, []);

  function handlePaymentFormChange(event) {
    const { name, value } = event.target;
    setPaymentForm((current) => ({
      ...current,
      [name]: name === "amount" && value !== "" ? Number(value) : value
    }));
  }

  function handleEditPaymentFormChange(event) {
    const { name, value } = event.target;
    setEditPaymentForm((current) => ({
      ...current,
      [name]: name === "amount" && value !== "" ? Number(value) : value
    }));
  }

  function parsePaymentNote(note) {
    if (!note || !note.startsWith("Aplicado a: ")) {
      return { appliedTo: "-", comment: note || "-" };
    }

    const body = note.replace("Aplicado a: ", "");
    if (body.includes(" | Comentario: ")) {
      const [appliedTo, comment] = body.split(" | Comentario: ");
      return {
        appliedTo: appliedTo || "-",
        comment: comment || "-"
      };
    }

    const legacyParts = body.split(". ");
    if (legacyParts.length > 1) {
      return {
        appliedTo: legacyParts[0] || "-",
        comment: legacyParts.slice(1).join(". ") || "-"
      };
    }

    return { appliedTo: body || "-", comment: "-" };
  }

  function getAppliedToTags(note) {
    const parsed = parsePaymentNote(note);
    if (!parsed.appliedTo || parsed.appliedTo === "-") {
      return [];
    }

    return parsed.appliedTo.split(", ").filter(Boolean);
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

  function openEditPaymentModal(payment) {
    const parsedNote = parsePaymentNote(payment.notes);
    setEditingPayment(payment);
    setEditPaymentForm({
      paid_at: payment.paid_at ? payment.paid_at.slice(0, 10) : today,
      amount: payment.amount,
      payment_method: payment.payment_method || "transferencia",
      notes: parsedNote.comment === "-" ? "" : parsedNote.comment
    });
    setError("");
    setMessage("");
  }

  async function handleSubmitPayment() {
    if (!paymentSale || !paymentForm.amount) {
      setError("Ingresa el monto del pago");
      return;
    }

    try {
      setError("");
      setMessage("");
      await createPayment({
        sale_id: paymentSale.id,
        applies_to: "balance",
        amount: Number(paymentForm.amount),
        currency: "USD",
        payment_method: paymentForm.payment_method || "transferencia",
        notes: paymentForm.notes || "",
        paid_at: `${paymentForm.paid_at || today}T12:00:00`
      });
      setMessage("Pago registrado");
      setPaymentSale(null);
      setPaymentForm({
        paid_at: today,
        amount: "",
        payment_method: "transferencia",
        notes: ""
      });
      await loadSales();
      await loadPayments();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function handleUpdatePayment() {
    if (!editingPayment) {
      return;
    }

    if (isEditPaymentInvalid()) {
      setError("Revisa el monto del pago");
      return;
    }

    try {
      setError("");
      setMessage("");
      await updatePayment(editingPayment.id, {
        amount: Number(editPaymentForm.amount),
        payment_method: editPaymentForm.payment_method || "transferencia",
        notes: editPaymentForm.notes || "",
        paid_at: `${editPaymentForm.paid_at || today}T12:00:00`
      });
      const updatedSales = await loadSales();
      await loadPayments();
      if (selectedSale) {
        const refreshedSale = updatedSales.find((sale) => sale.id === selectedSale.id);
        if (refreshedSale) {
          setSelectedSale(refreshedSale);
        }
      }
      setEditingPayment(null);
      setMessage("Pago actualizado");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function getMentorProgress(sale) {
    if (sale.product_name !== "Mentor") {
      return { currentInstallment: "-", remainingInstallments: "-" };
    }

    const currentInstallment = sale.installments.find(
      (item) => item.status !== "pagado"
    );
    const remainingInstallments = sale.installments.filter(
      (item) => item.status !== "pagado"
    ).length;

    return {
      currentInstallment: currentInstallment ? `Cuota ${currentInstallment.number}` : "Pagado",
      remainingInstallments
    };
  }

  function getSalePayments(saleId) {
    return payments
      .filter((payment) => payment.sale_id === saleId)
      .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
  }

  function getCollectionPayments(saleId) {
    return getSalePayments(saleId).filter((payment) => payment.applies_to === "balance");
  }

  function isOverdue(sale) {
    const todayDate = new Date();
    return sale.installments.some((item) => {
      if (item.status === "pagado") {
        return false;
      }
      return new Date(item.due_date) < todayDate;
    });
  }

  function isHighBalance(sale) {
    return sale.remaining_balance >= 1000;
  }

  function getUpcomingAlert(sale) {
    if (sale.product_name !== "Mentor" || sale.remaining_initial > 0) {
      return null;
    }

    const salePayments = getSalePayments(sale.id);
    if (salePayments.length === 0) {
      return null;
    }

    const lastPaymentDate = new Date(salePayments[0].paid_at);
    const nextPaymentDate = new Date(lastPaymentDate);
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(
      nextPaymentDate.getFullYear(),
      nextPaymentDate.getMonth(),
      nextPaymentDate.getDate()
    );
    const diffDays = Math.ceil((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));
    const formattedDate = nextPaymentDate.toLocaleDateString();

    if (diffDays >= 0) {
      return `Proximo pago en ${diffDays} dia${diffDays === 1 ? "" : "s"} (${formattedDate})`;
    }

    const overdueDays = Math.abs(diffDays);
    return `Vencido hace ${overdueDays} dia${overdueDays === 1 ? "" : "s"} (${formattedDate})`;
  }

  function isPaymentAmountInvalid() {
    if (!paymentSale) {
      return true;
    }

    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      return true;
    }

    return amount > paymentSale.remaining_balance;
  }

  function isEditPaymentInvalid() {
    if (!editingPayment) {
      return true;
    }

    const amount = Number(editPaymentForm.amount);
    if (!amount || amount <= 0) {
      return true;
    }

    const editableLimit = Number(editingPayment.amount) + Number(editingPayment.sale_remaining_balance || 0);
    return amount > editableLimit;
  }

  const filteredSales = sales.filter((sale) => {
    if (
      sale.product_name !== "Mentor" ||
      sale.remaining_initial > 0 ||
      sale.remaining_balance <= 0 ||
      sale.status === "no_interesado"
    ) {
      return false;
    }

    const fullName = `${sale.first_name} ${sale.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  return (
    <section className="page-card">
      <h2 className="h3 mb-2">Cobranza</h2>
      <p className="text-body-secondary">Solo se muestran mentores con inicial completa para registrar pagos de cobranza.</p>

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
            <th>Pagos realizados</th>
            <th>Saldo faltante</th>
            <th>Alerta</th>
            <th>Cuota actual</th>
            <th>Cuotas faltantes</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredSales.length === 0 ? (
            <tr>
              <td colSpan="10">No se encontraron personas.</td>
            </tr>
          ) : null}
          {filteredSales.map((sale) => {
            const mentorProgress = getMentorProgress(sale);
            const overdue = isOverdue(sale);
            const highBalance = isHighBalance(sale);
            const upcomingAlert = getUpcomingAlert(sale);
            const rowClassName = overdue ? "row-overdue" : highBalance ? "row-high-balance" : "";

            return (
              <tr key={sale.id} className={rowClassName}>
                <td>{sale.first_name}</td>
                <td>{sale.last_name || "-"}</td>
                <td>{sale.phone}</td>
                <td>${sale.total_paid.toFixed(2)}</td>
                <td>
                  <div className="table-status-stack">
                    <span className="table-amount">${sale.remaining_balance.toFixed(2)}</span>
                    {overdue ? <div className="status-chip badge text-bg-warning">Cuota vencida</div> : null}
                    {!overdue && highBalance ? <div className="status-chip badge text-bg-info">Saldo alto</div> : null}
                  </div>
                </td>
                <td>
                  {upcomingAlert ? <div className="status-chip badge text-bg-success">{upcomingAlert}</div> : "-"}
                </td>
                <td>{mentorProgress.currentInstallment}</td>
                <td>{mentorProgress.remainingInstallments}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary icon-button"
                    onClick={() => openPaymentModal(sale)}
                    disabled={sale.remaining_balance <= 0}
                    aria-label="Agregar pago"
                    title="Agregar pago"
                  >
                    <i className="bi bi-cash-stack" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary icon-button"
                    onClick={() => setSelectedSale(sale)}
                    aria-label="Ver historial de cobranza"
                    title="Ver historial de cobranza"
                  >
                    <i className="bi bi-clock-history" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mobile-only mobile-list">
        {filteredSales.length === 0 ? <p>No se encontraron personas.</p> : null}
        {filteredSales.map((sale) => {
          const mentorProgress = getMentorProgress(sale);
          const overdue = isOverdue(sale);
          const highBalance = isHighBalance(sale);
          const upcomingAlert = getUpcomingAlert(sale);
          const cardClassName = overdue ? "row-overdue" : highBalance ? "row-high-balance" : "";

          return (
            <article key={sale.id} className={`card shadow-sm ${cardClassName}`}>
              <div className="card-body">
                <h3 className="h6 mb-3">
                  {sale.first_name} {sale.last_name}
                </h3>
                <ul className="list-group list-group-flush mb-3">
                  <li className="list-group-item px-0">
                    <strong>Evento:</strong> {sale.event_name || sale.product_name}
                  </li>
                  <li className="list-group-item px-0">
                    <strong>Alerta:</strong>{" "}
                    {upcomingAlert ? (
                      <span className="badge text-bg-success">{upcomingAlert}</span>
                    ) : overdue ? (
                      <span className="badge text-bg-warning">Cuota vencida</span>
                    ) : highBalance ? (
                      <span className="badge text-bg-info">Saldo alto</span>
                    ) : (
                      "-"
                    )}
                  </li>
                  <li className="list-group-item px-0">
                    <strong>Cuota:</strong> {mentorProgress.currentInstallment}
                  </li>
                </ul>
                <div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary icon-button"
                    onClick={() => openPaymentModal(sale)}
                    disabled={sale.remaining_balance <= 0}
                    aria-label="Agregar pago"
                    title="Agregar pago"
                  >
                    <i className="bi bi-cash-stack" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary icon-button"
                    onClick={() => setSelectedSale(sale)}
                    aria-label="Ver historial de cobranza"
                    title="Ver historial de cobranza"
                  >
                    <i className="bi bi-clock-history" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {selectedSale ? (
        <div className="modal-backdrop" onClick={() => setSelectedSale(null)}>
          <div className="modal-dialog-shell" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card">
            <div className="modal-header">
              <h3>
                Historial de cobranza: {selectedSale.first_name} {selectedSale.last_name}
              </h3>
              <button type="button" className="btn-close" onClick={() => setSelectedSale(null)} aria-label="Cerrar" />
            </div>

            <div className="modal-body-stack">
              <div className="mini-list mt-0">
                <article className="card">
                  <div className="card-body">
                    <strong className="d-block mb-2">Resumen</strong>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item px-0">Evento: {selectedSale.event_name || selectedSale.product_name}</li>
                      <li className="list-group-item px-0">Pagado en cobranza: ${getCollectionPayments(selectedSale.id).reduce((total, payment) => total + Number(payment.amount), 0).toFixed(2)}</li>
                      <li className="list-group-item px-0">Saldo pendiente: ${selectedSale.remaining_balance.toFixed(2)}</li>
                    </ul>
                  </div>
                </article>
              </div>

              <table className="table table-striped table-hover align-middle">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Aplicado a</th>
                    <th>Monto</th>
                    <th>Medio</th>
                    <th>Observacion</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getCollectionPayments(selectedSale.id).length === 0 ? (
                    <tr>
                      <td colSpan="7">No hay pagos de cobranza registrados.</td>
                    </tr>
                  ) : null}
                  {getCollectionPayments(selectedSale.id).map((payment) => {
                    const parsedNote = parsePaymentNote(payment.notes);
                    const appliedTags = getAppliedToTags(payment.notes);

                    return (
                      <tr key={payment.id}>
                        <td>{new Date(payment.paid_at).toLocaleDateString()}</td>
                        <td>Cobranza</td>
                        <td>
                          {appliedTags.length ? (
                            <div className="payment-tags">
                              {appliedTags.map((tag) => (
                                <span key={`${payment.id}-${tag}`} className="payment-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            parsedNote.appliedTo
                          )}
                        </td>
                        <td>${payment.amount.toFixed(2)}</td>
                        <td>{payment.payment_method}</td>
                        <td>{parsedNote.comment}</td>
                        <td>
                          {payment.applies_to === "balance" ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary icon-button"
                              onClick={() =>
                                openEditPaymentModal({
                                  ...payment,
                                  sale_remaining_balance: selectedSale.remaining_balance
                                })
                              }
                              aria-label="Editar pago"
                              title="Editar pago"
                            >
                              <i className="bi bi-pencil" />
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {paymentSale ? (
        <div className="modal-backdrop" onClick={() => setPaymentSale(null)}>
          <div className="modal-dialog-shell modal-dialog-shell-small" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card">
            <div className="modal-header">
              <h3>
                Agregar pago: {paymentSale.first_name} {paymentSale.last_name}
              </h3>
              <button type="button" className="btn-close" onClick={() => setPaymentSale(null)} aria-label="Cerrar" />
            </div>

            <div className="modal-body-stack">
              <div className="mini-list mt-0">
                <article className="card">
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item px-0">Saldo pendiente: ${paymentSale.remaining_balance.toFixed(2)}</li>
                      <li className="list-group-item px-0">Evento: {paymentSale.event_name || paymentSale.product_name}</li>
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
                  max={paymentSale.remaining_balance}
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
                  Guardar pago
                </button>
              </form>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingPayment ? (
        <div className="modal-backdrop" onClick={() => setEditingPayment(null)}>
          <div className="modal-dialog-shell modal-dialog-shell-small" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card">
            <div className="modal-header">
              <h3>Editar pago de cobranza</h3>
              <button type="button" className="btn-close" onClick={() => setEditingPayment(null)} aria-label="Cerrar" />
            </div>

            <div className="modal-body-stack">
              <div className="mini-list mt-0">
                <article className="card">
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item px-0">Monto actual: ${Number(editingPayment.amount).toFixed(2)}</li>
                      <li className="list-group-item px-0">
                        Maximo permitido: $
                        {(Number(editingPayment.amount) + Number(editingPayment.sale_remaining_balance || 0)).toFixed(2)}
                      </li>
                    </ul>
                  </div>
                </article>
              </div>

              <form className="form-grid compact-grid mt-0" onSubmit={(event) => event.preventDefault()}>
                <input
                  className="form-control"
                  type="date"
                  name="paid_at"
                  value={editPaymentForm.paid_at}
                  onChange={handleEditPaymentFormChange}
                />
                <input
                  className="form-control"
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0"
                  max={Number(editingPayment.amount) + Number(editingPayment.sale_remaining_balance || 0)}
                  placeholder="Monto"
                  value={editPaymentForm.amount}
                  onChange={handleEditPaymentFormChange}
                />
                <select
                  className="form-select"
                  name="payment_method"
                  value={editPaymentForm.payment_method}
                  onChange={handleEditPaymentFormChange}
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
                  value={editPaymentForm.notes}
                  onChange={handleEditPaymentFormChange}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdatePayment}
                  disabled={isEditPaymentInvalid()}
                >
                  Guardar cambios
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
