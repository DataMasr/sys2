let allOrders = [];
let allProfiles = [];

async function loadOrders() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('orders')
    .select('*, creator:profiles!created_by(full_name, email), assignee:profiles!assigned_to(full_name, email)')
    .order('created_at', { ascending: false });

  if (error) {
    showAlert('فشل تحميل الأوامر: ' + error.message, 'error');
    throw error;
  }

  allOrders = data || [];
  return allOrders;
}

async function loadProfiles() {
  const sb = getSupabase();
  const { data, error } = await sb.from('profiles').select('*');
  if (error) throw error;
  allProfiles = data || [];
  return allProfiles;
}

function renderOrdersTable(orders = allOrders) {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">لا يوجد أوامر</td></tr>`;
    return;
  }

  orders.forEach(order => {
    const percent = order.total_quantity > 0
      ? Math.round((order.completed_quantity / order.total_quantity) * 100)
      : 0;

    const statusLabels = {
      pending: 'معلق',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتمل',
      delivered: 'تم التسليم'
    };

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${order.title}</strong></td>
      <td>${order.total_quantity}</td>
      <td>${order.completed_quantity}</td>
      <td>${order.total_quantity - order.completed_quantity}</td>
      <td>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <div class="progress-bar" style="width:100px">
            <div class="progress-fill" style="width:${percent}%; ${percent === 100 ? 'background:var(--success)' : ''}"></div>
          </div>
          <span style="font-size:0.75rem;font-weight:600">${percent}%</span>
        </div>
      </td>
      <td><span class="badge badge-${order.status}">${statusLabels[order.status]}</span></td>
      <td>${order.assignee?.full_name || '-'}</td>
      <td>
        <div class="actions">
          ${canManageOrders() ? `
            <button class="btn btn-primary btn-sm" onclick="openProgressModal('${order.id}')">تحديث</button>
            <button class="btn btn-success btn-sm" onclick="deliverOrder('${order.id}')" ${order.status !== 'completed' ? 'disabled style="opacity:0.5"' : ''}>تسليم</button>
            <button class="btn btn-danger btn-sm" onclick="deleteOrder('${order.id}')">حذف</button>
            <button class="btn btn-primary btn-sm" style="background:var(--accent); border-color:var(--accent);" onclick="showOrderDescription('${order.id}')">الوصف</button>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="viewOrder('${order.id}')">عرض</button>
            <button class="btn btn-primary btn-sm" style="background:var(--accent); border-color:var(--accent);" onclick="showOrderDescription('${order.id}')">الوصف</button>
          `}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function canManageOrders() {
  return hasRole(['admin', 'manager']);
}

window.showOrderDescription = function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (order) {
    document.getElementById('desc-content').textContent = order.description || 'لا يوجد وصف متاح لهذا الأمر.';
    document.getElementById('desc-modal').classList.remove('hidden');
  }
};

async function receiveOrder(orderId) {
  if (!confirm('هل تريد استلام هذا الأمر والبدء في تنفيذه؟')) return;

  const sb = getSupabase();
  const { error } = await sb.from('orders')
    .update({ status: 'in_progress' })
    .eq('id', orderId);

  if (error) {
    showAlert('فشل الاستلام: ' + error.message, 'error');
    return;
  }

  await logAction(orderId, 'استلام الطلب', 'تم استلام الأوردر وبدء التنفيذ');

  if (typeof refreshOrders === 'function') await refreshOrders();
  if (typeof loadDashboardData === 'function') await loadDashboardData();
  showAlert('تم استلام الأمر بنجاح', 'success');
}

function renderStats() {
  const total = allOrders.length;
  const pending = allOrders.filter(o => o.status === 'pending').length;
  const inProgress = allOrders.filter(o => o.status === 'in_progress').length;
  const completed = allOrders.filter(o => o.status === 'completed').length;
  const delivered = allOrders.filter(o => o.status === 'delivered').length;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal('stat-total', total);
  setVal('stat-pending', pending);
  setVal('stat-inprogress', inProgress);
  setVal('stat-completed', completed);
  setVal('stat-delivered', delivered);
}

async function createOrder(e) {
  e.preventDefault();
  const sb = getSupabase();

  const title = document.getElementById('order-title').value.trim();
  const description = document.getElementById('order-desc').value.trim();
  const totalQty = parseInt(document.getElementById('order-total').value);
  const assignedTo = document.getElementById('order-assigned').value || null;

  if (!title || !totalQty || totalQty <= 0) {
    showAlert('يرجى إدخال عنوان وكمية صحيحة', 'error');
    return;
  }

  const { error } = await sb.from('orders').insert({
    title,
    description,
    total_quantity: totalQty,
    completed_quantity: 0,
    status: 'pending',
    created_by: currentUser.id,
    assigned_to: assignedTo
  });

  if (error) {
    showAlert('فشل إنشاء الأمر: ' + error.message, 'error');
    return;
  }


  closeModal('create-modal');
  document.getElementById('create-form').reset();
  await refreshOrders();
  showAlert('تم إنشاء الأمر بنجاح', 'success');
}

async function updateProgress(e) {
  e.preventDefault();
  const sb = getSupabase();

  const orderId = document.getElementById('progress-order-id').value;
  const completedQty = parseInt(document.getElementById('progress-completed').value);
  const notes = document.getElementById('progress-notes').value.trim();

  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  if (completedQty < 0 || completedQty > order.total_quantity) {
    showAlert(`الكمية يجب أن تكون بين 0 و ${order.total_quantity}`, 'error');
    return;
  }

  let newStatus = order.status;
  if (completedQty === 0) newStatus = 'pending';
  else if (completedQty === order.total_quantity) newStatus = 'completed';
  else newStatus = 'in_progress';

  const { error } = await sb.from('orders').update({
    completed_quantity: completedQty,
    status: newStatus
  }).eq('id', orderId);

  if (error) {
    showAlert('فشل التحديث: ' + error.message, 'error');
    return;
  }

  await logAction(orderId, 'تحديث التقدم', `تم تحديث المنجز إلى ${completedQty}. ملاحظات: ${notes}`);

  closeModal('progress-modal');
  await refreshOrders();
  if (typeof loadDashboardData === 'function') await loadDashboardData();
  showAlert('تم تحديث التقدم بنجاح', 'success');
}

async function deliverOrder(orderId) {
  if (!confirm('هل أنت متأكد من تسليم هذا الأمر؟')) return;

  const sb = getSupabase();
  const { error } = await sb.from('orders')
    .update({ status: 'delivered' })
    .eq('id', orderId);

  if (error) {
    showAlert('فشل التسليم: ' + error.message, 'error');
    return;
  }

  await logAction(orderId, 'تسليم الطلب', 'تم تسليم الأوردر نهائياً');

  await refreshOrders();
  if (typeof loadDashboardData === 'function') await loadDashboardData();
  showAlert('تم تسليم الأمر بنجاح', 'success');
}

async function deleteOrder(orderId) {
  if (!confirm('هل أنت متأكد من الحذف؟')) return;

  const sb = getSupabase();
  const { error } = await sb.from('orders').delete().eq('id', orderId);

  if (error) {
    showAlert('فشل الحذف: ' + error.message, 'error');
    return;
  }

  await logAction(orderId, 'حذف الطلب', 'تم حذف الطلب بالكامل');

  await refreshOrders();
  showAlert('تم الحذف بنجاح', 'success');
}

async function logAction(orderId, actionType, details) {
  const sb = getSupabase();
  if (!currentUser) return;
  try {
    await sb.from('order_logs').insert({
      order_id: orderId,
      user_id: currentUser.id,
      action: actionType,
      notes: details
    });
  } catch (e) {
    console.error('Failed to log action:', e);
  }
}

async function refreshOrders() {
  await loadOrders();
  renderOrdersTable();
  renderStats();
}

function openCreateModal() {
  populateAssigneeSelect('order-assigned');
  document.getElementById('create-modal').classList.remove('hidden');
}

function openProgressModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('progress-order-id').value = orderId;
  document.getElementById('progress-total').textContent = order.total_quantity;
  document.getElementById('progress-completed').value = order.completed_quantity;
  document.getElementById('progress-notes').value = '';
  document.getElementById('progress-modal').classList.remove('hidden');
}

