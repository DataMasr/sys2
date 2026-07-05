let currentUser = null;
let currentProfile = null;

async function initAuth() {
  const sb = getSupabase();
  const { data: { session }, error } = await sb.auth.getSession();

  if (!session) {
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
    return null;
  }

  currentUser = session.user;

  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
    if (profileError.code === 'PGRST116') {
      showAlert('المستخدم غير مسجل في النظام. اتصل بالأدمن.', 'error');
      await logout();
      return null;
    }
  }

  currentProfile = profile;
  if (currentProfile && currentProfile.role) {
    currentProfile.role = currentProfile.role.toLowerCase().trim();
  }

  const sectionMap = {
    'client_orders.html': 'orders',
    'orders_history.html': 'orders_history',
    'inventory.html': 'inventory',
    'customers.html': 'customers',
    'pricing.html': 'pricing',
    'accounts.html': 'accounts',
    'profits.html': 'profits',
    'purchasing.html': 'purchasing',
    'users.html': 'users',
    'progress.html': 'progress',
    'workers.html': 'workers'
  };

  if (window.location.pathname.includes('login.html')) {
    if (currentProfile.role === 'admin') {
      window.location.href = 'client_orders.html';
    } else {
      const orderedSections = [
        { id: 'orders', page: 'client_orders.html' },
        { id: 'orders_history', page: 'orders_history.html' },
        { id: 'tasks', page: 'tasks.html' },
        { id: 'progress', page: 'progress.html' },
        { id: 'inventory', page: 'inventory.html' },
        { id: 'purchasing', page: 'purchasing.html' },
        { id: 'profits', page: 'profits.html' },
        { id: 'accounts', page: 'accounts.html' },
        { id: 'customers', page: 'customers.html' },
        { id: 'workers', page: 'workers.html' },
        { id: 'users', page: 'users.html' }
      ];
      const allowed = orderedSections.find(s => hasPermission(s.id));
      if (allowed) {
        window.location.href = allowed.page;
      } else {
        window.location.href = 'client_orders.html'; // Fallback
      }
    }
    return null;
  }

  if (typeof renderLayout === 'function') {
    renderLayout();
  }

  updateSidebarUser();
  if (typeof updateSidebarBreakButton === 'function') {
    await updateSidebarBreakButton();
  }
  if (typeof updateSidebarLeaveButton === 'function') {
    updateSidebarLeaveButton();
  }
  enforceRoutePermissions();
  return { user: currentUser, profile: currentProfile };
}

function updateSidebarUser() {
  const nameEl = document.getElementById('user-name');
  const roleEl = document.getElementById('user-role');
  const avatarEl = document.getElementById('user-avatar');

  if (!currentProfile) return;

  if (nameEl) nameEl.textContent = currentProfile.full_name || currentProfile.email;
  if (roleEl) roleEl.textContent = getRoleLabel(currentProfile.role);
  if (avatarEl) {
    const name = currentProfile.full_name || currentProfile.email;
    avatarEl.textContent = name.charAt(0).toUpperCase();
  }
}

function getRoleLabel(role) {
  if (role === 'admin') return 'المدير العام';
  if (role === 'executive_director') return 'مدير تنفيذي';
  if (role === 'general_manager') return 'مدير عام';
  if (role === 'designer') return 'مصمم';
  if (role === 'employee') return 'موظف';

  // Legacy roles
  if (role === 'purchasing_manager') return 'مدير مشتريات';
  if (role === 'inventory_manager') return 'مدير التجهيزات';
  if (role === 'production_engineer') return 'مهندس إنتاج';
  if (role === 'manager') return 'مدير عام';
  return 'مستخدم';
}

/** أدوار الإدارة العليا — لا تظهر لها أزرار طلب إجازة / استراحة */
function isWorkerSelfServiceExcludedRole(role) {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return ['admin', 'general_manager', 'manager'].includes(r);
}

function hasPermission(sectionId, mode = 'read') {
  if (!currentProfile) return false;
  const role = currentProfile.role;

  // Admin has full access to everything
  if (role === 'admin') return true;

  // Check permissions JSON
  const perms = currentProfile.permissions || {};
  const userPerm = perms[sectionId]; // 'full', 'read', or 'none'/undefined

  // Default permissions if not set in JSON (for backward compatibility)
  if (userPerm === undefined) {
    if (['tasks', 'progress', 'orders_history'].includes(sectionId)) return true;

    // Legacy full-access roles
    if (['purchasing_manager', 'inventory_manager', 'production_engineer', 'manager'].includes(role)) {
      if (['accounts', 'profits', 'customers'].includes(sectionId)) {
        return ['manager', 'purchasing_manager'].includes(role);
      }
      return true;
    }
    return false;
  }

  if (userPerm === 'none') return false;

  if (mode === 'full') {
    return userPerm === 'full';
  }

  return true;
}

