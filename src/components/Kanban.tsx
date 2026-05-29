import { useState } from 'react';
import type { KanbanTask } from '../types';
import { Plus, Trash2, ChevronLeft, ChevronRight, X, Check, Pencil } from 'lucide-react';

type Status = KanbanTask['status'];

const STATUS_ORDER: Status[] = ['not-started', 'in-progress', 'done'];

const COLUMNS: { id: Status; label: string; colClass: string }[] = [
  { id: 'not-started', label: 'Not Started', colClass: 'kanban-col--not-started' },
  { id: 'in-progress', label: 'In Progress', colClass: 'kanban-col--in-progress' },
  { id: 'done',        label: 'Done',        colClass: 'kanban-col--done'        },
];

const CAT_PALETTE = [
  { bg: '#DBEAFE', text: '#1E40AF' },
  { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#F3E8FF', text: '#6B21A8' },
  { bg: '#FEE2E2', text: '#991B1B' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#FCE7F3', text: '#9D174D' },
  { bg: '#E0E7FF', text: '#3730A3' },
  { bg: '#DCFCE7', text: '#14532D' },
];

function catColor(cat: string, categories: string[]) {
  const idx = categories.indexOf(cat);
  return CAT_PALETTE[Math.max(0, idx) % CAT_PALETTE.length];
}

function formatDue(dateStr: string): { label: string; overdue: boolean } | null {
  if (!dateStr) return null;
  const d     = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff  = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, overdue: true };
  if (diff === 0) return { label: 'Due today',    overdue: false };
  if (diff === 1) return { label: 'Due tomorrow', overdue: false };
  return { label: d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }), overdue: false };
}

interface Props {
  tasks:         KanbanTask[];
  setTasks:      (v: KanbanTask[] | ((p: KanbanTask[]) => KanbanTask[])) => void;
  categories:    string[];
  setCategories: (v: string[]    | ((p: string[])    => string[]))    => void;
}

