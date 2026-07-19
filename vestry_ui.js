/* ============================================================
   VESTRY — Vestry.UI
   Rendering, event handlers, and all DOM access. Depends on
   Vestry.State and Vestry.Logic (both loaded first). Functions
   are still declared as plain top-level globals — this is what
   lets the existing inline onclick="" handlers in index.html
   keep working unchanged — and are additionally exposed under
   window.Vestry.UI below to satisfy the namespace architecture.
   Boot sequence (load/render the app on first paint) lives at
   the bottom of this file, after everything else is defined.
   ============================================================ */


// ── NAVIGATION ───────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.sb-item').forEach(function(i){ i.classList.remove('active'); });
  document.getElementById('page-' + name).classList.add('active');
  var nav = document.getElementById('nav-' + name);
  if (nav) nav.classList.add('active');
  if (name === 'config') renderConfigPage();
  if (name === 'workhours') renderWorkHoursPage();
  render();
}


// ── MONTH NAV ────────────────────────────────────────────────
function changeMonth(dir) {
  STATE.currentMonth += dir;
  if (STATE.currentMonth > 11) { STATE.currentMonth = 0; STATE.currentYear++; }
  if (STATE.currentMonth < 0)  { STATE.currentMonth = 11; STATE.currentYear--; }
  updateMonthLabel();
  render();
}

function updateMonthLabel() {
  var lbl = MONTHS[STATE.currentMonth] + ' ' + STATE.currentYear;
  document.getElementById('monthLabel').textContent    = lbl;
  document.getElementById('monthLabelMob').textContent = lbl;
}


// ── MOBILE MENU ──────────────────────────────────────────────
function toggleMobMenu() {
  document.getElementById('mob-actions').classList.toggle('open');
}


// ── THEME ────────────────────────────────────────────────────
function toggleTheme() {
  var isDark = document.body.classList.toggle('dark');
  updateThemeIcons(isDark);
  try { localStorage.setItem('vestry_theme', isDark ? 'dark' : 'light'); } catch(e){}
}

function updateThemeIcons(isDark) {
  ['','mob'].forEach(function(suffix){
    var s = suffix ? '-' + suffix : '';
    var li = document.getElementById('icon-light' + s);
    var di = document.getElementById('icon-dark'  + s);
    if (!li || !di) return;
    if (isDark) { di.classList.add('on'); li.classList.remove('on'); }
    else        { li.classList.add('on'); di.classList.remove('on'); }
  });
}

function loadTheme() {
  try {
    var t = localStorage.getItem('vestry_theme');
    var isDark = t === 'dark';
    if (isDark) document.body.classList.add('dark');
    updateThemeIcons(isDark);
  } catch(e) { updateThemeIcons(false); }
}


// ── MODALS & EDITING ─────────────────────────────────────────
function openModal(name, editId) {
  var elId = document.getElementById(name === 'transaction' ? 'txn-id' : name === 'recurring' ? 'rec-id' : name === 'goal' ? 'goal-id' : name === 'workhour' ? 'wh-id' : null);
  if (elId) elId.value = editId || '';
  if (name === 'workhour') {
    document.getElementById('modal-title-workhour').textContent = editId ? 'Edit Hours' : 'Log Hours';
  } else {
    document.getElementById('modal-title-' + name).textContent = editId ? 'Edit ' + (name==='transaction'?'Transaction':name==='recurring'?'Bill':'Goal') : 'Add ' + (name==='transaction'?'Transaction':name==='recurring'?'Recurring Bill':'Savings Goal');
  }

  if (name === 'transaction') {
    if (editId) {
      var t = STATE.transactions.find(function(x){ return x.id == editId; });
      if (t) {
        document.getElementById('txn-date').value  = t.date;
        document.getElementById('txn-desc').value  = t.desc;
        selectCategorySafely('txn-cat', t.cat);
        document.getElementById('txn-type').value  = t.type;
        document.getElementById('txn-amt').value   = t.amt;
        document.getElementById('txn-owner').value = t.owner || '';
        document.getElementById('txn-source').value = txnSource(t);
        document.getElementById('txn-transfer-dir').value = t.transferDirection || 'to_savings';
        document.getElementById('txn-custodial').checked = isCustodial(t);
      }
    } else {
      var d = new Date();
      document.getElementById('txn-date').value  = d.toISOString().split('T')[0];
      document.getElementById('txn-desc').value  = '';
      document.getElementById('txn-amt').value   = '';
      document.getElementById('txn-type').value  = 'expense';
      document.getElementById('txn-cat').value   = 'Other';
      document.getElementById('txn-owner').value = STATE.config.ownerTag || STATE.config.person || '';
      document.getElementById('txn-source').value = 'checking';
      document.getElementById('txn-transfer-dir').value = 'to_savings';
      document.getElementById('txn-custodial').checked = false;
    }
    onTxnTypeChange();
  } else if (name === 'recurring') {
    if (editId) {
      var r = STATE.recurring.find(function(x){ return x.id == editId; });
      if (r) {
        document.getElementById('rec-name').value = r.name;
        selectCategorySafely('rec-cat', r.cat);
        document.getElementById('rec-day').value  = r.day;
        document.getElementById('rec-amt').value  = r.amt;
      }
    } else {
      document.getElementById('rec-name').value = '';
      document.getElementById('rec-cat').value  = 'Housing';
      document.getElementById('rec-day').value  = '';
      document.getElementById('rec-amt').value  = '';
    }
  } else if (name === 'goal') {
    if (editId) {
      var g = STATE.goals.find(function(x){ return x.id == editId; });
      if (g) {
        document.getElementById('goal-name').value    = g.name;
        document.getElementById('goal-target').value  = g.target;
      }
    } else {
      document.getElementById('goal-name').value    = '';
      document.getElementById('goal-target').value  = '';
    }
  } else if (name === 'workhour') {
    if (editId) {
      var wh = STATE.workHours.find(function(x){ return x.id == editId; });
      if (wh) {
        document.getElementById('wh-date').value  = wh.date;
        document.getElementById('wh-hours').value = wh.hours;
        document.getElementById('wh-note').value  = wh.note || '';
      }
    } else {
      var dnow = new Date();
      document.getElementById('wh-date').value  = dnow.toISOString().split('T')[0];
      document.getElementById('wh-hours').value = '';
      document.getElementById('wh-note').value  = '';
    }
  }
  document.getElementById('modal-' + name).classList.add('open');
}
function openWorkHourModal(editId) { openModal('workhour', editId); }

function onTxnTypeChange() {
  var type = document.getElementById('txn-type').value;
  var srcRow = document.getElementById('txn-source-row');
  var xferRow = document.getElementById('txn-transfer-row');
  if (!srcRow || !xferRow) return;
  if (type === 'transfer') {
    srcRow.style.display = 'none';
    xferRow.style.display = '';
  } else {
    srcRow.style.display = '';
    xferRow.style.display = 'none';
  }
  updateCustodialRowVisibility();
}
function onTxnSourceChange() {
  updateCustodialRowVisibility();
}
// The "not my money" checkbox only makes sense for income/expense/one-off
// transactions landing in the savings account (e.g. a kid's gift check) —
// hide it (and clear it) everywhere else so it can't be left on by accident.
function updateCustodialRowVisibility() {
  var type = document.getElementById('txn-type') ? document.getElementById('txn-type').value : '';
  var source = document.getElementById('txn-source') ? document.getElementById('txn-source').value : 'checking';
  var row = document.getElementById('txn-custodial-row');
  if (!row) return;
  var applicable = type !== 'transfer' && source === 'savings';
  row.style.display = applicable ? '' : 'none';
  if (!applicable) {
    var cb = document.getElementById('txn-custodial');
    if (cb) cb.checked = false;
  }
}


function closeModal(name) { document.getElementById('modal-' + name).classList.remove('open'); }

document.querySelectorAll('.modal-bg').forEach(function(bg){
  bg.addEventListener('click', function(e){ if (e.target === bg) bg.classList.remove('open'); });
});

function typeColor(type) {
  return { income:'pos', expense:'neg', savings:'sav', savings_wd:'neg', 'one-off':'one', transfer:'sav' }[type] || 'neg';
}
function typePill(type) {
  var map = {
    income:  ['Income',  'pill-income'],
    expense: ['Expense', 'pill-expense'],
    savings: ['Deposit', 'pill-savings'],
    savings_wd: ['Withdrawal', 'pill-savings'],
    'one-off':['One-off','pill-oneoff'],
    transfer: ['Transfer', 'pill-savings']
  };
  var m = map[type] || ['Expense','pill-expense'];
  return '<span class="pill ' + m[1] + '">' + m[0] + '</span>';
}
function txnRow(t, showOwner) {
  var isTransfer = t.type === 'transfer';
  var sign = isTransfer
    ? (t.transferDirection === 'from_savings' ? '\u2190' : '\u2192')
    : (t.type === 'income' || t.type === 'savings') ? '+' : '\u2212';
  var ownerCell = showOwner ? '<td>' + (t.owner ? '<span class="owner-tag">' + esc(t.owner) + '</span>' : '') + '</td>' : '';
  var srcTag = (!isTransfer && txnSource(t) === 'savings') ? ' <span style="color:var(--savings);font-size:9px">\u00b7 savings acct</span>' : '';
  var custTag = isCustodial(t) ? ' <span style="color:var(--oneoff);font-size:9px">\u00b7 not mine</span>' : '';
  var catCell = isTransfer
    ? (t.transferDirection === 'from_savings' ? 'Savings \u2192 Checking' : 'Checking \u2192 Savings')
    : esc(t.cat) + srcTag + custTag;
  return '<tr>' +
    '<td>' + esc(t.date) + '</td>' +
    '<td>' + esc(t.desc) + '</td>' +
    '<td style="color:var(--text3)">' + catCell + '</td>' +
    ownerCell +
    '<td>' + typePill(t.type) + '</td>' +
    '<td class="amt ' + typeColor(t.type) + '" style="text-align:right">' + sign + fmt(t.amt) + '</td>' +
    '<td><div style="display:flex;gap:4px;justify-content:flex-end">' + 
    '<button class="del-btn edit-btn" onclick="openModal(\'transaction\', ' + t.id + ')" title="Edit">\u270e</button>' +
    '<button class="del-btn" onclick="deleteTransaction(' + t.id + ')" title="Delete">\u2715</button></div></td></tr>';
}

// ── SAVE / DELETE ─────────────────────────────────────────────
function saveTransaction() {
  var editId = document.getElementById('txn-id').value;
  var date   = document.getElementById('txn-date').value;
  var desc   = document.getElementById('txn-desc').value.trim();
  var cat    = document.getElementById('txn-cat').value;
  var type   = document.getElementById('txn-type').value;
  var amt    = parseFloat(document.getElementById('txn-amt').value);
  var owner  = document.getElementById('txn-owner').value.trim();
  var source = document.getElementById('txn-source') ? document.getElementById('txn-source').value : 'checking';
  var transferDirection = type === 'transfer'
    ? (document.getElementById('txn-transfer-dir') ? document.getElementById('txn-transfer-dir').value : 'to_savings')
    : undefined;
  var custodial = type !== 'transfer' && source === 'savings' && document.getElementById('txn-custodial')
    ? document.getElementById('txn-custodial').checked
    : false;

  if (!date || !desc || isNaN(amt) || amt <= 0) return;

  var record = { id: editId ? parseFloat(editId) : Date.now(), date, desc, cat, type, amt, owner, source: source || 'checking' };
  if (type === 'transfer') record.transferDirection = transferDirection || 'to_savings';
  if (custodial) record.custodial = true;

  if (editId) {
    var idx = STATE.transactions.findIndex(function(t) { return t.id == editId; });
    if (idx > -1) STATE.transactions[idx] = record;
  } else {
    STATE.transactions.push(record);
  }
  STATE.transactions.sort(function(a,b){ return b.date.localeCompare(a.date); });
  
  // Auto-switch to the month of the transaction so it doesn't disappear
  var dParts = date.split('-');
  if (dParts.length >= 2) {
    STATE.currentYear = parseInt(dParts[0]);
    STATE.currentMonth = parseInt(dParts[1]) - 1;
    updateMonthLabel();
  }

  save(); closeModal('transaction'); render();
}
function deleteTransaction(id) {
  STATE.transactions = STATE.transactions.filter(function(t){ return t.id !== id; });
  save(); render();
}


function saveRecurring() {
  var editId = document.getElementById('rec-id').value;
  var name   = document.getElementById('rec-name').value.trim();
  var cat    = document.getElementById('rec-cat').value;
  var amt    = parseFloat(document.getElementById('rec-amt').value);
  var day    = parseInt(document.getElementById('rec-day').value) || 1;
  
  if (!name || isNaN(amt) || amt <= 0) return;

  if (editId) {
    var idx = STATE.recurring.findIndex(function(r) { return r.id == editId; });
    if (idx > -1) STATE.recurring[idx] = { id: parseFloat(editId), name, cat, amt, day };
  } else {
    STATE.recurring.push({ id: Date.now(), name, cat, amt, day });
  }

  save(); closeModal('recurring'); render();
}

function deleteRecurring(id) {
  STATE.recurring = STATE.recurring.filter(function(r){ return r.id !== id; });
  save(); render();
}


function saveGoal() {
  var editId  = document.getElementById('goal-id').value;
  var name    = document.getElementById('goal-name').value.trim();
  var target  = parseFloat(document.getElementById('goal-target').value);
  
  if (!name || isNaN(target) || target <= 0) return;

  if (editId) {
    var idx = STATE.goals.findIndex(function(g) { return g.id == editId; });
    if (idx > -1) STATE.goals[idx] = { id: parseFloat(editId), name, target };
  } else {
    STATE.goals.push({ id: Date.now(), name, target });
  }

  save(); closeModal('goal'); render();
}

function deleteGoal(id) {
  STATE.goals = STATE.goals.filter(function(g){ return g.id !== id; });
  save(); render();
}


// ── WORK HOURS ───────────────────────────────────────────────
function saveWorkHour() {
  var editId = document.getElementById('wh-id').value;
  var date   = document.getElementById('wh-date').value;
  var hours  = parseFloat(document.getElementById('wh-hours').value);
  var note   = document.getElementById('wh-note').value.trim();

  if (!date || isNaN(hours) || hours <= 0) return;

  if (editId) {
    var idx = STATE.workHours.findIndex(function(w){ return w.id == editId; });
    if (idx > -1) {
      var existing = STATE.workHours[idx];
      STATE.workHours[idx] = { id: parseFloat(editId), date, hours, note, invoiceId: existing.invoiceId || null };
    }
  } else {
    STATE.workHours.push({ id: Date.now(), date, hours, note, invoiceId: null });
  }
  STATE.workHours.sort(function(a,b){ return b.date.localeCompare(a.date); });

  save(); closeModal('workhour'); renderWorkHoursPage();
}

function deleteWorkHour(id) {
  var w = STATE.workHours.find(function(x){ return x.id === id; });
  if (w && w.invoiceId) { toast('This entry is already on an invoice. Delete the invoice first if you need to remove it.', 'error'); return; }
  STATE.workHours = STATE.workHours.filter(function(x){ return x.id !== id; });
  save(); renderWorkHoursPage();
}

