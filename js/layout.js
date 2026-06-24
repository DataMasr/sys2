let allLateItems = [];
let activeNotifTab = 'all';
let notifSearchQuery = '';

function renderLayout() {
  if (document.getElementById('sidebar')) return;

  const sectionMap = [
    { id: 'orders', name: 'طلبيات العملاء', page: 'client_orders.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="3"/><path d="M8 7h8M8 11h5M8 15h3"/><circle cx="17" cy="14" r="3" fill="currentColor" opacity="0.25"/><path d="M16 14l1 1 2-2"/></svg>' },
    { id: 'orders_history', name: 'سجل الطلبيات', page: 'orders_history.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' },
    { id: 'tasks', name: 'قائمة المهام', page: 'tasks.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>' },
    { id: 'progress', name: 'متابعة التقدم', page: 'progress.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' },
    { id: 'inventory', name: 'المخازن', page: 'inventory.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" opacity="0.5"/></svg>' },
    { id: 'purchasing', name: 'قسم الشراء', page: 'purchasing.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.5" fill="currentColor"/><circle cx="20" cy="21" r="1.5" fill="currentColor"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>' },
    { id: 'profits', name: 'الأرباح والمصروفات', page: 'profits.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" /><rect x="1" y="20" width="22" height="2" rx="1" fill="currentColor" opacity="0.15"/></svg>', adminOnly: true },
    { id: 'accounts', name: 'الحسابات', page: 'accounts.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 10h20" opacity="0.4"/><path d="M6 15h4M14 15h4"/></svg>', adminOnly: true },
    { id: 'customers', name: 'العملاء', page: 'customers.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" opacity="0.4"/></svg>', adminOnly: true },
    { id: 'workers', name: 'شؤون العمال', page: 'workers.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>' },
    { id: 'users', name: 'المستخدمين', page: 'users.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>' }
  ];

  let navHTML = '';
  if (currentProfile) {
    navHTML = sectionMap
      .filter(s => {
        if (s.adminOnly && !hasRole(['admin', 'manager', 'purchasing_manager']) && !hasPermission(s.id)) return false;
        return hasPermission(s.id);
      })
      .map(s => `
        <a href="${s.page}" class="nav-item ${location.pathname.includes(s.page) ? 'active' : ''}">
          ${s.icon}
          <span>${s.name}</span>
        </a>
      `).join('');
  }

  const sidebarHTML = `
    <!-- Mobile Header -->
    <div class="mobile-header">
      <h2 style="font-size:1.25rem; font-weight:800; color:var(--primary); margin:0;">نظام الإدارة</h2>
      <button class="mobile-toggle" onclick="toggleSidebar()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </div>
    
    <!-- Sidebar Overlay -->
    <div class="sidebar-overlay" onclick="toggleSidebar()"></div>

    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#4f46e5);display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <h2 style="margin:0; font-size:1.15rem;">نظام الإدارة</h2>
        </div>
        <div id="notif-bell" class="hidden" style="position:relative; cursor:pointer;" onclick="openNotificationsModal()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span id="notif-count" style="position:absolute; top:-5px; right:-5px; background:#ff4444; color:white; border-radius:50%; width:18px; height:18px; font-size:10px; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid var(--sidebar-bg);">0</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${navHTML}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar" id="user-avatar">-</div>
          <div>
            <div id="user-name" style="font-weight:600;font-size:0.875rem">-</div>
            <div id="user-role" style="font-size:0.75rem;color:var(--text-muted)">-</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-block btn-sm" onclick="logout()">تسجيل الخروج</button>
      </div>
    </aside>
    <div id="alert-container" style="position:fixed;top:1.5rem;left:1.5rem;z-index:9999;max-width:400px;display:flex;flex-direction:column;gap:0.5rem;"></div>

    <!-- Global Notifications Modal -->
    <div id="global-notifications-modal" class="modal-overlay hidden" style="z-index: 10000;">
      <div class="modal" style="max-width: 620px;">
        <div class="modal-header" style="border-bottom:none; padding-bottom: 0.5rem;">
          <h3 style="display:flex; align-items:center; gap:0.5rem;">التنبيهات والإشعارات 🔔</h3>
          <button class="btn btn-secondary btn-sm" onclick="closeNotificationsModal()" style="padding:0.5rem">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Notifications Tabs -->
        <div class="notif-tabs" id="notif-tabs-bar">
          <!-- Dynamically populated in renderNotificationsList() -->
        </div>

        <!-- Search & Actions -->
        <div class="notif-search-container">
          <div class="notif-search-wrapper">
            <div class="notif-search-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input type="text" id="notif-search-query" class="notif-search-input" placeholder="ابحث باسم العميل أو تفاصيل التنبيه..." oninput="handleNotifSearch(this.value)">
          </div>
          <button id="notif-mark-all-btn" class="btn btn-secondary btn-sm" onclick="markAllNotifsAsRead()" style="display:none; font-weight:700; gap:0.3rem;">
            ✓ تحديد الكل كمقروء
          </button>
        </div>

        <div class="modal-body" id="notif-modal-body" style="max-height: 450px; overflow-y: auto; padding: 0.75rem 1rem;">
          <div class="notif-card-list" id="notif-cards-container">
            <!-- Alerts injected here -->
          </div>
        </div>
        <div class="modal-footer" style="padding: 0.9rem 1.5rem;">
          <button class="btn btn-secondary" onclick="closeNotificationsModal()">إغلاق</button>
        </div>
      </div>
    </div>

    <!-- Global Confirm Modal -->
    <div id="global-confirm-modal" class="modal-overlay hidden" style="z-index: 10001;">
      <div class="modal" style="max-width: 400px; text-align: center; padding: 2rem;">
        <div style="color:var(--warning); margin-bottom:1rem;">
          <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 id="confirm-msg" style="margin-bottom: 1.5rem; color:var(--text-main); font-size: 1.1rem; line-height: 1.5;"></h3>
        <div style="display:flex; gap: 1rem; justify-content: center;">
          <button id="confirm-btn-yes" class="btn btn-primary" style="flex:1;">تأكيد</button>
          <button id="confirm-btn-no" class="btn btn-secondary" style="flex:1;">إلغاء</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
  checkGlobalAlerts();

  setInterval(checkGlobalAlerts, 15000);
}

function customConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('global-confirm-modal');
    if (!modal) {
      resolve(confirm(message));
      return;
    }
    const msgEl = document.getElementById('confirm-msg');
    const btnYes = document.getElementById('confirm-btn-yes');
    const btnNo = document.getElementById('confirm-btn-no');

    msgEl.textContent = message;
    modal.classList.remove('hidden');

    const handleYes = () => { cleanup(); resolve(true); };
    const handleNo = () => { cleanup(); resolve(false); };

    function cleanup() {
      modal.classList.add('hidden');
      btnYes.removeEventListener('click', handleYes);
      btnNo.removeEventListener('click', handleNo);
    }

    btnYes.addEventListener('click', handleYes);
    btnNo.addEventListener('click', handleNo);
  });
}

async function checkGlobalAlerts() {
  if (typeof getSupabase === 'undefined') return;
  const sb = getSupabase();

  const normalizeDate = (d) => {
    const date = new Date(d);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };
  const todayNormalized = normalizeDate(new Date());

  try {
    const [accRes, ordRes, notifRes] = await Promise.all([
      sb.from('accounts').select('*'),
      sb.from('client_orders').select('*').eq('archived', false),
      sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)
    ]);

    let lateItems = [];

     // ── Admin edit notifications (visible to all staff) ──
    if (notifRes.data && currentProfile) {
      const myId = currentProfile.id;
      notifRes.data.forEach(notif => {
        const readBy = notif.read_by || [];
        if (!readBy.includes(myId)) {
          // If this notification is associated with an order, verify if the order is active and not yet delivered
          if (notif.order_id) {
            const relatedOrder = ordRes.data ? ordRes.data.find(o => o.id === notif.order_id) : null;
            // Skip notification if the order is not found (archived/deleted) or if it has already been delivered to the customer
            if (!relatedOrder || relatedOrder.stage === 'تم التسليم للزبون') {
              return;
            }
          }

          // Restrict shortage approval notifications strictly to purchasing_manager, admin, and manager
          if (notif.message.includes("تم اعتماد نواقص") || notif.message.includes("جاهزة للشراء")) {
            if (!hasRole(['purchasing_manager', 'admin', 'manager']) && !hasPermission('purchasing')) {
              return;
            }
          }

          // Restrict task notifications strictly to the assigned role and admins
          if (notif.message.includes("مهمة جديدة للـ")) {
            const isDesignerText = notif.message.includes("للمصمم");
            const isExecText = notif.message.includes("للمدير التنفيذي");
            
            const isDesigner = currentProfile.role === 'designer';
            const isExec = currentProfile.role === 'executive_director';
            const isAdminOrMgr = ['admin', 'manager', 'general_manager', 'executive_director'].includes(currentProfile.role);
            
            if (isDesignerText && !isDesigner && !isAdminOrMgr) {
              return;
            }
            if (isExecText && !isExec && !isAdminOrMgr) {
              return;
            }
          }

          lateItems.push({
            id: notif.id,
            name: notif.order_display_name || 'أوردر',
            amount: 0,
            date: notif.created_at ? new Date(notif.created_at) : null,
            type: 'admin_edit',
            source: notif.message,
            notifId: notif.id,
            orderId: notif.order_id
          });
        }
      });
    }

    if (accRes.data) {
      accRes.data.forEach(acc => {
        const remaining = (acc.total_amount || 0) - (acc.paid_amount || 0);
        if (remaining > 0 && acc.due_date) {
          const dueDateNormalized = normalizeDate(acc.due_date);
          if (dueDateNormalized <= todayNormalized) {
            lateItems.push({
              id: acc.id,
              name: acc.person_name || acc.name,
              amount: remaining,
              date: new Date(acc.due_date),
              type: acc.account_type,
              source: 'accounts'
            });
          }
        }
      });
    }

    if (ordRes.data) {
      ordRes.data.forEach(order => {
        const isDelivered = order.stage === 'تم التسليم للزبون';

        // 1. Notification for prep manager / admin: order needs materials OR has material issue
        const isPrepOrAdmin = currentProfile && (hasRole(['inventory_manager', 'admin']) || hasPermission('inventory'));
        if (isPrepOrAdmin && !isDelivered) {
          const hasMaterials = order.material_notes && order.material_notes.includes('<!--TRACK:');
          const hasIssue = order.material_notes && order.material_notes.includes('<!--MATERIAL_ISSUE:');

          if (hasIssue) {
            let issueText = "مشكلة خامات تم الإبلاغ عنها";
            const match = order.material_notes.match(/<!--MATERIAL_ISSUE:[^:]*?:(.*?)-->/);
            if (match) {
              issueText = match[1];
            }
            lateItems.push({
              id: order.id,
              name: order.client_name,
              amount: 0,
              date: order.created_at ? new Date(order.created_at) : null,
              type: 'material_issue',
              source: issueText
            });
          } else if (!hasMaterials) {
            lateItems.push({
              id: order.id,
              name: order.client_name,
              amount: 0,
              date: order.created_at ? new Date(order.created_at) : null,
              type: 'material_needed',
              source: 'طلبية بانتظار الخامات'
            });
          }
        }

        // 2. Notification for shortages approval (production engineer, purchasing manager, manager, admin)
        const isProd = currentProfile && (currentProfile.role === 'production_engineer' || hasPermission('tasks') || hasPermission('progress'));
        const isPurch = currentProfile && (currentProfile.role === 'purchasing_manager' || hasPermission('purchasing'));
        const isMgr = currentProfile && (hasRole(['manager', 'admin']) || hasPermission('orders'));

        if ((isProd || isPurch || isMgr) && !isDelivered) {
          const hasShortage = order.material_notes && order.material_notes.includes('عجز (مطلوب شراء)');
          const hasIssue = order.material_notes && order.material_notes.includes('<!--MATERIAL_ISSUE:');

          if (hasShortage && !hasIssue) {
            let needsApproval = false;
            let approvalTypeLabel = "";

            if (isProd && !order.approval_production) {
              needsApproval = true;
              approvalTypeLabel = "اعتماد النواقص (مهندس الإنتاج)";
            } else if (isPurch && !order.approval_purchasing) {
              needsApproval = true;
              approvalTypeLabel = "اعتماد النواقص (مدير المشتريات)";
            } else if (isMgr) {
              if (!order.approval_production && !order.approval_purchasing) {
                needsApproval = true;
                approvalTypeLabel = "اعتماد النواقص (بانتظار الإنتاج والمشتريات)";
              } else if (!order.approval_production) {
                needsApproval = true;
                approvalTypeLabel = "اعتماد النواقص (بانتظار الإنتاج)";
              } else if (!order.approval_purchasing) {
                needsApproval = true;
                approvalTypeLabel = "اعتماد النواقص (بانتظار المشتريات)";
              }
            }

            if (needsApproval) {
              lateItems.push({
                id: order.id,
                name: order.client_name,
                amount: 0,
                date: order.created_at ? new Date(order.created_at) : null,
                type: 'shortage_approval',
                source: approvalTypeLabel
              });
            }
          }
        }

        // 2.5 Notification for ready for delivery (جاهز للتسليم) - visible to purchasing manager, manager, and admin
        if (order.stage === 'جاهز للتسليم') {
          const isPurchOrMgrOrAdmin = currentProfile && (hasRole(['purchasing_manager', 'manager', 'admin']) || hasPermission('orders') || hasPermission('purchasing'));
          if (isPurchOrMgrOrAdmin) {
            lateItems.push({
              id: order.id,
              name: order.client_name,
              amount: 0,
              date: order.created_at ? new Date(order.created_at) : null,
              type: 'ready_for_delivery',
              source: 'الطلب جاهز للتسليم وبانتظار التواصل والتسليم'
            });
          }
        }

        // 2.7 Notification for shortages fully approved (ready for purchase in purchasing.html) - visible to purchasing manager, manager, and admin
        const hasApprovedShortage = order.material_notes && order.material_notes.includes('عجز (معتمد للشراء)');
        if (hasApprovedShortage && !isDelivered) {
          const isPurchOrMgrOrAdmin = currentProfile && (hasRole(['purchasing_manager', 'manager', 'admin']) || hasPermission('orders') || hasPermission('purchasing'));
          if (isPurchOrMgrOrAdmin) {
            lateItems.push({
              id: order.id,
              name: order.client_name,
              amount: 0,
              date: order.created_at ? new Date(order.created_at) : null,
              type: 'shortage_approved_buy',
              source: 'نواقص معتمدة وجاهزة للشراء'
            });
          }
        }

        // 3. Late payment / installment notifications
        const remainingTotal = (order.total_price || 0) - (order.paid_amount || 0);
        if (remainingTotal <= 0) return;

        try {
          const installments = JSON.parse(order.payment_plan);
          if (Array.isArray(installments) && installments.length > 0) {
            const totalPlanned = installments.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
            const downPayment = Math.max(0, (order.total_price || 0) - totalPlanned);

            let paidPool = Math.max(0, (order.paid_amount || 0) - downPayment);

            let orderLateAmount = 0;
            let lateCount = 0;
            let firstLateDate = null;

            installments.forEach((inst, index) => {
              const instAmt = parseFloat(inst.amount) || 0;
              const instDateNormalized = normalizeDate(inst.date);

              if (paidPool < instAmt) {
                if (instDateNormalized <= todayNormalized) {
                  orderLateAmount += instAmt;
                  lateCount++;
                  if (!firstLateDate) firstLateDate = new Date(inst.date);
                }
                paidPool = 0;
              } else {
                paidPool -= instAmt;
              }
            });

            if (lateCount > 0) {
              lateItems.push({
                id: order.id,
                name: order.client_name,
                amount: orderLateAmount,
                date: firstLateDate,
                type: 'receivable',
                source: lateCount > 1 ? `مجموع ${lateCount} قسط متأخر` : 'قسط متأخر'
              });
            }
            return;
          }
        } catch (e) { }

        if (order.delivery_date) {
          if (normalizeDate(order.delivery_date) <= todayNormalized) {
            lateItems.push({
              id: order.id,
              name: order.client_name,
              amount: remainingTotal,
              date: new Date(order.delivery_date),
              type: 'receivable',
              source: 'طلبية'
            });
          }
        }
      });
    }

    // Normalize date field and sort all items chronologically (newest first)
    lateItems.forEach(item => {
      if (!item.date || isNaN(new Date(item.date).getTime())) {
        item.date = new Date();
      } else {
        item.date = new Date(item.date);
      }
    });
    lateItems.sort((a, b) => b.date.getTime() - a.date.getTime());
    allLateItems = lateItems;

    const bell = document.getElementById('notif-bell');
    const count = document.getElementById('notif-count');

    if (allLateItems.length > 0) {
      if (bell) {
        bell.classList.remove('hidden');
        bell.style.color = '#ff4444';
        bell.classList.add('pulse-animation');
      }
      if (count) count.textContent = allLateItems.length;
    } else {
      if (bell) {
        bell.classList.remove('hidden');
        bell.style.color = 'var(--text-muted)';
        bell.classList.remove('pulse-animation');
      }
      if (count) count.textContent = '0';
    }

    // Render the beautiful notification panels dynamically
    renderNotificationsList();

  } catch (e) { console.error('Failed to check global alerts', e); }
}

function renderNotificationsList() {
  const container = document.getElementById('notif-cards-container');
  const tabsBar = document.getElementById('notif-tabs-bar');
  const markAllBtn = document.getElementById('notif-mark-all-btn');

  if (!container || !tabsBar) return;

  // 1. Calculate counts for each tab filter (8 specific categories)
  let counts = {
    all: allLateItems.length,
    orders: 0,
    shortages: 0,
    ready_to_buy: 0,
    delivery: 0,
    client_pmt: 0,
    supplier_pmt: 0,
    updates: 0
  };

  allLateItems.forEach(item => {
    if (item.type === 'material_needed' || item.type === 'material_issue' || (item.type === 'admin_edit' && (item.source.includes("تعديل الكميات المطلوبة") || item.source.includes("خامات أوردر")))) {
      counts.orders++;
    } else if (item.type === 'shortage_approval' || (item.type === 'admin_edit' && (item.source.includes("اعتماد نواقص") || item.source.includes("جاهزة للشراء")))) {
      counts.shortages++;
    } else if (item.type === 'shortage_approved_buy') {
      counts.ready_to_buy++;
    } else if (item.type === 'ready_for_delivery') {
      counts.delivery++;
    } else if (item.type === 'receivable' || item.type === 'client') {
      counts.client_pmt++;
    } else if (item.type === 'supplier' || item.type === 'payable') {
      counts.supplier_pmt++;
    } else if (item.type === 'admin_edit') {
      counts.updates++;
    }
  });

  // 2. Render 8 Specific Tabs
  const tabDefs = [
    { id: 'all', label: 'الكل 🌐', count: counts.all },
    { id: 'orders', label: 'الخامات والطلبيات 📦', count: counts.orders },
    { id: 'shortages', label: 'اعتماد النواقص 📋', count: counts.shortages },
    { id: 'ready_to_buy', label: 'جاهز للشراء 🛒', count: counts.ready_to_buy },
    { id: 'delivery', label: 'جاهز للتسليم 🎉', count: counts.delivery },
    { id: 'client_pmt', label: 'أقساط العملاء 💵', count: counts.client_pmt },
    { id: 'supplier_pmt', label: 'سداد الموردين 💸', count: counts.supplier_pmt },
    { id: 'updates', label: 'تعديلات الإدارة ⚙️', count: counts.updates }
  ];

  tabsBar.innerHTML = tabDefs.map(tab => `
    <button class="notif-tab ${activeNotifTab === tab.id ? 'active' : ''}" onclick="filterNotifTab('${tab.id}')">
      <span>${tab.label}</span>
      <span class="notif-tab-count">${tab.count}</span>
    </button>
  `).join('');

  // 3. Show/hide "Mark all as read" button if there are system notifications in the active list
  const hasSystemNotifs = allLateItems.some(item => item.type === 'admin_edit');
  if (markAllBtn) {
    if (hasSystemNotifs) {
      markAllBtn.style.display = 'inline-flex';
    } else {
      markAllBtn.style.display = 'none';
    }
  }

  // 4. Filter list by tab and search query
  let filteredItems = allLateItems.filter(item => {
    // Tab filter
    if (activeNotifTab === 'orders') {
      const isOrderMat = item.type === 'material_needed' || item.type === 'material_issue' || (item.type === 'admin_edit' && (item.source.includes("تعديل الكميات المطلوبة") || item.source.includes("خامات أوردر")));
      if (!isOrderMat) return false;
    } else if (activeNotifTab === 'shortages') {
      const isShortage = item.type === 'shortage_approval' || (item.type === 'admin_edit' && (item.source.includes("اعتماد نواقص") || item.source.includes("جاهزة للشراء")));
      if (!isShortage) return false;
    } else if (activeNotifTab === 'ready_to_buy') {
      if (item.type !== 'shortage_approved_buy') return false;
    } else if (activeNotifTab === 'delivery') {
      if (item.type !== 'ready_for_delivery') return false;
    } else if (activeNotifTab === 'client_pmt') {
      if (item.type !== 'receivable' && item.type !== 'client') return false;
    } else if (activeNotifTab === 'supplier_pmt') {
      if (item.type !== 'supplier' && item.type !== 'payable') return false;
    } else if (activeNotifTab === 'updates') {
      const isGeneralEdit = item.type === 'admin_edit' && !item.source.includes("تعديل الكميات المطلوبة") && !item.source.includes("خامات أوردر") && !item.source.includes("اعتماد نواقص") && !item.source.includes("جاهزة للشراء");
      if (!isGeneralEdit) return false;
    }

    // Search query filter
    if (notifSearchQuery.trim()) {
      const q = notifSearchQuery.toLowerCase().trim();
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const sourceMatch = (item.source || '').toLowerCase().includes(q);
      const amountMatch = (item.amount || 0).toString().includes(q);
      return nameMatch || sourceMatch || amountMatch;
    }

    return true;
  });

  // 5. Render filtered list
  if (filteredItems.length === 0) {
    container.innerHTML = `
      <div class="notif-empty-state">
        <div class="notif-empty-icon">🔔</div>
        <div style="font-weight:700; color:var(--text-main); font-size: 0.95rem;">لا توجد تنبيهات في هذا القسم حالياً</div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top: 0.2rem;">قد تكون الفلاتر نشطة أو تم قراءة جميع الإشعارات المحددة.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filteredItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'notif-card';
    const dateStr = item.date ? new Date(item.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '';

    // Pass clicking event parameters to call handleNotifCardClick when card clicked
    card.setAttribute('onclick', `handleNotifCardClick(event, '${item.type}', '${item.id}', '${item.orderId || ''}', '${item.name.replace(/'/g, "\\'")}')`);

    if (item.type === 'admin_edit') {
      card.classList.add('notif-system');
      let notifTitle = "✏️ تعديل من الإدارة";
      if (item.source.includes("اعتماد نواقص") || item.source.includes("جاهزة للشراء")) {
        notifTitle = "🎉 اعتماد نواقص الشراء";
      } else if (item.source.includes("تم شراء خامات")) {
        notifTitle = "🛒 تم شراء خامات الطلبية";
      } else if (item.source.includes("الكمية المطلوبة") || item.source.includes("خامات أوردر")) {
        notifTitle = "🧱 تعديل خامات الطلبية";
      } else if (item.source.includes("مهمة جديدة للـ")) {
        notifTitle = "📌 مهمة جديدة مسندة إليك";
      } else if (item.source.includes("إشعار")) {
        notifTitle = "🔔 إشعار نظام";
      }

      card.innerHTML = `
        <div class="notif-card-header">
          <div class="notif-card-title" style="color: var(--pending-text);">${notifTitle}</div>
          <span class="notif-card-badge bg-system-badge">جديد</span>
        </div>
        <div class="notif-card-body">${item.source}</div>
        <div class="notif-card-footer">
          <div>${dateStr}</div>
          <button onclick="markNotifRead('${item.notifId}', this)" style="background:var(--pending-bg); color:var(--pending-text); border:none; border-radius:6px; padding:4px 12px; font-size:0.72rem; font-weight:700; cursor:pointer; font-family:inherit; transition: var(--transition);">تم القراءة ✓</button>
        </div>
      `;
    }
    else if (item.type === 'material_needed') {
      card.classList.add('notif-info');
      card.innerHTML = `
        <div class="notif-card-header">
          <div class="notif-card-title" style="color: var(--primary); font-weight: 800;">🧱 تحديد خامات مطلوب</div>
          <span class="notif-card-badge bg-info-badge">بانتظار التجهيز</span>
        </div>
        <div class="notif-card-body">
          الطلبية باسم العميل 
          <span class="notif-card-link">
            📦 ${item.name}
          </span>
          تم تسجيلها وبانتظار تحديد المواد والخامات من طرفكم لبدء التجهيز.
        </div>
        <div class="notif-card-footer">
          <div>تاريخ الطلب: ${dateStr}</div>
        </div>
      `;
    }
    else if (item.type === 'material_issue') {
      card.classList.add('notif-danger');
      card.innerHTML = `
        <div class="notif-card-header">
          <div class="notif-card-title" style="color: var(--danger-text); font-weight: 800;">⚠️ بلاغ مشكلة خامات</div>
          <span class="notif-card-badge bg-danger-badge">عاجل للحل</span>
        </div>
        <div class="notif-card-body">
          هناك مشكلة تم الإبلاغ عنها في خامات الطلبية:
          <span class="notif-card-link">
            📦 ${item.name}
          </span>
          <div style="background: var(--danger-bg); color: var(--danger-text); padding: 0.5rem 0.75rem; border-radius: 6px; font-weight: bold; margin-top: 0.4rem; font-size: 0.8rem;">
            الملاحظة: ${item.source}
          </div>
        </div>
        <div class="notif-card-footer">
          <div>تاريخ البلاغ: ${dateStr}</div>
        </div>
      `;
    }
    else if (item.type === 'shortage_approval') {
      card.classList.add('notif-warning');
      card.innerHTML = `
        <div class="notif-card-header">
          <div class="notif-card-title" style="color: var(--warning-text); font-weight: 800;">📋 اعتماد نواقص الشراء</div>
          <span class="notif-card-badge bg-warning-badge">مطلوب إجراء</span>
        </div>
        <div class="notif-card-body">
          الطلبية 
          <span class="notif-card-link">
            📦 ${item.name}
          </span>
          تحتوي على عجز في الخامات وتحتاج لاعتمادك ومراجعتك للموافقة على الشراء.
          <div style="font-weight: 700; color: var(--warning-text); margin-top: 0.25rem;">
            الإجراء المعلق: ${item.source}
          </div>
        </div>
        <div class="notif-card-footer">
          <div>تاريخ الطلب: ${dateStr}</div>
        </div>
      `;
    }
    else if (item.type === 'shortage_approved_buy') {
      card.classList.add('notif-success');
      card.innerHTML = `
        <div class="notif-card-header">
          <div class="notif-card-title" style="color: var(--success-text); font-weight: 800;">🎉 نواقص معتمدة وجاهزة للشراء</div>
          <span class="notif-card-badge bg-success-badge">جاهز للشراء</span>
        </div>
        <div class="notif-card-body">
          الطلبية 
          <span class="notif-card-link">
            📦 ${item.name}
          </span>
          تم اعتماد نواقصها بالكامل من الإدارة ومهندس الإنتاج وهي جاهزة للشراء في قسم الشراء الآن.
        </div>
        <div class="notif-card-footer">
          <div>تاريخ الطلب: ${dateStr}</div>
        </div>
      `;
    }
    else if (item.type === 'ready_for_delivery') {
      card.classList.add('notif-success');
      card.innerHTML = `
        <div class="notif-card-header">
          <div class="notif-card-title" style="color: var(--success-text); font-weight: 800;">🎉 الطلب جاهز للتسليم</div>
          <span class="notif-card-badge bg-success-badge">مكتمل وجاهز</span>
        </div>
        <div class="notif-card-body">
          تم الانتهاء تماماً من تصنيع وتجهيز طلبية العميل:
          <span class="notif-card-link">
            📦 ${item.name}
          </span>
          وهي الآن بانتظار تواصل الشحن أو التسليم للزبون.
        </div>
        <div class="notif-card-footer">
          <div>تاريخ الجاهزية: ${dateStr}</div>
        </div>
      `;
    }
    else {
      // receivable / accounts installments (financial payments)
      const isClient = item.type === 'receivable' || item.type === 'client';
      const today = new Date();
      const itemDate = new Date(item.date);
      const diffTime = today.getTime() - itemDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let daysText = '';
      let isOverdue = false;
      if (diffDays > 0) {
        daysText = diffDays > 36500 ? 'تاريخ قديم' : `متأخر ${diffDays} يوم ⚠️`;
        isOverdue = true;
      } else {
        daysText = 'مستحق اليوم ⏳';
      }

      card.classList.add(isOverdue ? 'notif-danger' : 'notif-warning');

      const amountFormatted = item.amount ? item.amount.toLocaleString() : '0';

      card.innerHTML = `
        <div class="notif-card-header">
          <div class="notif-card-title" style="color: ${isClient ? 'var(--primary-dark)' : 'var(--error)'}; font-weight: 800;">
            ${isClient ? '💵 قسط مستحق من عميل' : '💸 سداد مستحق لمورد'}
          </div>
          <span class="notif-card-badge ${isOverdue ? 'bg-danger-badge' : 'bg-warning-badge'}">${daysText}</span>
        </div>
        <div class="notif-card-body">
          دفعة مستحقة على 
          <span class="notif-card-link">
            👤 ${item.name}
          </span>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 0.4rem; background: var(--bg-color); padding: 0.4rem 0.75rem; border-radius: 6px; border: 1px solid var(--border);">
            <span style="font-size:0.8rem; color:var(--text-muted);">المبلغ المستحق:</span>
            <span style="font-size:1rem; font-weight:900; color:var(--success-text);">${amountFormatted} جنيه</span>
          </div>
        </div>
        <div class="notif-card-footer">
          <div>المصدر: ${item.source}</div>
          <div>تاريخ الاستحقاق: ${dateStr ? dateStr.split(' ')[0] : ''}</div>
        </div>
      `;
    }

    container.appendChild(card);
  });
}

