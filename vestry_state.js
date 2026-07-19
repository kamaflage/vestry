/* ============================================================
   VESTRY — Vestry.State
   Persisted application data: STATE object, load/save, and
   backward-compatible migration for the v2.28 source/transfer
   data model. Defines plain globals (STATE, save(), load(), etc.)
   for compatibility with inline onclick="" handlers elsewhere in
   the app, and also exposes them under window.Vestry.State so the
   codebase has a real namespace to hang off of.
   ============================================================ */

// ── CONSTANTS ────────────────────────────────────────────────
var APP_VERSION = 'v2.46';
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var MONTHS_SHORT = MONTHS.map(function(m){ return m.substr(0,3); });

// ── STATE ────────────────────────────────────────────────────
var STATE = {
  transactions: [],
  recurring:    [],
  goals:        [],
  workHours:    [],
  mileage:      [],
  expenses:     [],
  invoices:     [],
  config: {
    family:          '',
    person:          '',
    ownerTag:        '',
    incomeTarget:    0,
    expenseLimit:    0,
    savingsTarget:   0,
    motivStyle:      'gentle',
    currency:        '$',
    budgetGoals:     [],
    invName:         '',
    invAddress:      '',
    invCompany:      '',
    invCompanyAddress: '',
    invWage:         0,
    invPrefix:       'INV-',
    invNext:         1,
    invTerms:        'Due upon receipt',
    invCat:          'Contract Income',
    fuelPricePerL:   0,
    fuelEconomyL100km: 0,
    mileageRate:     0,
    mileageUnit:     'km',
    lastBackupDate:  0,
    firstUseDate:    0,
    customCategories: []
  },
  currentMonth: new Date().getMonth(),
  currentYear:  new Date().getFullYear()
};

var _mergeData = null;

// ── CSV PARSER (Robust) ──────────────────────────────────────
function splitCSV(str) {
  var result = [];
  var insideQuotes = false;
  var currentWord = '';
  for (var i = 0; i < str.length; i++) {
    var char = str[i];
    if (char === '"') { insideQuotes = !insideQuotes; }
    else if (char === ',' && !insideQuotes) { result.push(currentWord.trim()); currentWord = ''; }
    else { currentWord += char; }
  }
  result.push(currentWord.trim());
  return result.map(function(s) { return s.replace(/^"|"$/g, '').trim(); });
}


// ── ESCAPE (Strict XSS Prevention) ───────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}


// ── PERSIST ──────────────────────────────────────────────────
function save() {
  try { localStorage.setItem('vestry_state', JSON.stringify(STATE)); } catch(e){}
}

function load() {
  try {
    var raw = localStorage.getItem('vestry_state');
    if (!raw) return;
    var d = JSON.parse(raw);
    STATE.transactions = (d.transactions || []).map(migrateTransaction);
    STATE.recurring    = d.recurring    || [];
    STATE.goals        = d.goals        || [];
    STATE.workHours    = d.workHours    || [];
    STATE.mileage      = d.mileage      || [];
    STATE.expenses     = d.expenses     || [];
    STATE.invoices     = d.invoices     || [];
    if (d.config) {
      Object.assign(STATE.config, d.config);
      if (!STATE.config.budgetGoals) STATE.config.budgetGoals = [];
    }
  } catch(e){}
}

// ── FIRST USE DATE (v2.36) ────────────────────────────────────────────────
// The backup reminder needs to know "how long has this account existed
// unbacked-up" — and that is NOT the same thing as "what's the oldest date
// among my transactions." Transaction dates describe financial history and
// get backdated constantly (bank CSV imports, restoring an old backup,
// entering last month's receipts, test/dummy data) — none of that means the
// account itself is that old. firstUseDate is a separate, explicit anchor:
//   - Never set (fresh install, or a pre-v2.36 save with no such field) and
//     no transactions exist yet -> this moment IS day one. Set to now.
//   - Never set but transactions already exist -> this is an upgrade from a
//     pre-v2.36 save; best available proxy is the earliest transaction date
//     (one-time backfill only, never recomputed once set).
//   - Already set -> leave it alone. A reset clears localStorage entirely
//     (see nukeEverything), so the next load naturally hits the fresh-install
//     case above and gets a new day one, regardless of what gets imported
//     into it afterward.
// Restoring an actual backup (importBackup) is handled separately: it keeps
// the imported file's own firstUseDate if present, and otherwise treats the
// import as starting now, on the same reasoning as fresh install — see
// importBackup in vestry_ui.js.
function ensureFirstUseDate() {
  if (STATE.config.firstUseDate) return;
  var earliest = STATE.transactions.reduce(function(min,t){ return (!min || t.date < min) ? t.date : min; }, null);
  STATE.config.firstUseDate = earliest ? new Date(earliest + 'T00:00:00').getTime() : Date.now();
  save();
}

// ── MIGRATION: 'source' flag / 'transfer' type (v2.28 data model) ─────────
// Older transactions predate the checking/savings source split. This maps
// them onto the new model so the checking and savings ledgers stay decoupled
// (and the old double-count of direct savings expenses gets fixed on load):
//   - missing `source`                          -> 'checking' (safe default)
//   - type 'savings'    (old deposit)            -> type 'transfer', transferDirection 'to_savings'
//   - type 'savings_wd' (old withdrawal)         -> type 'transfer', transferDirection 'from_savings'
//   - type 'expense' with cat 'Savings'          -> stays type 'expense', source 'savings'
//     (money spent directly out of the savings account — this was the double-count bug)
// Idempotent: safe to run on already-migrated data.
function migrateTransaction(t) {
  if (!t) return t;
  if (t.type === 'savings') {
    return Object.assign({}, t, { type: 'transfer', transferDirection: 'to_savings', source: 'checking' });
  }
  if (t.type === 'savings_wd') {
    return Object.assign({}, t, { type: 'transfer', transferDirection: 'from_savings', source: 'checking' });
  }
  if (t.type === 'expense' && t.cat === 'Savings' && t.source !== 'savings') {
    return Object.assign({}, t, { source: 'savings' });
  }
  if (!t.source) {
    return Object.assign({}, t, { source: 'checking' });
  }
  return t;
}

// ── NAMESPACE EXPORT ────────────────────────────────────────
window.Vestry = window.Vestry || {};
Vestry.State = {
  STATE: STATE,
  APP_VERSION: APP_VERSION,
  MONTHS: MONTHS,
  MONTHS_SHORT: MONTHS_SHORT,
  save: save,
  load: load,
  ensureFirstUseDate: ensureFirstUseDate,
  migrateTransaction: migrateTransaction,
  esc: esc,
  splitCSV: splitCSV
};
