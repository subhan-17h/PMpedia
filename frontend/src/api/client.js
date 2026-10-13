const API_BASE = '/api';

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function searchStandards({ query, standards, topK = 5 }) {
  return post('/search', { query, standards, top_k: topK });
}

export async function searchPerStandard({ query, topK = 3 }) {
  const STANDARDS = ['PMBOK7', 'PRINCE2', 'ISO 21502'];
  const settled = await Promise.allSettled(
    STANDARDS.map(std =>
      post('/search', { query, standards: [std], top_k: topK })
        .then(data => ({ standard: std, results: data.results ?? [] }))
    )
  );
  return settled.map((s, i) =>
    s.status === 'fulfilled'
      ? s.value
      : { standard: STANDARDS[i], results: [], error: s.reason?.message }
  );
}

export async function agentQuery({ question, topK = 5, showTrace = true }) {
  return post('/agent/query', { question, top_k: topK, show_trace: showTrace });
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend unavailable');
  return res.json();
}