window.filterNotifTab = function (tabId) {
  activeNotifTab = tabId;
  renderNotificationsList();
};

window.handleNotifSearch = function (query) {
  notifSearchQuery = query;
  renderNotificationsList();
};

window.handleNotifCardClick = function (event, type, id, orderId, name) {
  // If the user clicked on a button or an active element inside the card, ignore to let that button's event fire
  if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
    return;
  }

  if (type === 'admin_edit') {
    const oId = orderId || id;
    if (oId) {
      window.location.href = `client_orders.html?scroll=${oId}`;
      closeNotificationsModal();
    }
  } else if (['material_needed', 'material_issue', 'shortage_approval', 'ready_for_delivery', 'receivable'].includes(type)) {
    window.location.href = `client_orders.html?scroll=${id}`;
    closeNotificationsModal();
  } else if (type === 'shortage_approved_buy') {
    window.location.href = `purchasing.html`;
    closeNotificationsModal();
  } else if (type === 'client') {
    window.location.href = `customers.html?search=${encodeURIComponent(name)}`;
    closeNotificationsModal();
  } else if (type === 'supplier' || type === 'payable') {
    window.location.href = `purchasing.html`;
    closeNotificationsModal();
  }
};

window.markAllNotifsAsRead = async function () {
  if (!currentProfile) return;
  const systemNotifs = allLateItems.filter(item => item.type === 'admin_edit');
  if (systemNotifs.length === 0) return;

  const confirmMsg = `هل أنت متأكد من تحديد جميع تعديلات النظام (${systemNotifs.length}) كمقروءة؟`;
  const approved = await customConfirm(confirmMsg);
  if (!approved) return;

  try {
    showAlert('جاري تحديث الإشعارات...', 'pending');
    const sb = getSupabase();

    for (const notif of systemNotifs) {
      const notifId = notif.notifId;
      const { data, error } = await sb.from('notifications').select('read_by').eq('id', notifId).single();
      if (!error && data) {
        const readBy = data.read_by || [];
        if (!readBy.includes(currentProfile.id)) {
          readBy.push(currentProfile.id);
          await sb.from('notifications').update({ read_by: readBy }).eq('id', notifId);
        }
      }
    }

    showAlert('تم تحديد الإشعارات كمقروءة بنجاح!', 'success');
    await checkGlobalAlerts();
  } catch (e) {
    console.error(e);
    showAlert('حدث خطأ أثناء تحديث الإشعارات', 'error');
  }
};