function openMileageModal(editId) {
  document.getElementById('ml-id').value = editId || '';
  document.getElementById('modal-title-mileage').textContent = editId ? 'Edit Mileage' : 'Log Mileage';
  document.getElementById('ml-unit-lbl-1').textContent = distUnit();
  document.getElementById('ml-unit-lbl-2').textContent = distUnit();
  if (editId) {
    var m = STATE.mileage.find(function(x){ return x.id == editId; });
    if (m) {
      document.getElementById('ml-date').value     = m.date;
      document.getElementById('ml-mode').value     = m.mode || 'distance';
      document.getElementById('ml-distance').value = m.distance;
      document.getElementById('ml-odo-start').value = m.odoStart != null ? m.odoStart : '';
      document.getElementById('ml-odo-end').value   = m.odoEnd != null ? m.odoEnd : '';
      document.getElementById('ml-rate').value     = (m.rate != null ? m.rate : (STATE.config.mileageRate || 0));
      document.getElementById('ml-note').value     = m.note || '';
    }
  } else {
    var dnow = new Date();
    document.getElementById('ml-date').value     = dnow.toISOString().split('T')[0];
    document.getElementById('ml-mode').value     = 'distance';
    document.getElementById('ml-distance').value = '';
    document.getElementById('ml-odo-start').value = '';
    document.getElementById('ml-odo-end').value   = '';
    document.getElementById('ml-rate').value     = STATE.config.mileageRate || 0;
    document.getElementById('ml-note').value     = '';
  }
  onMileageModeChange();
  document.getElementById('modal-mileage').classList.add('open');
}

function onMileageModeChange() {
  var mode = document.getElementById('ml-mode').value;
  document.getElementById('ml-distance-field').style.display = mode === 'distance' ? 'block' : 'none';
  document.getElementById('ml-odo-fields').style.display     = mode === 'odometer' ? 'grid'  : 'none';
  document.getElementById('ml-odo-calc').style.display       = mode === 'odometer' ? 'block' : 'none';
  if (mode === 'odometer') recalcMileageDistance();
}

function recalcMileageDistance() {
  var s = parseFloat(document.getElementById('ml-odo-start').value);
  var e = parseFloat(document.getElementById('ml-odo-end').value);
  var calc = document.getElementById('ml-odo-calc');
  if (!isNaN(s) && !isNaN(e) && e >= s) {
    var d = e - s;
    document.getElementById('ml-distance').value = d;
    calc.textContent = '= ' + d.toFixed(1) + ' ' + distUnit() + ' driven';
  } else {
    calc.textContent = 'Enter both readings (after ≥ before) to auto-calculate.';
  }
}

function saveMileage() {
  var editId = document.getElementById('ml-id').value;
  var date   = document.getElementById('ml-date').value;
  var mode   = document.getElementById('ml-mode').value;
  var distance = parseFloat(document.getElementById('ml-distance').value);
  var odoStart = document.getElementById('ml-odo-start').value === '' ? null : parseFloat(document.getElementById('ml-odo-start').value);
  var odoEnd   = document.getElementById('ml-odo-end').value === ''   ? null : parseFloat(document.getElementById('ml-odo-end').value);
  var rate   = parseFloat(document.getElementById('ml-rate').value);
  if (isNaN(rate) || rate < 0) rate = STATE.config.mileageRate || 0;
  var note   = document.getElementById('ml-note').value.trim();

  if (mode === 'odometer') {
    if (odoStart == null || odoEnd == null || odoEnd < odoStart) return;
    distance = odoEnd - odoStart;
  }
  if (!date || isNaN(distance) || distance <= 0) return;

  if (editId) {
    var idx = STATE.mileage.findIndex(function(m){ return m.id == editId; });
    if (idx > -1) {
      var existing = STATE.mileage[idx];
      STATE.mileage[idx] = { id: parseFloat(editId), date, mode, distance, odoStart, odoEnd, rate, note, invoiceId: existing.invoiceId || null };
    }
  } else {
    STATE.mileage.push({ id: Date.now(), date, mode, distance, odoStart, odoEnd, rate, note, invoiceId: null });
  }
  STATE.mileage.sort(function(a,b){ return b.date.localeCompare(a.date); });

  save(); closeModal('mileage'); renderWorkHoursPage();
}

function deleteMileage(id) {
  var m = STATE.mileage.find(function(x){ return x.id === id; });
  if (m && m.invoiceId) { toast('This entry is already on an invoice. Delete the invoice first if you need to remove it.', 'error'); return; }
  STATE.mileage = STATE.mileage.filter(function(x){ return x.id !== id; });
  save(); renderWorkHoursPage();
}


// ── EXPENSES ─────────────────────────────────────────────────
function openExpenseModal(editId) {
  document.getElementById('ex-id').value = editId || '';
  document.getElementById('modal-title-expense').textContent = editId ? 'Edit Expense' : 'Log Expense';
  if (editId) {
    var x = STATE.expenses.find(function(e){ return e.id == editId; });
    if (x) {
      document.getElementById('ex-date').value   = x.date;
      document.getElementById('ex-store').value  = x.store || '';
      document.getElementById('ex-amount').value = x.amount;
      document.getElementById('ex-note').value   = x.note || '';
    }
  } else {
    var dnow = new Date();
    document.getElementById('ex-date').value   = dnow.toISOString().split('T')[0];
    document.getElementById('ex-store').value  = '';
    document.getElementById('ex-amount').value = '';
    document.getElementById('ex-note').value   = '';
  }
  document.getElementById('modal-expense').classList.add('open');
}

function saveExpense() {
  var editId = document.getElementById('ex-id').value;
  var date   = document.getElementById('ex-date').value;
  var store  = document.getElementById('ex-store').value.trim();
  var amount = parseFloat(document.getElementById('ex-amount').value);
  var note   = document.getElementById('ex-note').value.trim();
  if (!date || !store || isNaN(amount) || amount <= 0) { toast('Enter a date, store, and amount.', 'error'); return; }

  if (editId) {
    var idx = STATE.expenses.findIndex(function(e){ return e.id == editId; });
    if (idx > -1) {
      var existing = STATE.expenses[idx];
      STATE.expenses[idx] = { id: parseFloat(editId), date, store, amount, note, invoiceId: existing.invoiceId || null };
    }
  } else {
    STATE.expenses.push({ id: Date.now(), date, store, amount, note, invoiceId: null });
  }
  STATE.expenses.sort(function(a,b){ return b.date.localeCompare(a.date); });
  save();
  closeModal('expense');
  renderWorkHoursPage();
  toast('Expense saved', 'ok');
}

function deleteExpense(id) {
  var x = STATE.expenses.find(function(e){ return e.id === id; });
  if (x && x.invoiceId) { toast('This entry is already billed or sent. Undo that first if you need to remove it.', 'error'); return; }
  STATE.expenses = STATE.expenses.filter(function(e){ return e.id !== id; });
  save(); renderWorkHoursPage();
  toast('Expense deleted', 'ok');
}

function updateExpensePreview() {
  var from = document.getElementById('es-from').value;
  var to   = document.getElementById('es-to').value;
  var prev = document.getElementById('es-summary-preview');
  if (!from || !to || from > to) { prev.innerHTML = ''; return; }
  var matched = entriesInRange(unbilledEntries(STATE.expenses), from, to)
    .sort(function(a,b){ return a.date.localeCompare(b.date); });
  if (!matched.length) {
    prev.innerHTML = '<div style="color:var(--text3);font-size:11px;padding:6px 0">No unbilled expenses in this range.</div>';
    return;
  }
  var total = sumExpenses(matched);
  var htmlLines = matched.map(function(e){ return esc(shortDate(e.date)) + ' — ' + esc(e.store) + ' — ' + fmt(e.amount); }).join('<br>');
  prev.innerHTML = '<div style="padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;user-select:all">' +
    '<strong>Total: ' + fmt(total) + '</strong><br><br>' + htmlLines + '</div>';
}

function copyExpenseSummary() {
  var from = document.getElementById('es-from').value;
  var to   = document.getElementById('es-to').value;
  var prev = document.getElementById('es-summary-preview');
  if (!from || !to || from > to) { toast('Pick a valid date range.', 'error'); return; }
  var matched = entriesInRange(unbilledEntries(STATE.expenses), from, to)
    .sort(function(a,b){ return a.date.localeCompare(b.date); });
  if (!matched.length) { toast('No unbilled expenses in that range.', 'error'); return; }
  var total = sumExpenses(matched);
  var text = 'Total: ' + fmt(total) + '\n\n' +
    matched.map(function(e){ return shortDate(e.date) + ' — ' + e.store + ' — ' + fmt(e.amount); }).join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function(){ toast('Copied to clipboard', 'ok'); }).catch(function(){ toast('Could not copy — select the text in the preview.', 'error'); });
  }
  if (!prev.querySelector('.btn')) {
    prev.insertAdjacentHTML('beforeend', '<button class="btn" style="margin-top:10px" onclick="markExpensesSent(\'' + from + '\',\'' + to + '\')">Mark these ' + matched.length + ' as sent</button>');
  }
}

function markExpensesSent(from, to) {
  var sid = 'summary-' + Date.now();
  var n = 0;
  STATE.expenses.forEach(function(e){
    if (!e.invoiceId && e.date >= from && e.date <= to) { e.invoiceId = sid; n++; }
  });
  save();
  renderWorkHoursPage();
  document.getElementById('es-summary-preview').innerHTML = '';
  toast(n + ' expense(s) marked as sent', 'ok');
}


function renderWorkHoursPage() {
  var c = STATE.config;
  var wage = c.invWage || 0;
  var mRate = c.mileageRate || 0;
  var unit = distUnit();

  var wk = rangeForPreset('week');
  var mo = rangeForPreset('month');
  var weekHrs  = sumHours(entriesInRange(STATE.workHours, wk[0], wk[1]));
  var monthHrs = sumHours(entriesInRange(STATE.workHours, mo[0], mo[1]));
  var unbilledHrs = sumHours(unbilledEntries(STATE.workHours));

  var weekDist  = sumDist(entriesInRange(STATE.mileage, wk[0], wk[1]));
  var monthDist = sumDist(entriesInRange(STATE.mileage, mo[0], mo[1]));
  var unbilledDist = sumDist(unbilledEntries(STATE.mileage));
  var ytdDist = sumDist(STATE.mileage.filter(function(m){ return m.date.startsWith(String(STATE.currentYear)); }));

  var monthExp    = sumExpenses(entriesInRange(STATE.expenses, mo[0], mo[1]));
  var unbilledExp = sumExpenses(unbilledEntries(STATE.expenses));
  var ytdExp      = sumExpenses(STATE.expenses.filter(function(e){ return e.date.startsWith(String(STATE.currentYear)); }));
  document.getElementById('wh-month-exp').textContent    = fmt(monthExp);
  document.getElementById('wh-unbilled-exp').textContent = fmt(unbilledExp);
  document.getElementById('wh-exp-ytd').textContent      = fmt(ytdExp);

  document.getElementById('wh-week-hrs').textContent  = weekHrs.toFixed(1) + ' hrs';
  document.getElementById('wh-week-amt').textContent  = fmt(weekHrs * wage);
  document.getElementById('wh-month-hrs').textContent = monthHrs.toFixed(1) + ' hrs';
  document.getElementById('wh-month-amt').textContent = fmt(monthHrs * wage);
  document.getElementById('wh-unbilled-hrs').textContent = unbilledHrs.toFixed(1) + ' hrs';
  document.getElementById('wh-unbilled-amt').textContent = fmt(unbilledHrs * wage + sumDistCost(unbilledEntries(STATE.mileage)));

  document.getElementById('wh-week-dist').textContent  = weekDist.toFixed(1) + ' ' + unit;
  document.getElementById('wh-week-dist-amt').textContent  = fmt(sumDistCost(entriesInRange(STATE.mileage, wk[0], wk[1])));
  document.getElementById('wh-month-dist').textContent = monthDist.toFixed(1) + ' ' + unit;
  document.getElementById('wh-month-dist-amt').textContent = fmt(sumDistCost(entriesInRange(STATE.mileage, mo[0], mo[1])));
  document.getElementById('wh-unbilled-dist').textContent = unbilledDist.toFixed(1) + ' ' + unit;
  document.getElementById('wh-unbilled-dist-amt').textContent = fmt(sumDistCost(unbilledEntries(STATE.mileage)));
  document.getElementById('wh-dist-ytd').textContent = ytdDist.toFixed(1);
  document.getElementById('wh-dist-ytd-unit').textContent = unit + ', all entries';

  var yearStr = String(STATE.currentYear);
  var paidYTD = STATE.invoices.filter(function(inv){ return inv.status === 'paid' && inv.paidDate && inv.paidDate.startsWith(yearStr); })
    .reduce(function(s,inv){ return s + inv.totalAmount; }, 0);
  document.getElementById('wh-paid-ytd').textContent = fmt(paidYTD);

  var invHtml = STATE.invoices.length === 0
    ? '<tr class="empty-row"><td colspan="7">No invoices generated yet.</td></tr>'
    : STATE.invoices.slice().sort(function(a,b){ return b.id - a.id; }).map(function(inv){
        var statusPill = inv.status === 'paid'
          ? '<span class="pill pill-income">Paid</span>'
          : '<span class="pill pill-expense">Unpaid</span>';
        var distCell = (inv.totalDistance || 0) > 0 ? inv.totalDistance.toFixed(1) + ' ' + (inv.mileageUnit || 'km') : '—';
        return '<tr>' +
          '<td>' + esc(inv.number) + '</td>' +
          '<td>' + esc(inv.from) + ' → ' + esc(inv.to) + '</td>' +
          '<td>' + inv.totalHours.toFixed(1) + '</td>' +
          '<td>' + distCell + '</td>' +
          '<td style="text-align:right" class="amt pos">' + fmt(inv.totalAmount) + '</td>' +
          '<td>' + statusPill + '</td>' +
          '<td><div style="display:flex;gap:4px;justify-content:flex-end">' +
          '<button class="del-btn edit-btn" onclick="viewInvoice(' + inv.id + ')" title="View">👁</button>' +
          '<button class="del-btn" onclick="deleteInvoice(' + inv.id + ')" title="Delete">✕</button></div></td></tr>';
      }).join('');
  document.getElementById('wh-invoice-body').innerHTML = invHtml;

  var hrsHtml = STATE.workHours.length === 0
    ? '<tr class="empty-row"><td colspan="5">No hours logged yet — click "+ Log Hours" to start.</td></tr>'
    : STATE.workHours.map(function(w){
        var statusPill = w.invoiceId
          ? '<span class="pill pill-savings">Invoiced</span>'
          : '<span class="pill pill-oneoff">Unbilled</span>';
        return '<tr>' +
          '<td>' + esc(w.date) + '</td>' +
          '<td>' + w.hours.toFixed(2) + '</td>' +
          '<td style="color:var(--text3)">' + esc(w.note || '') + '</td>' +
          '<td>' + statusPill + '</td>' +
          '<td><div style="display:flex;gap:4px;justify-content:flex-end">' +
          '<button class="del-btn edit-btn" onclick="openWorkHourModal(' + w.id + ')" title="Edit">✎</button>' +
          '<button class="del-btn" onclick="deleteWorkHour(' + w.id + ')" title="Delete">✕</button></div></td></tr>';
      }).join('');
  document.getElementById('wh-hours-body').innerHTML = hrsHtml;

  var mlHtml = STATE.mileage.length === 0
    ? '<tr class="empty-row"><td colspan="8">No mileage logged yet — click "+ Log Mileage" to start.</td></tr>'
    : STATE.mileage.map(function(m){
        var statusPill = m.invoiceId
          ? '<span class="pill pill-savings">Invoiced</span>'
          : '<span class="pill pill-oneoff">Unbilled</span>';
        var odoCell = (m.odoStart != null && m.odoEnd != null) ? (m.odoStart.toFixed(1) + ' → ' + m.odoEnd.toFixed(1)) : '—';
        var rate = (m.rate != null ? m.rate : (STATE.config.mileageRate || 0));
        var cost = rate * m.distance;
        return '<tr>' +
          '<td>' + esc(m.date) + '</td>' +
          '<td>' + m.distance.toFixed(1) + ' ' + unit + '</td>' +
          '<td style="color:var(--text3)">' + odoCell + '</td>' +
          '<td style="color:var(--text3)">' + fmt(rate) + '/' + unit + '</td>' +
          '<td style="text-align:right;color:var(--expense)">' + fmt(cost) + '</td>' +
          '<td style="color:var(--text3)">' + esc(m.note || '') + '</td>' +
          '<td>' + statusPill + '</td>' +
          '<td><div style="display:flex;gap:4px;justify-content:flex-end">' +
          '<button class="del-btn edit-btn" onclick="openMileageModal(' + m.id + ')" title="Edit">✎</button>' +
          '<button class="del-btn" onclick="deleteMileage(' + m.id + ')" title="Delete">✕</button></div></td></tr>';
      }).join('');
  document.getElementById('wh-mileage-body').innerHTML = mlHtml;

  var exHtml = STATE.expenses.length === 0
    ? '<tr class="empty-row"><td colspan="6">No expenses logged yet — click "+ Log Expense" to start.</td></tr>'
    : STATE.expenses.map(function(x){
        var sent = typeof x.invoiceId === 'string' && x.invoiceId.indexOf('summary-') === 0;
        var statusPill = x.invoiceId
          ? (sent ? '<span class="pill pill-savings">Sent</span>' : '<span class="pill pill-savings">Invoiced</span>')
          : '<span class="pill pill-oneoff">Unbilled</span>';
        return '<tr>' +
          '<td>' + esc(x.date) + '</td>' +
          '<td>' + esc(x.store) + '</td>' +
          '<td style="text-align:right;color:var(--expense)">' + fmt(x.amount) + '</td>' +
          '<td style="color:var(--text3)">' + esc(x.note || '') + '</td>' +
          '<td>' + statusPill + '</td>' +
          '<td><div style="display:flex;gap:4px;justify-content:flex-end">' +
          '<button class="del-btn edit-btn" onclick="openExpenseModal(' + x.id + ')" title="Edit">✎</button>' +
          '<button class="del-btn" onclick="deleteExpense(' + x.id + ')" title="Delete">✕</button></div></td></tr>';
      }).join('');
  document.getElementById('wh-expense-body').innerHTML = exHtml;

  // section count badges
  function setBadge(id, n, label) {
    var el = document.getElementById(id);
    if (el) el.textContent = n ? n + ' ' + label : '';
  }
  setBadge('whs-invoices-count', STATE.invoices.length, STATE.invoices.length === 1 ? 'invoice' : 'invoices');
  setBadge('whs-hours-count', STATE.workHours.length, STATE.workHours.length === 1 ? 'entry' : 'entries');
  setBadge('whs-mileage-count', STATE.mileage.length, STATE.mileage.length === 1 ? 'trip' : 'trips');
  setBadge('whs-expenses-count', STATE.expenses.length, STATE.expenses.length === 1 ? 'item' : 'items');
}


