const SUPABASE_URL = 'https://ubkxmrhyijkbepynrtdt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVia3htcmh5aWprYmVweW5ydGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjg4NjgsImV4cCI6MjA5NzcwNDg2OH0.gcKTjmQh1YAVEW4co5hOTpfoQaA7oLanw5uB_cBef0M';

/** ساعات يوم العمل الطبيعي */
const STANDARD_WORK_DAY_HOURS = 10;
/** مضاعف خصم الغياب: يوم غياب = خصم يومين (20 ساعة) */
const ABSENCE_PENALTY_DAYS = 2;
/** أول يوم يُحسب فيه الغياب — لا يُخصم أي يوم قبل هذا التاريخ */
const ABSENCE_TRACKING_START_DATE = '2026-07-06';
/** توقيت مصر — مواعيد العمل 10 صباحاً → 10 مساءً */
const EGYPT_TIMEZONE = 'Africa/Cairo';
const WORK_SHIFT_START_HOUR = 10;
const WORK_SHIFT_END_HOUR = 22;

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
  }
  return supabaseClient;
}

function formatDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** التاريخ والساعة الحالية بتوقيت مصر */
function getEgyptNowParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: EGYPT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  });
  const parts = fmt.formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value || '0';
  const day = get('day').padStart(2, '0');
  const month = get('month').padStart(2, '0');
  return {
    dateStr: `${get('year')}-${month}-${day}`,
    hour: parseInt(get('hour'), 10) % 24
  };
}

/** هل انتهى يوم العمل؟ (بعد 10 مساءً بتوقيت مصر) */
function hasWorkDayEnded(dateStr, shiftEndHour = WORK_SHIFT_END_HOUR) {
  const { dateStr: egyptToday, hour } = getEgyptNowParts();
  if (dateStr < egyptToday) return true;
  if (dateStr > egyptToday) return false;
  return hour >= shiftEndHour;
}

/** هل يُسمح باحتساب الغياب/الخصم لهذا اليوم؟ */
function isAbsenceDateProcessable(dateStr, shiftEndHour = WORK_SHIFT_END_HOUR) {
  if (dateStr < ABSENCE_TRACKING_START_DATE) return false;
  return hasWorkDayEnded(dateStr, shiftEndHour);
}

