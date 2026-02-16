// Report Export Utilities
// Provides PDF, CSV, and Word export for student reports

import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, TextRun } from 'docx';
import html2pdf from 'html2pdf.js';
import type { ExportConfig } from './report-types';
import { surahNames } from './quran-utils';

// Helper to create bold text
function boldText(text: string): TextRun {
  return new TextRun({ text, bold: true });
}

function buildFilterSummary(config: ExportConfig): string {
  const parts: string[] = [];
  const { filters } = config;
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom || 'Start';
    const to = filters.dateTo || 'Now';
    parts.push(`Period: ${from} to ${to}`);
  }
  if (filters.surahFrom || filters.surahTo) {
    const from = filters.surahFrom ? `${surahNames[filters.surahFrom]} (${filters.surahFrom})` : '1';
    const to = filters.surahTo ? `${surahNames[filters.surahTo]} (${filters.surahTo})` : '114';
    parts.push(`Surah ${from} - ${to}`);
  }
  if (filters.juz) {
    parts.push(`Juz ${filters.juz}`);
  }
  return parts.length > 0 ? parts.join(' | ') : 'All data (no filters)';
}

function fmtDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function fmtDateShort(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

function perfClass(perf: string): string {
  const p = perf.toLowerCase().replace(/\s+/g, '-');
  if (p === 'excellent') return 'excellent';
  if (p === 'very-good') return 'very-good';
  if (p === 'good') return 'good';
  return 'needs-work';
}

function perfBarWidth(perf: string): string {
  const p = perf.toLowerCase().replace(/\s+/g, '-');
  if (p === 'excellent') return '90%';
  if (p === 'very-good') return '70%';
  if (p === 'good') return '50%';
  return '30%';
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Build the full HTML document for the student report.
 * Used by both the backend Playwright export and the client-side html2pdf fallback.
 */
export function buildReportHTML(config: ExportConfig): { html: string; filename: string } {
  const { filteredReport: report, sections } = config;
  const maxMistakes = report.mistakes_by_surah.length > 0
    ? Math.max(...report.mistakes_by_surah.map(m => m.total_mistakes))
    : 1;

  let sectionNum = 0;
  const nextNum = () => ++sectionNum;

  // Build class entries HTML (simple table like the dashboard)
  let classesHtml = '';
  if (sections.classDetails && report.classes.length > 0) {
    const sortedClasses = [...report.classes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    classesHtml = `
      <div class="doc-section">
        <div class="doc-section-title"><span class="num">${nextNum()}</span> Classes</div>
        <table class="classes-table">
          <thead>
            <tr><th>Date</th><th>Portions</th><th style="text-align:center;">Mistakes</th><th>Performance</th></tr>
          </thead>
          <tbody>
            ${sortedClasses.map(cls => {
              const portions = cls.assignments.length > 0
                ? cls.assignments.map(a => {
                    const typeClass = a.type.toLowerCase() === 'hifz' ? 'hifz' : a.type.toLowerCase() === 'sabqi' ? 'sabqi' : 'manzil';
                    const startName = surahNames[a.start_surah] || `Surah ${a.start_surah}`;
                    const ayahPart = a.start_ayah ? (a.end_ayah && a.end_ayah !== a.start_ayah ? ` ${a.start_ayah}-${a.end_ayah}` : ` ${a.start_ayah}`) : '';
                    return `<span class="portion-tag"><span class="type-tag ${typeClass}">${a.type.toUpperCase()}</span> ${escHtml(startName)}${ayahPart}</span>`;
                  }).join(' ')
                : '<span style="color:#94a3b8;">-</span>';
              return `<tr>
                <td class="date-cell"><div class="date-main">${fmtDate(cls.date)}</div><div class="date-day">${escHtml(cls.day)}</div></td>
                <td class="portions-cell">${portions}</td>
                <td style="text-align:center;"><span class="mistake-count ${cls.mistake_count === 0 ? 'zero' : cls.mistake_count >= 10 ? 'high' : ''}">${cls.mistake_count}</span></td>
                <td>${cls.performance ? `<span class="doc-perf ${perfClass(cls.performance)}">${escHtml(cls.performance)}</span>` : '<span style="color:#94a3b8;">-</span>'}</td>
              </tr>
              ${sections.teacherNotes && cls.notes ? `<tr class="note-row"><td colspan="4"><div class="doc-note">"${escHtml(cls.notes)}"</div></td></tr>` : ''}`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // Build mistakes by surah HTML
  let mistakesSurahHtml = '';
  if (sections.mistakesBySurah && report.mistakes_by_surah.length > 0) {
    mistakesSurahHtml = `
      <div class="doc-section">
        <div class="doc-section-title"><span class="num">${nextNum()}</span> Mistakes by Surah</div>
        ${report.mistakes_by_surah.map(item => {
          const pct = Math.round((item.total_mistakes / maxMistakes) * 100);
          return `<div class="doc-bar-row">
            <div class="name">${escHtml(item.surah_name)}</div>
            <div class="track"><div class="fill" style="width:${pct}%;"></div></div>
            <div class="val"><strong>${item.total_mistakes}</strong> total (${item.unique_mistakes} unique)</div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // Build repeated mistakes HTML
  let repeatedHtml = '';
  if (sections.repeatedMistakes && report.repeated_mistakes.length > 0) {
    repeatedHtml = `
      <div class="doc-section">
        <div class="doc-section-title"><span class="num">${nextNum()}</span> Repeated Mistakes &mdash; Needs Focus</div>
        <table class="doc-table">
          <thead>
            <tr><th>Surah</th><th>Ayah</th><th>Word</th><th style="text-align:center;">Times Missed</th></tr>
          </thead>
          <tbody>
            ${report.repeated_mistakes.map(item =>
              `<tr><td>${escHtml(item.surah_name)}</td><td>${item.ayah_number}</td><td class="arabic">${escHtml(item.word_text)}</td><td style="text-align:center;"><span class="error-num">${item.error_count}x</span></td></tr>`
            ).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // Build performance timeline HTML
  let perfHtml = '';
  if (sections.performanceChart && report.performance_trend.length > 0) {
    perfHtml = `
      <div class="doc-section">
        <div class="doc-section-title"><span class="num">${nextNum()}</span> Performance History</div>
        <div class="perf-timeline">
          ${report.performance_trend.map(item =>
            `<div class="perf-row">
              <div class="p-date">${fmtDateShort(item.date)}</div>
              <div class="p-bar-area"><div class="p-bar ${perfClass(item.performance)}" style="width:${perfBarWidth(item.performance)};"></div><span class="p-label">${escHtml(item.performance)}</span></div>
            </div>`
          ).join('')}
        </div>
      </div>`;
  }

  // Build summary HTML
  let summaryHtml = '';
  if (sections.summary) {
    summaryHtml = `
      <div class="doc-section">
        <div class="doc-section-title"><span class="num">${nextNum()}</span> Summary</div>
        <div class="doc-stats">
          <div class="doc-stat accent"><div class="val">${report.summary.total_classes}</div><div class="lbl">Classes</div></div>
          <div class="doc-stat"><div class="val">${report.summary.total_mistakes}</div><div class="lbl">Total Mistakes</div></div>
          <div class="doc-stat warn"><div class="val">${report.summary.repeated_mistakes}</div><div class="lbl">Repeated Mistakes</div></div>
          <div class="doc-stat ok"><div class="val">${escHtml(report.summary.avg_performance)}</div><div class="lbl">Average Performance</div></div>
        </div>
      </div>`;
  }

  // Reorder: summary first
  sectionNum = 0;
  let orderedSections = '';
  if (sections.summary) {
    sectionNum++;
    orderedSections += summaryHtml.replace(/<span class="num">\d+<\/span>/, `<span class="num">${sectionNum}</span>`);
  }
  if (sections.classDetails && report.classes.length > 0) {
    sectionNum++;
    orderedSections += classesHtml.replace(/<span class="num">\d+<\/span>/, `<span class="num">${sectionNum}</span>`);
  }
  if (sections.mistakesBySurah && report.mistakes_by_surah.length > 0) {
    sectionNum++;
    orderedSections += mistakesSurahHtml.replace(/<span class="num">\d+<\/span>/, `<span class="num">${sectionNum}</span>`);
  }
  if (sections.repeatedMistakes && report.repeated_mistakes.length > 0) {
    sectionNum++;
    orderedSections += repeatedHtml.replace(/<span class="num">\d+<\/span>/, `<span class="num">${sectionNum}</span>`);
  }
  if (sections.performanceChart && report.performance_trend.length > 0) {
    sectionNum++;
    orderedSections += perfHtml.replace(/<span class="num">\d+<\/span>/, `<span class="num">${sectionNum}</span>`);
  }

  const filterText = buildFilterSummary(config);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; }
    .pdf-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; width: 100%; }

    .doc-header { background: linear-gradient(135deg, #0c4a6e, #0891b2); color: white; padding: 32px 40px; }
    .doc-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .doc-header .subtitle { font-size: 14px; opacity: 0.85; }
    .doc-header .meta-row { display: flex; gap: 24px; margin-top: 16px; font-size: 12px; opacity: 0.8; flex-wrap: wrap; }
    .doc-header .meta-row strong { opacity: 1; }

    .doc-body { padding: 32px 40px; }

    .doc-section { margin-bottom: 28px; page-break-inside: avoid; }
    .doc-section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #0891b2; display: flex; align-items: center; gap: 10px; page-break-after: avoid; }
    .doc-section-title .num { display: block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; background: #0891b2; color: white; font-size: 13px; font-weight: 700; flex-shrink: 0; }

    .doc-stats { display: flex; gap: 12px; }
    .doc-stat { flex: 1; padding: 16px; background: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; }
    .doc-stat .val { font-size: 24px; font-weight: 700; color: #0f172a; }
    .doc-stat .lbl { font-size: 11px; color: #64748b; margin-top: 4px; }
    .doc-stat.accent .val { color: #0891b2; }
    .doc-stat.warn .val { color: #dc2626; }
    .doc-stat.ok .val { color: #16a34a; font-size: 17px; }

    .classes-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; }
    .classes-table th { text-align: left; padding: 10px 12px; font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; }
    .classes-table td { padding: 10px 12px; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .classes-table .date-cell .date-main { font-weight: 600; color: #0f172a; font-size: 12px; white-space: nowrap; }
    .classes-table .date-cell .date-day { font-size: 10px; color: #94a3b8; }
    .classes-table .portions-cell { line-height: 2; }
    .classes-table .note-row td { padding: 0 12px 10px 12px; border-bottom: 1px solid #e2e8f0; }

    .portion-tag { display: inline; font-size: 11px; color: #475569; margin-right: 6px; white-space: nowrap; }
    .type-tag { font-weight: 700; font-size: 9px; padding: 2px 5px; border-radius: 3px; }
    .type-tag.hifz { background: #dbeafe; color: #2563eb; }
    .type-tag.sabqi { background: #cffafe; color: #0891b2; }
    .type-tag.manzil { background: #f1f5f9; color: #64748b; }

    .mistake-count { display: block; width: 30px; height: 30px; line-height: 30px; text-align: center; border-radius: 50%; font-size: 12px; font-weight: 700; background: #fef2f2; color: #dc2626; margin: 0 auto; }
    .mistake-count.zero { background: #f0fdf4; color: #16a34a; }
    .mistake-count.high { background: #dc2626; color: white; }

    .doc-perf { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .doc-perf.excellent { background: #dcfce7; color: #16a34a; }
    .doc-perf.very-good { background: #cffafe; color: #0891b2; }
    .doc-perf.good { background: #fef3c7; color: #d97706; }
    .doc-perf.needs-work { background: #fecaca; color: #dc2626; }

    .doc-note { font-size: 11px; color: #64748b; font-style: italic; padding: 8px 12px; background: #f8fafc; border-left: 3px solid #cbd5e1; border-radius: 0 4px 4px 0; }

    .doc-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .doc-bar-row .name { width: 100px; font-size: 12px; color: #475569; text-align: right; flex-shrink: 0; font-weight: 500; }
    .doc-bar-row .track { flex: 1; height: 20px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .doc-bar-row .fill { height: 100%; background: linear-gradient(90deg, #0891b2, #14b8a6); border-radius: 4px; }
    .doc-bar-row .val { width: 140px; font-size: 11px; color: #64748b; flex-shrink: 0; }
    .doc-bar-row .val strong { color: #0f172a; }

    .doc-table { width: 100%; border-collapse: collapse; }
    .doc-table th { text-align: left; padding: 8px 12px; font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; }
    .doc-table td { padding: 8px 12px; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .doc-table .arabic { font-family: 'Amiri', serif; font-size: 16px; direction: rtl; color: #0f172a; }
    .doc-table .error-num { display: inline-block; padding: 3px 10px; background: #fef2f2; color: #dc2626; border-radius: 20px; font-size: 12px; font-weight: 700; }

    .perf-timeline { display: flex; flex-direction: column; gap: 6px; }
    .perf-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
    .perf-row .p-date { width: 100px; font-size: 12px; color: #64748b; font-weight: 500; }
    .perf-row .p-bar-area { flex: 1; display: flex; align-items: center; }
    .perf-row .p-bar { height: 20px; border-radius: 4px; }
    .perf-row .p-bar.excellent { background: #22c55e; }
    .perf-row .p-bar.very-good { background: #06b6d4; }
    .perf-row .p-bar.good { background: #f59e0b; }
    .perf-row .p-bar.needs-work { background: #ef4444; }
    .perf-row .p-label { margin-left: 8px; font-size: 11px; color: #475569; font-weight: 500; }
  `;

  const bodyHtml = `
    <div class="doc-header">
      <h1>Student Progress Report</h1>
      <div class="subtitle">${escHtml(report.student.name)}</div>
      <div class="meta-row">
        <span>Filters: <strong>${escHtml(filterText)}</strong></span>
        <span>Generated: <strong>${today}</strong></span>
        <span>Student since: <strong>${fmtDate(report.student.added_at)}</strong></span>
      </div>
    </div>
    <div class="doc-body">
      ${orderedSections}
    </div>`;

  const filename = `${report.student.name.replace(/\s+/g, '_')}_Report.pdf`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Amiri&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div class="pdf-root">${bodyHtml}</div>
</body>
</html>`;

  return { html, filename };
}

/**
 * Export PDF via the backend Playwright endpoint (vector-quality output).
 * Returns the PDF as a Blob. Throws on error.
 */
export async function exportToPDFBackend(config: ExportConfig): Promise<{ blob: Blob; filename: string }> {
  const { html, filename } = buildReportHTML(config);
  const studentName = config.filteredReport.student.name;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch('http://localhost:8000/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, student_name: studentName, filename }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => 'Unknown error');
      throw new Error(`Server error (${res.status}): ${detail}`);
    }

    const blob = await res.blob();
    return { blob, filename };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Client-side PDF fallback using html2pdf.js (raster output).
 * Kept for when the backend is unavailable.
 */
export function exportToPDF(config: ExportConfig): void {
  const { html: _fullDoc, filename } = buildReportHTML(config);
  const { filteredReport: report } = config;

  // html2pdf works with a DOM element, not a full HTML document.
  // We need to extract just the body content and inject styles into <head>.
  const { css, bodyContent } = (() => {
    const styleMatch = _fullDoc.match(/<style>([\s\S]*?)<\/style>/);
    const bodyMatch = _fullDoc.match(/<body>([\s\S]*?)<\/body>/);
    return {
      css: styleMatch ? styleMatch[1] : '',
      bodyContent: bodyMatch ? bodyMatch[1] : '',
    };
  })();

  // Inject styles into document head
  const styleEl = document.createElement('style');
  styleEl.id = 'pdf-export-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Build container (not appended to DOM — let html2pdf manage it)
  const container = document.createElement('div');
  container.innerHTML = bodyContent;

  // Add back the footer for the client-side version (no running footer)
  const footer = document.createElement('div');
  footer.className = 'doc-footer';
  footer.style.cssText = 'padding:20px 40px;background:#f1f5f9;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;';
  footer.innerHTML = `<span>QuranTrack &mdash; Student Progress Report</span><span>${escHtml(report.student.name)}</span>`;
  const pdfRoot = container.querySelector('.pdf-root');
  if (pdfRoot) pdfRoot.appendChild(footer);

  const cleanup = () => {
    const s = document.getElementById('pdf-export-styles');
    if (s) s.remove();
  };

  html2pdf()
    .set({
      margin: [10, 0, 10, 0],
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: true, width: 790 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    } as any)
    .from(container)
    .save()
    .then(() => { cleanup(); console.log('PDF saved successfully'); })
    .catch((err: unknown) => { cleanup(); console.error('PDF generation failed:', err); });
}

export function exportToCSV(config: ExportConfig): void {
  const { filteredReport: report, sections } = config;
  let csv = 'Student Progress Report\n\n';

  // Student Info
  csv += 'Name,Email,Student ID,Added Date\n';
  csv += `"${report.student.name}","${report.student.email}","${report.student.student_id}","${report.student.added_at}"\n\n`;

  // Filter summary
  csv += `Filters,"${buildFilterSummary(config)}"\n\n`;

  // Summary
  if (sections.summary) {
    csv += 'Summary\n';
    csv += `Total Classes,${report.summary.total_classes}\n`;
    csv += `Total Mistakes,${report.summary.total_mistakes}\n`;
    csv += `Unique Mistakes,${report.summary.unique_mistakes}\n`;
    csv += `Repeated Mistakes,${report.summary.repeated_mistakes}\n`;
    csv += `Avg Performance,"${report.summary.avg_performance}"\n\n`;
  }

  // Class details
  if (sections.classDetails && report.classes.length > 0) {
    csv += 'Class Details\n';
    csv += 'Date,Day,Portions,Mistakes,Performance\n';
    for (const c of report.classes) {
      const portions = c.assignments.map(a => `${a.type}: ${a.start_surah}-${a.end_surah}`).join('; ');
      csv += `"${c.date}","${c.day}","${portions}",${c.mistake_count},"${c.performance || ''}"\n`;
    }
    csv += '\n';
  }

  // Mistakes by Surah
  if (sections.mistakesBySurah) {
    csv += 'Mistakes by Surah\n';
    csv += 'Surah,Total Mistakes,Unique Mistakes\n';
    for (const item of report.mistakes_by_surah) {
      csv += `"${item.surah_name}",${item.total_mistakes},${item.unique_mistakes}\n`;
    }
    csv += '\n';
  }

  // Repeated Mistakes
  if (sections.repeatedMistakes) {
    csv += 'Repeated Mistakes\n';
    csv += 'Surah,Ayah,Word,Times Missed\n';
    for (const item of report.repeated_mistakes) {
      csv += `"${item.surah_name}",${item.ayah_number},"${item.word_text}",${item.error_count}\n`;
    }
    csv += '\n';
  }

  // Performance History
  if (sections.performanceChart) {
    csv += 'Performance History\n';
    csv += 'Date,Performance\n';
    for (const item of report.performance_trend) {
      csv += `${item.date},"${item.performance}"\n`;
    }
    csv += '\n';
  }

  // Teacher Notes
  if (sections.teacherNotes) {
    const classesWithNotes = report.classes.filter(c => c.notes);
    if (classesWithNotes.length > 0) {
      csv += 'Teacher Notes\n';
      csv += 'Date,Day,Notes\n';
      for (const c of classesWithNotes) {
        csv += `"${c.date}","${c.day}","${(c.notes || '').replace(/"/g, '""')}"\n`;
      }
    }
  }

  // Save
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${report.student.name.replace(/\s+/g, '_')}_Report.csv`);
}

export async function exportToWord(config: ExportConfig): Promise<void> {
  const { filteredReport: report, sections } = config;
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: 'Student Progress Report',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 }
    })
  );

  // Student Info
  children.push(
    new Paragraph({
      children: [boldText('Student Information')],
      spacing: { before: 300, after: 100 }
    })
  );

  children.push(new Paragraph({ text: `Name: ${report.student.name}`, spacing: { after: 50 } }));
  children.push(new Paragraph({ text: `Email: ${report.student.email}`, spacing: { after: 50 } }));
  children.push(new Paragraph({ text: `Student ID: ${report.student.student_id}`, spacing: { after: 50 } }));
  children.push(new Paragraph({ text: `Added Date: ${new Date(report.student.added_at).toLocaleDateString()}`, spacing: { after: 100 } }));

  // Filter summary
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Filters: ${buildFilterSummary(config)}`, italics: true, color: '64748B' })],
      spacing: { after: 200 }
    })
  );

  // Summary
  if (sections.summary) {
    children.push(
      new Paragraph({ children: [boldText('Summary')], spacing: { before: 300, after: 100 } })
    );
    children.push(new Paragraph({ text: `Total Classes: ${report.summary.total_classes}`, spacing: { after: 50 } }));
    children.push(new Paragraph({ text: `Total Mistakes: ${report.summary.total_mistakes}`, spacing: { after: 50 } }));
    children.push(new Paragraph({ text: `Unique Mistakes: ${report.summary.unique_mistakes}`, spacing: { after: 50 } }));
    children.push(new Paragraph({ text: `Repeated Mistakes: ${report.summary.repeated_mistakes}`, spacing: { after: 50 } }));
    children.push(new Paragraph({ text: `Avg Performance: ${report.summary.avg_performance}`, spacing: { after: 200 } }));
  }

  // Class details
  if (sections.classDetails && report.classes.length > 0) {
    children.push(
      new Paragraph({ children: [boldText('Class Details')], spacing: { before: 300, after: 100 } })
    );

    const classRows = [
      new TableRow({
        children: ['Date', 'Day', 'Portions', 'Mistakes', 'Performance'].map(h =>
          new TableCell({
            children: [new Paragraph({ children: [boldText(h)] })],
            shading: { fill: '06b6d4' }
          })
        )
      })
    ];

    for (const c of report.classes) {
      const portions = c.assignments.map(a => `${a.type}: ${a.start_surah}-${a.end_surah}`).join(', ');
      classRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(c.date)] }),
            new TableCell({ children: [new Paragraph(c.day)] }),
            new TableCell({ children: [new Paragraph(portions || '-')] }),
            new TableCell({ children: [new Paragraph(c.mistake_count.toString())] }),
            new TableCell({ children: [new Paragraph(c.performance || '-')] }),
          ]
        })
      );
    }

    children.push(new Table({ rows: classRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // Mistakes by Surah
  if (sections.mistakesBySurah && report.mistakes_by_surah.length > 0) {
    children.push(
      new Paragraph({ children: [boldText('Mistakes by Surah')], spacing: { before: 300, after: 100 } })
    );

    const surahTableRows = [
      new TableRow({
        children: ['Surah', 'Total Mistakes', 'Unique Mistakes'].map(h =>
          new TableCell({
            children: [new Paragraph({ children: [boldText(h)] })],
            shading: { fill: '06b6d4' }
          })
        )
      })
    ];

    for (const item of report.mistakes_by_surah) {
      surahTableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(item.surah_name)] }),
            new TableCell({ children: [new Paragraph(item.total_mistakes.toString())] }),
            new TableCell({ children: [new Paragraph(item.unique_mistakes.toString())] })
          ]
        })
      );
    }

    children.push(new Table({ rows: surahTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // Repeated Mistakes
  if (sections.repeatedMistakes && report.repeated_mistakes.length > 0) {
    children.push(
      new Paragraph({ children: [boldText('Repeated Mistakes (Needs Focus)')], spacing: { before: 300, after: 100 } })
    );

    const repeatedTableRows = [
      new TableRow({
        children: ['Surah', 'Ayah', 'Word', 'Times Missed'].map(h =>
          new TableCell({
            children: [new Paragraph({ children: [boldText(h)] })],
            shading: { fill: 'ef4444' }
          })
        )
      })
    ];

    for (const item of report.repeated_mistakes) {
      repeatedTableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(item.surah_name)] }),
            new TableCell({ children: [new Paragraph(item.ayah_number.toString())] }),
            new TableCell({ children: [new Paragraph(item.word_text)] }),
            new TableCell({ children: [new Paragraph(`${item.error_count}x`)] })
          ]
        })
      );
    }

    children.push(new Table({ rows: repeatedTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // Performance History
  if (sections.performanceChart && report.performance_trend.length > 0) {
    children.push(
      new Paragraph({ children: [boldText('Performance History')], spacing: { before: 300, after: 100 } })
    );

    const perfTableRows = [
      new TableRow({
        children: ['Date', 'Performance'].map(h =>
          new TableCell({
            children: [new Paragraph({ children: [boldText(h)] })],
            shading: { fill: '10b981' }
          })
        )
      })
    ];

    for (const item of report.performance_trend) {
      perfTableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(new Date(item.date).toLocaleDateString())] }),
            new TableCell({ children: [new Paragraph(item.performance)] })
          ]
        })
      );
    }

    children.push(new Table({ rows: perfTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // Teacher Notes
  if (sections.teacherNotes) {
    const classesWithNotes = report.classes.filter(c => c.notes);
    if (classesWithNotes.length > 0) {
      children.push(
        new Paragraph({ children: [boldText('Teacher Notes')], spacing: { before: 300, after: 100 } })
      );

      const notesTableRows = [
        new TableRow({
          children: ['Date', 'Day', 'Notes'].map(h =>
            new TableCell({
              children: [new Paragraph({ children: [boldText(h)] })],
              shading: { fill: '64748B' }
            })
          )
        })
      ];

      for (const c of classesWithNotes) {
        notesTableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(c.date)] }),
              new TableCell({ children: [new Paragraph(c.day)] }),
              new TableCell({ children: [new Paragraph(c.notes || '')] }),
            ]
          })
        );
      }

      children.push(new Table({ rows: notesTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    }
  }

  // Create document
  const wordDoc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  // Generate and save
  const blob = await Packer.toBlob(wordDoc);
  saveAs(blob, `${report.student.name.replace(/\s+/g, '_')}_Report.docx`);
}