function openNotificationsModal() {
  document.getElementById('global-notifications-modal').classList.remove('hidden');
}

function closeNotificationsModal() {
  document.getElementById('global-notifications-modal').classList.add('hidden');
}

async function markNotifRead(notifId, btn) {
  if (!currentProfile) return;
  try {
    const sb = getSupabase();
    // Fetch current read_by array and append current user
    const { data, error } = await sb.from('notifications').select('read_by').eq('id', notifId).single();
    if (error) throw error;
    const readBy = data.read_by || [];
    if (!readBy.includes(currentProfile.id)) {
      readBy.push(currentProfile.id);
      await sb.from('notifications').update({ read_by: readBy }).eq('id', notifId);
    }
    // Animate and remove the card
    const card = btn.closest('.notif-card');
    if (card) { card.style.opacity = '0'; card.style.transition = 'opacity 0.3s'; setTimeout(() => card.remove(), 300); }
    await checkGlobalAlerts();
  } catch (e) { console.warn('markNotifRead error:', e.message); }
}

document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.data-table').forEach(table => {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
      table.querySelectorAll('tbody tr').forEach(tr => {
        Array.from(tr.querySelectorAll('td')).forEach((td, i) => {
          if (headers[i] && !td.hasAttribute('data-label') && !td.hasAttribute('colspan')) {
            td.setAttribute('data-label', headers[i]);
          }
        });
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

window.toggleSidebar = function () {
  document.getElementById('sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('show');
};

async function checkAndDeleteTemporaryCustomer(clientName) {
  if (!clientName) return;
  const trimmedName = clientName.trim();
  console.log(`[checkAndDeleteTemporaryCustomer] البدء في التحقق من العميل: "${trimmedName}"`);
  try {
    const sb = getSupabase();
    
    // 1. Fetch customer by name to check if they are temporary (phone contains '[مؤقت]')
    let { data: custData, error: custErr } = await sb
      .from('customers')
      .select('*')
      .eq('name', trimmedName)
      .maybeSingle();

    if (custErr) {
      console.error('[checkAndDeleteTemporaryCustomer] Error fetching customer:', custErr);
      if (typeof showAlert === 'function') {
        showAlert(`خطأ أثناء التحقق من العميل في قاعدة البيانات: ${custErr.message}`, 'error');
      }
      return;
    }

    if (!custData) {
      // Fallback: Fetch all customers and search by trimmed name (case-insensitive & space-insensitive)
      console.log(`[checkAndDeleteTemporaryCustomer] لم يتم العثور على تطابق تام لـ "${trimmedName}"، جاري البحث في القائمة الكاملة...`);
      const { data: allCusts, error: allErr } = await sb.from('customers').select('*');
      if (!allErr && allCusts) {
        custData = allCusts.find(c => (c.name || '').trim() === trimmedName);
      }
    }

    if (!custData) {
      console.log(`[checkAndDeleteTemporaryCustomer] لم يتم العثور على العميل "${trimmedName}" في الداتا بيز.`);
      return;
    }

    const isTemporary = custData.phone && custData.phone.includes('[مؤقت]');
    console.log(`[checkAndDeleteTemporaryCustomer] تم العثور على العميل "${custData.name}". هل هو مؤقت؟ ${isTemporary}`);
    if (!isTemporary) return;

    // 2. Fetch all orders for this customer to verify they are all delivered and fully paid
    let { data: orders, error: ordersErr } = await sb
      .from('client_orders')
      .select('*')
      .eq('client_name', custData.name); // match exact stored name

    if (ordersErr) {
      console.error('[checkAndDeleteTemporaryCustomer] Error fetching orders:', ordersErr);
      if (typeof showAlert === 'function') {
        showAlert(`خطأ أثناء جلب طلبيات العميل: ${ordersErr.message}`, 'error');
      }
      return;
    }

    // Fallback: search all orders if no orders matched or just to be extremely safe
    if (!orders || orders.length === 0) {
      const { data: allOrders, error: allOrdersErr } = await sb.from('client_orders').select('*');
      if (!allOrdersErr && allOrders) {
        orders = allOrders.filter(o => (o.client_name || '').trim() === trimmedName);
      }
    }

    console.log(`[checkAndDeleteTemporaryCustomer] تم جلب ${orders ? orders.length : 0} طلبية للعميل "${custData.name}".`);

    const hasActiveOrUnpaid = (orders || []).some(o => {
      const remaining = (o.total_price || 0) - (o.paid_amount || 0);
      const isFullyPaid = remaining <= 0;
      const isDelivered = (o.stage === 'تم التسليم للزبون');
      console.log(`[checkAndDeleteTemporaryCustomer] الطلبية: ${o.id || o.order_display_name} | حالة التسليم: ${isDelivered} | حالة الدفع: ${isFullyPaid} (المتبقي: ${remaining})`);
      return !isDelivered || !isFullyPaid;
    });

    console.log(`[checkAndDeleteTemporaryCustomer] هل هناك طلبيات نشطة أو غير مدفوعة؟ ${hasActiveOrUnpaid}`);

    // 3. If there are no active/unpaid orders left, delete the customer
    if (!hasActiveOrUnpaid) {
      console.log(`[checkAndDeleteTemporaryCustomer] جاري حذف العميل المؤقت لتوفر الشروط... ID: ${custData.id}`);
      const { error: delErr } = await sb
        .from('customers')
        .delete()
        .eq('id', custData.id);
      if (delErr) {
        console.error('[checkAndDeleteTemporaryCustomer] Failed to delete customer:', delErr);
        if (typeof showAlert === 'function') {
          showAlert(`فشل حذف العميل المؤقت من الداتا بيز: ${delErr.message}`, 'error');
        }
      } else {
        console.log(`[checkAndDeleteTemporaryCustomer] Successfully deleted customer: ${custData.name}`);
        if (typeof showAlert === 'function') {
          showAlert(`تم حذف العميل المؤقت "${custData.name}" تلقائياً بنجاح لتسوية حسابه بالكامل وتسليم طلبياته 🎉🗑️`, 'success');
        }
      }
    }
  } catch (e) {
    console.error('Error in checkAndDeleteTemporaryCustomer:', e);
    if (typeof showAlert === 'function') {
      showAlert(`خطأ غير متوقع: ${e.message || e}`, 'error');
    }
  }
}
