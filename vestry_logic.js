/* ============================================================
   VESTRY — Vestry.Logic
   Pure calculation and formatting functions — no DOM access.
   Includes the v2.28 source/transfer-aware ledger math that
   decouples the checking and savings balances (see the
   "SOURCE / TRANSFER AWARE LEDGER MATH" section below).
   Depends on Vestry.State (loaded first) for STATE/MONTHS_SHORT.
   ============================================================ */


// ── HELPERS ──────────────────────────────────────────────────
function C() { return STATE.config.currency || '$'; }

function fmt(n) {
  return C() + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function monthTxns() {
  var ym = STATE.currentYear + '-' + String(STATE.currentMonth + 1).padStart(2,'0');
  return STATE.transactions.filter(function(t){ return t.date && t.date.startsWith(ym); });
}


// ── MILEAGE ──────────────────────────────────────────────────
function distUnit() { return STATE.config.mileageUnit || 'km'; }

function sumExpenses(list) { return list.reduce(function(s,e){ return s + e.amount; }, 0); }

function shortDate(iso) {
  var p = iso.split('-');
  return MONTHS_SHORT[parseInt(p[1],10)-1] + ' ' + parseInt(p[2],10);
}


function dateStr(d) { return d.toISOString().split('T')[0]; }

function startOfWeek(d) {
  var x = new Date(d); var day = x.getDay();
  x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x;
}

function rangeForPreset(preset) {
  var today = new Date();
  if (preset === 'week') {
    var s = startOfWeek(today); var e = new Date(s); e.setDate(e.getDate()+6);
    return [dateStr(s), dateStr(e)];
  }
  if (preset === 'lastweek') {
    var s2 = startOfWeek(today); s2.setDate(s2.getDate()-7); var e2 = new Date(s2); e2.setDate(e2.getDate()+6);
    return [dateStr(s2), dateStr(e2)];
  }
  if (preset === 'month') {
    var s3 = new Date(today.getFullYear(), today.getMonth(), 1);
    var e3 = new Date(today.getFullYear(), today.getMonth()+1, 0);
    return [dateStr(s3), dateStr(e3)];
  }
  if (preset === 'lastmonth') {
    var s4 = new Date(today.getFullYear(), today.getMonth()-1, 1);
    var e4 = new Date(today.getFullYear(), today.getMonth(), 0);
    return [dateStr(s4), dateStr(e4)];
  }
  return [dateStr(today), dateStr(today)];
}


function unbilledEntries(list) { return (list || STATE.workHours).filter(function(w){ return !w.invoiceId; }); }

function entriesInRange(list, from, to) {
  return list.filter(function(w){ return w.date >= from && w.date <= to; });
}

function sumHours(list) { return list.reduce(function(s,w){ return s + w.hours; }, 0); }

// ── SOURCE / TRANSFER AWARE LEDGER MATH (v2.28) ──────────────────────────
// txnSource(t): every transaction has a funding/destination account —
// 'checking' (default) or 'savings'. Transfers move money between the two.
function txnSource(t) { return (t && t.source) || 'checking'; }
// Custodial (v2.30): money that passes through your accounts but isn't
// yours — e.g. a kid's gift check deposited into their savings category.
// It still counts toward the real Savings Balance and its category's
// running balance (the money is really sitting in the account), but it's
// excluded from your Income/Expense totals, targets, and health score.
function isCustodial(t) { return !!(t && t.custodial); }

// Global Income: all money received, regardless of which account it lands in
// (excludes custodial pass-through amounts — see isCustodial).
function globalIncome(list) {
  return (list||[]).filter(function(t){ return t.type==='income' && !isCustodial(t); }).reduce(function(s,t){ return s+t.amt; },0);
}
// Global Expenses: all spending (feeds the category breakdown), regardless of account
// (excludes custodial pass-through amounts).
function globalExpenses(list) {
  return (list||[]).filter(function(t){ return (t.type==='expense' || t.type==='one-off') && !isCustodial(t); }).reduce(function(s,t){ return s+t.amt; },0);
}
function checkingIncome(list) {
  return (list||[]).filter(function(t){ return t.type==='income' && txnSource(t)==='checking' && !isCustodial(t); }).reduce(function(s,t){ return s+t.amt; },0);
}
function checkingExpenses(list) {
  return (list||[]).filter(function(t){ return (t.type==='expense'||t.type==='one-off') && txnSource(t)==='checking' && !isCustodial(t); }).reduce(function(s,t){ return s+t.amt; },0);
}
// Savings-side income/expense intentionally INCLUDE custodial transactions —
// the money is really in the savings account and must count toward the real
// Savings Balance and per-category breakdown, even though it isn't "yours."
function savingsIncome(list) {
  return (list||[]).filter(function(t){ return t.type==='income' && txnSource(t)==='savings'; }).reduce(function(s,t){ return s+t.amt; },0);
}
function savingsExpenses(list) {
  return (list||[]).filter(function(t){ return (t.type==='expense'||t.type==='one-off') && txnSource(t)==='savings'; }).reduce(function(s,t){ return s+t.amt; },0);
}
// Checking Net: income minus expenses within the checking account only.
function checkingNet(list) { return checkingIncome(list) - checkingExpenses(list); }

function transfersToSavings(list) {
  return (list||[]).filter(function(t){ return t.type==='transfer' && t.transferDirection==='to_savings'; }).reduce(function(s,t){ return s+t.amt; },0);
}
function transfersFromSavings(list) {
  return (list||[]).filter(function(t){ return t.type==='transfer' && t.transferDirection==='from_savings'; }).reduce(function(s,t){ return s+t.amt; },0);
}
// Net movement into savings for a period (what the "Saved" card shows) —
// pure transfer flow, distinct from money earned/spent directly in savings.
function netSavingsContribution(list) { return transfersToSavings(list) - transfersFromSavings(list); }

// Checking Balance: start + checking_net - transfers_to_savings + transfers_from_savings
function checkingBalance(list, start) {
  start = start || 0;
  return start + checkingNet(list) - transfersToSavings(list) + transfersFromSavings(list);
}
// Savings Balance: start + savings-side income - savings-side expenses + transfers_to_savings - transfers_from_savings
function savingsBalance(list, start) {
  start = start || 0;
  return start + savingsIncome(list) - savingsExpenses(list) + transfersToSavings(list) - transfersFromSavings(list);
}
// Kept for backward compatibility with existing call sites: the all-time,
// all-transactions savings balance.
function allTimeSavingsBalance() {
  return savingsBalance(STATE.transactions, 0);
}

// Savings Balance as of the end of the currently VIEWED month (STATE.currentMonth/
// currentYear), not always today's live total \u2014 so browsing a past month via the
// month picker shows the real historical balance at that point in time, the same
// way the Checking carry-strip's Ending Balance already does. Includes every
// transaction dated on or before the last day of that month, regardless of type
// or account. Equals allTimeSavingsBalance() while viewing the real current month.
function savingsBalanceThroughViewedMonth() {
  var ym = STATE.currentYear + '-' + String(STATE.currentMonth + 1).padStart(2,'0');
  var cutoff = ym + '-31'; // date strings compare lexicographically; no real date exceeds this
  var through = STATE.transactions.filter(function(t){ return t.date && t.date <= cutoff; });
  return savingsBalance(through, 0);
}

// Savings by Category: running (all-time) net balance per category, for
// money that lives directly in the savings account (source: 'savings').
// Lets a category double as a sub-account — e.g. logging a deposit as
// income/source:savings/cat:"Nathan Savings" and a later withdrawal as
// expense/source:savings/cat:"Nathan Savings" nets out to that kid's
// running balance, while everything still sums to the one Savings Balance.
// Plain checking<->savings Transfers aren't category-earmarked and are
// intentionally excluded — they move the general pool, not a sub-account.
function savingsByCategory(list) {
  var totals = {};
  (list||[]).filter(function(t){ return txnSource(t)==='savings' && (t.type==='income'||t.type==='expense'||t.type==='one-off'); })
    .forEach(function(t){
      var sign = t.type === 'income' ? 1 : -1;
      totals[t.cat] = (totals[t.cat] || 0) + sign * t.amt;
    });
  return Object.keys(totals).sort(function(a,b){ return totals[b]-totals[a]; }).map(function(cat){
    return { cat: cat, balance: totals[cat] };
  });
}
function sumDist(list) { return list.reduce(function(s,m){ return s + m.distance; }, 0); }

function sumDistCost(list) {
  return list.reduce(function(s,m){
    var r = (m.rate != null) ? m.rate : (STATE.config.mileageRate || 0);
    return s + m.distance * r;
  }, 0);
}


// ── FUEL COST → MILEAGE RATE ────────────────────────────────
// Derives $/km (or $/mi) from fuel price and vehicle economy, instead of
// a manually-set flat rate, so it stays current as gas prices change.
function computeFuelRate(fuelPrice, economyL100km, unit) {
  var perKm = (economyL100km / 100) * fuelPrice;
  return unit === 'mi' ? perKm * 1.60934 : perKm;
}


// ── BUDGET HEALTH SCORE ──────────────────────────────────────
function calcHealthScore(txns) {
  var c = STATE.config;
  var income   = globalIncome(txns);
  var expenses = globalExpenses(txns);
  var saved    = netSavingsContribution(txns);
  var score = 50;

  if (income > 0) {
    var savingsRate = saved / income;
    score += Math.min(30, savingsRate * 150);
    var expenseRatio = expenses / income;
    if (expenseRatio < 0.5)      score += 20;
    else if (expenseRatio < 0.7) score += 12;
    else if (expenseRatio < 0.9) score += 4;
    else                          score -= 15;
  }

  if (c.expenseLimit > 0 && expenses > 0) {
    if (expenses <= c.expenseLimit * 0.8)      score += 10;
    else if (expenses <= c.expenseLimit)       score += 5;
    else                                        score -= 10;
  }
  if (c.savingsTarget > 0 && saved >= c.savingsTarget) score += 10;

  if (txns.length === 0) return null;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreLabel(score, style) {
  if (score === null) return { grade: '—', msg: 'No data this month yet.' };
  var msgs = {
    gentle: [
      'Every step counts — keep going! 🌱',
      "You're building good habits. Small wins add up.",
      "Solid month! You're on a steady path.",
      "Great work — your future self will thank you.",
      "Outstanding! You're crushing your budget goals. 🏆"
    ],
    coach: [
      'Put something away this month — even $1 matters.',
      'Track every dollar. You have room to tighten up.',
      "Decent. Push savings higher next month.",
      "Strong month. Keep this discipline.",
      "Elite level. This is how wealth is built."
    ],
    data: [
      'Score: ' + score + '/100. Below average.',
      'Score: ' + score + '/100. Below target.',
      'Score: ' + score + '/100. On track.',
      'Score: ' + score + '/100. Above target.',
      'Score: ' + score + '/100. Excellent.'
    ]
  };
  var bucket = score < 40 ? 0 : score < 55 ? 1 : score < 70 ? 2 : score < 85 ? 3 : 4;
  var grades = ['D','C','B','A','A+'];
  var m = msgs[style || 'gentle'];
  return { grade: grades[bucket], msg: m[bucket] };
}


function healthColor(score) {
  if (score === null) return 'var(--text3)';
  if (score < 40)  return 'var(--expense)';
  if (score < 60)  return 'var(--oneoff)';
  if (score < 75)  return 'var(--gold)';
  return 'var(--income)';
}


// ── NAMESPACE EXPORT ────────────────────────────────────────
// ── TRANSACTION FILTERING (v2.39) ─────────────────────────────────────────
// Pure filter over any transaction list, used by the All Transactions
// search/filter panel. Every field is optional; an unset field imposes no
// constraint. Amounts compare against Math.abs(t.amt) since the ledger
// stores unsigned amounts and derives sign from type elsewhere.
function filterTxns(list, f) {
  f = f || {};
  var q = (f.q || '').trim().toLowerCase();
  return (list || []).filter(function(t) {
    if (f.type && t.type !== f.type) return false;
    if (f.cat && t.cat !== f.cat) return false;
    if (f.source && txnSource(t) !== f.source) return false;
    if (f.from && t.date < f.from) return false;
    if (f.to && t.date > f.to) return false;
    if (f.amtMin != null && !isNaN(f.amtMin) && Math.abs(t.amt) < f.amtMin) return false;
    if (f.amtMax != null && !isNaN(f.amtMax) && Math.abs(t.amt) > f.amtMax) return false;
    if (q) {
      var hay = (t.desc + ' ' + t.cat + ' ' + (t.owner || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

window.Vestry = window.Vestry || {};
Vestry.Logic = {
  C: C,
  fmt: fmt,
  monthTxns: monthTxns,
  distUnit: distUnit,
  sumExpenses: sumExpenses,
  shortDate: shortDate,
  dateStr: dateStr,
  startOfWeek: startOfWeek,
  rangeForPreset: rangeForPreset,
  unbilledEntries: unbilledEntries,
  entriesInRange: entriesInRange,
  sumHours: sumHours,
  sumDist: sumDist,
  sumDistCost: sumDistCost,
  computeFuelRate: computeFuelRate,
  calcHealthScore: calcHealthScore,
  scoreLabel: scoreLabel,
  healthColor: healthColor,
  txnSource: txnSource,
  isCustodial: isCustodial,
  globalIncome: globalIncome,
  globalExpenses: globalExpenses,
  checkingIncome: checkingIncome,
  checkingExpenses: checkingExpenses,
  savingsIncome: savingsIncome,
  savingsExpenses: savingsExpenses,
  checkingNet: checkingNet,
  transfersToSavings: transfersToSavings,
  transfersFromSavings: transfersFromSavings,
  netSavingsContribution: netSavingsContribution,
  checkingBalance: checkingBalance,
  savingsBalance: savingsBalance,
  allTimeSavingsBalance: allTimeSavingsBalance,
  savingsBalanceThroughViewedMonth: savingsBalanceThroughViewedMonth,
  savingsByCategory: savingsByCategory,
  filterTxns: filterTxns
};
