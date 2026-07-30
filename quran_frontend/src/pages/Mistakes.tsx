import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMistakesWithOccurrences, type MistakeWithOccurrences } from '../api';
import { surahNames } from '../lib/quran-utils';
import { useAuth } from '../contexts/AuthContext';

export default function Mistakes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mistakes, setMistakes] = useState<MistakeWithOccurrences[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMistakeId, setSelectedMistakeId] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    getMistakesWithOccurrences(undefined, user.id)
      .then((items) => {
        if (!mounted) return;
        const next = Array.isArray(items) ? items : [];
        setMistakes(next);
        setSelectedMistakeId((current) => next.some((item) => item.id === current) ? current : next[0]?.id || '');
      })
      .catch((reason) => {
        if (mounted) setError(reason instanceof Error ? reason.message : 'Mistakes could not be loaded.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [user?.id]);

  const selected = mistakes.find((mistake) => mistake.id === selectedMistakeId);
  const totalOccurrences = mistakes.reduce((sum, mistake) => sum + mistake.error_count, 0);
  const repeated = mistakes.filter((mistake) => mistake.error_count > 1);
  const surahSummary = useMemo(() => {
    const counts = new Map<number, number>();
    mistakes.forEach((mistake) => counts.set(mistake.surah_number, (counts.get(mistake.surah_number) || 0) + mistake.error_count));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [mistakes]);
  const maxSurahCount = Math.max(1, ...surahSummary.map(([, count]) => count));

  const openInSession = (mistake: MistakeWithOccurrences) => {
    const latest = [...(mistake.occurrences || [])]
      .sort((a, b) => b.class_date.localeCompare(a.class_date))[0];
    const target = new URLSearchParams({
      student: user?.id || '',
      surah: String(mistake.surah_number),
      ayah: String(mistake.ayah_number),
      word: String(mistake.word_index),
    });
    navigate(latest?.class_id
      ? `/sessions/${latest.class_id}?${target.toString()}`
      : `/reader?${target.toString()}`);
  };

  return (
    <div className="approved-page">
      <header className="approved-page-header">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="approved-page-title">Mistakes &amp; Recitation Review</h1>
            <span className="approved-sync"><span className="desktop-status-dot" />Recorded history</span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Your recitation mistakes from sessions where you were the reciter.</p>
        </div>
        <button type="button" className="approved-primary-button" onClick={() => navigate('/sessions?new=1')}>New Session</button>
      </header>

      {error && <div className="approved-alert mb-4">{error}</div>}

      <section data-tour="mistakes-summary" className="approved-card mb-4 grid grid-cols-3 divide-x divide-[var(--border-color)] p-4 text-center">
        <div><strong className="approved-metric">{totalOccurrences}</strong><span className="approved-metric-label">Total occurrences</span></div>
        <div><strong className="approved-metric">{repeated.length}</strong><span className="approved-metric-label">Repeated mistakes</span></div>
        <div><strong className="approved-metric">{surahSummary.length}</strong><span className="approved-metric-label">Surahs affected</span></div>
      </section>

      <div className="mistakes-overview-grid">
        <section className="approved-card p-5">
          <h2 className="approved-card-title">Mistakes by Surah</h2>
          <div className="mt-4 space-y-3">
            {surahSummary.slice(0, 8).map(([surah, count]) => (
              <div key={surah} className="grid grid-cols-[100px_1fr_32px] items-center gap-3 text-xs">
                <span className="truncate">{surahNames[surah] || `Surah ${surah}`}</span>
                <span className="h-2 overflow-hidden rounded-sm bg-[var(--bg-secondary)]"><span className="block h-full bg-[var(--accent-primary)]" style={{ width: `${(count / maxSurahCount) * 100}%` }} /></span>
                <span className="text-right text-[var(--text-muted)]">{count}</span>
              </div>
            ))}
            {!loading && surahSummary.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-muted)]">No stored mistakes.</p>}
          </div>
        </section>

        <section className="approved-card p-5">
          <h2 className="approved-card-title">Repeated Mistakes</h2>
          <div className="mt-3 divide-y divide-[var(--border-color)]">
            {repeated.slice(0, 6).map((mistake) => (
              <button key={mistake.id} type="button" className="flex w-full items-center gap-3 py-3 text-left" onClick={() => setSelectedMistakeId(mistake.id)}>
                <span className="approved-count-badge">{mistake.error_count}</span>
                <span className="font-amiri text-xl" dir="rtl">{mistake.word_text}</span>
                <span className="ml-auto text-xs text-[var(--text-muted)]">{surahNames[mistake.surah_number]} {mistake.ayah_number}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div data-tour="mistakes-history" className="mistakes-detail-grid mt-4">
        <section className="approved-card overflow-hidden">
          <div className="mistakes-table-header"><span>Arabic</span><span>Quran reference</span><span>Type</span><span>Occurrences</span><span>Last seen</span></div>
          {loading ? <div className="approved-empty-state">Loading mistakes...</div> : mistakes.map((mistake) => {
            const latest = [...(mistake.occurrences || [])].sort((a, b) => b.class_date.localeCompare(a.class_date))[0];
            return (
              <button key={mistake.id} type="button" className={`mistakes-table-row ${selectedMistakeId === mistake.id ? 'active' : ''}`} onClick={() => setSelectedMistakeId(mistake.id)}>
                <span className="font-amiri text-xl" dir="rtl">{mistake.word_text}</span>
                <span>{surahNames[mistake.surah_number]} {mistake.ayah_number}:{mistake.word_index + 1}</span>
                <span>{mistake.char_index === undefined || mistake.char_index === null ? 'Whole word' : 'Character'}</span>
                <span>{mistake.error_count}x</span>
                <span>{latest?.class_date || 'Not linked'}</span>
              </button>
            );
          })}
        </section>

        <aside className="approved-card p-5">
          {selected ? (
            <>
              <span className="approved-eyebrow">Selected mistake</span>
              <div className="my-5 flex items-center gap-4">
                <span className="font-amiri text-4xl" dir="rtl">{selected.word_text}</span>
                <div><h2 className="approved-card-title">{surahNames[selected.surah_number]}</h2><p className="text-xs text-[var(--text-muted)]">{selected.surah_number}:{selected.ayah_number}, word {selected.word_index + 1}</p></div>
              </div>
              <dl className="approved-detail-list">
                <div><dt>Classification</dt><dd>{selected.char_index === undefined || selected.char_index === null ? 'Whole word' : `Character index ${selected.char_index}`}</dd></div>
                <div><dt>Occurrences</dt><dd>{selected.error_count}</dd></div>
                <div><dt>Linked sessions</dt><dd>{selected.occurrences?.length || 0}</dd></div>
                <div><dt>Last recorded by</dt><dd>{[...(selected.occurrences || [])].sort((a, b) => b.class_date.localeCompare(a.class_date))[0]?.listener_name || 'Not linked'}</dd></div>
              </dl>
              <button type="button" className="approved-primary-button w-full" onClick={() => openInSession(selected)}>Open in Quran</button>
            </>
          ) : <div className="approved-empty-state">Select a mistake to inspect it.</div>}
        </aside>
      </div>
    </div>
  );
}
