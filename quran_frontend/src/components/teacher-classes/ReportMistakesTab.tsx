import type { MistakeBySurah, RepeatedMistake } from '../../lib/report-types';

interface ReportMistakesTabProps {
  mistakesBySurah: MistakeBySurah[];
  repeatedMistakes: RepeatedMistake[];
  darkMode: boolean;
}

export default function ReportMistakesTab({ mistakesBySurah, repeatedMistakes, darkMode }: ReportMistakesTabProps) {
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textMuted = darkMode ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="report-mistake-analysis grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Mistakes by Surah */}
      <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
        <div className={`px-4.5 py-3.5 border-b ${borderColor} ${cardBg} flex items-center justify-between`}>
          <span className={`text-sm font-semibold ${textPrimary}`}>Mistakes by Surah</span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-600/20 text-cyan-400">
            {mistakesBySurah.length} surahs
          </span>
        </div>
        <div className={`p-4.5 ${cardBg}`}>
          {mistakesBySurah.length === 0 ? (
            <p className={textSecondary}>No mistakes recorded</p>
          ) : (
            <div className="space-y-2.5">
              {[...mistakesBySurah]
                .sort((a, b) => b.total_mistakes - a.total_mistakes)
                .map(item => {
                  const maxVal = [...mistakesBySurah].sort((a, b) => b.total_mistakes - a.total_mistakes)[0]?.total_mistakes || 1;
                  const pct = (item.total_mistakes / maxVal) * 100;
                  return (
                    <div key={item.surah_number} className="flex items-center gap-2.5">
                      <div className={`w-[100px] text-xs text-right flex-shrink-0 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {item.surah_name}
                      </div>
                      <div className={`flex-1 h-[22px] rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} overflow-hidden`}>
                        <div
                          className="h-full rounded bg-gradient-to-r from-cyan-600 to-teal-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className={`w-[90px] text-[11px] ${textMuted} whitespace-nowrap`}>
                        <strong className={textPrimary}>{item.total_mistakes}</strong> ({item.unique_mistakes} unique)
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Repeated Mistakes */}
      <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
        <div className={`px-4.5 py-3.5 border-b ${borderColor} ${cardBg} flex items-center justify-between`}>
          <span className={`text-sm font-semibold ${textPrimary}`}>Repeated Mistakes</span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-400">
            {repeatedMistakes.length} words
          </span>
        </div>
        <div className={`p-4.5 ${cardBg}`}>
          {repeatedMistakes.length === 0 ? (
            <p className={textSecondary}>No repeated mistakes - great progress!</p>
          ) : (
            <ul className="space-y-0">
              {repeatedMistakes.map((m, i) => (
                <li key={m.id} className={`flex items-center gap-3 py-2.5 ${i < repeatedMistakes.length - 1 ? `border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}` : ''}`}>
                  <span className="w-[26px] h-[26px] rounded-full bg-red-500/15 text-red-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-lg flex-1 font-['Amiri'] rtl" dir="rtl" style={{ color: darkMode ? '#e2e8f0' : '#1e293b' }}>
                    {m.word_text}
                  </span>
                  <span className={`text-[11px] w-[110px] ${textMuted}`}>
                    {m.surah_name} : {m.ayah_number}
                  </span>
                  <span className="text-[13px] font-bold text-red-400 w-9 text-right">
                    {m.error_count}x
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