// ── INVOICE GENERATION ──────────────────────────────────────
function openInvoiceGenModal() {
  document.getElementById('ig-range').value = 'week';
  onInvoiceRangeChange();
  document.getElementById('modal-invoicegen').classList.add('open');
}

function onInvoiceRangeChange() {
  var preset = document.getElementById('ig-range').value;
  var fromEl = document.getElementById('ig-from'), toEl = document.getElementById('ig-to');
  if (preset !== 'custom') {
    var r = rangeForPreset(preset);
    fromEl.value = r[0]; toEl.value = r[1];
  }
  updateInvoiceGenPreview();
}

function updateInvoiceGenPreview() {
  var from = document.getElementById('ig-from').value;
  var to   = document.getElementById('ig-to').value;
  var prev = document.getElementById('ig-preview');
  var btn  = document.getElementById('ig-confirm-btn');
  if (!from || !to || from > to) { prev.innerHTML = 'Pick a valid date range.'; btn.disabled = true; btn.style.opacity = .4; return; }
  var matchedHrs = entriesInRange(unbilledEntries(STATE.workHours), from, to);
  var matchedDist = entriesInRange(unbilledEntries(STATE.mileage), from, to);
  var matchedExp = entriesInRange(unbilledEntries(STATE.expenses), from, to);
  var hrs = sumHours(matchedHrs);
  var dist = sumDist(matchedDist);
  var distCost = sumDistCost(matchedDist);
  var expCost = sumExpenses(matchedExp);
  var wage = STATE.config.invWage || 0;
  var avgRate = dist > 0 ? (distCost / dist) : 0;
  var unit = distUnit();
  if (matchedHrs.length === 0 && matchedDist.length === 0 && matchedExp.length === 0) {
    prev.innerHTML = 'No un-invoiced hours, mileage, or expenses found in this range.';
    btn.disabled = true; btn.style.opacity = .4;
    return;
  }
  var lines = [];
  if (matchedHrs.length > 0) lines.push(matchedHrs.length + ' day(s) · <strong>' + hrs.toFixed(2) + ' hrs</strong> × ' + fmt(wage) + '/hr = <strong>' + fmt(hrs * wage) + '</strong>');
  if (matchedDist.length > 0) lines.push(matchedDist.length + ' trip(s) · <strong>' + dist.toFixed(1) + ' ' + unit + '</strong> at each trip\'s logged rate (avg ' + fmt(avgRate) + '/' + unit + ') = <strong>' + fmt(distCost) + '</strong>');
  if (matchedExp.length > 0) lines.push(matchedExp.length + ' expense(s) = <strong>' + fmt(expCost) + '</strong>');
  var total = hrs * wage + distCost + expCost;
  var zeroRateTrips = matchedDist.filter(function(m){ return (m.rate != null ? m.rate : (STATE.config.mileageRate||0)) === 0; });
  var warn = '';
  if (matchedHrs.length > 0 && wage === 0) warn += '<br><span style="color:var(--expense)">⚠ Set your hourly wage in Config.</span>';
  if (zeroRateTrips.length > 0) warn += '<br><span style="color:var(--expense)">⚠ ' + zeroRateTrips.length + ' trip(s) have a $0 rate — edit them in the Mileage Log.</span>';
  prev.innerHTML = lines.join('<br>') + '<br>Total: <strong>' + fmt(total) + '</strong>' + warn;
  var blocked = (matchedHrs.length > 0 && wage === 0) || zeroRateTrips.length > 0;
  btn.disabled = blocked; btn.style.opacity = blocked ? .4 : 1;
}

function generateInvoice() {
  var from = document.getElementById('ig-from').value;
  var to   = document.getElementById('ig-to').value;
  var matchedHrs = entriesInRange(unbilledEntries(STATE.workHours), from, to);
  var matchedDist = entriesInRange(unbilledEntries(STATE.mileage), from, to);
  var matchedExp = entriesInRange(unbilledEntries(STATE.expenses), from, to);
  var wage = STATE.config.invWage || 0;
  var distCost = sumDistCost(matchedDist);
  var expCost = sumExpenses(matchedExp);
  var zeroRateTrips = matchedDist.filter(function(m){ return (m.rate != null ? m.rate : (STATE.config.mileageRate||0)) === 0; });
  if (matchedHrs.length === 0 && matchedDist.length === 0 && matchedExp.length === 0) return;
  if ((matchedHrs.length > 0 && wage <= 0) || zeroRateTrips.length > 0) return;

  var hrs = sumHours(matchedHrs);
  var dist = sumDist(matchedDist);
  var avgRate = dist > 0 ? (distCost / dist) : 0;
  var c = STATE.config;
  var num = (c.invPrefix || 'INV-') + String(c.invNext || 1).padStart(4, '0');
  var unit = distUnit();

  var invoice = {
    id: Date.now(),
    number: num,
    from: from, to: to,
    createdDate: dateStr(new Date()),
    contractorName: c.invName, contractorAddress: c.invAddress,
    companyName: c.invCompany, companyAddress: c.invCompanyAddress,
    hourlyWage: wage, totalHours: hrs,
    mileageRate: avgRate, mileageUnit: unit, totalDistance: dist,
    totalExpenses: expCost,
    totalAmount: hrs * wage + distCost + expCost,
    terms: c.invTerms, catLabel: c.invCat || 'Contract Income',
    status: 'unpaid', paidDate: null, transactionId: null,
    entryIds: matchedHrs.map(function(m){ return m.id; }),
    mileageEntryIds: matchedDist.map(function(m){ return m.id; }),
    expenseEntryIds: matchedExp.map(function(m){ return m.id; }),
    lineItems: matchedHrs.map(function(m){ return { date: m.date, hours: m.hours, note: m.note || '' }; })
      .sort(function(a,b){ return a.date.localeCompare(b.date); }),
    mileageLineItems: matchedDist.map(function(m){ return { date: m.date, distance: m.distance, rate: (m.rate != null ? m.rate : (STATE.config.mileageRate||0)), note: m.note || '' }; })
      .sort(function(a,b){ return a.date.localeCompare(b.date); }),
    expenseLineItems: matchedExp.map(function(m){ return { date: m.date, store: m.store, amount: m.amount, note: m.note || '' }; })
      .sort(function(a,b){ return a.date.localeCompare(b.date); })
  };

  matchedHrs.forEach(function(m){
    var w = STATE.workHours.find(function(x){ return x.id === m.id; });
    if (w) w.invoiceId = invoice.id;
  });
  matchedDist.forEach(function(m){
    var d = STATE.mileage.find(function(x){ return x.id === m.id; });
    if (d) d.invoiceId = invoice.id;
  });
  matchedExp.forEach(function(m){
    var x = STATE.expenses.find(function(e){ return e.id === m.id; });
    if (x) x.invoiceId = invoice.id;
  });

  STATE.invoices.push(invoice);
  STATE.config.invNext = (c.invNext || 1) + 1;

  save();
  closeModal('invoicegen');
  renderWorkHoursPage();
  viewInvoice(invoice.id);
}


// ── INVOICE VIEW / PRINT / PAID ─────────────────────────────
var _viewingInvoiceId = null;
function invoiceHTML(inv) {
  var rows = (inv.lineItems || []).map(function(li){
    return '<tr><td>' + esc(li.date) + '</td><td>' + esc(li.note) + '</td><td style="text-align:right">' + li.hours.toFixed(2) + '</td></tr>';
  }).join('');
  var mileageRows = (inv.mileageLineItems || []).map(function(li){
    var r = li.rate != null ? li.rate : (inv.mileageRate || 0);
    return '<tr><td>' + esc(li.date) + '</td><td>' + esc(li.note) + '</td><td style="text-align:right">' + li.distance.toFixed(1) + ' ' + (inv.mileageUnit||'km') + '</td><td style="text-align:right">' + fmt(r) + '</td><td style="text-align:right">' + fmt(r * li.distance) + '</td></tr>';
  }).join('');
  var expenseRows = (inv.expenseLineItems || []).map(function(li){
    return '<tr><td>' + esc(li.date) + '</td><td>' + esc(li.store) + (li.note ? ' — ' + esc(li.note) : '') + '</td><td style="text-align:right">' + fmt(li.amount) + '</td></tr>';
  }).join('');
  return '' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">' +
      '<div><div style="font-size:1.3rem;font-family:var(--serif)">Invoice ' + esc(inv.number) + '</div>' +
      '<div style="font-size:11px;color:var(--text3)">Date: ' + esc(inv.createdDate) + ' · Period: ' + esc(inv.from) + ' to ' + esc(inv.to) + '</div></div>' +
      '<div style="font-size:11px;color:var(--text3);text-align:right">Terms: ' + esc(inv.terms || '—') + '</div>' +
    '</div>' +
    '<div style="display:flex;gap:24px;margin-bottom:18px">' +
      '<div style="flex:1"><div style="font-size:9px;letter-spacing:1px;color:var(--text4);text-transform:uppercase">From</div>' +
        '<div>' + esc(inv.contractorName || '—') + '</div><div style="font-size:11px;color:var(--text3);white-space:pre-line">' + esc(inv.contractorAddress || '') + '</div></div>' +
      '<div style="flex:1"><div style="font-size:9px;letter-spacing:1px;color:var(--text4);text-transform:uppercase">Bill To</div>' +
        '<div>' + esc(inv.companyName || '—') + '</div><div style="font-size:11px;color:var(--text3);white-space:pre-line">' + esc(inv.companyAddress || '') + '</div></div>' +
    '</div>' +
    (rows ?
      '<table style="width:100%;border-collapse:collapse;margin-bottom:14px"><thead><tr style="border-bottom:1px solid var(--border)">' +
      '<th style="text-align:left;padding:6px 0">Date</th><th style="text-align:left">Note</th><th style="text-align:right">Hours</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' : '') +
    (mileageRows ?
      '<table style="width:100%;border-collapse:collapse;margin-bottom:14px"><thead><tr style="border-bottom:1px solid var(--border)">' +
      '<th style="text-align:left;padding:6px 0">Date</th><th style="text-align:left">Note</th><th style="text-align:right">Distance</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>' +
      '<tbody>' + mileageRows + '</tbody></table>' : '') +
    (expenseRows ?
      '<table style="width:100%;border-collapse:collapse;margin-bottom:14px"><thead><tr style="border-bottom:1px solid var(--border)">' +
      '<th style="text-align:left;padding:6px 0">Date</th><th style="text-align:left">Store / Note</th><th style="text-align:right">Amount</th></tr></thead>' +
      '<tbody>' + expenseRows + '</tbody></table>' : '') +
    '<div style="display:flex;justify-content:flex-end;gap:32px;border-top:1px solid var(--border);padding-top:10px">' +
      '<div style="text-align:right;font-size:11px;color:var(--text3)">' +
        (inv.totalHours > 0 ? 'Hours: ' + inv.totalHours.toFixed(2) + ' × ' + fmt(inv.hourlyWage) + '/hr = ' + fmt(inv.totalHours * inv.hourlyWage) + '<br>' : '') +
        ((inv.totalDistance||0) > 0 ? 'Mileage: ' + inv.totalDistance.toFixed(1) + ' ' + (inv.mileageUnit||'km') + ' (avg ' + fmt(inv.mileageRate||0) + '/' + (inv.mileageUnit||'km') + ') = ' + fmt(inv.totalDistance * (inv.mileageRate||0)) + '<br>' : '') +
        ((inv.totalExpenses||0) > 0 ? 'Expenses: ' + fmt(inv.totalExpenses) : '') +
      '</div>' +
      '<div style="text-align:right;font-size:1.2rem;font-family:var(--serif)">Total Due<br><strong>' + fmt(inv.totalAmount) + '</strong></div>' +
    '</div>' +
    '<div style="margin-top:14px;font-size:11px;color:var(--text3)">Status: ' + (inv.status === 'paid' ? 'Paid on ' + esc(inv.paidDate) : 'Unpaid') + '</div>';
}

