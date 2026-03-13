import { useEffect, useState } from "react";

import { getInitialsDashboard } from "../services/api";

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "USD"
  }).format(amount || 0);
}

function AlertList({ title, subtitle, items, emptyMessage, tone, progress }) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel__header">
        <div>
          <span className="dashboard-kicker">{title}</span>
          <h3>{subtitle}</h3>
        </div>
      </div>

      {items.length === 0 ? <p className="text-body-secondary mb-0">{emptyMessage}</p> : null}

      <div className="dashboard-alert-list">
        {items.map((item) => (
          <article key={`${title}-${item.sale_id}`} className="dashboard-alert-card">
            <div className="dashboard-alert-card__head">
              <div>
                <strong>{item.customer_name}</strong>
                <span>{item.phone}</span>
              </div>
              <span className={`dashboard-tag dashboard-tag--${tone}`}>
                {progress ? `${item.progress_percent}%` : formatCurrency(item.remaining_initial)}
              </span>
            </div>

            <div className="dashboard-alert-meta">
              <span><strong>Asesor:</strong> {item.advisor_name}</span>
              <span><strong>Evento:</strong> {item.event_name || item.product_name}</span>
              <span><strong>Inicial requerida:</strong> {formatCurrency(item.initial_required)}</span>
              <span><strong>Inicial abonada:</strong> {formatCurrency(item.initial_paid)}</span>
              <span><strong>Pendiente:</strong> {formatCurrency(item.remaining_initial)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function InitialDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const data = await getInitialsDashboard();
        setDashboard(data);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const kpis = dashboard?.kpis;

  return (
    <section className="dashboard-shell">
      <section className="page-card dashboard-hero">
        <div className="dashboard-hero__copy">
          <span className="dashboard-kicker">Iniciales</span>
          <h2 className="h3 mb-2">Dashboard Iniciales</h2>
          <p className="text-body-secondary mb-0">
            Controla el monto pendiente de inicial, lo recaudado y los casos que requieren seguimiento comercial inmediato.
          </p>
        </div>
        <div className="dashboard-hero__aside">
          <span>Seguimiento prioritario</span>
          <strong>{kpis?.partial_initial_accounts_count || 0}</strong>
          <small>personas con inicial parcial y cierre pendiente</small>
        </div>
      </section>

      {loading ? <section className="page-card"><p className="mb-0">Cargando dashboard...</p></section> : null}
      {error ? <section className="page-card"><p className="error-text mb-0">{error}</p></section> : null}

      {dashboard ? (
        <>
          <section className="dashboard-kpi-grid">
            <article className="dashboard-kpi-card dashboard-kpi-card--accent">
              <span>Monto pendiente de inicial</span>
              <strong>{formatCurrency(kpis.total_initial_pending_amount)}</strong>
              <small>{kpis.pending_accounts_count} personas pendientes</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Recaudado en iniciales este mes</span>
              <strong>{formatCurrency(kpis.collected_initial_this_month_amount)}</strong>
              <small>Abonos iniciales registrados en el mes actual</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Iniciales cobradas acumuladas</span>
              <strong>{formatCurrency(kpis.collected_initial_total_amount)}</strong>
              <small>Total histórico abonado a inicial</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Ticket promedio inicial</span>
              <strong>{formatCurrency(kpis.average_initial_ticket)}</strong>
              <small>Promedio de inicial pagada por venta</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Cuentas con abono parcial</span>
              <strong>{kpis.partial_initial_accounts_count}</strong>
              <small>{formatCurrency(kpis.partial_initial_amount)} por cerrar</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Sin ningun abono</span>
              <strong>{kpis.no_initial_payment_accounts_count}</strong>
              <small>{formatCurrency(kpis.no_initial_payment_amount)} pendientes</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Mayor pendiente individual</span>
              <strong>{formatCurrency(kpis.highest_initial_pending_amount)}</strong>
              <small>Monto maximo de inicial pendiente</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Cuentas por convertir</span>
              <strong>{kpis.pending_accounts_count}</strong>
              <small>Clientes que aun no pasan a cobranza</small>
            </article>
          </section>

          <section className="dashboard-panels-grid">
            <AlertList
              title="Prioridad"
              subtitle="Inicial parcial"
              items={dashboard.partial_accounts}
              emptyMessage="No hay cuentas con abono parcial pendiente."
              tone="warn"
              progress
            />
            <AlertList
              title="Prospectos"
              subtitle="Sin abono inicial"
              items={dashboard.no_payment_accounts}
              emptyMessage="No hay cuentas sin abono inicial."
              tone="danger"
            />
          </section>

          <AlertList
            title="Foco comercial"
            subtitle="Mayores pendientes de inicial"
            items={dashboard.highest_pending_accounts}
            emptyMessage="No hay pendientes de inicial."
            tone="info"
          />
        </>
      ) : null}
    </section>
  );
}
