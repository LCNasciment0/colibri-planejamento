const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Calendário do Histórico — marca o mês inteiro com fundo leve quando há planejamento
// Cada dia fica com fundo da cor do planejamento; sem bolinha em cada célula
function renderizarCalendario(container, mes, ano, planejamentos = [], eventos = []) {
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const totalDias = new Date(ano, mes, 0).getDate();
  const hoje = new Date();
  const semanaAtual = obterNumeroSemana(hoje);

  const temPlano = planejamentos.length > 0;
  const corPrincipal = planejamentos[0]?.cor || '#F97316';

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
    const dataCelula = new Date(ano, mes - 1, d);
    const semanaDestaDia = obterNumeroSemana(dataCelula);
    const ehSemanaAtual = semanaDestaDia === semanaAtual
      && dataCelula.getFullYear() === hoje.getFullYear();

    let classes = 'cal-dia';
    if (ehHoje) classes += ' hoje';
    if (temPlano && ehSemanaAtual && mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()) {
      classes += ' semana-atual';
    }

    const estiloCelula = temPlano
      ? `style="background: color-mix(in srgb, ${corPrincipal} 8%, white)"`
      : '';

    celulas += `<div class="${classes}" ${estiloCelula} data-data="${dataStr}">
      <span>${d}</span>
    </div>`;
  }

  container.innerHTML = `
    <div class="cal-cabecalho">${cabecalho}</div>
    <div class="cal-dias">${celulas}</div>
  `;

  // Clicar em qualquer dia rola até a lista de planos abaixo
  if (temPlano) {
    container.querySelectorAll('.cal-dia:not(.vazio)').forEach((cel) => {
      cel.style.cursor = 'pointer';
      cel.addEventListener('click', () => {
        const listaMes = document.getElementById('lista-mes');
        if (listaMes) listaMes.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
}

function obterNumeroSemana(data) {
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
