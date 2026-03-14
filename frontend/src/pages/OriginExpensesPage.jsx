import { useEffect, useMemo, useState } from "react";

import {
  createOriginExpense,
  deleteOriginExpense,
  getOriginExpenses,
  getOrigins,
  updateOriginExpense
} from "../services/api";

const initialForm = {
  origin_id: "",
  concept: "",
  amount: "",
  expense_date: new Date().toISOString().slice(0, 10),
  notes: ""
};

export default function OriginExpensesPage() {
  const [origins, setOrigins] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedOriginId, setSelectedOriginId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData(originId = selectedOriginId) {
    try {
      setError("");
      const [originsData, expensesData] = await Promise.all([
        getOrigins(),
        getOriginExpenses(originId || null)
      ]);
      setOrigins(originsData);
      setExpenses(expensesData);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleFilterChange(event) {
    const nextOriginId = event.target.value;
    setSelectedOriginId(nextOriginId);
    await loadData(nextOriginId);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "origin_id" && value !== "" ? Number(value) : name === "amount" && value !== "" ? Number(value) : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setError("");
      setMessage("");
      if (editingId) {
        await updateOriginExpense(editingId, {
          concept: form.concept,
          amount: Number(form.amount),
          expense_date: form.expense_date,
          notes: form.notes || ""
        });
        setMessage("Gasto actualizado");
      } else {
        await createOriginExpense({
          origin_id: Number(form.origin_id),
          concept: form.concept,
          amount: Number(form.amount),
          expense_date: form.expense_date,
          notes: form.notes || ""
        });
        setMessage("Gasto registrado");
      }
      setEditingId(null);
      setForm(initialForm);
      await loadData(selectedOriginId);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function handleEdit(expense) {
    setEditingId(expense.id);
    setMessage("");
    setError("");
    setForm({
      origin_id: expense.origin_id,
      concept: expense.concept,
      amount: expense.amount,
      expense_date: expense.expense_date,
      notes: expense.notes || ""
    });
  }

  async function handleDelete(expenseId) {
    try {
      setError("");
      setMessage("");
      await deleteOriginExpense(expenseId);
      if (editingId === expenseId) {
        setEditingId(null);
        setForm(initialForm);
      }
      setMessage("Gasto eliminado");
      await loadData(selectedOriginId);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function handleCancel() {
    setEditingId(null);
    setMessage("");
    setError("");
    setForm(initialForm);
  }

  const totalExpenses = useMemo(
    () => expenses.reduce((total, item) => total + Number(item.amount), 0),
    [expenses]
  );

  return (
    <section className="page-card">
      <h2 className="h3 mb-2">Gastos por Conferencia</h2>
      <p className="text-body-secondary">
        Registra los gastos de cada conferencia u origen para controlar inversion, egresos y rentabilidad.
      </p>

      <div className="catalog-section">
        <div className="dashboard-kpi-grid">
          <article className="dashboard-kpi-card dashboard-kpi-card--accent">
            <span>Total registrado</span>
            <strong>${totalExpenses.toFixed(2)}</strong>
            <small>{expenses.length} gasto(s) cargados</small>
          </article>
        </div>
      </div>

      <label className="field-stack">
        <span>Filtrar por conferencia</span>
        <select className="form-select search-input" value={selectedOriginId} onChange={handleFilterChange}>
          <option value="">Todas las conferencias</option>
          {origins.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <form className="form-grid compact-grid" onSubmit={handleSubmit}>
        <select className="form-select" name="origin_id" value={form.origin_id} onChange={handleChange} required>
          <option value="">Selecciona una conferencia</option>
          {origins.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input
          className="form-control"
          name="concept"
          placeholder="Concepto del gasto"
          value={form.concept}
          onChange={handleChange}
          required
        />
        <input
          className="form-control"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="Monto"
          value={form.amount}
          onChange={handleChange}
          required
        />
        <input
          className="form-control"
          name="expense_date"
          type="date"
          value={form.expense_date}
          onChange={handleChange}
          required
        />
        <textarea
          className="form-control"
          name="notes"
          placeholder="Notas u observaciones"
          value={form.notes}
          onChange={handleChange}
        />
        <button type="submit" className="btn btn-primary">
          {editingId ? "Guardar cambios" : "Registrar gasto"}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={handleCancel}>
          Limpiar
        </button>
      </form>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <table className="table table-striped table-hover align-middle desktop-only">
        <thead>
          <tr>
            <th>Conferencia</th>
            <th>Concepto</th>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Notas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 ? (
            <tr>
              <td colSpan="6">No hay gastos registrados.</td>
            </tr>
          ) : null}
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>{origins.find((item) => item.id === expense.origin_id)?.name || "Conferencia"}</td>
              <td>{expense.concept}</td>
              <td>{new Date(`${expense.expense_date}T00:00:00`).toLocaleDateString()}</td>
              <td>${Number(expense.amount).toFixed(2)}</td>
              <td>{expense.notes || "-"}</td>
              <td>
                <button type="button" className="btn btn-sm btn-outline-primary icon-button" onClick={() => handleEdit(expense)} title="Editar gasto" aria-label="Editar gasto">
                  <i className="bi bi-pencil-square" />
                </button>
                <button type="button" className="btn btn-sm btn-outline-danger icon-button" onClick={() => handleDelete(expense.id)} title="Eliminar gasto" aria-label="Eliminar gasto">
                  <i className="bi bi-trash" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mobile-only mobile-list">
        {expenses.length === 0 ? <p>No hay gastos registrados.</p> : null}
        {expenses.map((expense) => (
          <article key={expense.id} className="mini-card shadow-sm">
            <strong>{expense.concept}</strong>
            <span>Conferencia: {origins.find((item) => item.id === expense.origin_id)?.name || "Conferencia"}</span>
            <span>Fecha: {new Date(`${expense.expense_date}T00:00:00`).toLocaleDateString()}</span>
            <span>Monto: ${Number(expense.amount).toFixed(2)}</span>
            <span>Notas: {expense.notes || "-"}</span>
            <div>
              <button type="button" className="btn btn-sm btn-outline-primary icon-button" onClick={() => handleEdit(expense)} title="Editar gasto" aria-label="Editar gasto">
                <i className="bi bi-pencil-square" />
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger icon-button" onClick={() => handleDelete(expense.id)} title="Eliminar gasto" aria-label="Eliminar gasto">
                <i className="bi bi-trash" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
