import { useEffect, useState } from "react";

import { getCollectionsDashboard } from "../services/api";

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "USD"
  }).format(amount || 0);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function AlertList({ title, subtitle, items, emptyMessage, tone }) {
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
                {item.days_until_due < 0 ? `${Math.abs(item.days_until_due)} dias vencido` : `${item.days_until_due} dias`}
              </span>
            </div>

            <div className="dashboard-alert-meta">
              <span><strong>Evento:</strong> {item.event_name || item.product_name}</span>
              <span><strong>Proximo pago:</strong> {formatDate(item.next_due_date)}</span>
              <span><strong>Monto:</strong> {formatCurrency(item.pending_amount)}</span>
              <span><strong>Saldo:</strong> {formatCurrency(item.remaining_balance)}</span>
              {item.overdue_amount > 0 ? <span><strong>Vencido:</strong> {formatCurrency(item.overdue_amount)}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const data = await getCollectionsDashboard();
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
          <span className="dashboard-kicker">Cobranza</span>
          <h2 className="h3 mb-2">Dashboard Cobranza</h2>
          <p className="text-body-secondary mb-0">
            Controla cuanto debes recaudar este mes, quienes vencen pronto y el saldo real pendiente despues de completar la inicial.
          </p>
        </div>
        <div className="dashboard-hero__aside">
          <span>Proxima fecha clave</span>
          <strong>{formatDate(kpis?.next_payment_date)}</strong>
          <small>{kpis?.next_payment_people_count || 0} personas con pago en esa fecha</small>
        </div>
      </section>

      {loading ? <section className="page-card"><p className="mb-0">Cargando dashboard...</p></section> : null}
      {error ? <section className="page-card"><p className="error-text mb-0">{error}</p></section> : null}

      {dashboard ? (
        <>
          <section className="dashboard-kpi-grid">
            <article className="dashboard-kpi-card dashboard-kpi-card--accent">
              <span>Cobro a recaudar este mes</span>
              <strong>{formatCurrency(kpis.due_this_month_amount)}</strong>
              <small>{kpis.due_this_month_accounts} cuentas con vencimiento este mes</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Cobrado este mes</span>
              <strong>{formatCurrency(kpis.collected_this_month_amount)}</strong>
              <small>Pagos de cobranza registrados en el mes actual</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Personas en cobranza</span>
              <strong>{kpis.active_accounts_count}</strong>
              <small>Cuentas activas despues de completar inicial</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Saldo total por cobrar</span>
              <strong>{formatCurrency(kpis.total_portfolio_balance)}</strong>
              <small>Balance pendiente de la cartera activa</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Proximos 7 dias</span>
              <strong>{kpis.upcoming_7_days_accounts}</strong>
              <small>{formatCurrency(kpis.upcoming_7_days_amount)} por gestionar</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Proximos 15 dias</span>
              <strong>{kpis.upcoming_15_days_accounts}</strong>
              <small>{formatCurrency(kpis.upcoming_15_days_amount)} por gestionar</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Cuentas vencidas</span>
              <strong>{kpis.overdue_accounts}</strong>
              <small>{formatCurrency(kpis.overdue_amount)} en mora</small>
            </article>
            <article className="dashboard-kpi-card">
              <span>Proximo corte</span>
              <strong>{formatDate(kpis.next_payment_date)}</strong>
              <small>{kpis.next_payment_people_count} personas para contactar</small>
            </article>
          </section>

          <section className="dashboard-panels-grid">
            <AlertList
              title="Prioridad"
              subtitle="Cuentas vencidas"
              items={dashboard.overdue_alerts}
              emptyMessage="No hay cuentas vencidas por ahora."
              tone="danger"
            />
            <AlertList
              title="Seguimiento"
              subtitle="Proximos 7 dias"
              items={dashboard.upcoming_7_days}
              emptyMessage="No hay pagos por vencer en los proximos 7 dias."
              tone="warn"
            />
          </section>

          <AlertList
            title="Planeacion"
            subtitle="Agenda de los proximos 15 dias"
            items={dashboard.upcoming_15_days}
            emptyMessage="No hay pagos agendados en los proximos 15 dias."
            tone="info"
          />
        </>
      ) : null}
    </section>
  );
}