function viewInvoice(id) {
  var inv = STATE.invoices.find(function(x){ return x.id === id; });
  if (!inv) return;
  _viewingInvoiceId = id;
  document.getElementById('iv-content').innerHTML = invoiceHTML(inv);
  var btn = document.getElementById('iv-paid-btn');
  btn.textContent = inv.status === 'paid' ? 'Mark as Unpaid' : 'Mark as Paid';
  document.getElementById('modal-invoiceview').classList.add('open');
}

function toggleInvoicePaidFromModal() {
  if (_viewingInvoiceId != null) toggleInvoicePaid(_viewingInvoiceId);
  viewInvoice(_viewingInvoiceId);
}

function toggleInvoicePaid(id) {
  var inv = STATE.invoices.find(function(x){ return x.id === id; });
  if (!inv) return;
  if (inv.status === 'unpaid') {
    inv.status = 'paid';
    inv.paidDate = dateStr(new Date());
    var txn = {
      id: Date.now(),
      date: inv.paidDate,
      desc: 'Invoice ' + inv.number + ' \u2014 ' + (inv.companyName || 'Contract work'),
      cat: inv.catLabel || 'Contract Income',
      type: 'income',
      amt: inv.totalAmount,
      owner: STATE.config.ownerTag || STATE.config.person || '',
      source: 'checking'
    };
    STATE.transactions.push(txn);
    STATE.transactions.sort(function(a,b){ return b.date.localeCompare(a.date); });
    inv.transactionId = txn.id;
  } else {
    inv.status = 'unpaid';
    inv.paidDate = null;
    if (inv.transactionId) {
      STATE.transactions = STATE.transactions.filter(function(t){ return t.id !== inv.transactionId; });
      inv.transactionId = null;
    }
  }
  save();
  renderWorkHoursPage();
  render();
}
function deleteInvoice(id) {
  var inv = STATE.invoices.find(function(x){ return x.id === id; });
  if (!inv) return;
  if (!confirm('Delete invoice ' + inv.number + '? Its logged hours, mileage, and expenses will become unbilled again.')) return;
  if (inv.transactionId) {
    STATE.transactions = STATE.transactions.filter(function(t){ return t.id !== inv.transactionId; });
  }
  STATE.workHours.forEach(function(w){ if (w.invoiceId === id) w.invoiceId = null; });
  STATE.mileage.forEach(function(m){ if (m.invoiceId === id) m.invoiceId = null; });
  STATE.expenses.forEach(function(x){ if (x.invoiceId === id) x.invoiceId = null; });
  STATE.invoices = STATE.invoices.filter(function(x){ return x.id !== id; });
  save();
  renderWorkHoursPage();
  render();
}

function printInvoiceFromModal() {
  if (_viewingInvoiceId == null) return;
  var inv = STATE.invoices.find(function(x){ return x.id === _viewingInvoiceId; });
  if (!inv) return;
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Invoice ' + esc(inv.number) + '</title>' +
    '<style>body{font-family:Georgia,serif;color:#1c1a16;padding:32px;max-width:680px;margin:0 auto}' +
    'table{width:100%;border-collapse:collapse}th,td{padding:6px 0}' +
    '@media print{body{padding:0}}</style></head><body>' + invoiceHTML(inv) + '</body></html>');
  w.document.close();
  w.focus();
  setTimeout(function(){ w.print(); }, 250);
}

function updateFuelRatePreview() {
  var price  = parseFloat(document.getElementById('cfg-fuel-price').value) || 0;
  var econ   = parseFloat(document.getElementById('cfg-fuel-economy').value) || 0;
  var unit   = document.getElementById('cfg-inv-mileage-unit').value || 'km';
  var el     = document.getElementById('cfg-fuel-rate-preview');
  if (!el) return;
  if (price > 0 && econ > 0) {
    var rate = computeFuelRate(price, econ, unit);
    el.textContent = 'Mileage rate: ' + fmt(rate) + ' / ' + unit + ' (from ' + fmt(price) + '/L at ' + econ + ' L/100km)';
  } else {
    el.textContent = 'Mileage rate: — enter fuel price and economy above';
  }
}


// ── COLLAPSIBLE CONFIG CARDS ─────────────────────────────────
function toggleConfigCard(headerEl) {
  headerEl.parentElement.classList.toggle('collapsed');
}

function toggleWHSection(id) {
  document.getElementById(id).classList.toggle('wh-collapsed');
}


// ── CONFIG ───────────────────────────────────────────────────
// ── DANGER ZONE — full data reset ───────────────────────────
function updateNukeButton() {
  var val = (document.getElementById('nuke-confirm').value || '').trim().toLowerCase();
  var btn = document.getElementById('nuke-btn');
  var armed = val === 'reset';
  btn.disabled = !armed;
  btn.style.opacity = armed ? '1' : '.4';
  btn.style.cursor = armed ? 'pointer' : 'not-allowed';
}

function nukeEverything() {
  var val = (document.getElementById('nuke-confirm').value || '').trim().toLowerCase();
  if (val !== 'reset') return;
  if (!confirm('This permanently deletes ALL data on this device — every transaction, work hour, mileage entry, expense, invoice, and setting. This cannot be undone. Continue?')) return;
  try {
    localStorage.removeItem('vestry_state');
    localStorage.removeItem('vestry_ob_done');
    localStorage.removeItem('vestry_install_dismissed');
  } catch(e) {}
  location.reload();
}


function saveConfig() {
  STATE.config.family        = document.getElementById('cfg-family').value.trim();
  STATE.config.person        = document.getElementById('cfg-person').value.trim();
  STATE.config.ownerTag      = document.getElementById('cfg-owner-tag').value.trim();
  STATE.config.incomeTarget  = parseFloat(document.getElementById('cfg-income-target').value) || 0;
  STATE.config.expenseLimit  = parseFloat(document.getElementById('cfg-expense-limit').value) || 0;
  STATE.config.savingsTarget = parseFloat(document.getElementById('cfg-savings-target').value) || 0;
  STATE.config.motivStyle    = document.getElementById('cfg-style').value;
  STATE.config.currency      = document.getElementById('cfg-currency').value;
  STATE.config.invName            = document.getElementById('cfg-inv-name').value.trim();
  STATE.config.invAddress         = document.getElementById('cfg-inv-address').value.trim();
  STATE.config.invCompany         = document.getElementById('cfg-inv-company').value.trim();
  STATE.config.invCompanyAddress  = document.getElementById('cfg-inv-company-address').value.trim();
  STATE.config.invWage            = parseFloat(document.getElementById('cfg-inv-wage').value) || 0;
  STATE.config.invPrefix          = document.getElementById('cfg-inv-prefix').value.trim() || 'INV-';
  STATE.config.invNext            = parseInt(document.getElementById('cfg-inv-next').value) || 1;
  STATE.config.invTerms           = document.getElementById('cfg-inv-terms').value.trim();
  STATE.config.invCat             = document.getElementById('cfg-inv-cat').value.trim() || 'Contract Income';
  STATE.config.fuelPricePerL      = parseFloat(document.getElementById('cfg-fuel-price').value) || 0;
  STATE.config.fuelEconomyL100km  = parseFloat(document.getElementById('cfg-fuel-economy').value) || 0;
  STATE.config.mileageUnit        = document.getElementById('cfg-inv-mileage-unit').value || 'km';
  STATE.config.mileageRate        = computeFuelRate(STATE.config.fuelPricePerL, STATE.config.fuelEconomyL100km, STATE.config.mileageUnit);
  save();
  renderBranding();
  render();
  var btn = event.target;
  var card = btn.closest('.config-card');
  btn.textContent = '✓ Saved';
  setTimeout(function(){ btn.textContent = 'Save'; if (card) card.classList.add('collapsed'); }, 1200);
}


function renderConfigPage() {
  var c = STATE.config;
  document.getElementById('cfg-family').value          = c.family || '';
  document.getElementById('cfg-person').value          = c.person || '';
  document.getElementById('cfg-owner-tag').value       = c.ownerTag || '';
  document.getElementById('cfg-income-target').value   = c.incomeTarget || '';
  document.getElementById('cfg-expense-limit').value   = c.expenseLimit || '';
  document.getElementById('cfg-savings-target').value  = c.savingsTarget || '';
  document.getElementById('cfg-style').value           = c.motivStyle || 'gentle';
  document.getElementById('cfg-currency').value        = c.currency || '$';
  document.getElementById('cfg-inv-name').value            = c.invName || '';
  document.getElementById('cfg-inv-address').value         = c.invAddress || '';
  document.getElementById('cfg-inv-company').value         = c.invCompany || '';
  document.getElementById('cfg-inv-company-address').value = c.invCompanyAddress || '';
  document.getElementById('cfg-inv-wage').value             = c.invWage || '';
  document.getElementById('cfg-inv-prefix').value           = c.invPrefix || 'INV-';
  document.getElementById('cfg-inv-next').value              = c.invNext || 1;
  document.getElementById('cfg-inv-terms').value             = c.invTerms || '';
  document.getElementById('cfg-inv-cat').value               = c.invCat || 'Contract Income';
  document.getElementById('cfg-fuel-price').value              = c.fuelPricePerL || '';
  document.getElementById('cfg-fuel-economy').value            = c.fuelEconomyL100km || '';
  document.getElementById('cfg-inv-mileage-unit').value       = c.mileageUnit || 'km';
  updateFuelRatePreview();
  renderBudgetGoalsList();
  renderCustomCategories();
}


function addBudgetGoal() {
  var label = document.getElementById('bg-label').value.trim();
  var cat   = document.getElementById('bg-cat').value;
  if (!label) return;
  STATE.config.budgetGoals.push({ id: Date.now(), label, cat });
  document.getElementById('bg-label').value = '';
  save();
  renderBudgetGoalsList();
}


function deleteBudgetGoal(id) {
  STATE.config.budgetGoals = STATE.config.budgetGoals.filter(function(g){ return g.id !== id; });
  save();
  renderBudgetGoalsList();
}


function renderBudgetGoalsList() {
  var list = document.getElementById('bg-list');
  if (!list) return;
  var goals = STATE.config.budgetGoals || [];
  if (goals.length === 0) { list.innerHTML = '<div style="font-size:10px;color:var(--text3);padding:4px 0">No intentions added yet.</div>'; return; }
  list.innerHTML = goals.map(function(g){
    return '<div class="budget-goal-row">' +
      '<span style="font-size:11px;color:var(--text)">' + esc(g.label) + '</span>' +
      '<span style="font-size:9px;color:var(--text3)">' + esc(g.cat) + '</span>' +
      '<button class="del-btn" onclick="deleteBudgetGoal(' + g.id + ')">✕</button></div>';
  }).join('');
}


// --- Custom Categories Logic ---
function addCustomCategory() {
  var cat = document.getElementById('cfg-new-cat').value.trim();
  if (!cat) return;
  if (!STATE.config.customCategories) STATE.config.customCategories = [];
  if (!STATE.config.customCategories.includes(cat)) {
    STATE.config.customCategories.push(cat);
    save();
    document.getElementById('cfg-new-cat').value = '';
    renderCustomCategories();
    updateCategoryDropdowns();
  }
}


function deleteCustomCategory(cat) {
  // Deleting only removes it from the quick-pick list \u2014 it never touches the
  // transactions themselves (category is a plain string on each one, not a
  // reference). But that's invisible unless we say so, so warn with the real
  // impact before removing anything used, and point at how to find those
  // transactions afterward (the Filter panel already does this \u2014 its
  // Category dropdown is built from categories actually in use, not from
  // this config list, so a deleted category stays fully filterable).
  var used = STATE.transactions.filter(function(t){ return t.cat === cat; });
  if (used.length > 0) {
    var total = used.reduce(function(s,t){ return s + t.amt; }, 0);
    var msg = '"' + cat + '" is used by ' + used.length + ' transaction' + (used.length===1?'':'s') +
      ' totaling ' + fmt(total) + '.\n\n' +
      'Deleting it only removes it from the quick-pick list \u2014 those transactions keep this category and stay fully visible in the ledger, Category Breakdown, Savings by Category, and the transaction Filter. You just won\u2019t be able to pick it for new entries unless you re-add it.\n\n' +
      'Continue?';
    if (!confirm(msg)) return;
  }
  STATE.config.customCategories = STATE.config.customCategories.filter(function(c){ return c !== cat; });
  save();
  renderCustomCategories();
  updateCategoryDropdowns();
  if (used.length > 0) {
    toast('Removed "' + cat + '" from your category list. ' + used.length + ' existing transaction' + (used.length===1?'':'s') + ' still tagged \u2014 use Filter \u2192 Category to find them.', 'ok');
  }
}


function renderCustomCategories() {
  var list = document.getElementById('custom-cat-list');
  if (!list) return;
  var cats = STATE.config.customCategories || [];
  if (cats.length === 0) { list.innerHTML = '<div style="font-size:10px;color:var(--text3);padding:4px 0">No custom categories added.</div>'; return; }
  list.innerHTML = cats.map(function(c){
    var count = STATE.transactions.filter(function(t){ return t.cat === c; }).length;
    var usageTag = count > 0 ? ' <span style="color:var(--text3);font-size:9px">(' + count + ' transaction' + (count===1?'':'s') + ')</span>' : '';
    return '<div class="budget-goal-row">' +
      '<span style="font-size:11px;color:var(--text)">' + esc(c) + usageTag + '</span>' +
      '<button class="del-btn" onclick="deleteCustomCategory(\'' + esc(c) + '\')">✕</button></div>';
  }).join('');
}


var DEFAULT_CATEGORIES = ['Income','Housing','Utilities','Groceries','Transport','Insurance','Health','Entertainment','Dining','Clothing','Savings','One-off','Other'];

// Registers any category names not already known (default or custom) into
// STATE.config.customCategories, so imported data's categories show up in
// dropdowns for new entries \u2014 and, combined with selectCategorySafely,
// never get silently discarded when an imported transaction is edited.
function registerNewCategories(cats) {
  var known = {};
  DEFAULT_CATEGORIES.forEach(function(c){ known[c]=true; });
  (STATE.config.customCategories||[]).forEach(function(c){ known[c]=true; });
  var added = [];
  (cats||[]).forEach(function(c){ if (c && !known[c]) { known[c]=true; added.push(c); } });
  if (added.length) STATE.config.customCategories = (STATE.config.customCategories||[]).concat(added);
  return added;
}

function updateCategoryDropdowns() {
  var defaults = DEFAULT_CATEGORIES;
  var customs = STATE.config.customCategories || [];
  var optionsHtml = defaults.map(function(c){ return '<option value="'+esc(c)+'">'+esc(c)+'</option>'; }).join('') + 
                    (customs.length ? '<optgroup label="Custom">' + customs.map(function(c){ return '<option value="'+esc(c)+'">'+esc(c)+'</option>'; }).join('') + '</optgroup>' : '');

  var txnCat = document.getElementById('txn-cat');
  var recCat = document.getElementById('rec-cat');
  if (txnCat) { var val = txnCat.value; txnCat.innerHTML = optionsHtml; txnCat.value = val || 'Other'; }
  if (recCat) { var val2 = recCat.value; recCat.innerHTML = optionsHtml; recCat.value = val2 || 'Housing'; }
}

