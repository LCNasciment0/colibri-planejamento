const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function renderizarCalendario(container, mes, ano, planejamentos = [], eventos = []) {
  const diasComPlano = new Set(
    planejamentos.map((p) => `${p.ano}-${p.mes}`)
  );

  const diasComEvento = new Set(
    eventos.map((e) => e.data)
  );

  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const totalDias = new Date(ano, mes, 0).getDate();

  const cabecalho = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    .map((d) => `<div class="cal-dia-semana">${d}</div>`)
    .join('');

  let celulas = '';
  for (let i = 0; i < primeiroDia; i++) {
    celulas += '<div class="cal-dia vazio"></div>';
  }

  const hoje = new Date();
  for (let d = 1; d <= totalDias; d++) {
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ehHoje = d === hoje.getDate() && mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
    const temEvento = diasComEvento.has(dataStr);

    let classes = 'cal-dia';
    if (ehHoje) classes += ' hoje';
    if (temEvento) classes += ' tem-evento';

    celulas += `
      <div class="${classes}" data-data="${dataStr}">
        <span>${d}</span>
        ${temEvento ? '<span class="cal-ponto"></span>' : ''}
      </div>`;
  }

  container.innerHTML = `
    <div class="cal-cabecalho">${cabecalho}</div>
    <div class="cal-dias">${celulas}</div>
  `;
}
