import { useState } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";

export default function AppShell({ children }) {
  const { user, isAdmin, logout } = useAuth();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const navItems = [
    { to: "/", label: "Dashboard Cobranza", icon: "bi-speedometer2" },
    { to: "/dashboard-iniciales", label: "Dashboard Iniciales", icon: "bi-graph-up-arrow" },
    { to: "/ventas", label: "Ventas", icon: "bi-bag-check" },
    { to: "/cobro-inicial", label: "Cobro Inicial", icon: "bi-cash-coin" },
    { to: "/cobranza", label: "Cobranza", icon: "bi-wallet2" }
  ];

  const adminItems = [
    { to: "/origenes", label: "Origenes", icon: "bi-diagram-3" },
    { to: "/vendedores", label: "Vendedores", icon: "bi-people" },
    { to: "/eventos", label: "Eventos", icon: "bi-calendar-event" },
    { to: "/gastos-conferencias", label: "Gastos Conferencias", icon: "bi-receipt-cutoff" },
    { to: "/usuarios", label: "Usuarios", icon: "bi-person-gear" }
  ];

  return (
    <div className="app-shell bg-body-tertiary">
      <button
        type="button"
        className="mobile-sidebar-fab btn btn-primary"
        onClick={() => setMobileExpanded((current) => !current)}
        aria-label={mobileExpanded ? "Cerrar menu" : "Abrir menu"}
        title={mobileExpanded ? "Cerrar menu" : "Abrir menu"}
      >
        <i className={`bi ${mobileExpanded ? "bi-x-lg" : "bi-list"}`} />
      </button>
      {mobileExpanded ? (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileExpanded(false)}
          aria-label="Cerrar menu"
        />
      ) : null}
      <aside className={`sidebar border-end border-secondary-subtle ${mobileExpanded ? "sidebar-expanded" : ""}`}>
        <div className="sidebar-topbar">
          <div className="sidebar-brand">
            <span className="sidebar-brand__mark">P</span>
            <div className="sidebar-brand__copy">
              <h1 className="h3 mb-2">Pagos</h1>
              <p className="small text-light-emphasis mb-4">Ventas y cobranza para mentorias.</p>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle btn btn-sm btn-outline-light"
            onClick={() => setMobileExpanded((current) => !current)}
            aria-label={mobileExpanded ? "Contraer menu" : "Expandir menu"}
            title={mobileExpanded ? "Contraer menu" : "Expandir menu"}
          >
            <i className={`bi ${mobileExpanded ? "bi-layout-sidebar-inset" : "bi-layout-sidebar"}`} />
          </button>
        </div>

        <div className="sidebar-user">
          <strong className="sidebar-expand-only">{user?.full_name}</strong>
          <span className="sidebar-expand-only">@{user?.username}</span>
          <span className="role-badge sidebar-expand-only">{user?.role}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-light sidebar-logout"
            onClick={logout}
            aria-label="Cerrar sesion"
            title="Cerrar sesion"
          >
            <i className="bi bi-box-arrow-left" />
            <span className="sidebar-expand-only">Cerrar sesion</span>
          </button>
        </div>
        <nav className="nav nav-pills flex-column gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link sidebar-link ${isActive ? "active" : "text-white"}`}
              title={item.label}
              onClick={() => setMobileExpanded(false)}
            >
              <i className={`bi ${item.icon}`} />
              <span className="sidebar-expand-only">{item.label}</span>
            </NavLink>
          ))}
          {isAdmin ? (
            <>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link sidebar-link ${isActive ? "active" : "text-white"}`}
                  title={item.label}
                  onClick={() => setMobileExpanded(false)}
                >
                  <i className={`bi ${item.icon}`} />
                  <span className="sidebar-expand-only">{item.label}</span>
                </NavLink>
              ))}
            </>
          ) : null}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