// Setting a <select>'s .value to something that isn't one of its <option>s
// fails silently in HTML \u2014 selectedIndex just becomes -1, and the next save
// writes back whatever WAS showing, quietly discarding the real category.
// This happened for real: importing a backup with new custom categories
// didn't refresh the open dropdown, so editing an imported transaction wiped
// its category. Belt and suspenders: always refresh from current config
// first, and if the value still isn't an option (any other stale-dropdown
// case we haven't hit yet), inject it directly rather than lose data.
function selectCategorySafely(selectId, cat) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  updateCategoryDropdowns();
  var hasOption = Array.prototype.some.call(sel.options, function(o){ return o.value === cat; });
  if (!hasOption && cat) {
    var opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    sel.appendChild(opt);
  }
  sel.value = cat;
}


// ── TRANSACTION FILTER PANEL (v2.39) ───────────────────────────────────────
// Populates the Category filter dropdown from every category actually in
// use (not just the default + custom lists), so CSV-imported or one-off
// category names are still filterable even if never formally registered.
function populateTxnFilterCatDropdown() {
  var sel = document.getElementById('txn-filter-cat');
  if (!sel) return;
  var seen = {};
  STATE.transactions.forEach(function(t){ if (t.cat) seen[t.cat] = true; });
  DEFAULT_CATEGORIES.forEach(function(c){ seen[c] = true; });
  (STATE.config.customCategories || []).forEach(function(c){ seen[c] = true; });
  var sorted = Object.keys(seen).sort();
  var val = sel.value;
  sel.innerHTML = '<option value="">All Categories</option>' +
    sorted.map(function(c){ return '<option value="'+esc(c)+'">'+esc(c)+'</option>'; }).join('');
  sel.value = val;
}

function getTxnFilters() {
  var el = function(id){ return document.getElementById(id); };
  var amtMin = el('txn-filter-amt-min') ? parseFloat(el('txn-filter-amt-min').value) : NaN;
  var amtMax = el('txn-filter-amt-max') ? parseFloat(el('txn-filter-amt-max').value) : NaN;
  return {
    q: el('txn-filter-search') ? el('txn-filter-search').value : '',
    type: el('txn-filter-type') ? el('txn-filter-type').value : '',
    cat: el('txn-filter-cat') ? el('txn-filter-cat').value : '',
    source: el('txn-filter-source') ? el('txn-filter-source').value : '',
    from: el('txn-filter-date-from') ? el('txn-filter-date-from').value : '',
    to: el('txn-filter-date-to') ? el('txn-filter-date-to').value : '',
    amtMin: isNaN(amtMin) ? null : amtMin,
    amtMax: isNaN(amtMax) ? null : amtMax
  };
}

function renderAllTxnTable() {
  var body = document.getElementById('all-txn-body');
  if (!body) return;
  var countEl = document.getElementById('txn-filter-count');
  if (STATE.transactions.length === 0) {
    body.innerHTML = '<tr class="empty-row"><td colspan="7">No transactions yet.</td></tr>';
    if (countEl) countEl.textContent = '';
    return;
  }
  var f = getTxnFilters();
  var filtered = filterTxns(STATE.transactions, f);
  if (countEl) {
    countEl.textContent = 'Showing ' + filtered.length + ' of ' + STATE.transactions.length;
  }
  body.innerHTML = filtered.length === 0
    ? '<tr class="empty-row"><td colspan="7">No transactions match your filters.</td></tr>'
    : filtered.map(function(t){ return txnRow(t, true); }).join('');
}