export default function Kanban({ tasks, setTasks, categories, setCategories }: Props) {
  // Add-task form
  const [adding,       setAdding]       = useState(false);
  const [newTitle,     setNewTitle]     = useState('');
  const [newCat,       setNewCat]       = useState(categories[0] ?? 'Work');
  const [newDue,       setNewDue]       = useState('');
  const [newStatus,    setNewStatus]    = useState<Status>('not-started');
  // New category creation (inside the form)
  const [creatingCat,  setCreatingCat]  = useState(false);
  const [newCatName,   setNewCatName]   = useState('');
  // Category delete mode
  const [managingCats, setManagingCats] = useState(false);
  // Inline card title editing
  const [editId,       setEditId]       = useState<string | null>(null);
  const [editTitle,    setEditTitle]    = useState('');
  // Clear-done confirmation
  const [confirmClear, setConfirmClear] = useState(false);

  // ── Actions ──────────────────────────────────────────────
  function openAdd() {
    setNewCat(categories[0] ?? 'Work');
    setNewTitle(''); setNewDue(''); setNewStatus('not-started');
    setAdding(true);
  }

  function addTask() {
    if (!newTitle.trim()) return;
    setTasks(p => [...p, {
      id:        `task-${Date.now()}`,
      title:     newTitle.trim(),
      category:  newCat,
      dueDate:   newDue,
      status:    newStatus,
      createdAt: Date.now(),
    }]);
    setAdding(false);
  }

  function deleteTask(id: string) {
    setTasks(p => p.filter(t => t.id !== id));
  }

  function moveTask(id: string, dir: 'forward' | 'back') {
    setTasks(p => p.map(t => {
      if (t.id !== id) return t;
      const idx  = STATUS_ORDER.indexOf(t.status);
      const next = STATUS_ORDER[dir === 'forward' ? idx + 1 : idx - 1];
      return next ? { ...t, status: next } : t;
    }));
  }

  function saveTitle(id: string) {
    if (editTitle.trim()) setTasks(p => p.map(t => t.id === id ? { ...t, title: editTitle.trim() } : t));
    setEditId(null);
  }

  function createCategory() {
    const name = newCatName.trim();
    if (!name || categories.includes(name)) { setCreatingCat(false); setNewCatName(''); return; }
    setCategories(p => [...p, name]);
    setNewCat(name);
    setCreatingCat(false); setNewCatName('');
  }

  function deleteCategory(cat: string) {
    const remaining = categories.filter(c => c !== cat);
    const fallback  = remaining[0] ?? '';
    // Reassign any tasks using this category
    setTasks(p => p.map(t => t.category === cat ? { ...t, category: fallback } : t));
    setCategories(remaining);
    if (newCat === cat) setNewCat(fallback);
    // Exit manage mode if no categories left
    if (remaining.length === 0) setManagingCats(false);
  }

  function clearDone() {
    setTasks(p => p.filter(t => t.status !== 'done'));
    setConfirmClear(false);
  }

  return (
    <div className="section">
      {/* ── Header ── */}
      <div className="section-header">
        <h1 className="section-title">Tasks</h1>
        <div className="kanban-header-actions">
          {confirmClear ? (
            <>
              <span className="clear-confirm-text">Clear all done tasks?</span>
              <button onClick={clearDone} className="btn btn-danger btn-sm">Yes, clear</button>
              <button onClick={() => setConfirmClear(false)} className="btn btn-ghost btn-sm">Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmClear(true)} className="btn btn-ghost btn-sm">Clear Done</button>
          )}
          {!adding && (
            <button onClick={openAdd} className="btn btn-primary btn-sm">
              <Plus size={14} /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* ── Add task form ── */}
      {adding && (
        <div className="card kanban-add-card">
          <div className="card-header">
            <h2 className="card-title">New Task</h2>
            <button onClick={() => setAdding(false)} className="icon-btn icon-btn--cancel"><X size={16} /></button>
          </div>

          <input
            autoFocus type="text" placeholder="Task title (required)"
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAdding(false); }}
            className="kanban-title-input"
          />

          <div className="kanban-form-row">
            {/* ── Category ── */}
            <div className="kanban-form-field">
              <div className="kanban-form-label-row">
                <div className="kanban-form-label">Category</div>
                {categories.length > 0 && (
                  <button
                    className={`kanban-manage-btn ${managingCats ? 'kanban-manage-btn--active' : ''}`}
                    onClick={() => setManagingCats(m => !m)}
                    title={managingCats ? 'Done managing' : 'Delete categories'}
                  >
                    <Pencil size={11} />
                    {managingCats ? 'Done' : 'Manage'}
                  </button>
                )}
              </div>
              <div className="kanban-cat-chips">
                {categories.map(cat => {
                  const c = catColor(cat, categories);
                  if (managingCats) {
                    return (
                      <button key={cat}
                        className="cat-chip kanban-cat-delete-chip"
                        onClick={() => deleteCategory(cat)}
                        title={`Delete "${cat}" category`}>
                        {cat} <X size={11} />
                      </button>
                    );
                  }
                  return (
                    <button key={cat}
                      className={`cat-chip ${newCat === cat ? 'cat-chip--active' : ''}`}
                      style={newCat === cat ? { background: c.bg, color: c.text, borderColor: c.text } : {}}
                      onClick={() => setNewCat(cat)}>
                      {cat}
                    </button>
                  );
                })}
                {!managingCats && (
                  creatingCat ? (
                    <div className="kanban-newcat-inline">
                      <input autoFocus type="text" placeholder="Name" value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') createCategory();
                          if (e.key === 'Escape') { setCreatingCat(false); setNewCatName(''); }
                        }}
                        className="kanban-newcat-input" />
                      <button onClick={createCategory} className="icon-btn icon-btn--save"><Check size={13} /></button>
                      <button onClick={() => { setCreatingCat(false); setNewCatName(''); }} className="icon-btn icon-btn--cancel"><X size={13} /></button>
                    </div>
                  ) : (
                    <button className="cat-chip kanban-newcat-btn" onClick={() => setCreatingCat(true)}>+ New</button>
                  )
                )}
              </div>
              {managingCats && (
                <p className="kanban-manage-hint">Tasks in deleated category will be moved to the next one.</p>
              )}
            </div>

            {/* ── Due date ── */}
            <div className="kanban-form-field">
              <div className="kanban-form-label">Due Date</div>
              <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="kanban-date-input" />
            </div>

            {/* ── Starting column ── */}
            <div className="kanban-form-field">
              <div className="kanban-form-label">Column</div>
              <div className="kanban-status-chips">
                {COLUMNS.map(col => (
                  <button key={col.id}
                    className={`cat-chip ${newStatus === col.id ? 'cat-chip--active kanban-status-active--' + col.id : ''}`}
                    onClick={() => setNewStatus(col.id)}>
                    {col.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="add-item-actions">
            <button onClick={addTask} className="btn btn-primary btn-sm">Add Task</button>
            <button onClick={() => setAdding(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Board ── */}
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colTasks = tasks
            .filter(t => t.status === col.id)
            .sort((a, b) => {
              if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
              if (a.dueDate) return -1;
              if (b.dueDate) return  1;
              return a.createdAt - b.createdAt;
            });
          const statusIdx = STATUS_ORDER.indexOf(col.id);

          return (
            <div key={col.id} className={`kanban-col ${col.colClass}`}>
              <div className="kanban-col-header">
                <span>{col.label}</span>
                <span className="kanban-col-count">{colTasks.length}</span>
              </div>

              <div className="kanban-col-body">
                {colTasks.length === 0 && (
                  <div className="kanban-col-empty">No tasks</div>
                )}

                {colTasks.map(task => {
                  const due = task.dueDate ? formatDue(task.dueDate) : null;
                  const c   = catColor(task.category, categories);

                  return (
                    <div key={task.id} className="kanban-card">
                      {/* Category badge + due date */}
                      <div className="kanban-card-top">
                        <span className="cat-badge" style={{ background: c.bg, color: c.text }}>
                          {task.category}
                        </span>
                        {due && (
                          <span className={`kanban-card-due ${due.overdue ? 'kanban-card-due--overdue' : ''}`}>
                            {due.label}
                          </span>
                        )}
                      </div>

                      {/* Title — click to edit */}
                      {editId === task.id ? (
                        <input
                          autoFocus type="text" value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveTitle(task.id); if (e.key === 'Escape') setEditId(null); }}
                          onBlur={() => saveTitle(task.id)}
                          className="kanban-title-edit-input"
                        />
                      ) : (
                        <div
                          className="kanban-card-title"
                          onClick={() => { setEditId(task.id); setEditTitle(task.title); }}
                          title="Click to edit"
                        >
                          {task.title}
                        </div>
                      )}

                      {/* Move + delete */}
                      <div className="kanban-card-actions">
                        {statusIdx > 0 && (
                          <button onClick={() => moveTask(task.id, 'back')} className="kanban-move-btn">
                            <ChevronLeft size={12} /> Back
                          </button>
                        )}
                        {statusIdx < STATUS_ORDER.length - 1 && (
                          <button onClick={() => moveTask(task.id, 'forward')} className="kanban-move-btn">
                            Next <ChevronRight size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="icon-btn icon-btn--cancel"
                          style={{ marginLeft: 'auto' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