function canViewFinancials() {
  if (!currentProfile) return false;
  const role = currentProfile.role;
  if (role === 'admin') return true;

  // If they have access to accounts or profits, they can see financials
  if (hasPermission('accounts') || hasPermission('profits')) return true;

  // Backward compatibility / default roles
  return ['manager', 'general_manager', 'executive_director', 'purchasing_manager'].includes(role);
}

function hasRole(rolesList) {
  if (!currentProfile) return false;
  const role = currentProfile.role;
  if (role === 'admin') return true;

  let normalizedList = [...rolesList];
  if (rolesList.includes('manager')) {
    normalizedList.push('general_manager', 'executive_director');
  }
  if (rolesList.includes('admin')) {
    normalizedList.push('executive_director');
  }

  return normalizedList.includes(role);
}

function enforceRoutePermissions() {
  if (!currentProfile) return;
  const role = currentProfile.role;
  if (role === 'admin') {
    return; // Admin always bypasses route enforcement
  }

  const path = window.location.pathname;

  const sectionMap = {
    'client_orders.html': 'orders',
    'orders_history.html': 'orders_history',
    'inventory.html': 'inventory',
    'customers.html': 'customers',
    'pricing.html': 'pricing',
    'accounts.html': 'accounts',
    'profits.html': 'profits',
    'purchasing.html': 'purchasing',
    'users.html': 'users',
    'tasks.html': 'tasks',
    'progress.html': 'progress',
    'workers.html': 'workers'
  };

  let currentSection = null;
  for (const key in sectionMap) {
    if (path.includes(key)) {
      currentSection = sectionMap[key];
      break;
    }
  }

  // If on a restricted page, check access
  if (currentSection && !hasPermission(currentSection)) {
    const firstAllowed = Object.entries(sectionMap).find(([page, sec]) => hasPermission(sec));
    if (firstAllowed) {
      window.location.href = firstAllowed[0];
      return;
    }

    showAlert('عذراً، ليس لديك صلاحيات وصول لأي قسم. تواصل مع الأدمن.', 'error');
    setTimeout(() => logout(), 3000);
  }
}

function hideUnauthorizedElements() {
  if (!currentProfile) return;
  const role = currentProfile.role;
  if (role === 'admin') return; // Admin has full power

  const path = window.location.pathname;

  const sectionMap = {
    'client_orders.html': 'orders',
    'inventory.html': 'inventory',
    'customers.html': 'customers',
    'pricing.html': 'pricing',
    'accounts.html': 'accounts',
    'profits.html': 'profits',
    'purchasing.html': 'purchasing',
    'users.html': 'users',
    'workers.html': 'workers',
    'tasks.html': 'tasks',
    'progress.html': 'progress',
    'orders_history.html': 'orders_history'
  };

  let currentSection = null;
  for (const key in sectionMap) {
    if (path.includes(key)) {
      currentSection = sectionMap[key];
      break;
    }
  }

  // If the user has permission but only 'read' mode, disable/hide actions
  if (currentSection && !hasPermission(currentSection, 'full')) {
    // Disable/Hide all buttons that imply action
    const actionButtons = document.querySelectorAll('.btn-primary, .btn-danger, button[onclick*="open"], button[onclick*="submit"], button[onclick*="delete"], button[onclick*="Update"], button[onclick*="Add"]');
    actionButtons.forEach(btn => {
      // Keep cancel/close buttons, global sidebar self-service buttons, and modal actions visible
      if (btn.id === 'sidebar-attendance-btn') return;
      if (btn.id === 'sidebar-leave-btn') return;
      if (btn.closest('#attendance-self-modal')) return;
      if (btn.closest('#leave-request-modal')) return;
      if (btn.textContent.includes('إلغاء') || btn.textContent.includes('إغلاق')) return;

      btn.style.display = 'none';
    });

    // Also disable inputs
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.id.includes('search')) return; // Allow searching
      if (input.closest('#attendance-self-modal')) return;
      if (input.closest('#leave-request-modal')) return;
      input.disabled = true;
      input.style.opacity = '0.7';
      input.style.cursor = 'not-allowed';
    });
  }

  if (typeof updateSidebarLeaveButton === 'function') {
    updateSidebarLeaveButton();
  }
}

async function login(email, password) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    showAlert(error.message === 'Invalid login credentials' ? 'البريد أو كلمة المرور غير صحيحة' : error.message, 'error');
    return false;
  }

  window.location.reload();
  return true;
}

async function logout() {
  const sb = getSupabase();
  await sb.auth.signOut();
  window.location.href = 'login.html';
}

function showAlert(message, type = 'error') {
  const container = document.getElementById('alert-container');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `alert alert-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else if (type === 'pending') {
    iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; animation: spin 1.5s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
  }

  div.innerHTML = `${iconSvg}<span style="line-height: 1.4;">${message}</span>`;
  container.innerHTML = '';
  container.appendChild(div);

  setTimeout(() => div.remove(), 5000);
}

async function getProfiles() {
  const sb = getSupabase();
  const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function updateUserRole(userId, role) {
  const sb = getSupabase();
  const { error } = await sb.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.supabase) {
    await initAuth();
    hideUnauthorizedElements();
  }
});
