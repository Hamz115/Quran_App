import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyContacts, type ContactListItem } from '../api';
import ReportPanel from '../components/teacher-classes/ReportPanel';

export default function Reports() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedContact = searchParams.get('contact');
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getMyContacts()
      .then((items) => {
        if (!mounted) return;
        const next = Array.isArray(items) ? items : [];
        setContacts(next);
        setSelectedId((current) =>
          current
          || (requestedContact && next.some((contact) => contact.id === requestedContact) ? requestedContact : '')
          || next[0]?.id
          || '',
        );
      })
      .catch((reason) => {
        if (mounted) setError(reason instanceof Error ? reason.message : 'Unable to load contacts');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [requestedContact]);

  const selected = contacts.find((contact) => contact.id === selectedId);

  return (
    <div className="approved-page reports-editorial-page">
      <header className="reports-editorial-header">
        <div>
          <span className="approved-eyebrow">Learning intelligence</span>
          <h1>Recitation Reports</h1>
          <p>Review every session, mistake pattern, and performance change in one clear record.</p>
        </div>
        <button type="button" className="approved-primary-button" onClick={() => navigate('/sessions?new=1')}>
          <span className="text-lg leading-none">+</span> New Session
        </button>
      </header>

      <section className="reports-reciter-card">
        <span className="reports-reciter-avatar">
          {selected ? `${selected.first_name[0] || ''}${selected.last_name[0] || ''}` : 'QT'}
        </span>
        <div className="reports-reciter-copy">
          <small>Report for</small>
          <strong>{selected ? `${selected.first_name} ${selected.last_name}` : 'Select a reciter'}</strong>
        </div>
        <label className="reports-reciter-select">
          <span>Change reciter</span>
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={loading || contacts.length === 0}>
            {contacts.length === 0 && <option value="">No contacts available</option>}
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.first_name} {contact.last_name} · {contact.student_id || contact.email}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? (
        <div className="approved-empty-state text-red-600">{error}</div>
      ) : loading ? (
        <div className="approved-empty-state">Loading reports...</div>
      ) : selectedId ? (
        <ReportPanel studentId={selectedId} basePath="/sessions" />
      ) : (
        <div className="approved-empty-state">
          Add a contact before opening a recitation report.
          <button type="button" className="approved-secondary-button mt-4" onClick={() => navigate('/contacts')}>Open Contacts</button>
        </div>
      )}
    </div>
  );
}
