import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  addContact,
  getClasses,
  getMyContacts,
  lookupContact,
  type ClassData,
  type ContactListItem,
} from '../api';
import { formatPortionLabel } from '../lib/quran-utils';

interface ContactLookupResult {
  student_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}` || 'QT';
}

function sessionContactName(session: ClassData) {
  const names = session.students?.map((student) => `${student.first_name} ${student.last_name}`.trim()).filter(Boolean);
  return names?.join(', ') || session.listener_name || 'QuranTrack session';
}

function formatSessionDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sessionMistakes(session: ClassData) {
  if (typeof session.mistake_count === 'number') return session.mistake_count;
  const counts = session.mistake_counts;
  return counts ? counts.hifz + counts.sabqi + counts.revision : 0;
}

function performanceWeight(performance?: string | null) {
  const value = (performance || '').toLowerCase();
  if (value.includes('needs') || value.includes('poor')) return 30;
  if (value.includes('average') || value.includes('fair')) return 18;
  if (!value || value.includes('not rated')) return 8;
  return 0;
}

function sectionLabel(type: string) {
  if (type === 'revision') return 'Manzil';
  if (type === 'hifz') return 'Hifz';
  if (type === 'sabqi') return 'Sabqi';
  return type;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [listeningClasses, setListeningClasses] = useState<ClassData[]>([]);
  const [recitingClasses, setRecitingClasses] = useState<ClassData[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [lookupResult, setLookupResult] = useState<ContactLookupResult | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [hasLoadIssue, setHasLoadIssue] = useState(false);

  const loadData = useCallback(async () => {
    const [contactsResult, listenerResult, reciterResult] = await Promise.allSettled([
      getMyContacts(),
      getClasses('listener'),
      getClasses('reciter'),
    ]);

    setHasLoadIssue(
      contactsResult.status === 'rejected'
      || listenerResult.status === 'rejected'
      || reciterResult.status === 'rejected',
    );

    if (contactsResult.status === 'fulfilled') setContacts(Array.isArray(contactsResult.value) ? contactsResult.value : []);
    if (listenerResult.status === 'fulfilled') setListeningClasses(Array.isArray(listenerResult.value) ? listenerResult.value : []);
    if (reciterResult.status === 'fulfilled') setRecitingClasses(Array.isArray(reciterResult.value) ? reciterResult.value : []);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData, user?.id]);

  const allSessions = useMemo(
    () => [...listeningClasses, ...recitingClasses].sort((a, b) => b.date.localeCompare(a.date)),
    [listeningClasses, recitingClasses],
  );

  const startOfWeek = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);

  const listeningThisWeek = useMemo(
    () => listeningClasses.filter((session) => new Date(`${session.date}T00:00:00`) >= startOfWeek),
    [listeningClasses, startOfWeek],
  );

  const recitingThisWeek = useMemo(
    () => recitingClasses.filter((session) => new Date(`${session.date}T00:00:00`) >= startOfWeek),
    [recitingClasses, startOfWeek],
  );

  const reciterSummaries = useMemo(() => {
    return contacts.map((contact) => {
      const contactSessions = listeningClasses
        .filter((session) => session.students?.some((student) => student.id === contact.id)
          || sessionContactName(session).toLowerCase() === `${contact.first_name} ${contact.last_name}`.trim().toLowerCase())
        .sort((a, b) => b.date.localeCompare(a.date));
      const latest = contactSessions[0];
      const latestMistakes = latest ? sessionMistakes(latest) : 0;
      const score = latestMistakes + performanceWeight(latest?.performance) + (latest?.notes ? 3 : 0);
      return { contact, sessions: contactSessions, latest, latestMistakes, score };
    }).sort((a, b) => b.score - a.score);
  }, [contacts, listeningClasses]);

  const attention = reciterSummaries.filter((item) => item.latest && item.score > 10);
  const recentSessions = allSessions.slice(0, 5);
  const recentNotes = allSessions
    .filter((session) => Boolean(session.notes?.trim()))
    .slice(0, 4);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const closeAddContactModal = () => {
    setShowAddContactModal(false);
    setEmailInput('');
    setLookupResult(null);
    setLookupError('');
  };

  const handleLookupContact = async () => {
    if (!emailInput.trim()) return;
    setIsLookingUp(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const result = await lookupContact(emailInput.trim().toLowerCase());
      if (contacts.some((contact) => contact.email.toLowerCase() === result.email.toLowerCase())) {
        setLookupError('This user is already in your contacts');
      } else {
        setLookupResult(result);
      }
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'No user found with that email');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddContact = async () => {
    if (!lookupResult) return;
    setIsAdding(true);
    try {
      await addContact(lookupResult.email);
      await loadData();
      closeAddContactModal();
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Failed to add contact');
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return <div className="approved-page dashboard-loading"><span className="spinner" /> Loading your workspace…</div>;
  }

  return (
    <div className="approved-page operational-dashboard">
      <header className="approved-page-header">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="approved-page-title">Recitation overview</h1>
            <span className="approved-sync"><span className="desktop-status-dot" />{hasLoadIssue ? 'Some data unavailable' : 'Live data'}</span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Assalamu alaikum, {user?.first_name || 'welcome back'}. Your reciting and listening activity in one place.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="desktop-icon-button" onClick={handleRefresh} disabled={refreshing} title="Refresh data" aria-label="Refresh data">
            <svg className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 6v5h-5M4 18v-5h5m10.5-2a8 8 0 0 0-14-3M4.5 14a8 8 0 0 0 14 3" /></svg>
          </button>
          <button data-tour="add-student-btn" type="button" className="approved-secondary-button" onClick={() => setShowAddContactModal(true)}>Add Contact</button>
          <button data-tour="start-class-btn" type="button" className="approved-primary-button" onClick={() => navigate('/sessions?new=1')}><span className="text-lg">+</span> New Session</button>
        </div>
      </header>

      <section className="dashboard-metric-grid" aria-label="Recitation summary">
        <article><span>LISTENING</span><strong>{listeningThisWeek.length}</strong><small>sessions where you listened</small></article>
        <article><span>RECITING</span><strong>{recitingThisWeek.length}</strong><small>sessions where you recited</small></article>
        <article><span>MY MISTAKES</span><strong>{recitingThisWeek.reduce((sum, session) => sum + sessionMistakes(session), 0)}</strong><small>marked in your recitation</small></article>
        <article className={attention.length ? 'attention' : ''}><span>RECORDED</span><strong>{listeningThisWeek.reduce((sum, session) => sum + sessionMistakes(session), 0)}</strong><small>mistakes you recorded</small></article>
      </section>

      <div className="dashboard-operational-grid">
        <section className="approved-card dashboard-my-recitation-panel">
          <header className="dashboard-panel-header">
            <div><span className="approved-eyebrow">MY RECITATION</span><h2>Sessions where you recited</h2></div>
            <button onClick={() => navigate('/sessions?view=reciting')}>Reciting history</button>
          </header>
          <div className="dashboard-activity-list">
            {recitingClasses.slice(0, 4).map((session) => {
              const assignment = session.assignments?.[0];
              return (
                <button key={session.id} onClick={() => navigate(`/sessions/${session.id}`)}>
                  <span className="dashboard-role-token reciting">R</span>
                  <span><strong>{assignment ? formatPortionLabel(assignment) : 'Recitation session'}</strong><small>Listened by {session.listener_name || 'your listener'} · {formatSessionDate(session.date)} · {session.performance || 'Not rated'}</small></span>
                  <span className="dashboard-activity-mistakes"><strong>{sessionMistakes(session)}</strong><small>my mistakes</small></span>
                  <i aria-hidden="true">›</i>
                </button>
              );
            })}
            {!recitingClasses.length && <div className="approved-empty-state"><strong>No reciting sessions yet</strong><span>Sessions where another person listens to you will appear here.</span></div>}
          </div>
        </section>

        <section className="approved-card dashboard-attention-panel">
          <header className="dashboard-panel-header">
            <div><span className="approved-eyebrow">LISTENING FOLLOW-UP</span><h2>Reciters needing review</h2></div>
            <button onClick={() => navigate('/sessions')}>All sessions</button>
          </header>
          <div className="dashboard-attention-list">
            {attention.length ? attention.slice(0, 4).map(({ contact, latest, latestMistakes }) => {
              if (!latest) return null;
              const assignment = latest.assignments?.[0];
              return (
                <article key={contact.id} className="dashboard-attention-row">
                  <span className="approved-avatar">{initials(contact.first_name, contact.last_name)}</span>
                  <div className="dashboard-attention-main">
                    <strong>{contact.first_name} {contact.last_name}</strong>
                    <small>{assignment ? formatPortionLabel(assignment) : 'No portion assigned'} · {latest.performance || 'Not rated'}</small>
                  </div>
                  <div className="dashboard-attention-count"><strong>{latestMistakes}</strong><small>mistakes</small></div>
                  <button onClick={() => navigate(`/sessions/${latest.id}`)}>Review</button>
                </article>
              );
            }) : <div className="approved-empty-state"><strong>No urgent reviews</strong><span>New mistake or performance data will appear here.</span></div>}
          </div>
        </section>

        <section className="approved-card dashboard-activity-panel">
          <header className="dashboard-panel-header"><div><span className="approved-eyebrow">ALL ACTIVITY</span><h2>Recent listening and reciting</h2></div></header>
          <div className="dashboard-activity-list">
            {recentSessions.length ? recentSessions.map((session) => {
              const assignment = session.assignments?.[0];
              return (
                <button key={session.id} onClick={() => navigate(`/sessions/${session.id}`)}>
                  <span className={`dashboard-role-token ${recitingClasses.some((item) => item.id === session.id) ? 'reciting' : 'listening'}`}>{recitingClasses.some((item) => item.id === session.id) ? 'R' : 'L'}</span>
                  <span><strong>{sessionContactName(session)}</strong><small>{recitingClasses.some((item) => item.id === session.id) ? 'You recited' : 'You listened'} · {assignment ? formatPortionLabel(assignment) : 'No portion'} · {formatSessionDate(session.date)}</small></span>
                  <span className="dashboard-activity-mistakes"><strong>{sessionMistakes(session)}</strong><small>mistakes</small></span>
                  <i aria-hidden="true">›</i>
                </button>
              );
            }) : <div className="approved-empty-state">No sessions yet.</div>}
          </div>
        </section>

        <section className="approved-card dashboard-plans-panel">
          <header className="dashboard-panel-header"><div><span className="approved-eyebrow">LISTENING PLANS</span><h2>Latest plans for your reciters</h2></div></header>
          <div className="dashboard-plan-list">
            {reciterSummaries.filter((item) => item.latest).slice(0, 4).map(({ contact, latest }) => (
              <article key={contact.id}>
                <div className="dashboard-plan-person"><span className="approved-avatar">{initials(contact.first_name, contact.last_name)}</span><span><strong>{contact.first_name} {contact.last_name}</strong><small>{latest ? formatSessionDate(latest.date) : ''}</small></span></div>
                <div className="dashboard-plan-assignments">
                  {latest?.assignments?.length ? latest.assignments.map((assignment) => <span key={assignment.id}><b>{sectionLabel(assignment.type)}</b>{formatPortionLabel(assignment)}</span>) : <small>No portions assigned</small>}
                </div>
                <button onClick={() => navigate(`/sessions?new=1&student=${contact.id}`)}>Start next</button>
              </article>
            ))}
          </div>
        </section>

        <section className="approved-card dashboard-notes-panel">
          <header className="dashboard-panel-header"><div><span className="approved-eyebrow">SHARED FOLLOW-UP</span><h2>Notes from both roles</h2></div></header>
          <div className="dashboard-note-list">
            {recentNotes.length ? recentNotes.map((session) => (
              <button key={session.id} onClick={() => navigate(`/sessions/${session.id}`)}>
                <span><strong>{sessionContactName(session)}</strong><small>{formatSessionDate(session.date)}</small></span>
                <p>{session.notes}</p>
                <i aria-hidden="true">›</i>
              </button>
            )) : <div className="approved-empty-state">No follow-up notes yet.</div>}
          </div>
        </section>
      </div>

      {showAddContactModal && (
        <div className="approved-modal-backdrop">
          <div className="classroom-portion-dialog dashboard-contact-dialog">
            <header><div><span className="approved-eyebrow">CONTACTS</span><h2>Add a reciter</h2><p>Find an existing QuranTrack account by email.</p></div><button onClick={closeAddContactModal} aria-label="Close">×</button></header>
            <div className="dashboard-contact-search"><input type="email" value={emailInput} onChange={(event) => { setEmailInput(event.target.value); setLookupResult(null); setLookupError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') handleLookupContact(); }} placeholder="reciter@example.com" /><button onClick={handleLookupContact} disabled={!emailInput.trim() || isLookingUp}>{isLookingUp ? 'Searching…' : 'Find account'}</button></div>
            {lookupError && <p className="dashboard-contact-error">{lookupError}</p>}
            {lookupResult && <div className="dashboard-contact-result"><span className="approved-avatar">{initials(lookupResult.first_name, lookupResult.last_name)}</span><span><strong>{lookupResult.display_name}</strong><small>{lookupResult.email}</small></span><button onClick={handleAddContact} disabled={isAdding}>{isAdding ? 'Adding…' : 'Add contact'}</button></div>}
          </div>
        </div>
      )}
    </div>
  );
}
