import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Legend
} from "recharts";

const CATS = [
  { id: "food", name: "Food", icon: "🍽️", color: "#f97316" },
  { id: "fruits", name: "Fruits", icon: "🍎", color: "#22c55e" },
  { id: "diver", name: "Diver", icon: "🤿", color: "#06b6d4" },
  { id: "diver_x", name: "Diver X", icon: "💫", color: "#a855f7" },
  { id: "rosa_fee", name: "Rosa Fee", icon: "🌹", color: "#ec4899" },
  { id: "kids_fee", name: "Kids Fee", icon: "🧒", color: "#eab308" },
  { id: "car_fee", name: "Car Fee", icon: "🚗", color: "#64748b" },
  { id: "parent_fee", name: "Parent Fee", icon: "👨‍👩‍👦", color: "#84cc16" },
  { id: "unexpected", name: "Unexpected Fee", icon: "⚡", color: "#ef4444" },
  { id: "financial", name: "Financial", icon: "💰", color: "#f59e0b" },
  { id: "trip_fee", name: "Trip Fee", icon: "✈️", color: "#3b82f6" },
  { id: "study_fee", name: "Study Fee", icon: "📚", color: "#8b5cf6" },
];

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n || 0);

const todayStr = () => new Date().toISOString().split("T")[0];
const monthStr = (d) => d.toISOString().slice(0, 7);
const yearStr = (d) => d.getFullYear().toString();
const getCat = (id) => CATS.find((c) => c.id === id) || CATS[0];
const sum = (arr) => arr.reduce((s, e) => s + e.amount, 0);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [dark, setDark] = useState(true);
  const [modal, setModal] = useState(false);
  const [selCat, setSelCat] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", notes: "", date: todayStr() });
  const [editId, setEditId] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState("month");
  const [calSelDay, setCalSelDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState("today");
  const [gsConnected, setGsConnected] = useState(false);
  const [gsId, setGsId] = useState("");
  const [toast, setToast] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);

  useEffect(() => {
    
      try {
        const r = { value: localStorage.getItem("expenses_v1") };
        if (r?.value) setExpenses(JSON.parse(r.value));
        const cfg = { value: localStorage.getItem("expenses_cfg") };
        if (cfg?.value) {
          const c = JSON.parse(cfg.value);
          setDark(c.dark ?? true);
          setGsConnected(c.gsConnected ?? false);
          setGsId(c.gsId ?? "");
        }
      } catch {}
      setLoading(false);

  }, []);

  const persist = useCallback((data) => {
    try { localStorage.setItem("expenses_v1", JSON.stringify(data)); } catch {}
  }, []);

  const persistCfg = useCallback((cfg) => {
    try { localStorage.setItem("expenses_cfg", JSON.stringify(cfg)); } catch {}
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const saveExpense = () => {
    if (!form.name.trim() || !form.amount || isNaN(parseFloat(form.amount))) return;
    let updated;
    if (editId) {
      updated = expenses.map((e) =>
        e.id === editId
          ? { ...e, ...form, amount: parseFloat(form.amount), category: selCat.id, ts: new Date().toISOString() }
          : e
      );
      showToast("Expense updated");
    } else {
      const ex = {
        id: Date.now().toString(),
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        notes: form.notes.trim(),
        date: form.date,
        category: selCat.id,
        ts: new Date().toISOString(),
      };
      updated = [ex, ...expenses];
      showToast("Expense added");
    }
    setExpenses(updated);
    persist(updated);
    closeModal();
  };

  const deleteExpense = (id) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    persist(updated);
    setDelConfirm(null);
    showToast("Expense deleted", "error");
  };

  const closeModal = () => {
    setModal(false);
    setSelCat(null);
    setEditId(null);
    setForm({ name: "", amount: "", notes: "", date: todayStr() });
  };

  const openAdd = (cat) => { setSelCat(cat); setModal(true); };
  const openEdit = (ex) => {
    setSelCat(getCat(ex.category));
    setForm({ name: ex.name, amount: ex.amount.toString(), notes: ex.notes || "", date: ex.date });
    setEditId(ex.id);
    setModal(true);
  };

  const exportCSV = () => {
    const hdr = "ID,Date,Category,Name,Amount,Notes,Timestamp\n";
    const rows = expenses.map((e) =>
      [e.id, e.date, getCat(e.category).name, `"${e.name}"`, e.amount, `"${e.notes || ""}"`, e.ts].join(",")
    ).join("\n");
    const blob = new Blob([hdr + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expenses.csv";
    a.click();
    showToast("CSV exported");
  };

  // ── derived data ──────────────────────────────────────────────
  const now = new Date();
  const todayExp = expenses.filter((e) => e.date === todayStr());
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
  const weekExp = expenses.filter((e) => new Date(e.date) >= weekStart);
  const monthExp = expenses.filter((e) => e.date.startsWith(monthStr(now)));
  const yearExp = expenses.filter((e) => e.date.startsWith(yearStr(now)));

  const catTotals = useMemo(() =>
    CATS.map((c) => ({ ...c, total: sum(expenses.filter((e) => e.category === c.id)) }))
      .sort((a, b) => b.total - a.total),
    [expenses]
  );

  const monthlyBar = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const key = monthStr(d);
      return { month: MONTHS[d.getMonth()], total: parseFloat(sum(expenses.filter((e) => e.date.startsWith(key))).toFixed(2)) };
    });
  }, [expenses]);

  const dailyLine = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days.push({ day: d.getDate(), total: parseFloat(sum(expenses.filter((e) => e.date === key)).toFixed(2)) });
    }
    return days;
  }, [expenses]);

  const pieData = catTotals.filter((c) => c.total > 0).slice(0, 8);

  const filtered = useMemo(() => {
    let r = [...expenses];
    if (search) r = r.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      getCat(e.category).name.toLowerCase().includes(search.toLowerCase()) ||
      e.date.includes(search)
    );
    if (filterCat !== "all") r = r.filter((e) => e.category === filterCat);
    if (sortBy === "newest") r.sort((a, b) => new Date(b.ts || b.date) - new Date(a.ts || a.date));
    else if (sortBy === "oldest") r.sort((a, b) => new Date(a.ts || a.date) - new Date(b.ts || b.date));
    else if (sortBy === "highest") r.sort((a, b) => b.amount - a.amount);
    else r.sort((a, b) => a.amount - b.amount);
    return r;
  }, [expenses, search, filterCat, sortBy]);

  const calExpenses = useMemo(() => {
    if (calView === "day") {
      const key = calSelDay || todayStr();
      return expenses.filter((e) => e.date === key);
    }
    if (calView === "month") return expenses.filter((e) => e.date.startsWith(monthStr(calDate)));
    return expenses.filter((e) => e.date.startsWith(yearStr(calDate)));
  }, [expenses, calDate, calView, calSelDay]);

  const calGrid = useMemo(() => {
    const y = calDate.getFullYear(), m = calDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const grid = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      grid.push({ day: d, dateStr, total: sum(expenses.filter((e) => e.date === dateStr)) });
    }
    return grid;
  }, [expenses, calDate]);

  // ── theme ──────────────────────────────────────────────────────
  const T = {
    bg: dark ? "#0d1117" : "#f0f2f5",
    surface: dark ? "#161b22" : "#ffffff",
    surface2: dark ? "#1e2430" : "#f8fafc",
    border: dark ? "#30363d" : "#e2e8f0",
    text: dark ? "#e6edf3" : "#0f172a",
    muted: dark ? "#8b949e" : "#64748b",
    accent: "#6366f1",
    amber: "#f59e0b",
    sidebar: dark ? "#0d1117" : "#1e293b",
    sideText: "#c9d1d9",
    sideMuted: "#6e7681",
  };

  // ── shared component helpers ───────────────────────────────────
  const Card = ({ children, style = {} }) => (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, ...style }}>
      {children}
    </div>
  );

  const StatCard = ({ label, value, icon, color, sub }) => (
    <Card style={{ padding: "20px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{fmt(value)}</div>
          {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 28 }}>{icon}</div>
      </div>
    </Card>
  );

  const ExpenseRow = ({ ex, compact = false }) => {
    const cat = getCat(ex.category);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: compact ? "8px 0" : "10px 0", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: cat.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {cat.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</div>
          <div style={{ fontSize: 11, color: T.muted }}>{cat.name} · {ex.date}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: cat.color }}>{fmt(ex.amount)}</div>
          {ex.notes && <div style={{ fontSize: 10, color: T.muted, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.notes}</div>}
        </div>
        {!compact && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => openEdit(ex)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: T.muted, fontSize: 14 }}>✏️</button>
            <button onClick={() => setDelConfirm(ex.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: T.muted, fontSize: 14 }}>🗑️</button>
          </div>
        )}
      </div>
    );
  };

  // ── pages ──────────────────────────────────────────────────────
  const drillPeriods = {
    today: { label: "Today", sub: todayStr(), exps: todayExp, color: "#6366f1", icon: "📅" },
    week: { label: "This Week", sub: `${weekStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – now`, exps: weekExp, color: "#06b6d4", icon: "📆" },
    month: { label: "This Month", sub: new Date().toLocaleString("default",{month:"long",year:"numeric"}), exps: monthExp, color: "#f59e0b", icon: "🗓️" },
    year: { label: "This Year", sub: new Date().getFullYear().toString(), exps: yearExp, color: "#22c55e", icon: "📊" },
  };
  const activePeriod = drillPeriods[drillDown];

  const PageDashboard = () => (
    <div>
      {/* Clickable period cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        {Object.entries(drillPeriods).map(([key, p]) => {
          const active = drillDown === key;
          return (
            <button key={key} onClick={() => setDrillDown(key)}
              style={{ background: active ? p.color + "22" : T.surface, border: `2px solid ${active ? p.color : T.border}`, borderRadius: 12, padding: "18px 16px", cursor: "pointer", textAlign: "left", transition: "all .15s" }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = p.color + "88"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = T.border; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 11, color: active ? p.color : T.muted, marginBottom: 6, fontWeight: 600 }}>{p.label.toUpperCase()}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: active ? p.color : T.text, lineHeight: 1 }}>{fmt(sum(p.exps))}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{p.exps.length} transaction{p.exps.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontSize: 26 }}>{p.icon}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Drill-down expense list for selected period */}
      <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: activePeriod.color + "14", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{activePeriod.icon}</span>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{activePeriod.label} — {activePeriod.sub}</span>
              <span style={{ fontSize: 12, color: T.muted, marginLeft: 12 }}>{activePeriod.exps.length} transaction{activePeriod.exps.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: activePeriod.color }}>{fmt(sum(activePeriod.exps))}</span>
        </div>
        {activePeriod.exps.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: T.muted, fontSize: 14 }}>
            No expenses for {activePeriod.label.toLowerCase()}.<br/>
            <span style={{ fontSize: 12 }}>Click a category below to add one.</span>
          </div>
        ) : (
          <div style={{ padding: "0 20px", maxHeight: 280, overflowY: "auto" }}>
            {/* Group by category for this period */}
            {(() => {
              const grouped = {};
              activePeriod.exps.forEach(ex => {
                if (!grouped[ex.category]) grouped[ex.category] = [];
                grouped[ex.category].push(ex);
              });
              return Object.entries(grouped).sort((a,b) => sum(b[1]) - sum(a[1])).map(([catId, exps]) => {
                const cat = getCat(catId);
                return (
                  <div key={catId} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0 6px", position: "sticky", top: 0, background: T.surface }}>
                      <span style={{ fontSize: 16 }}>{cat.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{cat.name}</span>
                      <span style={{ fontSize: 11, color: T.muted, marginLeft: "auto" }}>{exps.length} items · {fmt(sum(exps))}</span>
                    </div>
                    {exps.map(ex => (
                      <div key={ex.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0 6px 24px", borderTop: `1px solid ${T.border}33` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: T.text }}>{ex.name}</div>
                          {ex.notes && <div style={{ fontSize: 11, color: T.muted }}>{ex.notes}</div>}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted }}>{ex.date}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: cat.color, minWidth: 70, textAlign: "right" }}>{fmt(ex.amount)}</div>
                        <button onClick={() => openEdit(ex)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "2px 4px" }}>✏️</button>
                        <button onClick={() => setDelConfirm(ex.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "2px 4px" }}>🗑️</button>
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>Monthly Spending (6 months)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyBar} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, fontSize: 12 }} formatter={(v) => [fmt(v), "Total"]} />
              <Bar dataKey="total" fill={T.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>Spending by Category</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="40%" cy="50%" outerRadius={70} innerRadius={28} dataKey="total" nameKey="name">
                  {pieData.map((c) => <Cell key={c.id} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: T.muted, fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 13 }}>Add expenses to see chart</div>
          )}
        </Card>
      </div>

      <Card style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>Quick Add — Select Category</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
          {CATS.map((cat) => (
            <button key={cat.id} onClick={() => openAdd(cat)}
              style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 6px", cursor: "pointer", transition: "all .15s", textAlign: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.background = cat.color + "18"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surface2; }}>
              <div style={{ fontSize: 22 }}>{cat.icon}</div>
              <div style={{ fontSize: 9, color: T.muted, marginTop: 4, lineHeight: 1.3, wordBreak: "break-word" }}>{cat.name}</div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );

  const PageCalendar = () => {
    const prevMonth = () => { const d = new Date(calDate); d.setMonth(d.getMonth() - 1); setCalDate(d); setCalSelDay(null); };
    const nextMonth = () => { const d = new Date(calDate); d.setMonth(d.getMonth() + 1); setCalDate(d); setCalSelDay(null); };
    const prevYear  = () => { const d = new Date(calDate); d.setFullYear(d.getFullYear() - 1); setCalDate(d); setCalSelDay(null); };
    const nextYear  = () => { const d = new Date(calDate); d.setFullYear(d.getFullYear() + 1); setCalDate(d); setCalSelDay(null); };
    const monthTotal = sum(expenses.filter(e => e.date.startsWith(monthStr(calDate))));
    const yearTotal  = sum(expenses.filter(e => e.date.startsWith(yearStr(calDate))));

    const yearMonthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
      const key = `${calDate.getFullYear()}-${String(i+1).padStart(2,"0")}`;
      const exps = expenses.filter(e => e.date.startsWith(key));
      return { month: MONTHS[i], key, total: sum(exps), count: exps.length };
    });

    // Which expenses to show in the right panel
    const panelDate  = calSelDay || todayStr();
    const panelExps  = calView === "day"
      ? expenses.filter(e => e.date === panelDate)
      : calView === "month"
        ? expenses.filter(e => e.date.startsWith(monthStr(calDate)))
        : expenses.filter(e => e.date.startsWith(yearStr(calDate)));

    const panelTitle = calView === "day"
      ? panelDate
      : calView === "month"
        ? `${MONTHS[calDate.getMonth()]} ${calDate.getFullYear()}`
        : `${calDate.getFullYear()}`;

    // Group panel expenses by date descending
    const panelGrouped = {};
    [...panelExps].sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(ex => {
      if (!panelGrouped[ex.date]) panelGrouped[ex.date] = [];
      panelGrouped[ex.date].push(ex);
    });

    // Inline edit for quick amount/name change in the panel
    const [inlineEdit, setInlineEdit] = useState(null); // { id, field }
    const [inlineVal, setInlineVal]   = useState("");

    const commitInline = (ex) => {
      if (!inlineEdit) return;
      const updated = expenses.map(e => {
        if (e.id !== ex.id) return e;
        if (inlineEdit.field === "amount") return { ...e, amount: parseFloat(inlineVal) || e.amount };
        if (inlineEdit.field === "name")   return { ...e, name: inlineVal.trim() || e.name };
        return e;
      });
      setExpenses(updated);
      persist(updated);
      setInlineEdit(null);
      showToast("Updated");
    };

    const ExpenseCard = ({ ex }) => {
      const cat = getCat(ex.category);
      const isEditingName   = inlineEdit?.id === ex.id && inlineEdit?.field === "name";
      const isEditingAmount = inlineEdit?.id === ex.id && inlineEdit?.field === "amount";
      return (
        <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          {/* Category icon */}
          <div style={{ width: 38, height: 38, borderRadius: 8, background: cat.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
            {cat.icon}
          </div>

          {/* Name + category + date */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditingName ? (
              <input autoFocus value={inlineVal}
                onChange={e => setInlineVal(e.target.value)}
                onBlur={() => commitInline(ex)}
                onKeyDown={e => { if (e.key === "Enter") commitInline(ex); if (e.key === "Escape") setInlineEdit(null); }}
                style={{ fontSize: 13, fontWeight: 600, color: T.text, background: T.surface, border: `1px solid ${T.accent}`, borderRadius: 6, padding: "2px 6px", width: "100%", outline: "none" }} />
            ) : (
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "text" }}
                onClick={() => { setInlineEdit({ id: ex.id, field: "name" }); setInlineVal(ex.name); }}>
                {ex.name}
              </div>
            )}
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              <span style={{ color: cat.color }}>{cat.name}</span>
              {calView !== "day" && <span> · {ex.date}</span>}
              {ex.notes && <span> · {ex.notes}</span>}
            </div>
          </div>

          {/* Amount — click to edit inline */}
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            {isEditingAmount ? (
              <input autoFocus type="number" value={inlineVal}
                onChange={e => setInlineVal(e.target.value)}
                onBlur={() => commitInline(ex)}
                onKeyDown={e => { if (e.key === "Enter") commitInline(ex); if (e.key === "Escape") setInlineEdit(null); }}
                style={{ fontSize: 14, fontWeight: 700, color: cat.color, background: T.surface, border: `1px solid ${T.accent}`, borderRadius: 6, padding: "2px 6px", width: 80, outline: "none", textAlign: "right" }} />
            ) : (
              <div style={{ fontSize: 14, fontWeight: 700, color: cat.color, cursor: "text", padding: "2px 4px", borderRadius: 4 }}
                title="Click to edit amount"
                onClick={() => { setInlineEdit({ id: ex.id, field: "amount" }); setInlineVal(ex.amount.toString()); }}>
                {fmt(ex.amount)}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
            <button onClick={() => openEdit(ex)} title="Edit expense"
              style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.accent + "22", color: T.accent, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
              ✏️ Edit
            </button>
            <button onClick={() => setDelConfirm(ex.id)} title="Delete expense"
              style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #ef444433", background: "#ef444422", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
              🗑️ Del
            </button>
          </div>
        </div>
      );
    };

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16 }}>
        {/* Left: calendar navigation */}
        <div>
          {/* View toggle + date jump */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {["day", "month", "year"].map((v) => (
              <button key={v} onClick={() => { setCalView(v); setCalSelDay(null); }}
                style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${calView === v ? T.accent : T.border}`, background: calView === v ? T.accent : T.surface, color: calView === v ? "#fff" : T.text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                {v === "day" ? "📅 Day" : v === "month" ? "🗓️ Month" : "📊 Year"}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Jump to date:</span>
              <input type="date" defaultValue={todayStr()}
                onChange={e => { if (e.target.value) { setCalSelDay(e.target.value); const d = new Date(e.target.value); setCalDate(d); setCalView("day"); } }}
                style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 12, cursor: "pointer" }} />
            </div>
          </div>

          {/* Month calendar grid */}
          {calView !== "year" && (
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <button onClick={prevMonth} style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 14 }}>←</button>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{MONTHS[calDate.getMonth()]} {calDate.getFullYear()}</div>
                  <div style={{ fontSize: 12, color: T.amber, fontWeight: 600 }}>Month total: {fmt(monthTotal)}</div>
                </div>
                <button onClick={nextMonth} style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 14 }}>→</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
                {DAYS_SHORT.map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: T.muted, padding: "4px 0" }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                {calGrid.map((cell, i) => {
                  if (!cell) return <div key={`e-${i}`} />;
                  const isToday = cell.dateStr === todayStr();
                  const isSel   = cell.dateStr === calSelDay;
                  const hasData = cell.total > 0;
                  return (
                    <button key={cell.dateStr}
                      onClick={() => { setCalSelDay(cell.dateStr); setCalView("day"); }}
                      style={{ background: isSel ? T.accent : isToday ? T.accent + "33" : hasData ? T.surface2 : "transparent", border: isSel ? `2px solid ${T.accent}` : isToday ? `1px solid ${T.accent}88` : hasData ? `1px solid ${T.border}` : "1px solid transparent", borderRadius: 8, padding: "7px 3px", cursor: "pointer", textAlign: "center", transition: "all .1s", position: "relative" }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.surface2; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = hasData ? T.surface2 : isToday ? T.accent+"33" : "transparent"; }}>
                      <div style={{ fontSize: 13, fontWeight: isToday || isSel ? 700 : 400, color: isSel ? "#fff" : T.text }}>{cell.day}</div>
                      {hasData && <div style={{ fontSize: 9, color: isSel ? "#ffffffcc" : T.amber, marginTop: 1, lineHeight: 1 }}>${cell.total.toFixed(0)}</div>}
                      {hasData && !isSel && <div style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: 2, background: T.accent }} />}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: "flex", gap: 16, fontSize: 11, color: T.muted }}>
                <span>🔵 Selected</span><span>🟡 Has expenses (amount shown)</span><span>⬤ Any expense</span>
              </div>
            </Card>
          )}

          {/* Year view */}
          {calView === "year" && (
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <button onClick={prevYear} style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>←</button>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{calDate.getFullYear()}</div>
                  <div style={{ fontSize: 13, color: T.amber, fontWeight: 600 }}>Year Total: {fmt(yearTotal)}</div>
                </div>
                <button onClick={nextYear} style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>→</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {yearMonthlyBreakdown.map(({ month, key, total, count }) => {
                  const isCur = key === monthStr(new Date());
                  return (
                    <button key={key} onClick={() => { const d = new Date(calDate); d.setMonth(MONTHS.indexOf(month)); setCalDate(d); setCalView("month"); setCalSelDay(null); }}
                      style={{ background: isCur ? T.accent + "22" : T.surface2, border: `1px solid ${isCur ? T.accent : T.border}`, borderRadius: 10, padding: "14px 12px", cursor: "pointer", textAlign: "left", transition: "all .12s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.accent + "18"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = isCur ? T.accent : T.border; e.currentTarget.style.background = isCur ? T.accent + "22" : T.surface2; }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isCur ? T.accent : T.text }}>{month}{isCur ? " ◀" : ""}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: total > 0 ? T.amber : T.muted, marginTop: 4 }}>{total > 0 ? fmt(total) : "—"}</div>
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{count} transaction{count !== 1 ? "s" : ""}</div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right panel: expenses with full edit/delete */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Card style={{ padding: "14px 18px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                  {calView === "day" ? `📅 ${panelDate}` : calView === "month" ? `🗓️ ${panelTitle}` : `📊 ${panelTitle}`}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{panelExps.length} expense{panelExps.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.accent }}>{fmt(sum(panelExps))}</div>
                <button onClick={() => { setSelCat(CATS[0]); setForm(f => ({ ...f, date: calView === "day" ? panelDate : todayStr() })); setModal(true); }}
                  style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.accent}`, background: T.accent + "22", color: T.accent, cursor: "pointer", marginTop: 4, fontWeight: 600 }}>
                  + Add here
                </button>
              </div>
            </div>
          </Card>

          <div style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 260px)" }}>
            {panelExps.length === 0 ? (
              <Card style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                <div style={{ color: T.muted, fontSize: 14 }}>No expenses for this period</div>
                <div style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>
                  {calView === "day" ? "Click a different day or use the date picker above" : "Navigate to a different period"}
                </div>
              </Card>
            ) : (
              Object.entries(panelGrouped).map(([date, exps]) => (
                <div key={date} style={{ marginBottom: 16 }}>
                  {calView !== "day" && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "6px 2px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>
                        {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.amber }}>{fmt(sum(exps))}</span>
                    </div>
                  )}
                  {exps.map(ex => <ExpenseCard key={ex.id} ex={ex} />)}
                </div>
              ))
            )}
          </div>

          {panelExps.length > 0 && (
            <Card style={{ padding: "10px 14px", marginTop: 10 }}>
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.8 }}>
                💡 <strong style={{ color: T.text }}>Quick edit:</strong> click the <span style={{ color: T.text }}>name</span> or <span style={{ color: T.accent }}>amount</span> directly to change it inline, or use <strong style={{ color: T.accent }}>✏️ Edit</strong> for the full form. Use <strong style={{ color: "#ef4444" }}>🗑️ Del</strong> to remove.
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const PageHistory = () => (
    <div>
      <Card style={{ padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search by name, category, date…"
            style={{ flex: "1 1 200px", padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 13, outline: "none" }} />
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 13, cursor: "pointer" }}>
            <option value="all">All Categories</option>
            {CATS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 13, cursor: "pointer" }}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
          <button onClick={exportCSV}
            style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            ⬇️ Export CSV
          </button>
        </div>
      </Card>
      <Card style={{ padding: "0 20px" }}>
        <div style={{ padding: "14px 0", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: T.muted }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>Total: {fmt(sum(filtered))}</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: T.muted, fontSize: 14 }}>No expenses found</div>
        ) : (
          filtered.map((ex) => <ExpenseRow key={ex.id} ex={ex} />)
        )}
      </Card>
    </div>
  );

  const PageReports = () => {
    const avgDaily = expenses.length > 0
      ? sum(yearExp) / Math.max(1, new Date().getDayOfYear?.() || Math.ceil((now - new Date(now.getFullYear(), 0, 0)) / 86400000))
      : 0;
    const highest = catTotals[0];
    const lowest = catTotals.filter((c) => c.total > 0).slice(-1)[0];
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
          <StatCard label="Highest Category" value={highest?.total || 0} icon={highest?.icon || "📊"} color="#ef4444" sub={highest?.name} />
          <StatCard label="Lowest Category" value={lowest?.total || 0} icon={lowest?.icon || "📊"} color="#22c55e" sub={lowest?.name} />
          <StatCard label="Monthly Average" value={sum(monthExp)} icon="📅" color="#6366f1" sub={`${monthExp.length} transactions`} />
          <StatCard label="Yearly Total" value={sum(yearExp)} icon="📈" color="#f59e0b" sub={`${yearExp.length} transactions`} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>30-Day Daily Spending</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyLine} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, fontSize: 12 }} formatter={(v) => [fmt(v), "Spent"]} />
                <Line type="monotone" dataKey="total" stroke={T.accent} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>Category Distribution</div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="total" nameKey="name" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((c) => <Cell key={c.id} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>No data</div>}
          </Card>
        </div>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 16 }}>Spending by Category — All Time</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {catTotals.filter((c) => c.total > 0).map((c) => {
              const pct = catTotals[0].total > 0 ? (c.total / catTotals[0].total) * 100 : 0;
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 18, width: 24 }}>{c.icon}</div>
                  <div style={{ fontSize: 12, color: T.text, width: 110 }}>{c.name}</div>
                  <div style={{ flex: 1, height: 8, background: T.surface2, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: c.color, borderRadius: 4, transition: "width .4s" }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.color, width: 80, textAlign: "right" }}>{fmt(c.total)}</div>
                </div>
              );
            })}
            {catTotals.every((c) => c.total === 0) && (
              <div style={{ textAlign: "center", padding: "30px 0", color: T.muted }}>No data yet</div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const PageSettings = () => (
    <div style={{ maxWidth: 580 }}>
      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 18 }}>🔗 Google Sheets Integration</div>
        {gsConnected ? (
          <div style={{ background: "#22c55e18", border: "1px solid #22c55e44", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>✅ Connected</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Sheet ID: {gsId}</div>
            </div>
            <button onClick={() => { setGsConnected(false); setGsId(""); persistCfg({ dark, gsConnected: false, gsId: "" }); showToast("Disconnected"); }}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.6 }}>
              Connect your Google Sheets spreadsheet to automatically sync expenses. Enter your Google Sheets spreadsheet ID to link your account.
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input value={gsId} onChange={(e) => setGsId(e.target.value)} placeholder="Enter spreadsheet ID (e.g. 1BxiMV...)"
                style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 13 }} />
              <button onClick={() => { if (gsId.trim()) { setGsConnected(true); persistCfg({ dark, gsConnected: true, gsId: gsId.trim() }); showToast("Connected to Google Sheets!"); } }}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#4285f4", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                🔗 Connect
              </button>
            </div>
            <div style={{ background: "#3b82f618", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#60a5fa", marginBottom: 6 }}>📌 How to set up:</div>
              <ol style={{ fontSize: 12, color: T.muted, paddingLeft: 16, lineHeight: 2, margin: 0 }}>
                <li>Open Google Sheets and create a new spreadsheet</li>
                <li>Copy the spreadsheet ID from the URL (between /d/ and /edit)</li>
                <li>Share the sheet with your Google service account</li>
                <li>Paste the ID above and click Connect</li>
              </ol>
            </div>
          </div>
        )}
      </Card>
      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 18 }}>⚙️ App Preferences</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize: 13, color: T.text }}>Dark Mode</div>
            <div style={{ fontSize: 11, color: T.muted }}>Toggle light/dark theme</div>
          </div>
          <button onClick={() => { const nd = !dark; setDark(nd); persistCfg({ dark: nd, gsConnected, gsId }); }}
            style={{ width: 48, height: 26, borderRadius: 13, border: "none", background: dark ? T.accent : T.border, cursor: "pointer", position: "relative", transition: "background .2s" }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 3, left: dark ? 25 : 3, transition: "left .2s" }} />
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
          <div>
            <div style={{ fontSize: 13, color: T.text }}>Export Data</div>
            <div style={{ fontSize: 11, color: T.muted }}>Download all expenses as CSV</div>
          </div>
          <button onClick={exportCSV}
            style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, cursor: "pointer", fontSize: 13 }}>
            ⬇️ Export CSV
          </button>
        </div>
      </Card>
      <Card style={{ padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 18 }}>📊 Database Structure</div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.8 }}>
          Google Sheets columns will be automatically created:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {["ID", "Date", "Day", "Month", "Year", "Category", "Expense Name", "Amount", "Notes", "Timestamp"].map((col) => (
            <span key={col} style={{ padding: "4px 10px", background: T.accent + "22", color: T.accent, borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{col}</span>
          ))}
        </div>
      </Card>
    </div>
  );

  // ── nav items ─────────────────────────────────────────────────
  const NAV = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "calendar", icon: "📅", label: "Calendar" },
    { id: "history", icon: "📋", label: "History" },
    { id: "reports", icon: "📈", label: "Reports" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const pageTitle = { dashboard: "Dashboard", calendar: "Calendar", history: "Expense History", reports: "Reports & Analytics", settings: "Settings" };

  const renderPage = () => {
    if (loading) return <div style={{ textAlign: "center", padding: 80, color: T.muted, fontSize: 16 }}>Loading...</div>;
    if (page === "dashboard") return <PageDashboard />;
    if (page === "calendar") return <PageCalendar />;
    if (page === "history") return <PageHistory />;
    if (page === "reports") return <PageReports />;
    if (page === "settings") return <PageSettings />;
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: "'DM Sans', 'Inter', sans-serif", color: T.text, overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: sideOpen ? 220 : 60, background: T.sidebar, borderRight: `1px solid #21262d`, display: "flex", flexDirection: "column", transition: "width .2s", flexShrink: 0 }}>
        <div style={{ padding: sideOpen ? "20px 16px 16px" : "20px 8px 16px", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>💼</div>
          {sideOpen && <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f6ff", whiteSpace: "nowrap" }}>Expenses</div>
            <div style={{ fontSize: 11, color: T.sideMuted, whiteSpace: "nowrap" }}>Tracker</div>
          </div>}
        </div>
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ id, icon, label }) => {
            const active = page === id;
            return (
              <button key={id} onClick={() => setPage(id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: sideOpen ? "10px 10px" : "10px 8px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? "#6366f122" : "transparent", color: active ? "#a5b4fc" : T.sideText, transition: "all .12s", textAlign: "left", width: "100%" }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#ffffff12"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                {sideOpen && <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden" }}>{label}</span>}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "12px 8px", borderTop: "1px solid #21262d" }}>
          <button onClick={() => setSideOpen(!sideOpen)}
            style={{ width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "transparent", color: T.sideMuted, cursor: "pointer", fontSize: 16 }}>
            {sideOpen ? "◀" : "▶"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.surface, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: T.text }}>{pageTitle[page]}</h1>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => { setSelCat(CATS[0]); setModal(true); }}
              style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              + Add Expense
            </button>
            <button onClick={() => { const nd = !dark; setDark(nd); persistCfg({ dark: nd, gsConnected, gsId }); }}
              style={{ padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, cursor: "pointer", fontSize: 14 }}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {renderPage()}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && selCat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: selCat.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{selCat.icon}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{editId ? "Edit Expense" : `Add to ${selCat.name}`}</div>
                <div style={{ fontSize: 12, color: T.muted }}>Category: {selCat.name}</div>
              </div>
              <button onClick={closeModal} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 20 }}>×</button>
            </div>

            {!editId && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                {CATS.map((c) => (
                  <button key={c.id} onClick={() => setSelCat(c)}
                    style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${c.id === selCat.id ? c.color : T.border}`, background: c.id === selCat.id ? c.color + "22" : "transparent", cursor: "pointer", fontSize: 11, color: c.id === selCat.id ? c.color : T.muted }}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: T.muted, marginBottom: 6, display: "block" }}>Expense Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={`e.g. ${selCat.id === "food" ? "Lunch" : selCat.id === "fruits" ? "Apples" : "Expense"}`}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.muted, marginBottom: 6, display: "block" }}>Amount (USD) *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00" min="0" step="0.01"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.muted, marginBottom: 6, display: "block" }}>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.muted, marginBottom: 6, display: "block" }}>Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional details…" rows={3}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 13, boxSizing: "border-box", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={closeModal}
                  style={{ flex: 1, padding: "11px", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.text, cursor: "pointer", fontSize: 14 }}>
                  Cancel
                </button>
                <button onClick={saveExpense}
                  style={{ flex: 2, padding: "11px", borderRadius: 9, border: "none", background: selCat.color, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                  {editId ? "Update Expense" : "Save Expense"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 28, width: 360, maxWidth: "90vw" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, textAlign: "center", marginBottom: 8 }}>Delete Expense?</div>
            <div style={{ fontSize: 13, color: T.muted, textAlign: "center", marginBottom: 24 }}>This action cannot be undone.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDelConfirm(null)}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.text, cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={() => deleteExpense(delConfirm)}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, padding: "12px 20px", borderRadius: 10,
          background: toast.type === "error" ? "#ef4444" : "#22c55e",
          color: "#fff", fontSize: 14, fontWeight: 600, zIndex: 300,
          animation: "slideIn .2s ease",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
        }}>
          {toast.type === "error" ? "🗑️" : "✅"} {toast.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input:focus, textarea:focus, select:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
