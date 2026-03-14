const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const AUTH_STORAGE_KEY = "pagos_auth";
export const AUTH_CHANGE_EVENT = "pagos-auth-changed";

function emitAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

function buildHeaders(includeJson = false) {
  const headers = {};
  const auth = getStoredAuth();

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  // ngrok free domains may return an HTML interstitial unless this header is sent.
  if (API_BASE_URL.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  return headers;
}

async function parseResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";

  if (response.ok) {
    if (response.status === 204) {
      return null;
    }

    if (!contentType.includes("application/json")) {
      throw new Error("El backend devolvio una respuesta no valida. Revisa VITE_API_BASE_URL o la configuracion de ngrok.");
    }

    return response.json();
  }

  const error = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
  if (response.status === 401) {
    clearStoredAuth();
  }
  throw new Error(error?.detail || fallbackMessage);
}

export function persistAuth(session) {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      accessToken: session.access_token ?? session.accessToken,
      user: session.user
    })
  );
  emitAuthChange();
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  emitAuthChange();
}

export function getStoredAuth() {
  const rawValue = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    clearStoredAuth();
    return null;
  }
}

export async function healthcheck() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseResponse(response, "No se pudo consultar el backend");
}

export async function loginRequest(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  const data = await parseResponse(response, "No se pudo iniciar sesion");
  return {
    accessToken: data.access_token,
    user: data.user
  };
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo validar la sesion");
}

export async function getUsers() {
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo cargar la lista de usuarios");
}

export async function getCollectionsDashboard() {
  const response = await fetch(`${API_BASE_URL}/dashboard/collections`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo cargar el dashboard de cobranza");
}

export async function getInitialsDashboard() {
  const response = await fetch(`${API_BASE_URL}/dashboard/initials`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo cargar el dashboard de iniciales");
}

export async function createUser(payload) {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  return parseResponse(response, "No se pudo crear el usuario");
}

export async function getSales() {
  const response = await fetch(`${API_BASE_URL}/sales`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo cargar la lista de ventas");
}

export async function createSale(payload) {
  const response = await fetch(`${API_BASE_URL}/sales`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  return parseResponse(response, "No se pudo registrar la venta");
}

export async function updateSale(saleId, payload) {
  const response = await fetch(`${API_BASE_URL}/sales/${saleId}`, {
    method: "PUT",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  return parseResponse(response, "No se pudo actualizar la venta");
}

export async function markSaleNotInterested(saleId) {
  const response = await fetch(`${API_BASE_URL}/sales/${saleId}/mark-not-interested`, {
    method: "POST",
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo marcar al cliente");
}

export async function deleteSale(saleId) {
  const response = await fetch(`${API_BASE_URL}/sales/${saleId}`, {
    method: "DELETE",
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo eliminar la venta");
}

export async function createPayment(payload) {
  const response = await fetch(`${API_BASE_URL}/payments`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  return parseResponse(response, "No se pudo registrar el pago");
}

export async function getPayments() {
  const response = await fetch(`${API_BASE_URL}/payments`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo cargar la lista de pagos");
}

export async function updatePayment(paymentId, payload) {
  const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
    method: "PUT",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  return parseResponse(response, "No se pudo actualizar el pago");
}

export async function deletePayment(paymentId) {
  const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
    method: "DELETE",
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo eliminar el pago");
}

export async function getProducts() {
  const response = await fetch(`${API_BASE_URL}/products`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo cargar la lista de productos");
}

export async function getAdvisors() {
  const response = await fetch(`${API_BASE_URL}/advisors`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo cargar la lista de vendedores");
}

export async function createAdvisor(payload) {
  const response = await fetch(`${API_BASE_URL}/advisors`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  return parseResponse(response, "No se pudo crear el vendedor");
}

export async function getOrigins() {
  const response = await fetch(`${API_BASE_URL}/origins`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo cargar la lista de origenes");
}

export async function createOrigin(payload) {
  const response = await fetch(`${API_BASE_URL}/origins`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  return parseResponse(response, "No se pudo crear el origen");
}

export async function getEvents() {
  const response = await fetch(`${API_BASE_URL}/events`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo cargar la lista de eventos");
}

export async function createEvent(payload) {
  const response = await fetch(`${API_BASE_URL}/events`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  return parseResponse(response, "No se pudo crear el evento");
}

export async function getOriginExpenses(originId) {
  const suffix = originId ? `?origin_id=${originId}` : "";
  const response = await fetch(`${API_BASE_URL}/origin-expenses${suffix}`, {
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo cargar la lista de gastos");
}

export async function createOriginExpense(payload) {
  const response = await fetch(`${API_BASE_URL}/origin-expenses`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  return parseResponse(response, "No se pudo registrar el gasto");
}

export async function updateOriginExpense(expenseId, payload) {
  const response = await fetch(`${API_BASE_URL}/origin-expenses/${expenseId}`, {
    method: "PUT",
    headers: buildHeaders(true),
    body: JSON.stringify(payload)
  });
  return parseResponse(response, "No se pudo actualizar el gasto");
}

export async function deleteOriginExpense(expenseId) {
  const response = await fetch(`${API_BASE_URL}/origin-expenses/${expenseId}`, {
    method: "DELETE",
    headers: buildHeaders()
  });
  return parseResponse(response, "No se pudo eliminar el gasto");
}
