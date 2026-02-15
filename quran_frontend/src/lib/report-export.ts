// Report Export Utilities
// Provides PDF, CSV, and Word export for student reports

import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, TextRun } from 'docx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
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

export function exportToPDF(config: ExportConfig): void {
  const { filteredReport: report, sections } = config;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Progress Report', pageWidth / 2, 20, { align: 'center' });

  // Student Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(report.student.name, 14, 35);
  doc.setFontSize(10);
  doc.text(`Email: ${report.student.email}`, 14, 42);
  doc.text(`Student ID: ${report.student.student_id}`, 14, 48);
  doc.text(`Added: ${new Date(report.student.added_at).toLocaleDateString()}`, 14, 54);

  // Filter summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Filters: ${buildFilterSummary(config)}`, 14, 62);

  let currentY = 70;

  // Summary Stats
  if (sections.summary) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Classes: ${report.summary.total_classes}`, 14, currentY); currentY += 6;
    doc.text(`Total Mistakes: ${report.summary.total_mistakes}`, 14, currentY); currentY += 6;
    doc.text(`Unique Mistakes: ${report.summary.unique_mistakes}`, 14, currentY); currentY += 6;
    doc.text(`Repeated Mistakes: ${report.summary.repeated_mistakes}`, 14, currentY); currentY += 6;
    doc.text(`Avg Performance: ${report.summary.avg_performance}`, 14, currentY); currentY += 10;
  }

  // Class-by-class details
  if (sections.classDetails && report.classes.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Class Details', 14, currentY);
    currentY += 4;

    const classData = report.classes.map(c => [
      c.date,
      c.day,
      c.assignments.map(a => `${a.type}: ${a.start_surah}-${a.end_surah}`).join(', ') || '-',
      c.mistake_count.toString(),
      c.performance || '-'
    ]);

    (doc as any).autoTable({
      startY: currentY,
      head: [['Date', 'Day', 'Portions', 'Mistakes', 'Performance']],
      body: classData,
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 }
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
    currentY += 10;
  }

  // Mistakes by Surah
  if (sections.mistakesBySurah && report.mistakes_by_surah.length > 0) {
    if (currentY > 240) { doc.addPage(); currentY = 20; }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Mistakes by Surah', 14, currentY);
    currentY += 4;

    const surahData = report.mistakes_by_surah.map(item => [
      item.surah_name,
      item.total_mistakes.toString(),
      item.unique_mistakes.toString()
    ]);

    (doc as any).autoTable({
      startY: currentY,
      head: [['Surah', 'Total Mistakes', 'Unique']],
      body: surahData,
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212] },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
    currentY += 10;
  }

  // Repeated Mistakes
  if (sections.repeatedMistakes && report.repeated_mistakes.length > 0) {
    if (currentY > 240) { doc.addPage(); currentY = 20; }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Repeated Mistakes (Needs Focus)', 14, currentY);
    currentY += 4;

    const repeatedData = report.repeated_mistakes.map(item => [
      item.surah_name,
      item.ayah_number.toString(),
      item.word_text,
      `${item.error_count}x`
    ]);

    (doc as any).autoTable({
      startY: currentY,
      head: [['Surah', 'Ayah', 'Word', 'Times Missed']],
      body: repeatedData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
    currentY += 10;
  }

  // Performance Trend
  if (sections.performanceChart && report.performance_trend.length > 0) {
    if (currentY > 240) { doc.addPage(); currentY = 20; }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance History', 14, currentY);
    currentY += 4;

    const perfData = report.performance_trend.map(item => [
      new Date(item.date).toLocaleDateString(),
      item.performance
    ]);

    (doc as any).autoTable({
      startY: currentY,
      head: [['Date', 'Performance']],
      body: perfData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
    currentY += 10;
  }

  // Teacher Notes
  if (sections.teacherNotes) {
    const classesWithNotes = report.classes.filter(c => c.notes);
    if (classesWithNotes.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Teacher Notes', 14, currentY);
      currentY += 4;

      const notesData = classesWithNotes.map(c => [
        c.date,
        c.day,
        c.notes || ''
      ]);

      (doc as any).autoTable({
        startY: currentY,
        head: [['Date', 'Day', 'Notes']],
        body: notesData,
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8 },
        columnStyles: { 2: { cellWidth: 100 } }
      });
    }
  }

  // Save
  doc.save(`${report.student.name.replace(/\s+/g, '_')}_Report.pdf`);
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
