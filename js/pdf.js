async function gerarPDF(planejamentoId) {
  const plano = await buscarPlanejamento(planejamentoId);
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const PW = doc.internal.pageSize.getWidth();   // 297
  const PH = doc.internal.pageSize.getHeight();  // 210
  const MARGEM = 8;
  const HEADER_H = 18;
  const [r, g, b] = hexParaRgb(plano.cor || '#F97316');

  const DIAS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const DIAS_LABEL = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];

  const nomeMes = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
  ][plano.mes - 1];

  const nomeTurma = plano.turmas?.nome || '';
  const nomeProfessora = estado?.professora?.nome || '';
  const slugTurma = nomeTurma.toLowerCase().replace(/\s+/g, '-');

  // ── Cabeçalho ──────────────────────────────────────────────
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, PW, HEADER_H, 'F');

  // Logo placeholder
  doc.setFillColor(255, 255, 255, 0.25);
  doc.setDrawColor(255, 255, 255);
  doc.roundedRect(MARGEM, 3, 12, 12, 2, 2, 'S');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('COLIBRI', MARGEM + 1.5, 10.5);

  // Título central
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const titulo = `PLANEJAMENTO MENSAL — ${nomeMes} ${plano.ano}`;
  doc.text(titulo, PW / 2, 11, { align: 'center' });

  // Turma + professora direita
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const labelDireita = nomeProfessora
    ? `${nomeTurma} — ${nomeProfessora}`
    : nomeTurma;
  doc.text(labelDireita, PW - MARGEM, 8, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(new Date().toLocaleDateString('pt-BR'), PW - MARGEM, 14, { align: 'right' });

  // ── Tabela ─────────────────────────────────────────────────
  const tableTop = HEADER_H + 2;
  const tableH = PH - tableTop - MARGEM;   // espaço disponível
  const rowH = tableH / 4;                 // 4 semanas dividem igualmente

  const body = plano.semanas.map((semana) => {
    const row = [`S${semana.numero}`];
    DIAS.forEach((dia) => {
      const ativ = semana.atividades.find((a) => a.dia_semana === dia);
      row.push(ativ?.conteudo || '');
    });
    return row;
  });

  doc.autoTable({
    startY: tableTop,
    head: [['', ...DIAS_LABEL]],
    body,
    tableWidth: PW - MARGEM * 2,
    margin: { left: MARGEM, right: MARGEM },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      valign: 'top',
      overflow: 'linebreak',
      lineColor: [210, 210, 210],
      lineWidth: 0.3,
      minCellHeight: rowH,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [50, 50, 50],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold',
           fillColor: [r, g, b].map((c) => Math.round(c * 0.15 + 240 * 0.85)),
           textColor: [r, g, b] },
    },
    // Distribuir as 5 colunas de dias igualmente
    didParseCell(data) {
      if (data.column.index > 0) {
        data.cell.styles.cellWidth = (PW - MARGEM * 2 - 10) / 5;
      }
    },
  });

  const nomeArquivo = `planejamento-${slugTurma || 'colibri'}-${plano.mes}-${plano.ano}.pdf`;
  doc.save(nomeArquivo);
}

function hexParaRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)]
    : [249, 115, 22];
}
