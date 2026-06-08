const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Calendário do Histórico — foco em planejamentos (granularidade mensal)
function renderizarCalendario(container, mes, ano, planejamentos = [], eventos = []) {
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const totalDias = new Date(ano, mes, 0).getDate();
  const hoje = new Date();

  // Planejamentos são mensais: se há plano, todos os dias do mês recebem a bolinha
  const coresPlanejamento = planejamentos.map((p) => p.cor || '#F97316');
  const temPlano = coresPlanejamento.length > 0;
  const corPrincipal = coresPlanejamento[0] || '#F97316';

  const cabecalho = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    .map((d) => `<div class="cal-dia-semana">${d}</div>`)
    .join('');

  let celulas = '';
  for (let i = 0; i < primeiroDia; i++) {
    celulas += '<div class="cal-dia vazio"></div>';
  }

  for (let d = 1; d <= totalDias; d++) {
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ehHoje = d === hoje.getDate() && mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();

    let classes = 'cal-dia';
    if (ehHoje) classes += ' hoje';
    if (temPlano) classes += ' tem-plano clicavel';

    const bolinhaPlano = temPlano
      ? `<span class="cal-ponto" style="background:${corPrincipal}"></span>`
      : '';

    celulas += `<div class="${classes}" data-data="${dataStr}"
      ${temPlano ? `style="--cor-plano:${corPrincipal}"` : ''}>
      <span>${d}</span>
      ${bolinhaPlano}
    </div>`;
  }

  container.innerHTML = `
    <div class="cal-cabecalho">${cabecalho}</div>
    <div class="cal-dias">${celulas}</div>
  `;

  // Clicar em qualquer dia com plano rola até a lista de planos
  if (temPlano) {
    container.querySelectorAll('.cal-dia.tem-plano').forEach((cel) => {
      cel.addEventListener('click', () => {
        const listaMes = document.getElementById('lista-mes');
        if (listaMes) listaMes.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
}