function populateAssigneeSelect(selectId, selectedId = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  sel.innerHTML = '<option value="">-- اختر مسؤول --</option>';
  allProfiles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.full_name || p.email} (${getRoleLabel(p.role)})`;
    if (p.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function filterOrders() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const status = document.getElementById('filter-status').value;

  let filtered = allOrders;

  if (q) {
    filtered = filtered.filter(o => o.title.toLowerCase().includes(q));
  }

  if (status) {
    filtered = filtered.filter(o => o.status === status);
  }

  renderOrdersTable(filtered);
}

function viewOrder(id) {
  const order = allOrders.find(o => o.id === id);
  if (!order) return;

  const statusLabels = {
    pending: 'معلق',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتمل',
    delivered: 'تم التسليم'
  };

  alert(`
الأمر: ${order.title}
الوصف: ${order.description || '-'}
الكمية الكلية: ${order.total_quantity}
المنجز: ${order.completed_quantity}
المتبقي: ${order.total_quantity - order.completed_quantity}
الحالة: ${statusLabels[order.status]}
المسؤول: ${order.assignee?.full_name || '-'}
  `.trim());
}

async function initOrdersPage() {
  await loadProfiles();
  await refreshOrders();

  const createForm = document.getElementById('create-form');
  if (createForm) createForm.addEventListener('submit', createOrder);

  const progressForm = document.getElementById('progress-form');
  if (progressForm) progressForm.addEventListener('submit', updateProgress);

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.addEventListener('input', filterOrders);

  const filterStatus = document.getElementById('filter-status');
  if (filterStatus) filterStatus.addEventListener('change', filterOrders);

  const channel = getSupabase()
    .channel('orders-list-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
      console.log('[Realtime] orders changed');
      await loadOrders();
      filterOrders();
    })
    .subscribe((status) => {
      console.log('[Realtime] status:', status);
      if (status !== 'SUBSCRIBED') {
        console.warn('[Realtime] not subscribed, enabling polling fallback');
      }
    });

  setInterval(async () => {
    const beforeCount = allOrders.length;
    const beforeJson = JSON.stringify(allOrders.map(o => ({ id: o.id, status: o.status, completed: o.completed_quantity })));
    await loadOrders();
    const afterJson = JSON.stringify(allOrders.map(o => ({ id: o.id, status: o.status, completed: o.completed_quantity })));
    if (beforeJson !== afterJson) {
      console.log('[Polling] data changed, re-rendering');
      filterOrders();
    }
  }, 3000);
}
