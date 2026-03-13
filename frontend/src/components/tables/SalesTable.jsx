export default function SalesTable({ rows, onEdit, onDelete, canDelete }) {
  function getStatusClass(status) {
    if (status === "no_interesado") {
      return "status-chip chip-danger";
    }

    if (status === "pendiente_inicial") {
      return "status-chip chip-warn";
    }

    return "status-chip chip-info";
  }

  function formatStatus(status) {
    return status
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return (
    <table className="table table-striped table-hover align-middle desktop-only">
      <thead>
        <tr>
          <th>ID</th>
          <th>Cliente</th>
          <th>Celular</th>
          <th>Asesor</th>
          <th>Producto</th>
          <th>Evento</th>
          <th>Inicial</th>
          <th>Saldo Inicial</th>
          <th>Mensualidad</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan="11">No hay ventas registradas.</td>
          </tr>
        ) : null}
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.id}</td>
            <td>{row.customer_name}</td>
            <td>{row.phone}</td>
            <td>{row.advisor_name}</td>
            <td>{row.product_name}</td>
            <td>{row.event_name || "-"}</td>
            <td>${row.initial_paid.toFixed(2)}</td>
            <td>${row.remaining_initial.toFixed(2)}</td>
            <td>${row.monthly_amount.toFixed(2)}</td>
            <td>
              <span className={getStatusClass(row.status)}>{formatStatus(row.status)}</span>
            </td>
            <td>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary icon-button"
                onClick={() => onEdit(row)}
                aria-label="Editar venta"
                title="Editar venta"
              >
                <i className="bi bi-pencil-square" />
              </button>
              {canDelete ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger icon-button"
                  onClick={() => onDelete(row.id)}
                  aria-label="Eliminar venta"
                  title="Eliminar venta"
                >
                  <i className="bi bi-trash" />
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
