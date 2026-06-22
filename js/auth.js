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
      const perms = currentProfile.permissions || {};
      const firstAllowed = Object.keys(perms)[0];
      if (firstAllowed) {
        const target = Object.entries(sectionMap).find(([key, val]) => val === firstAllowed);
        window.location.href = target ? target[0] : 'client_orders.html';
      } else {
        window.location.href = 'client_orders.html'; // Fallback to let enforce handle it
      }
    }
    return null;
  }

  if (typeof renderLayout === 'function') {
    renderLayout();
  }
  
  updateSidebarUser();
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
  if (role === 'admin') return 'الأونر';
  if (role === 'purchasing_manager') return 'مدير مشتريات';
  if (role === 'inventory_manager') return 'مدير التجهيزات';
  if (role === 'production_engineer') return 'مهندس إنتاج';
  if (role === 'manager') return 'الأونر';
  return 'مستخدم';
}

function hasPermission(sectionId, mode = 'read') {
  if (sectionId === 'tasks') return true;
  if (sectionId === 'progress') return true;
  if (sectionId === 'orders_history') return true;
  if (!currentProfile) return false;
  const role = currentProfile.role;

  // accounts, profits, customers restricted to admin + manager + purchasing_manager only
  if (['accounts', 'profits', 'customers'].includes(sectionId)) {
    return ['admin', 'manager', 'purchasing_manager'].includes(role);
  }

  if (['admin', 'purchasing_manager', 'inventory_manager', 'production_engineer', 'manager'].includes(role)) {
    return true;
  }
  
  const perms = currentProfile.permissions || {};
  if (!perms[sectionId]) return false;
  
  if (mode === 'full' && perms[sectionId] !== 'full') return false;
  
  return true;
}

function enforceRoutePermissions() {
  if (!currentProfile) return;
  const role = currentProfile.role;
  if (['admin', 'purchasing_manager', 'inventory_manager', 'production_engineer', 'manager'].includes(role)) {
    return; // Full access roles
  }

  const path = window.location.pathname;
  const perms = currentProfile.permissions || {};

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
    const firstAllowed = Object.keys(perms)[0];
    if (firstAllowed) {
      const target = Object.entries(sectionMap).find(([key, val]) => val === firstAllowed);
      if (target) {
        window.location.href = target[0];
        return;
      }
    }
    
    showAlert('عذراً، ليس لديك صلاحيات وصول لأي قسم. تواصل مع الأدمن.', 'error');
    setTimeout(() => logout(), 3000);
  }
}

function hideUnauthorizedElements() {
  if (!currentProfile) return;
  const role = currentProfile.role;
  if (['admin', 'purchasing_manager', 'inventory_manager', 'production_engineer', 'manager'].includes(role)) {
    return; // Full access roles
  }

  const path = window.location.pathname;
  const perms = currentProfile.permissions || {};

  const sectionMap = {
    'client_orders.html': 'orders',
    'inventory.html': 'inventory',
    'customers.html': 'customers',
    'pricing.html': 'pricing',
    'accounts.html': 'accounts',
    'profits.html': 'profits',
    'purchasing.html': 'purchasing',
    'users.html': 'users',
    'workers.html': 'workers'
  };

  let currentSection = null;
  for (const key in sectionMap) {
    if (path.includes(key)) {
      currentSection = sectionMap[key];
      break;
    }
  }

  if (currentSection && perms[currentSection] === 'read') {
    // Disable/Hide all buttons that imply action
    const actionButtons = document.querySelectorAll('.btn-primary, .btn-danger, button[onclick*="open"], button[onclick*="submit"], button[onclick*="delete"], button[onclick*="Update"], button[onclick*="Add"]');
    actionButtons.forEach(btn => {
      // If it's a "Close" or "Cancel" button, keep it
      if (btn.textContent.includes('إلغاء') || btn.textContent.includes('إغلاق')) return;
      
      btn.style.display = 'none';
    });
    
    // Also disable inputs
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.id.includes('search')) return; // Allow searching
      input.disabled = true;
      input.style.opacity = '0.7';
      input.style.cursor = 'not-allowed';
    });
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