function eachDateInRange(startDateStr, endDateStr) {
  const dates = [];
  const cur = new Date(startDateStr + 'T12:00:00');
  const end = new Date(endDateStr + 'T12:00:00');
  while (cur <= end) {
    dates.push(formatDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function isDateInLeaveRange(dateStr, leave) {
  return dateStr >= leave.start_date && dateStr <= leave.end_date;
}

function isWorkDay(dateStr, workDaysSet) {
  if (workDaysSet.has(dateStr)) return true;
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() !== 5; // الجمعة عطلة افتراضية
}

function getLeaveForDate(workerId, dateStr, leaveRequests) {
  return (leaveRequests || []).filter(lr =>
    lr.worker_id === workerId && isDateInLeaveRange(dateStr, lr)
  );
}

async function getOrCreateWorkerForProfile(sb, profile) {
  let { data: workers, error: workerErr } = await sb
    .from('workers')
    .select('*')
    .eq('profile_id', profile.id)
    .limit(1);

  if (workerErr) throw workerErr;
  let worker = workers && workers.length > 0 ? workers[0] : null;

  if (!worker) {
    const { data: matchedWorker } = await sb
      .from('workers')
      .select('*')
      .eq('name', profile.full_name)
      .maybeSingle();

    if (matchedWorker) {
      const { data: updatedWorker, error: linkErr } = await sb
        .from('workers')
        .update({ profile_id: profile.id })
        .eq('id', matchedWorker.id)
        .select()
        .single();
      if (linkErr) throw linkErr;
      worker = updatedWorker;
    } else {
      const { data: newWorker, error: createErr } = await sb
        .from('workers')
        .insert({
          name: profile.full_name,
          profile_id: profile.id,
          hourly_rate: 0
        })
        .select()
        .single();
      if (createErr) throw createErr;
      worker = newWorker;
    }
  }

  return worker;
}

/**
 * يخصم الغياب: يوم بيومين (20 ساعة) إذا لم يُقدّم طلب إجازة أو رُفض الطلب.
 * الإجازة المعتمدة = بدون خصم. الطلب المعلق = بدون خصم حتى يُبت فيه.
 */
async function processAbsenceDeductions(sb, workers, attendance, leaveRequests, existingDeductions) {
  const { dateStr: egyptTodayStr } = getEgyptNowParts();
  const workDaysSet = new Set((attendance || []).map(a => a.work_date));

  await sb.from('absence_deductions').delete().lt('work_date', ABSENCE_TRACKING_START_DATE);

  if (!hasWorkDayEnded(egyptTodayStr)) {
    await sb.from('absence_deductions').delete().eq('work_date', egyptTodayStr);
  }

  const existingKeys = new Set(
    (existingDeductions || [])
      .filter(d => d.work_date >= ABSENCE_TRACKING_START_DATE && hasWorkDayEnded(d.work_date))
      .map(d => `${d.worker_id}_${d.work_date}`)
  );

  const toInsert = [];
  const toDelete = [];

  for (const worker of workers || []) {
    const workerShiftEnd = worker.shift_end || WORK_SHIFT_END_HOUR;
    const shiftEndHour = parseInt(workerShiftEnd, 10) || WORK_SHIFT_END_HOUR;
    const workerAttDates = new Set(
      (attendance || []).filter(a => a.worker_id === worker.id).map(a => a.work_date)
    );

    const workerLeaves = (leaveRequests || []).filter(lr => lr.worker_id === worker.id);

    for (const leave of workerLeaves) {
      if (leave.status !== 'approved') continue;
      for (const dateStr of eachDateInRange(leave.start_date, leave.end_date)) {
        if (!isAbsenceDateProcessable(dateStr, shiftEndHour)) continue;
        if (existingKeys.has(`${worker.id}_${dateStr}`)) {
          toDelete.push({ worker_id: worker.id, work_date: dateStr });
        }
      }
    }

    const datesToCheck = new Set();
    workerLeaves.forEach(leave => {
      eachDateInRange(leave.start_date, leave.end_date).forEach(d => {
        if (isAbsenceDateProcessable(d, shiftEndHour)) datesToCheck.add(d);
      });
    });

    const workerStartStr = worker.created_at ? formatDateStr(worker.created_at) : ABSENCE_TRACKING_START_DATE;
    const effectiveStart = workerStartStr > ABSENCE_TRACKING_START_DATE ? workerStartStr : ABSENCE_TRACKING_START_DATE;
    const cur = new Date(effectiveStart + 'T12:00:00');
    const end = new Date(egyptTodayStr + 'T12:00:00');
    while (cur <= end) {
      const ds = formatDateStr(cur);
      if (isAbsenceDateProcessable(ds, shiftEndHour) && isWorkDay(ds, workDaysSet) && !workerAttDates.has(ds)) {
        datesToCheck.add(ds);
      }
      cur.setDate(cur.getDate() + 1);
    }

    for (const dateStr of datesToCheck) {
      if (!isAbsenceDateProcessable(dateStr, shiftEndHour)) continue;
      if (workerAttDates.has(dateStr)) continue;
      if (!isWorkDay(dateStr, workDaysSet)) continue;

      const leavesOnDate = getLeaveForDate(worker.id, dateStr, workerLeaves);
      const approved = leavesOnDate.some(l => l.status === 'approved');
      const pending = leavesOnDate.some(l => l.status === 'pending');
      const rejected = leavesOnDate.find(l => l.status === 'rejected');

      if (approved || pending) continue;

      const key = `${worker.id}_${dateStr}`;
      if (existingKeys.has(key)) continue;

      let reason = 'no_leave_request';
      let leaveRequestId = null;
      if (rejected) {
        reason = 'rejected_leave';
        leaveRequestId = rejected.id;
      }

      const deductionHours = STANDARD_WORK_DAY_HOURS * ABSENCE_PENALTY_DAYS;
      const hourlyRate = parseFloat(worker.hourly_rate) || 0;
      const deductionAmount = Number((deductionHours * hourlyRate).toFixed(2));

      toInsert.push({
        worker_id: worker.id,
        work_date: dateStr,
        deduction_hours: deductionHours,
        deduction_amount: deductionAmount,
        reason,
        leave_request_id: leaveRequestId
      });
      existingKeys.add(key);
    }
  }

  if (toDelete.length > 0) {
    for (const item of toDelete) {
      await sb.from('absence_deductions')
        .delete()
        .eq('worker_id', item.worker_id)
        .eq('work_date', item.work_date);
    }
  }

  if (toInsert.length > 0) {
    const { error } = await sb.from('absence_deductions').insert(toInsert);
    if (error && !error.message.includes('duplicate')) throw error;
  }
}

async function removeAbsenceDeductionsForLeave(sb, leave) {
  for (const dateStr of eachDateInRange(leave.start_date, leave.end_date)) {
    await sb.from('absence_deductions')
      .delete()
      .eq('worker_id', leave.worker_id)
      .eq('work_date', dateStr);
  }
}

function isMissingTableError(err) {
  if (!err) return false;
  return err.code === 'PGRST205';
}

function getDbErrorMessage(err, fallback) {
  if (!err) return fallback;
  let msg = err.message || fallback;
  if (err.code === 'PGRST205') {
    msg += ' — إذا أنشأت الجداول بالفعل: Supabase → Project Settings → API → Reload schema';
  }
  return msg;
}

/** إشعار موجّه لمستخدم محدد (يُخفى عن باقي المستخدمين) */
function buildTargetedNotificationMessage(targetProfileId, message) {
  return `<!--NOTIF_TO:${targetProfileId}-->${message}`;
}

function getNotificationTargetId(message) {
  if (!message) return null;
  const m = message.match(/^<!--NOTIF_TO:([^>]+)-->/);
  return m ? m[1] : null;
}

function getNotificationDisplayText(message) {
  if (!message) return '';
  return message.replace(/^<!--NOTIF_TO:[^>]+-->/, '').trim();
}

async function notifyWorkerProfile(sb, workerId, message, createdBy) {
  const { data: worker } = await sb.from('workers').select('profile_id, name').eq('id', workerId).maybeSingle();
  if (!worker?.profile_id) return;
  await sb.from('notifications').insert([{
    message: buildTargetedNotificationMessage(worker.profile_id, message),
    created_by: createdBy || null,
    read_by: []
  }]);
}

/** من يرى إشعار «طلب إجازة جديد» — المدير العام ومدير عام فقط */
function canReceiveLeaveRequestNotifications(role) {
  if (!role) return false;
  return ['admin', 'general_manager'].includes(role.toLowerCase().trim());
}

async function notifyLeaveManagers(sb, message, createdBy) {
  const { data: managers } = await sb
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'general_manager']);

  if (!managers || managers.length === 0) return;

  await sb.from('notifications').insert(
    managers.map(m => ({
      message: buildTargetedNotificationMessage(m.id, message),
      created_by: createdBy || null,
      read_by: []
    }))
  );
}

async function distributeWagesForDate(dateStr) {
  try {
    const sb = getSupabase();

    // 1. Get all completed attendance records for this date
    const { data: attendanceData, error: attError } = await sb.from('attendance')
      .select('earnings')
      .eq('work_date', dateStr)
      .not('check_out', 'is', null);

    if (attError) throw attError;

    const totalWages = (attendanceData || []).reduce((sum, a) => sum + (parseFloat(a.earnings) || 0), 0);

    // 2. Update general expenses table
    // Delete existing general expense for this date under category 'يومية عمال'
    const targetGeneralCategory = 'يومية عمال';
    const { error: genDelError } = await sb.from('expenses')
      .delete()
      .eq('expense_date', dateStr)
      .eq('category', targetGeneralCategory);

    if (genDelError) throw genDelError;

    if (totalWages > 0) {
      // Insert new general expense
      const { error: genInsError } = await sb.from('expenses')
        .insert([{
          expense_date: dateStr,
          category: targetGeneralCategory,
          amount: totalWages,
          notes: `إجمالي يوميات العمال ليوم ${dateStr}`
        }]);
      if (genInsError) throw genInsError;
    }

    // 3. Find client orders to distribute the wages
    // First, let's find orders created on this date
    const startDate = new Date(dateStr);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(dateStr);
    endDate.setDate(endDate.getDate() + 2);

    const startIso = startDate.toISOString().split('T')[0] + 'T00:00:00Z';
    const endIso = endDate.toISOString().split('T')[0] + 'T23:59:59Z';

    const { data: orders, error: ordersError } = await sb.from('client_orders')
      .select('id, order_display_name, client_name, created_at, stage, archived')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    if (ordersError) throw ordersError;

    let dayOrders = (orders || []).filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return localDateStr === dateStr;
    });

    // Smart Fallback: If no orders were created on this day, fetch all active orders on this day
    if (dayOrders.length === 0) {
      // Fetch all client orders in the system that are not archived and not delivered
      const { data: activeOrders, error: activeOrdersError } = await sb.from('client_orders')
        .select('id, order_display_name, client_name, created_at, stage, archived')
        .eq('archived', false)
        .neq('stage', 'تم التسليم');

      if (activeOrdersError) throw activeOrdersError;

      // Filter active orders that were created on or before dateStr
      dayOrders = (activeOrders || []).filter(o => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return localDateStr <= dateStr;
      });
    }

    const N = dayOrders.length;

    // 4. Delete existing order expenses for this date distribution
    const targetDescription = `يومية عمال - ${dateStr}`;
    const { error: delError } = await sb.from('order_expenses')
      .delete()
      .eq('description', targetDescription);

    if (delError) throw delError;

    if (totalWages > 0 && N > 0) {
      const share = Number((totalWages / N).toFixed(2));

      // 5. Insert new order expenses
      const expensesToInsert = dayOrders.map(order => ({
        order_id: order.id,
        description: targetDescription,
        amount: share,
        created_at: new Date(`${dateStr}T12:00:00Z`).toISOString()
      }));

      const { error: insError } = await sb.from('order_expenses').insert(expensesToInsert);
      if (insError) throw insError;
    }
    console.log(`Successfully distributed ${totalWages} wages among ${N} orders for ${dateStr}`);
  } catch (err) {
    console.error('Error distributing wages:', err);
    if (typeof showAlert === 'function') {
      showAlert('خطأ أثناء توزيع اليومية على الطلبيات: ' + err.message, 'error');
    }
  }
}