function clearTxnFilters() {
  ['txn-filter-search','txn-filter-date-from','txn-filter-date-to','txn-filter-amt-min','txn-filter-amt-max'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  ['txn-filter-type','txn-filter-cat','txn-filter-source'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  renderAllTxnTable();
}

// --- Backup Check Logic ---
function checkBackupStatus() {
  var banner = document.getElementById('backup-banner');
  var text = document.getElementById('backup-banner-text');
  var dismissBtn = document.getElementById('backup-dismiss-btn');
  if (!banner) return;

  if (STATE.transactions.length === 0) { banner.style.display = 'none'; return; }

  // Anchor point for "how long has this account gone unbacked-up": the last
  // backup, if there's ever been one, otherwise firstUseDate \u2014 a separate,
  // explicit timestamp of when THIS account started (see ensureFirstUseDate
  // in vestry_state.js), never inferred from transaction dates. Backdated or
  // imported data must never look like an old, overdue account.
  var last = STATE.config.lastBackupDate || 0;
  var anchor = last || STATE.config.firstUseDate || Date.now();
  var days = (Date.now() - anchor) / (1000 * 60 * 60 * 24);

  // Grace period: don't nag a brand-new account in its first week, even if
  // it's never been backed up \u2014 there's been no real time to form the habit.
  var graceDays = 7;
  if (!last && days < graceDays) { banner.style.display = 'none'; return; }

  if (days > 45) {
    banner.style.display = 'flex';
    banner.style.borderColor = 'var(--expense)';
    banner.querySelector('.motiv-title').style.color = 'var(--expense)';
    text.textContent = 'URGENT: It has been ' + Math.floor(days) + ' days since your last backup. Please download a copy now to secure your data.';
    dismissBtn.style.display = 'none';
  } else if (days > 30) {
    banner.style.display = 'flex';
    banner.style.borderColor = 'var(--oneoff)';
    banner.querySelector('.motiv-title').style.color = 'var(--oneoff)';
    text.textContent = 'It has been ' + Math.floor(days) + ' days since your last backup.';
    dismissBtn.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}


function renderBranding() {
  var c = STATE.config;
  var familyLbl = document.getElementById('logo-family-lbl');
  var sbName    = document.getElementById('sb-person-name');
  var sbRole    = document.getElementById('sb-person-role');
  if (familyLbl) familyLbl.textContent = c.family || '';
  if (sbName)    sbName.textContent    = c.person || c.family || 'My Budget';
  if (sbRole)    sbRole.textContent    = c.family || 'household';
}


// ── MOTIVATIONAL BANNER ───────────────────────────────────────
function renderMotivBanner(txns) {
  var banner  = document.getElementById('motiv-banner');
  var icon    = document.getElementById('motiv-icon');
  var title   = document.getElementById('motiv-title');
  var body    = document.getElementById('motiv-body');
  var badge   = document.getElementById('motiv-badge');
  var c       = STATE.config;
  var style   = c.motivStyle || 'gentle';

  var income   = globalIncome(txns);
  var expenses = globalExpenses(txns);
  var saved    = netSavingsContribution(txns);
  var score    = calcHealthScore(txns);
  var sl       = scoreLabel(score, style);

  banner.style.display = 'flex';
  badge.style.display  = 'none';

  var name = c.person ? c.person.split(' ')[0] + ', ' : '';

  if (txns.length === 0) {
    icon.textContent  = '\ud83d\udc4b';
    title.textContent = name + 'ready to start tracking?';
    body.textContent  = c.family
      ? 'Welcome to ' + c.family + "'s budget. Add your first transaction to get started."
      : 'Add your first transaction to see your dashboard come to life.';
    var bgs = c.budgetGoals || [];
    if (bgs.length > 0) {
      body.textContent += ' Your focus: ' + bgs[0].label + '.';
    }
    return;
  }

  if (score !== null) {
    badge.style.display = 'inline-block';
    badge.textContent   = sl.grade;
    var col = healthColor(score);
    badge.style.background = col === 'var(--income)' ? 'var(--income-bg)' : col === 'var(--expense)' ? 'var(--expense-bg)' : 'var(--gold-bg)';
    badge.style.color = col;
  }

  var icons = ['\ud83d\ude2c','\ud83d\ude10','\ud83d\udcaa','\ud83c\udf1f','\ud83c\udfc6'];
  var bucket = score === null ? 1 : score < 40 ? 0 : score < 55 ? 1 : score < 70 ? 2 : score < 85 ? 3 : 4;
  icon.textContent = icons[bucket];

  var bgs = c.budgetGoals || [];
  if (bgs.length > 0) {
    title.textContent = name + 'working toward: ' + bgs[0].label;
  } else {
    var titles = [
      name + 'let\'s tighten things up this month.',
      name + 'staying on track.',
      name + 'good momentum this month.',
      name + 'strong month so far.',
      name + 'excellent budget health! \ud83c\udf89'
    ];
    title.textContent = titles[bucket];
  }

  var parts = [];
  if (c.expenseLimit > 0) {
    var pct = Math.round((expenses / c.expenseLimit) * 100);
    parts.push('Expenses at ' + pct + '% of your ' + fmt(c.expenseLimit) + ' limit.');
  }
  if (c.savingsTarget > 0) {
    var spct = Math.round((saved / c.savingsTarget) * 100);
    parts.push('Saved ' + spct + '% of your ' + fmt(c.savingsTarget) + ' monthly target.');
  }
  parts.push(sl.msg);
  body.textContent = parts.join(' ');
}

// ── MAIN RENDER ──────────────────────────────────────────────
function render() {
  var txns = monthTxns();
  var c    = STATE.config;
  var income   = globalIncome(txns);
  var expenses = globalExpenses(txns);
  var saved    = netSavingsContribution(txns);
  var net      = checkingNet(txns);

  // All-time cumulative liquid position: everything strictly before the currently-viewed month,
  // vs. this month's activity, so "am I bleeding overall" doesn't get hidden by a single good month.
  var ym = STATE.currentYear + '-' + String(STATE.currentMonth + 1).padStart(2,'0');
  var priorTxns = STATE.transactions.filter(function(t){ return t.date && t.date < ym + '-01'; });
  var startingBalance = checkingBalance(priorTxns, 0);
  var endingBalance = checkingBalance(priorTxns.concat(txns), 0);
  var carryNet = endingBalance - startingBalance;

  // All-time Savings Balance: the actual cumulative pot, distinct from "contributed this month."
  var savingsBal = allTimeSavingsBalance();

  var startEl = document.getElementById('carry-start');
  if (startEl) {
    startEl.textContent = (startingBalance < 0 ? '\u2212' : '') + fmt(startingBalance);
    startEl.style.color = startingBalance < 0 ? 'var(--expense)' : 'var(--text)';
    var carryNetEl = document.getElementById('carry-net');
    carryNetEl.textContent = (carryNet >= 0 ? '+' : '\u2212') + fmt(carryNet);
    carryNetEl.style.color = carryNet >= 0 ? 'var(--income)' : 'var(--expense)';
    var endEl = document.getElementById('carry-end');
    endEl.textContent = (endingBalance < 0 ? '\u2212' : '') + fmt(endingBalance);
    endEl.style.color = endingBalance >= 0 ? 'var(--text)' : 'var(--expense)';
    var carryLbl = document.getElementById('carry-month-lbl');
    if (carryLbl) carryLbl.textContent = MONTHS_SHORT[STATE.currentMonth] + ' ' + STATE.currentYear;
  }
  var balEl = document.getElementById('ov-saved');
  if (balEl) {
    var totalGoalTargetOv = STATE.goals.reduce(function(s,g){ return s+(g.target||0); }, 0);
    balEl.textContent = (savingsBal < 0 ? '\u2212' : '') + fmt(savingsBal) + (totalGoalTargetOv>0 ? ' / '+fmt(totalGoalTargetOv) : '');
    balEl.style.color = savingsBal < 0 ? 'var(--expense)' : 'var(--savings)';
  }

  document.getElementById('ov-income').textContent   = fmt(income);
  document.getElementById('ov-expenses').textContent = fmt(expenses);
  var savedMonthEl = document.getElementById('ov-saved-month');
  if (savedMonthEl && savedMonthEl.firstChild) {
    savedMonthEl.firstChild.textContent = 'this month: ' + (saved >= 0 ? '+' : '\u2212') + fmt(saved);
  }
  var netEl = document.getElementById('ov-net');
  netEl.textContent = (net >= 0 ? '+' : '\u2212') + fmt(net);
  netEl.style.color = net >= 0 ? 'var(--income)' : 'var(--expense)';

  var ytdStr = String(STATE.currentYear);
  var cwHrsYTD  = sumHours(STATE.workHours.filter(function(w){ return w.date.startsWith(ytdStr); }));
  var cwDistYTD = sumDist(STATE.mileage.filter(function(m){ return m.date.startsWith(ytdStr); }));
  var cwUnbilled = sumHours(unbilledEntries(STATE.workHours)) * (c.invWage || 0) + sumDistCost(unbilledEntries(STATE.mileage));
  var cwPaidYTD = STATE.invoices.filter(function(inv){ return inv.status === 'paid' && inv.paidDate && inv.paidDate.startsWith(ytdStr); })
    .reduce(function(s,inv){ return s + inv.totalAmount; }, 0);
  var ovCwHrs = document.getElementById('ov-cw-hrs');
  if (ovCwHrs) {
    ovCwHrs.textContent = cwHrsYTD.toFixed(1);
    document.getElementById('ov-cw-dist').textContent = cwDistYTD.toFixed(1);
    document.getElementById('ov-cw-dist-unit').textContent = distUnit() + ' logged this year';
    document.getElementById('ov-cw-unbilled').textContent = fmt(cwUnbilled);
    document.getElementById('ov-cw-paid').textContent = fmt(cwPaidYTD);
  }

  function setCardProg(progId, fillId, lblId, actual, target, color, suffix) {
    var prog = document.getElementById(progId);
    var fill = document.getElementById(fillId);
    var lbl  = document.getElementById(lblId);
    if (!prog) return;
    if (target > 0) {
      prog.style.display = 'block';
      var pct = Math.min(100, Math.round((actual / target) * 100));
      fill.style.width = pct + '%';
      fill.style.background = pct > 100 ? 'var(--expense)' : color;
      lbl.textContent = pct + '% of ' + fmt(target) + ' target';
    } else {
      prog.style.display = 'none';
    }
  }
  setCardProg('ov-income-prog',  'ov-income-fill',  'ov-income-prog-lbl',  income,   c.incomeTarget,  'var(--income)',  '');
  setCardProg('ov-expense-prog', 'ov-expense-fill', 'ov-expense-prog-lbl', expenses, c.expenseLimit,  'var(--expense)', '');
  setCardProg('ov-saved-prog',   'ov-saved-fill',   'ov-saved-prog-lbl',   saved,    c.savingsTarget, 'var(--savings)', '');

  renderMotivBanner(txns);

  var score = calcHealthScore(txns);
  var sl    = scoreLabel(score, c.motivStyle);
  var sbScore = document.getElementById('sb-score');
  var sbFill  = document.getElementById('sb-score-fill');
  var sbMsg   = document.getElementById('sb-score-msg');
  sbScore.textContent   = score !== null ? sl.grade : '\u2014';
  sbScore.style.color   = healthColor(score);
  sbFill.style.width    = (score || 0) + '%';
  sbFill.style.background = healthColor(score);
  sbMsg.textContent     = sl.msg;

  var recent = txns.slice(0, 8);
  var html = recent.length === 0
    ? '<tr class="empty-row"><td colspan="6">No transactions this month \u2014 add one to get started.</td></tr>'
    : recent.map(function(t){ return txnRow(t, false); }).join('');
  document.getElementById('ov-txn-body').innerHTML = html;

  populateTxnFilterCatDropdown();
  renderAllTxnTable();

  renderCatBars('ov-cat-chart', txns);

  var recTotal = STATE.recurring.reduce(function(s,r){ return s+r.amt; },0);
  document.getElementById('rec-total').textContent = fmt(recTotal);
  document.getElementById('rec-daily').textContent = fmt(recTotal / 30);
  document.getElementById('rec-count').textContent = STATE.recurring.length;
  var recHtml = STATE.recurring.length === 0
    ? '<div style="grid-column:span 2;text-align:center;padding:28px;color:var(--text3);font-size:11px">No recurring bills added yet.</div>'
    : STATE.recurring.map(function(r){
        return '<div class="rec-card">' +
          '<div><div class="rec-name">' + esc(r.name) + '</div><div class="rec-meta">' + esc(r.cat) + ' \u00b7 due day ' + r.day + '</div></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><span class="rec-amt">' + fmt(r.amt) + '</span>' +
          '<button class="del-btn edit-btn" onclick="openModal(\'recurring\', ' + r.id + ')" title="Edit">\u270e</button>' +
          '<button class="del-btn" onclick="deleteRecurring(' + r.id + ')" title="Delete">\u2715</button></div></div>';
      }).join('');
  document.getElementById('rec-grid').innerHTML = recHtml;

  var goalsHtml = STATE.goals.length === 0
    ? '<div style="grid-column:span 3;text-align:center;padding:28px;color:var(--text3);font-size:11px">No savings goals yet. Add one to track your progress.</div>'
    : STATE.goals.map(function(g){
        return '<div class="goal-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">' +
          '<div class="goal-name">' + esc(g.name) + '</div>' +
          '<div><button class="del-btn edit-btn" onclick="openModal(\'goal\', ' + g.id + ')" title="Edit">\u270e</button>' +
          '<button class="del-btn" onclick="deleteGoal(' + g.id + ')" title="Delete">\u2715</button></div></div>' +
          '<div class="goal-amounts"><strong>Target: ' + fmt(g.target) + '</strong></div>' +
          '</div>';
      }).join('');
  document.getElementById('goals-grid').innerHTML = goalsHtml;

  var savTxns = txns.filter(function(t){ return t.type==='transfer' || txnSource(t)==='savings'; });
  var savHtml = savTxns.length === 0
    ? '<tr class="empty-row"><td colspan="5">No savings activity this month.</td></tr>'
    : savTxns.map(function(t){
        var isWithdrawal = (t.type === 'transfer' && t.transferDirection === 'from_savings') || ((t.type==='expense'||t.type==='one-off') && txnSource(t)==='savings');
        var sign = isWithdrawal ? '\u2212' : '+';
        var colorClass = isWithdrawal ? 'neg' : 'sav';
        var label = t.type === 'transfer' ? (t.transferDirection === 'from_savings' ? 'Savings \u2192 Checking' : 'Checking \u2192 Savings') : t.cat;
        return '<tr><td>' + esc(t.date) + '</td><td>' + esc(t.desc) + '</td>' +
               '<td style="color:var(--text3)">' + esc(label) + '</td>' +
               '<td class="amt ' + colorClass + '" style="text-align:right">' + sign + fmt(t.amt) + '</td>' +
               '<td><div style="display:flex;gap:4px;justify-content:flex-end">' +
               '<button class="del-btn edit-btn" onclick="openModal(\'transaction\', ' + t.id + ')" title="Edit">\u270e</button>' + 
               '<button class="del-btn" onclick="deleteTransaction(' + t.id + ')" title="Delete">\u2715</button></div></td></tr>';
      }).join('');
  document.getElementById('sav-txn-body').innerHTML = savHtml;

  renderSavCatBreakdown('sav-cat-breakdown');
  renderSavCatBreakdown('ov-sav-cat-breakdown');

  renderTrends();
}

// Shared "Savings by Category" all-time running-balance renderer, used on
// both the Overview page and the dedicated Savings page.
function renderSavCatBreakdown(elId) {
  var el = document.getElementById(elId);
  if (!el) return;
  var catBalances = savingsByCategory(STATE.transactions);
  el.innerHTML = catBalances.length === 0
    ? '<div style="text-align:center;padding:16px;color:var(--text3);font-size:11px">No category-tagged savings activity yet. Log a deposit as Income with Funding Source: Savings and a category name to start tracking one.</div>'
    : catBalances.map(function(row){
        var neg = row.balance < 0;
        return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span>' + esc(row.cat) + '</span>' +
          '<strong style="color:' + (neg ? 'var(--expense)' : 'var(--savings)') + '">' + (neg ? '\u2212' : '') + fmt(row.balance) + '</strong></div>';
      }).join('');
}

function renderCatBars(containerId, txns) {
  var cats = {};
  txns.filter(function(t){ return (t.type==='expense' || t.type==='one-off') && txnSource(t)==='checking'; }).forEach(function(t){
    cats[t.cat] = (cats[t.cat] || 0) + t.amt;
  });
  var sorted = Object.keys(cats).sort(function(a,b){ return cats[b]-cats[a]; });
  var max = sorted.length ? cats[sorted[0]] : 1;
  var container = document.getElementById(containerId);
  if (!container) return;
  if (sorted.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:11px">No expense categories this period.</div>';
    return;
  }
  container.innerHTML = sorted.map(function(cat){
    var pct = Math.round((cats[cat]/max)*100);
    return '<div class="bar-row">' +
      '<div class="bar-lbl" title="' + esc(cat) + '">' + esc(cat) + '</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:var(--expense)"></div></div>' +
      '<div class="bar-val">' + fmt(cats[cat]) + '</div></div>';
  }).join('');
}

function renderTrends() {
  var months = [];
  for (var i = 5; i >= 0; i--) {
    var d = new Date(STATE.currentYear, STATE.currentMonth - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTHS_SHORT[d.getMonth()] });
  }
  var incArr = [], expArr = [], netArr = [];
  months.forEach(function(m){
    var ym = m.year + '-' + String(m.month+1).padStart(2,'0');
    var mt = STATE.transactions.filter(function(t){ return t.date && t.date.startsWith(ym); });
    var inc = globalIncome(mt);
    var exp = globalExpenses(mt);
    incArr.push(inc); expArr.push(exp); netArr.push(checkingNet(mt));
  });
  var maxIE  = Math.max.apply(null, incArr.concat(expArr)) || 1;
  var maxNet = Math.max.apply(null, netArr.map(Math.abs)) || 1;

  var ieHtml = months.map(function(m,i){
    return '<div class="bar-row">' +
      '<div class="bar-lbl">' + m.label + '</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;gap:3px">' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + Math.round(incArr[i]/maxIE*100) + '%;background:var(--income)"></div></div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + Math.round(expArr[i]/maxIE*100) + '%;background:var(--expense)"></div></div>' +
      '</div><div class="bar-val" style="font-size:9px;width:130px">' +
      '<span style="color:var(--income)">' + fmt(incArr[i]) + '</span> <span style="color:var(--expense)">' + fmt(expArr[i]) + '</span>' +
      '</div></div>';
  }).join('');

  var netHtml = months.map(function(m,i){
    var col = netArr[i] >= 0 ? 'var(--income)' : 'var(--expense)';
    return '<div class="bar-row">' +
      '<div class="bar-lbl">' + m.label + '</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + Math.round(Math.abs(netArr[i])/maxNet*100) + '%;background:' + col + '"></div></div>' +
      '<div class="bar-val" style="color:' + col + '">' + (netArr[i]>=0?'+':'\u2212') + fmt(netArr[i]) + '</div></div>';
  }).join('');

  var ieEl  = document.getElementById('trend-ie');
  var netEl = document.getElementById('trend-net');
  var catEl = document.getElementById('trend-cat');
  if (ieEl)  ieEl.innerHTML  = ieHtml  || '<div style="text-align:center;padding:20px;color:var(--text3);font-size:11px">No data yet.</div>';
  if (netEl) netEl.innerHTML = netHtml || '<div style="text-align:center;padding:20px;color:var(--text3);font-size:11px">No data yet.</div>';
  if (catEl) renderCatBars('trend-cat', STATE.transactions);
}

// ── CSV ──────────────────────────────────────────────────────
function togglePanel(id) { document.getElementById(id).classList.toggle('open'); }

function importPaste() {
  var raw = document.getElementById('csv-paste').value.trim();
  if (!raw) return;
  var added = 0; var seenCats = [];
  raw.split('\n').forEach(function(line){
    var p = splitCSV(line);
    if (p.length < 5) return;
    var date=p[0], desc=p[1], cat=p[2], type=p[3].toLowerCase(), amt=parseFloat(p[4]);
    if (!date || !desc || isNaN(amt)) return;
    var source = (p[6] || 'checking').toLowerCase();
    var rec = { id: Date.now()+Math.random(), date, desc, cat:cat||'Other', type, amt, owner:'', source: source === 'savings' ? 'savings' : 'checking' };
    if (type === 'transfer' && p[7]) rec.transferDirection = p[7];
    STATE.transactions.push(migrateTransaction(rec));
    seenCats.push(rec.cat);
    added++;
  });
  registerNewCategories(seenCats);
  STATE.transactions.sort(function(a,b){ return b.date.localeCompare(a.date); });
  save(); document.getElementById('csv-paste').value=''; updateCategoryDropdowns(); render();
  if (added) toast(added + ' transactions imported.', 'ok');
}
function importCSV() { document.getElementById('csv-file-input').click(); }

function handleCSVFile(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev){
    var lines = ev.target.result.split('\n'); var added=0; var start=0; var seenCats=[];
    if (isNaN(parseFloat(splitCSV(lines[0]||'')[4]))) start=1;
    for (var i=start;i<lines.length;i++){
      var p = splitCSV(lines[i]);
      if (p.length<5) continue;
      var date=p[0],desc=p[1],cat=p[2],type=p[3].toLowerCase(),amt=parseFloat(p[4]);
      if (!date||!desc||isNaN(amt)) continue;
      var source = (p[6] || 'checking').toLowerCase();
      var rec = {id:Date.now()+Math.random(),date,desc,cat:cat||'Other',type,amt,owner:p[5]||'', source: source === 'savings' ? 'savings' : 'checking'};
      if (type === 'transfer' && p[7]) rec.transferDirection = p[7];
      STATE.transactions.push(migrateTransaction(rec));
      seenCats.push(rec.cat);
      added++;
    }
    registerNewCategories(seenCats);
    STATE.transactions.sort(function(a,b){return b.date.localeCompare(a.date);});
    save(); updateCategoryDropdowns(); render(); toast(added+' transactions imported.', 'ok'); e.target.value='';
  };
  reader.readAsText(file);
}
function exportCSV() {
  var rows = ['Date,Description,Category,Type,Amount,Owner,Source,TransferDirection'];
  STATE.transactions.forEach(function(t){ rows.push([t.date,'"'+t.desc.replace(/"/g,'""')+'"',t.cat,t.type,t.amt,t.owner||'',txnSource(t),t.transferDirection||''].join(',')); });
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));
  a.download='vestry_export.csv'; a.click();
}

// ── AUDIT EXPORT ──────────────────────────────────────────────
// A cross-checkable CSV: computed summary figures (using the exact same
// Vestry.Logic functions the dashboard renders from, so there's no drift
// between "what the app shows" and "what this file says"), the per-category
// savings running balances, the checking-side category breakdown, and
// finally the complete raw transaction ledger with every field — so every
// number on screen can be traced back to, and re-summed from, source rows.
function csvEsc(v) {
  v = (v === null || v === undefined) ? '' : String(v);
  return '"' + v.replace(/"/g,'""') + '"';
}
function exportAudit() {
  var txns = monthTxns();
  var all  = STATE.transactions;
  var c    = STATE.config;
  var ym   = STATE.currentYear + '-' + String(STATE.currentMonth + 1).padStart(2,'0');
  var priorTxns = all.filter(function(t){ return t.date && t.date < ym + '-01'; });
  var startingBalance = checkingBalance(priorTxns, 0);
  var endingBalance   = checkingBalance(priorTxns.concat(txns), 0);

  var lines = [];
  lines.push(csvEsc('VESTRY AUDIT EXPORT'));
  lines.push(csvEsc('Generated') + ',' + csvEsc(new Date().toISOString()));
  lines.push(csvEsc('App Version') + ',' + csvEsc(APP_VERSION));
  lines.push(csvEsc('Period') + ',' + csvEsc(MONTHS[STATE.currentMonth] + ' ' + STATE.currentYear));
  lines.push('');

  lines.push(csvEsc('SUMMARY \u2014 THIS MONTH'));
  lines.push('Metric,Value,Formula');
  lines.push(['Global Income', fmt(globalIncome(txns)), 'sum(type=income, excl. custodial)'].map(csvEsc).join(','));
  lines.push(['Global Expenses', fmt(globalExpenses(txns)), 'sum(type=expense/one-off, excl. custodial)'].map(csvEsc).join(','));
  lines.push(['Checking Net', fmt(checkingNet(txns)), 'checking income \u2212 checking expenses (excl. custodial)'].map(csvEsc).join(','));
  lines.push(['Checking Starting Balance', fmt(startingBalance), 'checkingBalance(all txns before this month)'].map(csvEsc).join(','));
  lines.push(['Checking Ending Balance', fmt(endingBalance), 'checkingBalance(all txns through this month)'].map(csvEsc).join(','));
  lines.push(['Savings Transferred This Month', fmt(netSavingsContribution(txns)), 'transfers to savings \u2212 transfers from savings'].map(csvEsc).join(','));
  lines.push('');

  lines.push(csvEsc('SUMMARY \u2014 ALL-TIME'));
  lines.push('Metric,Value,Formula');
  lines.push(['Savings Balance', fmt(allTimeSavingsBalance()), 'savings income \u2212 savings expenses + transfers to \u2212 transfers from savings (incl. custodial)'].map(csvEsc).join(','));
  lines.push('');

  lines.push(csvEsc('SAVINGS BY CATEGORY \u2014 ALL-TIME RUNNING BALANCE'));
  lines.push('Category,Balance,Formula');
  var catBalances = savingsByCategory(all);
  if (catBalances.length === 0) lines.push(csvEsc('(none)'));
  catBalances.forEach(function(row){
    lines.push([row.cat, fmt(row.balance), 'income in that category (source:savings) \u2212 expense in that category (source:savings)'].map(csvEsc).join(','));
  });
  var catSum = catBalances.reduce(function(s,r){ return s+r.balance; }, 0);
  lines.push(['TOTAL (should equal Savings Balance above)', fmt(catSum), ''].map(csvEsc).join(','));
  lines.push('');

  lines.push(csvEsc('CHECKING CATEGORY BREAKDOWN \u2014 THIS MONTH'));
  lines.push('Category,Total');
  var checkCats = {};
  txns.filter(function(t){ return (t.type==='expense'||t.type==='one-off') && txnSource(t)==='checking'; }).forEach(function(t){
    checkCats[t.cat] = (checkCats[t.cat]||0) + t.amt;
  });
  var checkCatKeys = Object.keys(checkCats).sort(function(a,b){ return checkCats[b]-checkCats[a]; });
  if (checkCatKeys.length === 0) lines.push(csvEsc('(none)'));
  checkCatKeys.forEach(function(cat){ lines.push([cat, fmt(checkCats[cat])].map(csvEsc).join(',')); });
  lines.push('');

  lines.push(csvEsc('ALL TRANSACTIONS \u2014 RAW LEDGER (all-time, ' + all.length + ' rows)'));
  lines.push('ID,Date,Description,Category,Type,Amount,Owner,Source,Custodial,TransferDirection');
  all.slice().sort(function(a,b){ return a.date.localeCompare(b.date); }).forEach(function(t){
    lines.push([t.id, t.date, t.desc, t.cat, t.type, t.amt, t.owner||'', txnSource(t), isCustodial(t) ? 'yes' : '', t.transferDirection||''].map(csvEsc).join(','));
  });

  var a = document.createElement('a');
  var stamp = dateStr(new Date());
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], {type:'text/csv'}));
  a.download = 'vestry_audit_' + stamp + '.csv';
  a.click();
  toast('Audit export downloaded.', 'ok');
}

// ── BACKUP / RESTORE ─────────────────────────────────────────
function exportBackup() {
  var d = new Date().toISOString().split('T')[0];
  var payload = { version: APP_VERSION, exported: new Date().toISOString(), transactions: STATE.transactions, recurring: STATE.recurring, goals: STATE.goals, config: STATE.config, workHours: STATE.workHours, mileage: STATE.mileage, expenses: STATE.expenses, invoices: STATE.invoices };
  STATE.config.lastBackupDate = Date.now(); save(); checkBackupStatus();
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  a.download='vestry_backup_'+d+'.json'; a.click();
}

function importBackup(e) {
  var file=e.target.files[0]; if (!file) return;
  var reader=new FileReader();
  reader.onload=function(ev){
    try {
      var data=JSON.parse(ev.target.result);
      if (!data.transactions||!data.recurring||!data.goals){toast('Invalid backup file.','error');return;}
      if (!confirm('Replace ALL current data with this backup?')) return;
      STATE.transactions=(data.transactions||[]).map(migrateTransaction);
      STATE.recurring=data.recurring||[];
      STATE.goals=data.goals||[];
      STATE.workHours=data.workHours||[];
      STATE.mileage=data.mileage||[];
      STATE.expenses=data.expenses||[];
      STATE.invoices=data.invoices||[];
      if (data.config) Object.assign(STATE.config,data.config);
      // firstUseDate: keep the backup's own history if it has one; otherwise
      // this import IS the start of this account's tracked history \u2014 never
      // infer it from transaction dates (see ensureFirstUseDate).
      STATE.config.firstUseDate = (data.config && data.config.firstUseDate) ? data.config.firstUseDate : Date.now();
      save(); renderBranding(); updateCategoryDropdowns(); render(); checkBackupStatus(); toast('Backup restored \u2014 '+STATE.transactions.length+' transactions.', 'ok');
    } catch(err){toast('Could not read backup: '+err.message, 'error');}
  };
  reader.readAsText(file); e.target.value='';
}

// ── SHARE EXPORT ─────────────────────────────────────────────
function openShareModal() {
  var now=new Date();
  var y=now.getFullYear(),m=now.getMonth();
  var first=y+'-'+String(m+1).padStart(2,'0')+'-01';
  var last=new Date(y,m+1,0);
  var lastStr=y+'-'+String(m+1).padStart(2,'0')+'-'+String(last.getDate()).padStart(2,'0');
  document.getElementById('share-from').value=first;
  document.getElementById('share-to').value=lastStr;
  document.getElementById('share-owner').value=STATE.config.ownerTag||STATE.config.person||'';
  updateSharePreview();
  document.getElementById('modal-share').classList.add('open');
}

function updateSharePreview() {
  var from=document.getElementById('share-from').value;
  var to=document.getElementById('share-to').value;
  var owner=document.getElementById('share-owner').value.trim();
  var el=document.getElementById('share-preview');
  if (!from||!to) return;
  var filtered=STATE.transactions.filter(function(t){return t.date>=from&&t.date<=to;});
  if (!filtered.length) { el.textContent='No transactions in this range.'; return; }
  var inc=globalIncome(filtered);
  var exp=globalExpenses(filtered);
  var sav=netSavingsContribution(filtered);
  var net=checkingNet(filtered);
  el.innerHTML='<strong>'+filtered.length+' transactions</strong>'+(owner?' \u00b7 owner: '+esc(owner):'')+
    '<br><span style="color:var(--income)">Income '+fmt(inc)+'</span> \u00b7 '+
    '<span style="color:var(--expense)">Expenses '+fmt(exp)+'</span> \u00b7 '+
    '<span style="color:var(--savings)">Savings '+fmt(sav)+'</span>'+
    '<br>Checking Net: <strong style="color:'+(net>=0?'var(--income)':'var(--expense)')+'">'+(net>=0?'+':'')+fmt(net)+'</strong>';
}
function doShareExport() {
  var from=document.getElementById('share-from').value;
  var to=document.getElementById('share-to').value;
  var owner=document.getElementById('share-owner').value.trim()||'shared';
  var fmt2=document.getElementById('share-fmt').value;
  if (!from||!to){toast('Set a date range.','error');return;}
  var filtered=STATE.transactions.filter(function(t){return t.date>=from&&t.date<=to;});
  if (!filtered.length){toast('No transactions in that range.','error');return;}
  var tagged=filtered.map(function(t){return Object.assign({},t,{owner:t.owner||owner});});
  var a=document.createElement('a');
  var safe=owner.replace(/[^a-z0-9]/gi,'_').toLowerCase();
  var range=from+'_to_'+to;
  if (fmt2==='csv'){
    var rows=['Date,Description,Category,Type,Amount,Owner,Source,TransferDirection'];
    tagged.forEach(function(t){rows.push([t.date,'"'+t.desc.replace(/"/g,'""')+'"',t.cat,t.type,t.amt,owner,txnSource(t),t.transferDirection||''].join(','));});
    a.href=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));
    a.download='vestry_'+safe+'_'+range+'.csv';
  } else {
    var payload={version:APP_VERSION,exported:new Date().toISOString(),owner:owner,range:{from,to},transactions:tagged,recurring:[],goals:[]};
    a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    a.download='vestry_'+safe+'_'+range+'.json';
  }
  a.click(); closeModal('share');
}

// ── MERGE ────────────────────────────────────────────────────
function openMergeModal() {
  _mergeData=null;
  document.getElementById('merge-owner').value='';
  document.getElementById('merge-file-name').textContent='No file selected';
  document.getElementById('merge-preview').style.display='none';
  document.getElementById('merge-confirm-btn').disabled=true;
  document.getElementById('merge-confirm-btn').style.opacity='.4';
  document.getElementById('modal-merge').classList.add('open');
}

function previewMerge(e) {
  var file=e.target.files[0]; if (!file) return;
  document.getElementById('merge-file-name').textContent=file.name;
  var reader=new FileReader();
  reader.onload=function(ev){
    try {
      var data=JSON.parse(ev.target.result);
      if (!data.transactions){toast('Invalid backup file.','error');return;}
      _mergeData=data;
      var incoming=data.transactions||[];
      var dupes=0,newCount=0;
      incoming.forEach(function(t){
        var isDupe=STATE.transactions.some(function(e){return e.date===t.date&&e.desc===t.desc&&parseFloat(e.amt)===parseFloat(t.amt);});
        if (isDupe) dupes++; else newCount++;
      });
      var prev=document.getElementById('merge-preview');
      prev.style.display='block';
      document.getElementById('merge-preview-text').innerHTML=
        '<strong>File:</strong> '+esc(file.name)+'<br>'+
        (data.owner?'<strong>Source:</strong> '+esc(data.owner)+'<br>':'')+
        (data.range?'<strong>Range:</strong> '+data.range.from+' → '+data.range.to+'<br>':'')+
        '<span style="color:var(--income)">✓ New: '+newCount+'</span> &nbsp; '+
        '<span style="color:var(--text3)">⟳ Dupes skipped: '+dupes+'</span>';
      document.getElementById('merge-confirm-btn').disabled=false;
      document.getElementById('merge-confirm-btn').style.opacity='1';
    } catch(err){toast('Could not read file: '+err.message,'error');}
  };
  reader.readAsText(file); e.target.value='';
}

function doMerge() {
  if (!_mergeData) return;
  var owner=document.getElementById('merge-owner').value.trim()||_mergeData.owner||'imported';
  var incoming=_mergeData.transactions||[]; var added=0;
  incoming.forEach(function(t){
    var isDupe=STATE.transactions.some(function(e){return e.date===t.date&&e.desc===t.desc&&parseFloat(e.amt)===parseFloat(t.amt);});
    if (!isDupe){STATE.transactions.push(migrateTransaction(Object.assign({},t,{id:Date.now()+Math.random(),owner:t.owner||owner})));added++;}
  });
  (_mergeData.goals||[]).forEach(function(g){
    if (!STATE.goals.some(function(eg){return eg.name===g.name;}))
      STATE.goals.push(Object.assign({},g,{id:Date.now()+Math.random()}));
  });
  // Merged-in transactions may use categories this device has never seen \u2014
  // register them so the dropdown offers them and future edits don't
  // silently discard the category (see selectCategorySafely).
  registerNewCategories(incoming.map(function(t){ return t.cat; }));
  STATE.transactions.sort(function(a,b){return b.date.localeCompare(a.date);});
  save(); closeModal('merge'); updateCategoryDropdowns(); render(); _mergeData=null;
  toast(added+' transactions merged from '+owner+'.', 'ok');
}


// ── ONBOARDING WIZARD ────────────────────────────────────────
var OB_STEP = 0;
var OB_TOTAL = 5;
var OB_STEPS = [
  {
    icon: '👋',
    title: 'Welcome to Vestry',
    body: 'Vestry is your household budget — built to run entirely in your browser. No account, no cloud, no ads. Everything lives on your device and you control it completely.',
    highlight: null,
    fields: null,
    next: 'Meet your dashboard →'
  },
  {
    icon: '🏠',
    title: "Let's set up your household",
    body: "First, tell Vestry who you are. Your name appears on your dashboard and gets stamped on every transaction you log — useful when you share data with a partner.",
    highlight: null,
    fields: [
      { id: 'ob-family', label: 'Family / Household Name', placeholder: 'e.g. The Griffith Family', cfgKey: 'family' },
      { id: 'ob-person', label: 'Your Name', placeholder: 'e.g. Anita', cfgKey: 'person' },
      { id: 'ob-owner',  label: 'Short Tag for sharing (used on exports)', placeholder: 'e.g. Anita', cfgKey: 'ownerTag' }
    ],
    next: 'Next →'
  },
  {
    icon: '🎯',
    title: 'Set your monthly targets',
    body: "These targets unlock progress bars on your dashboard. You'll see at a glance how close you are to your income goal, whether you're under your spending limit, and whether you're hitting your savings target each month.",
    highlight: '<strong>Tip:</strong> Start with your take-home income and a realistic expense cap. You can always adjust later in Config.',
    fields: [
      { id: 'ob-income-t',  label: 'Monthly Income Target ($)', placeholder: 'e.g. 6000', cfgKey: 'incomeTarget',  type: 'number' },
      { id: 'ob-expense-l', label: 'Monthly Expense Limit ($)', placeholder: 'e.g. 4200', cfgKey: 'expenseLimit', type: 'number' },
      { id: 'ob-savings-t', label: 'Monthly Savings Target ($)', placeholder: 'e.g. 600', cfgKey: 'savingsTarget', type: 'number' }
    ],
    next: 'Next →'
  },
  {
    icon: '💡',
    title: "What are you working toward?",
    body: "Add one intention — something that motivates you. It shows every time you open the app. You can add more in Config anytime.",
    highlight: '<strong>Examples:</strong> "Pay off the car by December" · "Build a 3-month emergency fund" · "Family vacation to Portugal" · "No debt by 2027"',
    fields: [
      { id: 'ob-goal1', label: 'Your first budget intention', placeholder: 'e.g. Build 3-month emergency fund', cfgKey: '_goal1' }
    ],
    next: 'Next →'
  },
  {
    icon: '🚀',
    title: "You're all set!",
    body: "Here's how the three-step loop works every month:",
    highlight: '<strong>1. Log</strong> — add transactions as they happen, or paste a CSV batch.<br><strong>2. Review</strong> — your dashboard shows income, expenses, savings, and your health score.<br><strong>3. Share</strong> — use 📤 Share to export your month for your partner. They merge it in with 🔀 Merge.',
    fields: null,
    next: "Let's go! →"
  }
];

function obRender() {
  var step = OB_STEPS[OB_STEP];
  var totalSteps = OB_TOTAL;

  document.getElementById('ob-step-lbl').textContent = 'Step ' + (OB_STEP+1) + ' of ' + totalSteps;
  document.getElementById('ob-icon').textContent    = step.icon;
  document.getElementById('ob-title').textContent   = step.title;
  document.getElementById('ob-body-text').textContent = step.body;
  document.getElementById('ob-fill').style.width = Math.round(((OB_STEP+1)/totalSteps)*100) + '%';

  // Highlight
  var hl = document.getElementById('ob-highlight');
  if (step.highlight) { hl.style.display='block'; hl.innerHTML = step.highlight; }
  else                 { hl.style.display='none'; }

  // Fields
  var fieldsEl = document.getElementById('ob-fields');
  if (step.fields && step.fields.length > 0) {
    fieldsEl.style.display = 'flex';
    fieldsEl.innerHTML = step.fields.map(function(f){
      var type = f.type || 'text';
      var val = '';
      if (f.cfgKey && f.cfgKey !== '_goal1') val = STATE.config[f.cfgKey] || '';
      else if (f.cfgKey === '_goal1') val = (STATE.config.budgetGoals||[])[0]?.label || '';
      return '<div class="field"><label>' + f.label + '</label>' +
        '<input type="' + type + '" id="' + f.id + '" placeholder="' + f.placeholder + '" value="' + esc(String(val)) + '"></div>';
    }).join('');
  } else {
    fieldsEl.style.display = 'none';
    fieldsEl.innerHTML = '';
  }

  // Dots
  var dots = '';
  for (var i=0; i<totalSteps; i++) {
    var cls = i === OB_STEP ? 'active' : i < OB_STEP ? 'done' : '';
    dots += '<div class="ob-dot ' + cls + '"></div>';
  }
  document.getElementById('ob-dots').innerHTML = dots;

  // Buttons
  var nextBtn = document.getElementById('ob-next-btn');
  var backBtn = document.getElementById('ob-back-btn');
  var skipBtn = document.getElementById('ob-skip-btn');
  nextBtn.textContent = step.next || 'Next →';
  backBtn.style.display = OB_STEP > 0 ? 'inline-flex' : 'none';
  skipBtn.style.display = OB_STEP < OB_TOTAL - 1 ? 'inline' : 'none';
}


function obCollect() {
  var step = OB_STEPS[OB_STEP];
  if (!step.fields) return;
  step.fields.forEach(function(f){
    var el = document.getElementById(f.id);
    if (!el) return;
    var val = el.value.trim();
    if (f.cfgKey === '_goal1') {
      if (val) {
        if (!STATE.config.budgetGoals) STATE.config.budgetGoals = [];
        if (STATE.config.budgetGoals.length === 0) STATE.config.budgetGoals.push({ id: Date.now(), label: val, cat: 'Other' });
        else STATE.config.budgetGoals[0].label = val;
      }
    } else if (f.cfgKey) {
      if (f.type === 'number') STATE.config[f.cfgKey] = parseFloat(val) || 0;
      else STATE.config[f.cfgKey] = val;
    }
  });
}


function obNext() {
  obCollect();
  if (OB_STEP >= OB_TOTAL - 1) {
    obFinish();
    return;
  }
  OB_STEP++;
  obRender();
}


function obBack() {
  obCollect();
  if (OB_STEP > 0) { OB_STEP--; obRender(); }
}


function obSkip() {
  obCollect();
  obFinish();
}


function obFinish() {
  save();
  renderBranding();
  render();
  document.getElementById('ob-backdrop').style.display = 'none';
  try { localStorage.setItem('vestry_ob_done', '1'); } catch(e){}
  // Pre-fill owner tag from person name if blank
  if (!STATE.config.ownerTag && STATE.config.person) {
    STATE.config.ownerTag = STATE.config.person.split(' ')[0];
    save();
  }
}


function maybeShowOnboarding() {
  try {
    var done = localStorage.getItem('vestry_ob_done');
    var hasData = STATE.transactions.length > 0 || STATE.config.person || STATE.config.family;
    if (!done && !hasData) {
      OB_STEP = 0;
      document.getElementById('ob-backdrop').style.display = 'flex';
      obRender();
    }
  } catch(e){}
}



// ── BOOT ────────────────────────────────────────────────────
load();
ensureFirstUseDate();
loadTheme();
updateCategoryDropdowns(); checkBackupStatus();
updateMonthLabel();
renderBranding();
render();
maybeShowOnboarding();

// Defensive: if the page has any leftover horizontal scroll offset for any reason,
// opening a modal shouldn't inherit it — force back to the left edge every time.
(function() {
  var mo = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.attributeName === 'class' && m.target.classList && m.target.classList.contains('open')) {
        window.scrollTo(0, window.scrollY);
        document.documentElement.scrollLeft = 0;
        document.body.scrollLeft = 0;
      }
    });
  });
  document.querySelectorAll('.modal-bg, #help-overlay').forEach(function(el) {
    mo.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
})();

// ── CARD DETAIL MODAL ───────────────────────────────────────
function openCardDetail(type) {
  if (type === 'cw-hours' || type === 'cw-dist') { showPage('workhours'); return; }
  var c = STATE.config;
  var mo = rangeForPreset('month');
  var monthly = STATE.transactions.filter(function(t){ return t.date >= mo[0] && t.date <= mo[1]; });
  var title, html;

  if (type === 'income') {
    var inc = monthly.filter(function(t){ return t.type === 'income' && !isCustodial(t); });
    var total = inc.reduce(function(s,t){ return s + parseFloat(t.amt||0); }, 0);
    title = 'Income \u2014 This Month';
    html = '<p class="modal-sub">All money received this month, grouped by category. Money held for someone else (custodial) is excluded \u2014 see Savings by Category for that.</p>';
    if (!inc.length) { html += '<p style="color:var(--text3)">No income transactions this month yet.</p>'; }
    else {
      var cats = {};
      inc.forEach(function(t){ cats[t.cat] = (cats[t.cat]||0) + parseFloat(t.amt||0); });
      html += '<div style="display:flex;flex-direction:column;gap:2px;margin:12px 0">';
      Object.keys(cats).sort(function(a,b){ return cats[b]-cats[a]; }).forEach(function(cat){
        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>'+esc(cat)+'</span><strong style="color:var(--income)">'+fmt(cats[cat])+'</strong></div>';
      });
      html += '<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:600"><span>Total</span><span style="color:var(--income)">'+fmt(total)+'</span></div></div>';
      if (c.incomeTarget) { var pct=Math.min(100,Math.round(total/c.incomeTarget*100)); html += '<div style="font-size:11px;color:var(--text3)">'+pct+'% of '+fmt(c.incomeTarget)+' monthly target</div>'; }
    }
  }

  else if (type === 'expenses') {
    var exp = monthly.filter(function(t){ return (t.type==='expense'||t.type==='one-off') && !isCustodial(t); });
    var total = exp.reduce(function(s,t){ return s + parseFloat(t.amt||0); }, 0);
    title = 'Expenses \u2014 This Month';
    html = '<p class="modal-sub">Money spent this month, highest categories first. Money spent on someone else\u2019s behalf (custodial) is excluded \u2014 see Savings by Category for that.</p>';
    if (!exp.length) { html += '<p style="color:var(--text3)">No expense transactions this month yet.</p>'; }
    else {
      var cats = {};
      exp.forEach(function(t){ cats[t.cat] = (cats[t.cat]||0) + parseFloat(t.amt||0); });
      html += '<div style="display:flex;flex-direction:column;gap:2px;margin:12px 0">';
      Object.keys(cats).sort(function(a,b){ return cats[b]-cats[a]; }).forEach(function(cat){
        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>'+esc(cat)+'</span><strong style="color:var(--expense)">'+fmt(cats[cat])+'</strong></div>';
      });
      html += '<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:600"><span>Total</span><span style="color:var(--expense)">'+fmt(total)+'</span></div></div>';
      if (c.expenseLimit) { var pct=Math.min(100,Math.round(total/c.expenseLimit*100)); html += '<div style="font-size:11px;color:'+(pct>90?'var(--expense)':'var(--text3)')+'">'+pct+'% of '+fmt(c.expenseLimit)+' monthly limit</div>'; }
    }
  }

  else if (type === 'net') {
    var net = checkingNet(monthly);
    var incC = checkingIncome(monthly), expC = checkingExpenses(monthly);
    title = 'Checking Net \u2014 This Month';
    html = '<p class="modal-sub">Checking Net is income minus expenses within your checking account only. Savings-account activity and transfers are tracked separately and do not affect this number.</p>';
    html += '<div style="display:flex;flex-direction:column;gap:2px;margin:16px 0">';
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>Checking Income</span><span style="color:var(--income)">'+fmt(incC)+'</span></div>';
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>Checking Expenses</span><span style="color:var(--expense)">\u2212 '+fmt(expC)+'</span></div>';
    html += '<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:600"><span>Checking Net</span><span style="color:'+(net>=0?'var(--income)':'var(--expense)')+'">'+(net>=0?'+':'')+fmt(net)+'</span></div></div>';
    html += '<p style="font-size:11px;color:var(--text3)">'+(net<0?'You spent more from checking than you earned into it this month. Check your expense categories for areas to trim.':'You have '+fmt(net)+' left over in checking this month before any transfers to savings.')+'</p>';
  }

  else if (type === 'saved') {
    var toSav = transfersToSavings(monthly);
    var fromSav = transfersFromSavings(monthly);
    title = 'Savings \u2014 This Month';
    html = '<p class="modal-sub">Money moved between checking and savings this month, your running savings balance, and your goal targets.</p>';
    html += '<div style="display:flex;flex-direction:column;gap:2px;margin-bottom:14px">';
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>Transferred to savings</span><strong style="color:var(--income)">+'+fmt(toSav)+'</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>Transferred from savings</span><strong style="color:var(--expense)">\u2212'+fmt(fromSav)+'</strong></div>';
    var netAllTime = allTimeSavingsBalance();
    var totalGoalTarget = STATE.goals.reduce(function(s,g){ return s+(g.target||0); }, 0);
    html += '<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:600"><span>Savings Balance (all-time)</span><span style="color:'+(netAllTime<0?'var(--expense)':'var(--savings)')+'">'+(netAllTime<0?'\u2212':'')+fmt(netAllTime)+(totalGoalTarget>0?' / '+fmt(totalGoalTarget):'')+'</span></div></div>';
    if (!STATE.goals.length) { html += '<p style="color:var(--text3)">No savings goals yet. Add one from the Savings Goals page.</p>'; }
    else {
      STATE.goals.forEach(function(g){
        html += '<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-weight:500">'+esc(g.name)+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">Target: '+fmt(g.target)+'</div></div>';
      });
    }
    var catBal = savingsByCategory(STATE.transactions);
    if (catBal.length) {
      html += '<div style="margin-top:14px;font-weight:600;font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">By Category (all-time)</div>';
      html += '<div style="display:flex;flex-direction:column;gap:2px;margin-top:6px">';
      catBal.forEach(function(row){
        var neg = row.balance < 0;
        html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span>'+esc(row.cat)+'</span><strong style="color:'+(neg?'var(--expense)':'var(--savings)')+'">'+(neg?'\u2212':'')+fmt(row.balance)+'</strong></div>';
      });
      html += '</div>';
    }
  }

  else if (type === 'cw-unbilled') {
    var uHrs = unbilledEntries(STATE.workHours), uMi = unbilledEntries(STATE.mileage), uEx = unbilledEntries(STATE.expenses||[]);
    var wage = c.invWage||0, unit = distUnit();
    var mDist = sumDist(uMi), mAmt = sumDistCost(uMi), avgRate = mDist > 0 ? (mAmt/mDist) : 0;
    var hAmt = sumHours(uHrs)*wage, eAmt = sumExpenses(uEx);
    title = 'Unbilled Work';
    html = '<p class="modal-sub">Hours, mileage and expenses logged but not yet on an invoice.</p>';
    html += '<div style="display:flex;flex-direction:column;gap:2px;margin:12px 0">';
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>Hours ('+sumHours(uHrs).toFixed(1)+' hrs @ '+fmt(wage)+'/hr)</span><span style="color:var(--savings)">'+fmt(hAmt)+'</span></div>';
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>Mileage ('+mDist.toFixed(1)+' '+unit+', avg '+fmt(avgRate)+'/'+unit+')</span><span style="color:var(--savings)">'+fmt(mAmt)+'</span></div>';
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>Expenses</span><span style="color:var(--savings)">'+fmt(eAmt)+'</span></div>';
    html += '<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:600"><span>Total Unbilled</span><span style="color:var(--savings)">'+fmt(hAmt+mAmt+eAmt)+'</span></div></div>';
    html += '<button class="btn btn-primary" style="margin-top:4px" onclick="closeModal(\'carddetail\');showPage(\'workhours\')">Go to Work Hours \u2192</button>';
  }

  else if (type === 'cw-paid') {
    var ytdStr2 = String(STATE.currentYear);
    var paid = (STATE.invoices||[]).filter(function(inv){ return inv.status==='paid' && inv.paidDate && inv.paidDate.startsWith(ytdStr2); });
    var ytdTotal = paid.reduce(function(s,inv){ return s+(inv.totalAmount||0); },0);
    title = 'Paid Invoices YTD';
    html = '<p class="modal-sub">Invoices marked as paid this year \u2014 each created an income transaction automatically.</p>';
    if (!paid.length) { html += '<p style="color:var(--text3)">No paid invoices yet.</p>'; }
    else {
      html += '<div style="display:flex;flex-direction:column;gap:2px;margin:12px 0">';
      paid.slice().sort(function(a,b){ return b.id-a.id; }).forEach(function(inv){
        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">';
        html += '<span style="font-size:12px">'+esc(inv.number)+' <span style="color:var(--text3);font-size:10px">'+esc(inv.from)+' \u2192 '+esc(inv.to)+'</span></span>';
        html += '<strong style="color:var(--income)">'+fmt(inv.totalAmount||0)+'</strong></div>';
      });
      html += '<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:600"><span>Total Paid YTD</span><span style="color:var(--income)">'+fmt(ytdTotal)+'</span></div></div>';
    }
  }

  document.getElementById('cd-title').textContent = title || '';
  document.getElementById('cd-body').innerHTML = html || '';
  document.getElementById('modal-carddetail').classList.add('open');
}

// Toast notification (replaces alert())
var _toastTimer = null;
function toast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show' + (type === 'error' ? ' toast-error' : type === 'ok' ? ' toast-ok' : '');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.className = ''; }, 3200);
}


// Close any modal when clicking the backdrop (outside the modal card)
document.querySelectorAll('.modal-bg').forEach(function(bg) {
  bg.addEventListener('click', function(e) {
    if (e.target === bg) {
      var id = bg.id.replace('modal-', '');
      closeModal(id);
    }
  });
});

// ── NAMESPACE EXPORT ────────────────────────────────────────
window.Vestry = window.Vestry || {};
Vestry.UI = {
  showPage: showPage,
  changeMonth: changeMonth,
  updateMonthLabel: updateMonthLabel,
  toggleMobMenu: toggleMobMenu,
  toggleTheme: toggleTheme,
  updateThemeIcons: updateThemeIcons,
  loadTheme: loadTheme,
  openModal: openModal,
  openWorkHourModal: openWorkHourModal,
  closeModal: closeModal,
  typeColor: typeColor,
  typePill: typePill,
  txnRow: txnRow,
  saveTransaction: saveTransaction,
  deleteTransaction: deleteTransaction,
  saveRecurring: saveRecurring,
  deleteRecurring: deleteRecurring,
  saveGoal: saveGoal,
  deleteGoal: deleteGoal,
  saveWorkHour: saveWorkHour,
  deleteWorkHour: deleteWorkHour,
  openMileageModal: openMileageModal,
  onMileageModeChange: onMileageModeChange,
  recalcMileageDistance: recalcMileageDistance,
  saveMileage: saveMileage,
  deleteMileage: deleteMileage,
  openExpenseModal: openExpenseModal,
  saveExpense: saveExpense,
  deleteExpense: deleteExpense,
  updateExpensePreview: updateExpensePreview,
  copyExpenseSummary: copyExpenseSummary,
  markExpensesSent: markExpensesSent,
  renderWorkHoursPage: renderWorkHoursPage,
  openInvoiceGenModal: openInvoiceGenModal,
  onInvoiceRangeChange: onInvoiceRangeChange,
  updateInvoiceGenPreview: updateInvoiceGenPreview,
  generateInvoice: generateInvoice,
  invoiceHTML: invoiceHTML,
  viewInvoice: viewInvoice,
  toggleInvoicePaidFromModal: toggleInvoicePaidFromModal,
  toggleInvoicePaid: toggleInvoicePaid,
  deleteInvoice: deleteInvoice,
  printInvoiceFromModal: printInvoiceFromModal,
  updateFuelRatePreview: updateFuelRatePreview,
  toggleConfigCard: toggleConfigCard,
  toggleWHSection: toggleWHSection,
  updateNukeButton: updateNukeButton,
  nukeEverything: nukeEverything,
  saveConfig: saveConfig,
  renderConfigPage: renderConfigPage,
  addBudgetGoal: addBudgetGoal,
  deleteBudgetGoal: deleteBudgetGoal,
  renderBudgetGoalsList: renderBudgetGoalsList,
  addCustomCategory: addCustomCategory,
  deleteCustomCategory: deleteCustomCategory,
  renderCustomCategories: renderCustomCategories,
  updateCategoryDropdowns: updateCategoryDropdowns,
  selectCategorySafely: selectCategorySafely,
  registerNewCategories: registerNewCategories,
  populateTxnFilterCatDropdown: populateTxnFilterCatDropdown,
  getTxnFilters: getTxnFilters,
  renderAllTxnTable: renderAllTxnTable,
  clearTxnFilters: clearTxnFilters,
  checkBackupStatus: checkBackupStatus,
  renderBranding: renderBranding,
  renderMotivBanner: renderMotivBanner,
  render: render,
  renderCatBars: renderCatBars,
  renderSavCatBreakdown: renderSavCatBreakdown,
  renderTrends: renderTrends,
  togglePanel: togglePanel,
  importPaste: importPaste,
  importCSV: importCSV,
  handleCSVFile: handleCSVFile,
  exportCSV: exportCSV,
  exportAudit: exportAudit,
  csvEsc: csvEsc,
  exportBackup: exportBackup,
  importBackup: importBackup,
  openShareModal: openShareModal,
  updateSharePreview: updateSharePreview,
  doShareExport: doShareExport,
  openMergeModal: openMergeModal,
  previewMerge: previewMerge,
  doMerge: doMerge,
  obRender: obRender,
  obCollect: obCollect,
  obNext: obNext,
  obBack: obBack,
  obSkip: obSkip,
  obFinish: obFinish,
  maybeShowOnboarding: maybeShowOnboarding,
  openCardDetail: openCardDetail,
  toast: toast,
  onTxnTypeChange: onTxnTypeChange
};
