import React, { useEffect, useMemo, useReducer, useCallback, useContext, createContext, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";

/**
 * React Crash Project: Todo App (No external UI libs)
 * - Hooks: useState, useEffect, useMemo, useCallback, useReducer, useRef
 * - Context: TodoContext to share state across routes/components
 * - Router: react-router-dom (Home, Stats, Settings)
 * - Extras: localStorage persistence, keyboard UX, basic styling
 *
 * NOTE: This version removes shadcn/ui and Tailwind to avoid missing dependency errors.
 * Only deps required: react, react-dom, react-router-dom
 */

// -----------------------------
// Tiny UI Primitives (no dependencies)
// -----------------------------

const styles = {
  page: { maxWidth: 860, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" },
  header: { position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: 12, zIndex: 10 },
  navLink: (active) => ({ padding: "6px 10px", borderRadius: 16, textDecoration: "none", color: active ? "#fff" : "#111", background: active ? "#111" : "transparent", marginRight: 8 }),
  footer: { fontSize: 12, color: "#6b7280", padding: 16 },
  card: { border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.03)", background: "#fff" },
  cardContent: { padding: 16 },
  button: { padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#111", color: "#fff", cursor: "pointer" },
  buttonOutline: { padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#111", cursor: "pointer" },
  input: { padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" },
  row: { display: "flex", gap: 8, alignItems: "center" },
  spacer: { height: 16 },
};

const Button = ({ variant = "default", style, ...props }) => (
  <button {...props} style={{ ...(variant === "outline" ? styles.buttonOutline : styles.button), ...style }} />
);
const Card = ({ style, ...props }) => <div {...props} style={{ ...styles.card, ...style }} />;
const CardContent = ({ style, ...props }) => <div {...props} style={{ ...styles.cardContent, ...style }} />;
const Input = (props) => <input {...props} style={{ ...styles.input, ...(props.style || {}) }} />;
const Checkbox = ({ checked, onChange, ...props }) => (
  <input type="checkbox" checked={!!checked} onChange={(e)=>onChange?.(e.target.checked)} {...props} />
);

// -----------------------------
// Types & Helpers
// -----------------------------

/** @typedef {{ id: string, text: string, done: boolean, createdAt: number }} Todo */

const uid = () => Math.random().toString(36).slice(2, 9);

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem("todos@crash");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (todos) => localStorage.setItem("todos@crash", JSON.stringify(todos));

// -----------------------------
// Context + Reducer (Global State)
// -----------------------------

/** @type {React.Context<{
 *  todos: Todo[];
 *  dispatch: React.Dispatch<any>;
 * }>} */
const TodoContext = createContext(null);

function todoReducer(state, action) {
  switch (action.type) {
    case "INIT":
      return action.payload;
    case "ADD": {
      const next = [{ id: uid(), text: action.text.trim(), done: false, createdAt: Date.now() }, ...state];
      saveToStorage(next);
      return next;
    }
    case "TOGGLE": {
      const next = state.map(t => t.id === action.id ? { ...t, done: !t.done } : t);
      saveToStorage(next);
      return next;
    }
    case "DELETE": {
      const next = state.filter(t => t.id !== action.id);
      saveToStorage(next);
      return next;
    }
    case "EDIT": {
      const next = state.map(t => t.id === action.id ? { ...t, text: action.text } : t);
      saveToStorage(next);
      return next;
    }
    case "CLEAR_DONE": {
      const next = state.filter(t => !t.done);
      saveToStorage(next);
      return next;
    }
    default:
      return state;
  }
}

function TodoProvider({ children }) {
  const [todos, dispatch] = useReducer(todoReducer, []);

  // Initialize from localStorage once
  useEffect(() => {
    const initial = loadFromStorage();
    dispatch({ type: "INIT", payload: initial });
  }, []);

  const value = useMemo(() => ({ todos, dispatch }), [todos]);
  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

function useTodos() {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used inside <TodoProvider>");
  return ctx;
}

// -----------------------------
// Layout (no theme dependency)
// -----------------------------

function Layout({ children }) {
  return (
    <div>
      <header style={styles.header}>
        <div style={{ ...styles.page, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0 }}>
          <div style={{ fontWeight: 600 }}>React Crash Todo</div>
          <nav>
            <NavLink to="/" style={({isActive})=>styles.navLink(isActive)}>Home</NavLink>
            <NavLink to="/stats" style={({isActive})=>styles.navLink(isActive)}>Stats</NavLink>
            <NavLink to="/settings" style={({isActive})=>styles.navLink(isActive)}>Settings</NavLink>
          </nav>
        </div>
      </header>
      <main style={styles.page}>{children}</main>
      <footer style={{ ...styles.page, ...styles.footer }}>Built with React hooks, Context, and React Router.</footer>
    </div>
  );
}

// -----------------------------
// Components
// -----------------------------

function AddTodo() {
  const { dispatch } = useTodos();
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const add = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch({ type: "ADD", text: trimmed });
    setText("");
    inputRef.current?.focus();
  }, [text, dispatch]);

  const onKeyDown = useCallback((e) => {
    if (e.key === "Enter") add();
  }, [add]);

  return (
    <div style={{ ...styles.row }}>
      <Input
        ref={inputRef}
        value={text}
        onChange={(e)=>setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Add a task and press Enter or click Add"
        aria-label="New todo"
        style={{ flex: 1 }}
      />
      <Button onClick={add} aria-label="Add todo">Add</Button>
    </div>
  );
}

function TodoItem({ todo }) {
  const { dispatch } = useTodos();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const draftRef = useRef(null);

  const toggle = useCallback(() => dispatch({ type: "TOGGLE", id: todo.id }), [dispatch, todo.id]);
  const del = useCallback(() => dispatch({ type: "DELETE", id: todo.id }), [dispatch, todo.id]);
  const startEdit = useCallback(() => {
    setIsEditing(true);
    setTimeout(()=>draftRef.current?.focus(), 0);
  }, []);
  const save = useCallback(() => {
    const t = draft.trim();
    if (!t) return setIsEditing(false);
    dispatch({ type: "EDIT", id: todo.id, text: t });
    setIsEditing(false);
  }, [dispatch, draft, todo.id]);

  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
      <Checkbox checked={todo.done} onChange={toggle} aria-label={`Mark ${todo.text} ${todo.done?"undone":"done"}`} />
      {isEditing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <Input ref={draftRef} value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') save(); if(e.key==='Escape') setIsEditing(false); }} />
          <Button onClick={save}>Save</Button>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <div style={{ textDecoration: todo.done?"line-through":"none", color: todo.done?"#6b7280":"inherit" }}>{todo.text}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>{new Date(todo.createdAt).toLocaleString()}</div>
        </div>
      )}
      {!isEditing && (
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" onClick={startEdit}>Edit</Button>
          <Button variant="outline" onClick={del}>Delete</Button>
        </div>
      )}
    </li>
  );
}

function TodoList() {
  const { todos, dispatch } = useTodos();
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    switch (filter) {
      case "active": return todos.filter(t => !t.done);
      case "done": return todos.filter(t => t.done);
      default: return todos;
    }
  }, [todos, filter]);

  const remaining = useMemo(() => todos.filter(t => !t.done).length, [todos]);

  return (
    <Card style={{ marginTop: 12 }}>
      <CardContent>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant={filter==="all"?"default":"outline"} onClick={()=>setFilter("all")}>All</Button>
            <Button variant={filter==="active"?"default":"outline"} onClick={()=>setFilter("active")}>Active</Button>
            <Button variant={filter==="done"?"default":"outline"} onClick={()=>setFilter("done")}>Done</Button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <span style={{ opacity: 0.8 }}>{remaining} remaining</span>
            <Button variant="outline" onClick={()=>dispatch({type: "CLEAR_DONE"})}>Clear Completed</Button>
            <Button variant="outline" onClick={()=>navigate("/stats")}>View Stats</Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 14 }}>No todos. Add your first task above.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filtered.map(t => <TodoItem key={t.id} todo={t} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// -----------------------------
// Pages (Routes)
// -----------------------------

function HomePage() {
  return (
    <div>
      <AddTodo />
      <div style={styles.spacer} />
      <TodoList />
    </div>
  );
}

function StatsPage() {
  const { todos } = useTodos();
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  const active = total - done;
  const donePct = total ? Math.round((done/total)*100) : 0;

  const firstCreated = useMemo(() => {
    if (!todos.length) return null;
    return new Date([...todos].sort((a,b)=>a.createdAt-b.createdAt)[0].createdAt).toLocaleString();
  }, [todos]);

  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "2fr 1fr" }}>
      <Card>
        <CardContent>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Progress</div>
          <div style={{ height: 12, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${donePct}%`, background: "#111" }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>{donePct}% complete</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent style={{ fontSize: 14, display: "grid", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total</span><span style={{ fontWeight: 600 }}>{total}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Active</span><span style={{ fontWeight: 600 }}>{active}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Done</span><span style={{ fontWeight: 600 }}>{done}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>First Created</span><span style={{ fontWeight: 600 }}>{firstCreated ?? "—"}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPage() {
  const { todos } = useTodos();

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "todos-export.json"; a.click();
    URL.revokeObjectURL(url);
  }, [todos]);

  const importRef = useRef(null);
  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        localStorage.setItem("todos@crash", JSON.stringify(data));
        window.location.reload();
      }
    } catch {
      alert("Invalid file");
    }
  }, []);

  return (
    <Card>
      <CardContent style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button onClick={exportJson}>Export JSON</Button>
          <input ref={importRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImport} />
          <Button variant="outline" onClick={()=>importRef.current?.click()}>Import JSON</Button>
        </div>
        <div>
          <Button variant="outline" onClick={()=>{ if(confirm("Clear ALL todos?")) { localStorage.removeItem("todos@crash"); window.location.reload(); } }}>Clear All</Button>
        </div>
        <p style={{ fontSize: 14, color: "#6b7280" }}>Data persists in your browser via localStorage.</p>
      </CardContent>
    </Card>
  );
}

// -----------------------------
// App (Router + Provider)
// -----------------------------

function AppShell() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/stats" element={<StatsPage/>} />
        <Route path="/settings" element={<SettingsPage/>} />
        <Route path="*" element={<HomePage/>} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <TodoProvider>
      <BrowserRouter>
        <AppShell/>
      </BrowserRouter>
    </TodoProvider>
  );
}
