const API_BASE = process.env.REACT_APP_API_BASE || '/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function fetchGroups() {
  return request('/groups');
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

export function fetchRecommendation(groupId, constraints) {
  return request('/recommend', {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId, constraints }),
  });
}
