'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';

type NoteTone = 'sage' | 'peach' | 'lavender' | 'sky';
type NoteFilter = 'all' | 'pinned';

interface Note {
  id: string;
  title: string;
  body: string;
  tone: NoteTone;
  pinned: boolean;
  updatedAt: string;
}

const STORAGE_KEY = 'little-notes';
const tones: NoteTone[] = ['sage', 'peach', 'lavender', 'sky'];

function Icon({
  name,
  size = 20,
}: {
  name: 'note' | 'search' | 'plus' | 'pin' | 'edit' | 'trash' | 'close' | 'sparkle' | 'arrow';
  size?: number;
}) {
  const shared = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (name) {
    case 'note':
      return <svg {...shared}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></svg>;
    case 'search':
      return <svg {...shared}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case 'plus':
      return <svg {...shared}><path d="M12 5v14M5 12h14" /></svg>;
    case 'pin':
      return <svg {...shared}><path d="m16 3 5 5-4 1-4 4-1 5-2-2-4 4-1-1 4-4-2-2 5-1 4-4z" /></svg>;
    case 'edit':
      return <svg {...shared}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>;
    case 'trash':
      return <svg {...shared}><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></svg>;
    case 'close':
      return <svg {...shared}><path d="m18 6-12 12M6 6l12 12" /></svg>;
    case 'sparkle':
      return <svg {...shared}><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14Z" /></svg>;
    case 'arrow':
      return <svg {...shared}><path d="M5 12h14m-7-7 7 7-7 7" /></svg>;
  }
}

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== 'object') return false;
  const note = value as Record<string, unknown>;
  return (
    typeof note.id === 'string' &&
    typeof note.title === 'string' &&
    typeof note.body === 'string' &&
    tones.includes(note.tone as NoteTone) &&
    typeof note.pinned === 'boolean' &&
    typeof note.updatedAt === 'string'
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [query, setQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tone, setTone] = useState<NoteTone>('sage');
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const savedNotes = window.localStorage.getItem(STORAGE_KEY);
        if (savedNotes) {
          const parsed: unknown = JSON.parse(savedNotes);
          if (!Array.isArray(parsed) || !parsed.every(isNote)) {
            throw new Error('Saved notes have an invalid format.');
          }
          setNotes(parsed);
        }
      } catch {
        setStorageError(true);
      } finally {
        setReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function saveNotes(updatedNotes: Note[]) {
    setNotes(updatedNotes);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  const visibleNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return notes
      .filter((note) => filter === 'all' || note.pinned)
      .filter(
        (note) =>
          !normalizedQuery ||
          note.title.toLowerCase().includes(normalizedQuery) ||
          note.body.toLowerCase().includes(normalizedQuery),
      )
      .sort(
        (first, second) =>
          Number(second.pinned) - Number(first.pinned) ||
          new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
      );
  }, [filter, notes, query]);

  function openNewNote() {
    setEditingId(null);
    setTitle('');
    setBody('');
    setTone('sage');
    setIsEditorOpen(true);
  }

  function openEditNote(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setTone(note.tone);
    setIsEditorOpen(true);
  }

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const updatedAt = new Date().toISOString();
    if (editingId) {
      saveNotes(
        notes.map((note) =>
          note.id === editingId
            ? { ...note, title: trimmedTitle, body: body.trim(), tone, updatedAt }
            : note,
        ),
      );
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: trimmedTitle,
        body: body.trim(),
        tone,
        pinned: false,
        updatedAt,
      };
      saveNotes([newNote, ...notes]);
    }

    setIsEditorOpen(false);
  }

  function deleteNote(id: string) {
    saveNotes(notes.filter((note) => note.id !== id));
  }

  function togglePinned(id: string) {
    saveNotes(
      notes.map((note) =>
        note.id === id ? { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() } : note,
      ),
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Side Notes home">
          <span className="brand-mark"><Icon name="note" size={22} /></span>
          <span>side notes<span className="brand-period">.</span></span>
        </Link>

        <div className="sidebar-label">THE EVERYDAY NOTEBOOK</div>
        <nav className="sidebar-nav" aria-label="Note filters">
          <button
            className={`nav-item${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
            type="button"
          >
            <Icon name="note" size={18} />
            <span>On the desk</span>
            <span className="nav-count">{notes.length}</span>
          </button>
          <button
            className={`nav-item${filter === 'pinned' ? ' active' : ''}`}
            onClick={() => setFilter('pinned')}
            type="button"
          >
            <Icon name="pin" size={18} />
            <span>Kept close</span>
            <span className="nav-count">{notes.filter((note) => note.pinned).length}</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><Icon name="sparkle" size={18} /></span>
            <p>You don’t have to write it all down. Just the bit you might forget.</p>
          </div>
          <div className={`save-status${storageError ? ' save-status-error' : ''}`} aria-live="polite">
            <span className="status-dot" />
            {!ready ? 'Loading your notes' : storageError ? 'Local storage unavailable' : 'Saved on this device'}
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">YOUR NOTEBOOK <span>/</span> {filter === 'all' ? 'ON THE DESK' : 'KEPT CLOSE'}</div>
          <button className="add-button" type="button" onClick={openNewNote}>
            <Icon name="plus" size={18} />
            <span>New page</span>
          </button>
        </header>

        <div className="content">
          <div className="page-intro">
            <p className="eyebrow">OPEN WHENEVER YOU NEED IT</p>
            <h1>{filter === 'all' ? 'A home for the little things.' : 'Worth keeping close.'}</h1>
            <p className="intro-copy">
              {filter === 'all'
                ? 'Lists, half-formed ideas, names to remember. It all belongs here.'
                : 'A few things you wanted to find again.'}
            </p>
          </div>

          <div className="notes-toolbar">
            <div className="section-title">
              <h2>{filter === 'all' ? 'On the desk' : 'Kept close'}</h2>
              <span className="total-count">{filter === 'all' ? notes.length : notes.filter((note) => note.pinned).length}</span>
            </div>
            <label className="search-box">
              <Icon name="search" size={18} />
              <span className="sr-only">Search notes</span>
              <input
                type="search"
                placeholder="Find a thought..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button className="clear-search" type="button" onClick={() => setQuery('')} aria-label="Clear search">
                  <Icon name="close" size={15} />
                </button>
              )}
            </label>
          </div>

          {storageError && ready && (
            <p className="storage-warning" role="status">
              Your notes are available for this session, but this browser could not read or save local data.
            </p>
          )}

          {visibleNotes.length > 0 ? (
            <div className="notes-grid">
              {visibleNotes.map((note) => (
                <article className={`note-card tone-${note.tone}`} key={note.id}>
                  <div className="card-topline">
                    <span className="note-date">{formatDate(note.updatedAt)}</span>
                    <button
                      className={`icon-button pin-button${note.pinned ? ' is-pinned' : ''}`}
                      type="button"
                      onClick={() => togglePinned(note.id)}
                      aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                      title={note.pinned ? 'Unpin note' : 'Pin note'}
                    >
                      <Icon name="pin" size={17} />
                    </button>
                  </div>
                  <button className="note-content" type="button" onClick={() => openEditNote(note)}>
                    <h3>{note.title}</h3>
                    <p>{note.body || 'No extra details. Click to add some.'}</p>
                  </button>
                  <div className="card-footer">
                    <span>{note.pinned ? 'Kept close' : 'A note to self'}</span>
                    <div className="card-actions">
                      <button className="icon-button" type="button" onClick={() => openEditNote(note)} aria-label={`Edit ${note.title}`}>
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="icon-button delete-button" type="button" onClick={() => deleteNote(note.id)} aria-label={`Delete ${note.title}`}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-mark"><Icon name={query ? 'search' : filter === 'pinned' ? 'pin' : 'note'} size={28} /></span>
              <h3>{query ? 'Nothing by that name' : filter === 'pinned' ? 'Nothing tucked away yet' : 'The first page is yours'}</h3>
              <p>
                {query
                  ? 'Try another search, or clear it to see all your notes.'
                  : filter === 'pinned'
                    ? 'Tap the little pin on any note and it’ll live here.'
                    : 'Start with anything. A reminder, a recipe, a thought from the bus.'}
              </p>
              {query ? (
                <button className="text-button" type="button" onClick={() => setQuery('')}>Clear search</button>
              ) : filter === 'all' ? (
                <button className="empty-button" type="button" onClick={openNewNote}>
                  <Icon name="plus" size={17} /> Start a note
                </button>
              ) : null}
            </div>
          )}

          <footer className="page-footer">
            <span>A notebook is just a place to begin.</span>
            <span>Kept close, on this device <span className="footer-heart">♥</span></span>
          </footer>
        </div>
      </section>

      {isEditorOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsEditorOpen(false);
          }}
        >
          <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
            <div className="editor-heading">
              <div>
                <p className="eyebrow">{editingId ? 'BACK TO THIS PAGE' : 'PUT IT SOMEWHERE SAFE'}</p>
                <h2 id="editor-title">{editingId ? 'A little edit' : 'Start wherever'}</h2>
              </div>
              <button className="icon-button close-button" type="button" onClick={() => setIsEditorOpen(false)} aria-label="Close editor">
                <Icon name="close" size={19} />
              </button>
            </div>
            <form onSubmit={saveNote}>
              <label className="field-label" htmlFor="note-title">GIVE IT A NAME</label>
              <input
                autoFocus
                className="title-input"
                id="note-title"
                maxLength={100}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="A few words will do"
                value={title}
              />
              <label className="field-label body-label" htmlFor="note-body">GET IT OUT OF YOUR HEAD</label>
              <textarea
                className="body-input"
                id="note-body"
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write it the way you’d tell a friend."
                rows={7}
                value={body}
              />
              <div className="tone-picker">
                <span className="field-label">PAPER COLOR</span>
                <div className="tone-options" role="group" aria-label="Choose note color">
                  {tones.map((option) => (
                    <button
                      aria-label={`${option} paper`}
                      aria-pressed={tone === option}
                      className={`tone-swatch tone-${option}${tone === option ? ' selected' : ''}`}
                      key={option}
                      onClick={() => setTone(option)}
                      type="button"
                    />
                  ))}
                </div>
              </div>
              <div className="editor-actions">
                <button className="cancel-button" type="button" onClick={() => setIsEditorOpen(false)}>Cancel</button>
                <button className="save-button" type="submit" disabled={!title.trim()}>
                  {editingId ? 'Save changes' : 'Save note'} <Icon name="arrow" size={17} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
