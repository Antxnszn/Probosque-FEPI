const API_BASE = 'http://localhost:8000/api/v1';

export async function fetchPlotsFromServer(token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/plots`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch plots: ${res.statusText}`);
  }
  return res.json();
}

export async function requestSyncChallenge(deviceInstallationId: string, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/sync/challenges`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ device_installation_id: deviceInstallationId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to request challenge: ${res.statusText}`);
  }
  return res.json();
}

export async function pushAuditPayload(auditPayload: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/sync/audits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(auditPayload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Audit sync failed: ${res.statusText}`);
  }
  return res.json();
}

export async function pushEvidencePhoto(formData: FormData, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/sync/evidence`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Evidence photo upload failed: ${res.statusText}`);
  }
  return res.json();
}
