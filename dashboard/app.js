/**
 * Token Radar Dashboard - Client-side rendering
 * Loads board.json and renders the ranked protocol board.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const boardList = document.getElementById('boardList');
  const totalEl = document.getElementById('totalProtocols');
  const topValueEl = document.getElementById('topValue');
  const avgValueEl = document.getElementById('avgValue');
  const dateEl = document.getElementById('dateGenerated');

  try {
    // Load board.json from same directory as index.html
    const response = await fetch('board.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const board = await response.json();

    const rows = board.rows || [];
    renderStats(rows);
    renderBoard(rows);
    const now = new Date();
    dateEl.textContent = now.toLocaleString();
  } catch (err) {
    boardList.innerHTML = `
      <div class="empty-state">
        <p>⚠️ Failed to load board data.</p>
        <p style="font-size:0.85rem; margin-top:8px;">${err.message}</p>
      </div>
    `;
  }
});

/**
 * Render summary statistics.
 */
function renderStats(rows) {
  const totalEl = document.getElementById('totalProtocols');
  const topValueEl = document.getElementById('topValue');
  const avgValueEl = document.getElementById('avgValue');

  totalEl.textContent = rows.length;

  if (rows.length === 0) {
    topValueEl.textContent = '—';
    avgValueEl.textContent = '—';
    return;
  }

  const topValue = rows[0].implied_value_usd;
  topValueEl.textContent = `$${topValue.toLocaleString()}`;

  const sum = rows.reduce((acc, row) => acc + row.implied_value_usd, 0);
  const avg = sum / rows.length;
  avgValueEl.textContent = `$${avg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Render the ranked protocol board.
 */
function renderBoard(rows) {
  const boardList = document.getElementById('boardList');

  if (rows.length === 0) {
    boardList.innerHTML = '<div class="empty-state">No protocols scored.</div>';
    return;
  }

  let html = '';
  rows.forEach(row => {
    const stepsHtml = renderSteps(row.farm_steps);
    const slugHtml = row.slug
      ? `<span class="protocol-slug">${escapeHtml(row.slug)}</span>`
      : '';

    html += `
      <div class="protocol-card">
        <div class="protocol-header">
          <span class="rank-badge">#${row.rank}</span>
          <span class="protocol-name">${escapeHtml(row.name)} ${slugHtml}</span>
          <span class="value-display">$${row.implied_value_usd.toLocaleString()}</span>
        </div>
        <div class="market-metrics">
          <span class="metric">TVL: <strong>$${row.implied_value_usd.toLocaleString()}</strong> implied</span>
        </div>
        <div class="farm-steps">
          <h4>🌾 Farm Steps</h4>
          <ul class="steps-list">
            ${stepsHtml}
          </ul>
        </div>
      </div>
    `;
  });

  boardList.innerHTML = html;
}

/**
 * Render farm steps as list items.
 */
function renderSteps(steps) {
  if (!steps || steps.length === 0) {
    return '<li class="step-item">No farm steps available.</li>';
  }
  return steps.map(step => `<li class="step-item">${escapeHtml(step)}</li>`).join('');
}

/**
 * Simple HTML escape.
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, ch => map[ch]);
}
