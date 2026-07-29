import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addContact,
  getClasses,
  getMyContacts,
  lookupContact,
  removeContact,
  type ClassData,
  type ContactListItem,
} from '../api';
import { formatPortionLabel } from '../lib/quran-utils';
import ConfirmDialog from '../components/ConfirmDialog';

type LookupResult = Awaited<ReturnType<typeof lookupContact>>;

function contactName(contact: ContactListItem) {
  return `${contact.first_name} ${contact.last_name}`.trim();
}

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [sessions, setSessions] = useState<ClassData[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [working, setWorking] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setError('');
    const [contactResult, sessionResult] = await Promise.allSettled([
      getMyContacts(),
      getClasses('listener'),
    ]);
    if (contactResult.status === 'fulfilled') {
      const next = Array.isArray(contactResult.value) ? contactResult.value : [];
      setContacts(next);
      setSelectedId((current) => next.some((item) => item.id === current) ? current : next[0]?.id || '');
    } else {
      setError('Unable to load contacts.');
    }
    if (sessionResult.status === 'fulfilled') setSessions(Array.isArray(sessionResult.value) ? sessionResult.value : []);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const visibleContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((contact) =>
      contactName(contact).toLowerCase().includes(term)
      || contact.email.toLowerCase().includes(term)
      || contact.student_id?.toLowerCase().includes(term),
    );
  }, [contacts, search]);

  const selected = contacts.find((contact) => contact.id === selectedId);
  const selectedSessions = sessions.filter((session) => session.students?.some((student) => student.id === selectedId));
  const latestSession = selectedSessions[0];
  const latestAssignment = latestSession?.assignments?.[0];
  const mistakes = selectedSessions.reduce((sum, session) => {
    if (typeof session.mistake_count === 'number') return sum + session.mistake_count;
    const counts = session.mistake_counts;
    return sum + (counts ? counts.hifz + counts.sabqi + counts.revision : 0);
  }, 0);

  const handleLookup = async () => {
    if (!email.trim()) return;
    setWorking(true);
    setError('');
    try {
      setLookup(await lookupContact(email.trim().toLowerCase()));
    } catch (reason) {
      setLookup(null);
      setError(reason instanceof Error ? reason.message : 'No account found for that email.');
    } finally {
      setWorking(false);
    }
  };

  const handleAdd = async () => {
    if (!lookup) return;
    setWorking(true);
    try {
      await addContact(lookup.email);
      await loadData();
      setShowAdd(false);
      setEmail('');
      setLookup(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to add contact.');
    } finally {
      setWorking(false);
    }
  };

  const handleRemove = async () => {
    if (!selected) return;
    setWorking(true);
    try {
      await removeContact(selected.id);
      setShowRemoveConfirm(false);
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to remove contact.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="approved-page">
      <header className="approved-page-header">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="approved-page-title">Contacts</h1>
            <span className="approved-sync"><span className="desktop-status-dot" />{contacts.length} active</span>
            <span className="approved-eyebrow">Reciter management</span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Review real session activity and start the next recitation.</p>
        </div>
        <button type="button" className="approved-primary-button" onClick={() => { setError(''); setShowAdd(true); }}>
          <span className="text-lg leading-none">+</span> Add Contact
        </button>
      </header>

      {error && <div className="approved-alert mb-4">{error}</div>}

      <section className="approved-card mb-4 grid grid-cols-3 divide-x divide-[var(--border-color)] p-4 text-center">
        <div><strong className="approved-metric">{contacts.length}</strong><span className="approved-metric-label">Active contacts</span></div>
        <div><strong className="approved-metric">{sessions.length}</strong><span className="approved-metric-label">Recorded sessions</span></div>
        <div><strong className="approved-metric">{mistakes}</strong><span className="approved-metric-label">Selected contact mistakes</span></div>
      </section>

      <div className="contacts-workspace">
        <section className="approved-card overflow-hidden">
          <div className="border-b border-[var(--border-color)] p-3">
            <input className="approved-input w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts or student ID" />
          </div>
          <div className="contacts-table-header">
            <span>Contact</span><span>Last session</span><span>Current portion</span><span>Sessions</span>
          </div>
          <div className="divide-y divide-[var(--border-color)]">
            {loading ? <div className="approved-empty-state">Loading contacts...</div> : visibleContacts.map((contact) => {
              const contactSessions = sessions.filter((session) => session.students?.some((student) => student.id === contact.id));
              const last = contactSessions[0];
              const portion = last?.assignments?.[0];
              return (
                <button key={contact.id} type="button" className={`contacts-row ${selectedId === contact.id ? 'active' : ''}`} onClick={() => setSelectedId(contact.id)}>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="approved-avatar !h-9 !w-9 !text-xs">{contact.first_name[0]}{contact.last_name[0]}</span>
                    <span className="min-w-0 text-left"><strong className="block truncate text-sm">{contactName(contact)}</strong><small className="block truncate">{contact.student_id || contact.email}</small></span>
                  </span>
                  <span>{last ? new Date(`${last.date}T00:00:00`).toLocaleDateString() : 'No session'}</span>
                  <span>{portion ? formatPortionLabel(portion) : 'Not assigned'}</span>
                  <span>{contactSessions.length}</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="approved-card contacts-detail p-5">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                <span className="approved-avatar !h-12 !w-12">{selected.first_name[0]}{selected.last_name[0]}</span>
                <div className="min-w-0"><h2 className="approved-card-title truncate">{contactName(selected)}</h2><p className="truncate text-xs text-[var(--text-muted)]">{selected.email}</p></div>
              </div>
              <dl className="approved-detail-list">
                <div><dt>User code</dt><dd>{selected.student_id || 'Not assigned'}</dd></div>
                <div><dt>Added</dt><dd>{new Date(selected.added_at).toLocaleDateString()}</dd></div>
                <div><dt>Last session</dt><dd>{latestSession ? latestSession.date : 'No session yet'}</dd></div>
                <div><dt>Current portion</dt><dd>{latestAssignment ? formatPortionLabel(latestAssignment) : 'Not assigned'}</dd></div>
              </dl>
              <div className="grid gap-2">
                <button type="button" className="approved-primary-button" onClick={() => navigate(`/sessions?new=1&student=${selected.id}`)}>New Session</button>
                <button type="button" className="approved-secondary-button" onClick={() => navigate(`/reports?contact=${selected.id}`)}>View Report</button>
                <button type="button" className="approved-danger-button" onClick={() => setShowRemoveConfirm(true)} disabled={working}>Remove Contact</button>
              </div>
            </>
          ) : <div className="approved-empty-state">Select a contact to review details.</div>}
        </aside>
      </div>

      <ConfirmDialog
        open={showRemoveConfirm && Boolean(selected)}
        eyebrow="Remove contact"
        title={`Remove ${selected ? contactName(selected) : 'this contact'}?`}
        message="This removes the person from your contacts. Their account is not deleted, and existing recitation history remains available."
        confirmLabel="Remove contact"
        busy={working}
        onCancel={() => setShowRemoveConfirm(false)}
        onConfirm={handleRemove}
      />

      {showAdd && (
        <div className="approved-modal-backdrop">
          <div className="approved-card w-full max-w-md p-5" role="dialog" aria-modal="true" aria-labelledby="add-contact-title">
            <div className="flex items-center justify-between">
              <h2 id="add-contact-title" className="approved-card-title">Add contact</h2>
              <button type="button" className="desktop-icon-button !h-8 !w-8" onClick={() => setShowAdd(false)} aria-label="Close">×</button>
            </div>
            <div className="mt-5 flex gap-2">
              <input className="approved-input min-w-0 flex-1" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setLookup(null); }} placeholder="reciter@example.com" />
              <button type="button" className="approved-secondary-button" onClick={handleLookup} disabled={working}>Find</button>
            </div>
            {lookup && (
              <div className="mt-4 flex items-center gap-3 rounded-md border border-[var(--border-color)] p-3">
                <span className="approved-avatar">{lookup.first_name[0]}{lookup.last_name[0]}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{lookup.display_name}</strong><small className="block truncate text-[var(--text-muted)]">{lookup.email}</small></span>
                <button type="button" className="approved-primary-button" onClick={handleAdd} disabled={working}>Add</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
