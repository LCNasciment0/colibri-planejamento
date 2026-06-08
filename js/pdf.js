async function gerarPDF(planejamentoId) {
  const plano = await buscarPlanejamento(planejamentoId);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const largura = doc.internal.pageSize.getWidth();
  const DIAS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const DIAS_LABEL = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  const cor = plano.cor || '#F97316';
  const [r, g, b] = hexParaRgb(cor);

  const nomeMes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ][plano.mes - 1];

  // Cabeçalho
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, largura, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Colibri Planejamento', 10, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${plano.turmas?.emoji || ''} ${plano.turmas?.nome || ''} — ${nomeMes} ${plano.ano}`, 10, 18);

  // Tabela de semanas
  const colX = [10, 58, 106, 154, 202, 250];
  const alturaLinha = 10;
  let y = 28;

  plano.semanas.forEach((semana) => {
    // Cabeçalho da semana
    doc.setFillColor(r, g, b);
    doc.setFillColor(r * 0.85, g * 0.85, b * 0.85);
    doc.rect(10, y, largura - 20, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Semana ${semana.numero}`, 12, y + 5);

    // Dias da semana
    y += 7;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    DIAS_LABEL.forEach((label, i) => {
      doc.setFillColor(245, 245, 245);
      doc.rect(colX[i], y, 46, 6, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(colX[i], y, 46, 6);
      doc.text(label, colX[i] + 2, y + 4);
    });

    // Conteúdo dos dias
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const alturaConteudo = 20;
    semana.atividades.forEach((ativ) => {
      const idx = DIAS.indexOf(ativ.dia_semana);
      if (idx < 0) return;
      doc.setDrawColor(220, 220, 220);
      doc.rect(colX[idx], y, 46, alturaConteudo);
      const linhas = doc.splitTextToSize(ativ.conteudo || '', 44);
      doc.text(linhas, colX[idx] + 1, y + 4);
    });
    y += alturaConteudo + 3;
  });

  doc.save(`planejamento-${nomeMes}-${plano.ano}.pdf`);
}

function hexParaRgb(hex) {
  const resultado = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return resultado
    ? [parseInt(resultado[1], 16), parseInt(resultado[2], 16), parseInt(resultado[3], 16)]
    : [249, 115, 22];
}
