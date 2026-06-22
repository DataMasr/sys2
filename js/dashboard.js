
async function renderDashboardOrders() {
  const tbody = document.getElementById('dashboard-orders-body');
  if (!tbody) return;

  const recent = allOrders.slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">لا يوجد أوامر</td></tr>`;
    renderStats();
    return;
  }

  const statusLabels = {
    pending: 'معلق',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتمل',
    delivered: 'تم التسليم'
  };

  tbody.innerHTML = '';
  recent.forEach(order => {
    const percent = order.total_quantity > 0
      ? Math.round((order.completed_quantity / order.total_quantity) * 100)
      : 0;

    const tr = document.createElement('tr');
    const isManager = hasRole(['admin', 'manager']);
    tr.innerHTML = `
      <td><strong>${order.title}</strong></td>
      <td>${order.total_quantity}</td>
      <td>${order.completed_quantity}</td>
      <td>${order.total_quantity - order.completed_quantity}</td>
      <td>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <div class="progress-bar" style="width:80px">
            <div class="progress-fill" style="width:${percent}%;background:${percent === 100 ? 'var(--success)' : 'var(--primary)'}"></div>
          </div>
          <span style="font-size:0.75rem;font-weight:600">${percent}%</span>
        </div>
      </td>
      <td><span class="badge badge-${order.status}">${statusLabels[order.status]}</span></td>
      <td>
        ${isManager ? `
          <div class="actions">
            ${order.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="receiveOrder('${order.id}')">استلام</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="openProgressModal('${order.id}')">تحديث</button>
            <button class="btn btn-success btn-sm" onclick="deliverOrder('${order.id}')" ${order.status !== 'completed' ? 'disabled style="opacity:0.5"' : ''}>تسليم</button>
          </div>
        ` : (order.assignee?.full_name || '-')}
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderStats();
  const el = document.getElementById('last-updated');
  if (el) el.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG');
}

async function loadDashboardData() {
  try {
    await loadOrders();
    await renderDashboardOrders();
  } catch (e) {
    console.error('Failed to load orders:', e);
  }
}

async function initDashboard() {
  const sb = getSupabase();

  await loadDashboardData();

  const channel = sb.channel('dashboard-orders-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
      console.log('[Realtime Dashboard] change received:', payload.eventType);
      await loadDashboardData();
    })
    .subscribe((status) => {
      console.log('[Realtime Dashboard] status:', status);
      if (status !== 'SUBSCRIBED') {
        console.warn('[Realtime Dashboard] Not subscribed, relying on polling');
      }
    });

  let lastDataHash = '';
  setInterval(async () => {
    try {
      const { data, error } = await sb
        .from('orders')
        .select('id, status, completed_quantity, total_quantity, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const currentHash = JSON.stringify(data);
      if (currentHash !== lastDataHash) {
        console.log('[Polling Dashboard] Data changed, refreshing...');
        lastDataHash = currentHash;
        await loadDashboardData();
      }
    } catch (err) {
      console.error('[Polling Dashboard] error:', err);
    }
  }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  if (currentUser) {
    await initDashboard();
  } else {
    console.warn('[Dashboard] User not authenticated');
  }
});
