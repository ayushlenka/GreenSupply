const API_BASE = process.env.REACT_APP_API_BASE || '/api/v1';
const TOKEN_KEY = 'greensupply_access_token';

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function fetchMe() {
  return request('/auth/me');
}

export function fetchGroups() {
  return request('/groups');
}

export function fetchRegions() {
  return request('/regions');
}

export function fetchGroupDetail(groupId) {
  return request(`/groups/${groupId}`);
}

export function joinGroup(groupId, businessId, units) {
  return request(`/groups/${groupId}/join`, {
    method: 'POST',
    body: JSON.stringify({ business_id: businessId, units }),
  });
}

export function fetchProducts() {
  return request('/products');
}

export function fetchImpact(groupId) {
  return request(`/groups/${groupId}/impact`);
}

export function createGroup(payload) {
  return request('/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createBusiness(payload) {
  return request('/businesses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchBusinessByEmail(email) {
  const query = new URLSearchParams({ email });
  return request(`/businesses?${query.toString()}`);
}

export function fetchRecommendation(groupId, constraints) {
  return request('/recommend', {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId, constraints }),
  });
}

export function createSupplierProduct(payload) {
  return request('/supplier-products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchSupplierProducts(supplierBusinessId) {
  const query = new URLSearchParams({ supplier_business_id: supplierBusinessId });
  return request(`/supplier-products?${query.toString()}`);
}

export function fetchSupplierOrders(supplierBusinessId) {
  const query = new URLSearchParams({ supplier_business_id: supplierBusinessId });
  return request(`/supplier-orders?${query.toString()}`);
}
