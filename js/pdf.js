async function gerarPDF(planejamentoId) {
  const plano = await buscarPlanejamento(planejamentoId);
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const PW = doc.internal.pageSize.getWidth();   // 297
  const PH = doc.internal.pageSize.getHeight();  // 210
  const MARGEM    = 10;
  const HEADER_H  = 12;
  const COL_SEM   = 8;    // largura da coluna S1/S2...
  const HEAD_ROW  = 8;    // altura da linha de cabeçalho da tabela

  const [r, g, b] = hexParaRgb(plano.cor || '#F97316');

  const DIAS       = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const DIAS_LABEL = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];

  const nomeMes = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
  ][plano.mes - 1];

  const nomeTurma      = plano.turmas?.nome || '';
  const nomeProfessora = estado?.professora?.nome || '';
  const slugTurma      = nomeTurma.toLowerCase().replace(/\s+/g, '-');

  // ── Cabeçalho ────────────────────────────────────────────────
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, PW, HEADER_H, 'F');
  doc.setTextColor(255, 255, 255);

  // Logo placeholder
  doc.setDrawColor(255, 255, 255);
  doc.roundedRect(MARGEM, 2, 8, 8, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.text('COLIBRI', MARGEM + 0.8, 7);

  // Título central
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`PLANEJAMENTO MENSAL — ${nomeMes} ${plano.ano}`, PW / 2, 8, { align: 'center' });

  // Turma + professora direita
  const labelDireita = nomeProfessora ? `${nomeTurma} — ${nomeProfessora}` : nomeTurma;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(labelDireita, PW - MARGEM, 6, { align: 'right' });
  doc.text(new Date().toLocaleDateString('pt-BR'), PW - MARGEM, 10.5, { align: 'right' });

  // ── Tabela ───────────────────────────────────────────────────
  const tableTop      = HEADER_H + 1;
  const alturaDisponivel = PH - 16 - 16;
  const bodyRowH      = alturaDisponivel / 4;
  const colDiaW       = (PW - MARGEM * 2 - COL_SEM) / 5;

  const body = plano.semanas.map((semana) => {
    const row = [`S${semana.numero}`];
    DIAS.forEach((dia) => {
      const ativ = semana.atividades.find((a) => a.dia_semana === dia);
      row.push(ativ?.conteudo || '');
    });
    return row;
  });

  doc.autoTable({
    didParseCell(data) {
      if (data.section === 'body' && data.column.index > 0) {
        data.cell.styles.fontSize = calcularFonte(data.cell.raw, colDiaW, bodyRowH);
      }
    },
    startY: tableTop,
    head: [['', ...DIAS_LABEL]],
    body,
    tableWidth: PW - MARGEM * 2,
    margin: { left: MARGEM, right: MARGEM, top: tableTop, bottom: MARGEM },
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 2,
      valign: 'top',
      overflow: 'linebreak',
      lineColor: [210, 210, 210],
      lineWidth: 0.25,
      minCellHeight: bodyRowH,
    },
    headStyles: {
      fillColor: [235, 235, 235],
      textColor: [60, 60, 60],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      minCellHeight: HEAD_ROW,
      cellPadding: 2,
    },
    columnStyles: {
      0: {
        cellWidth: COL_SEM,
        halign: 'center',
        fontStyle: 'bold',
        fillColor: [r, g, b].map((c) => Math.round(c * 0.12 + 243 * 0.88)),
        textColor: [r, g, b],
        fontSize: 7,
      },
      1: { cellWidth: colDiaW },
      2: { cellWidth: colDiaW },
      3: { cellWidth: colDiaW },
      4: { cellWidth: colDiaW },
      5: { cellWidth: colDiaW },
    },
  });

  const nomeArquivo = `planejamento-${slugTurma || 'colibri'}-${plano.mes}-${plano.ano}.pdf`;
  doc.save(nomeArquivo);
}

function calcularFonte(texto, larguraCelula, alturaCelula) {
  if (!texto) return 8;
  const chars = texto.length;
  if (chars < 50)  return 8;
  if (chars < 100) return 7;
  if (chars < 150) return 6;
  if (chars < 250) return 5;
  return 4;
}

function hexParaRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)]
    : [249, 115, 22];
}
