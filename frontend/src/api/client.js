// API Client with automatic offline/online resilience

export async function fetchHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchUserProfile() {
  const res = await fetch('/api/me');
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function fetchDaylight(lat, lon) {
  const params = new URLSearchParams();
  if (lat !== undefined && lat !== null) params.append('lat', lat);
  if (lon !== undefined && lon !== null) params.append('lon', lon);
  const res = await fetch(`/api/daylight?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch daylight calculation');
  return res.json();
}

export async function createDispatch(moodPre, lat, lon, targetDurationMin) {
  const res = await fetch('/api/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mood_pre: moodPre,
      lat,
      lon,
      target_duration_min: targetDurationMin,
    }),
  });
  if (!res.ok) throw new Error('Failed to generate dispatch');
  return res.json();
}

export async function completeRun(runId, data) {
  const res = await fetch(`/api/runs/${runId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to complete run');
  return res.json();
}

export async function uploadFieldLog(runId, clientId, audioBlob, text) {
  const formData = new FormData();
  formData.append('client_id', clientId);
  if (text) formData.append('text', text);
  if (audioBlob) formData.append('audio', audioBlob, `${clientId}.webm`);

  const res = await fetch(`/api/runs/${runId}/field-logs`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload field log');
  return res.json();
}

export async function fetchRecentRuns() {
  const res = await fetch('/api/runs');
  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

export async function fetchStats() {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}
