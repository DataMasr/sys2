const SUPABASE_URL = 'https://ubkxmrhyijkbepynrtdt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVia3htcmh5aWprYmVweW5ydGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjg4NjgsImV4cCI6MjA5NzcwNDg2OH0.gcKTjmQh1YAVEW4co5hOTpfoQaA7oLanw5uB_cBef0M';

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
        .neq('stage', 'تم التسليم للزبون');

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

