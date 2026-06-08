// Estado global da aplicação
const estado = {
  sessao: null,
  professora: null,
  planejamentoAtual: null,
  mesCalendario: new Date().getMonth() + 1,
  anoCalendario: new Date().getFullYear(),
};

// --- Inicialização ---

document.addEventListener('DOMContentLoaded', async () => {
  registrarServiceWorker();
  configurarNavegacao();
  configurarFormLogin();
  configurarFormNovoPlano();
  configurarFormEvento();
  configurarBotaoLogout();

  const sessao = await getSession();
  if (sessao) {
    await entrarNoApp(sessao);
  }

  onAuthChange(async (sessao) => {
    if (sessao) {
      await entrarNoApp(sessao);
    } else {
      sairDoApp();
    }
  });
});

function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

// --- Auth flow ---

async function entrarNoApp(sessao) {
  estado.sessao = sessao;
  estado.professora = await buscarProfessora(sessao.user.id);

  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('app-shell').classList.remove('hidden');

  atualizarSaudacao();
  navegarPara('home');
  carregarHome();
}

function sairDoApp() {
  estado.sessao = null;
  estado.professora = null;
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('screen-login').classList.add('active');
}

function atualizarSaudacao() {
  const hora = new Date().getHours();
  let saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = estado.professora?.nome || '';
  document.getElementById('txt-saudacao').textContent = `${saudacao},`;
  document.getElementById('txt-nome-professora').textContent = nome;
}

// --- Navegação ---

function configurarNavegacao() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => navegarPara(btn.dataset.screen));
  });

  document.getElementById('btn-voltar-novo').addEventListener('click', () => navegarPara('home'));
  document.getElementById('btn-voltar-editor').addEventListener('click', () => navegarPara('home'));
  document.getElementById('btn-novo-plano').addEventListener('click', () => navegarPara('novo'));

  document.getElementById('btn-mes-ant').addEventListener('click', () => {
    estado.mesCalendario--;
    if (estado.mesCalendario < 1) { estado.mesCalendario = 12; estado.anoCalendario--; }
    carregarHistorico();
  });
  document.getElementById('btn-mes-prox').addEventListener('click', () => {
    estado.mesCalendario++;
    if (estado.mesCalendario > 12) { estado.mesCalendario = 1; estado.anoCalendario++; }
    carregarHistorico();
  });
}

function navegarPara(screenId) {
  document.querySelectorAll('#app-shell .screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(`screen-${screenId}`).classList.add('active');

  const navsComBotao = ['home', 'historico', 'novo', 'agenda'];
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.screen === screenId);
  });

  // Carrega dados ao entrar na tela
  if (screenId === 'home') carregarHome();
  if (screenId === 'historico') carregarHistorico();
  if (screenId === 'novo') carregarFormNovoPlano();
  if (screenId === 'agenda') carregarAgenda();
}

// --- Home ---

async function carregarHome() {
  if (!estado.professora) return;
  try {
    const [planos, turmas] = await Promise.all([
      listarPlanejamentos(estado.professora.id),
      listarTurmas(),
    ]);

    document.getElementById('stat-planos').textContent = planos.length;
    document.getElementById('stat-turmas').textContent = turmas.length;

    renderizarListaRecentes(planos.slice(0, 5));
  } catch (err) {
    console.error('Erro ao carregar home:', err);
  }
}

function renderizarListaRecentes(planos) {
  const container = document.getElementById('lista-recentes');
  if (!planos.length) {
    container.innerHTML = '<p class="empty-state">Nenhum planejamento ainda.<br>Crie o seu primeiro!</p>';
    return;
  }

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  container.innerHTML = planos.map((p) => `
    <div class="card-plano" data-id="${p.id}" style="--cor-plano: ${p.cor}">
      <div class="card-plano-cor"></div>
      <div class="card-plano-info">
        <span class="card-plano-turma">${p.turmas?.emoji || ''} ${p.turmas?.nome || ''}</span>
        <span class="card-plano-mes">${meses[p.mes - 1]} ${p.ano}</span>
      </div>
      <span class="badge-status ${p.status}">${p.status === 'concluido' ? 'Concluído' : 'Rascunho'}</span>
    </div>
  `).join('');

  container.querySelectorAll('.card-plano').forEach((card) => {
    card.addEventListener('click', () => abrirEditor(card.dataset.id));
  });
}

// --- Histórico ---

async function carregarHistorico() {
  const { mesCalendario: mes, anoCalendario: ano } = estado;
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('txt-mes-ano').textContent = `${meses[mes - 1]} ${ano}`;

  if (!estado.professora) return;
  try {
    const [planejamentos, eventos] = await Promise.all([
      listarPlanejamentosMes(estado.professora.id, mes, ano),
      listarEventosMes(estado.professora.id, mes, ano),
    ]);

    renderizarCalendario(
      document.getElementById('calendario-grid'),
      mes, ano, planejamentos, eventos
    );

    renderizarListaMes(planejamentos);
  } catch (err) {
    console.error('Erro ao carregar histórico:', err);
  }
}

function renderizarListaMes(planos) {
  const container = document.getElementById('lista-mes');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  if (!planos.length) {
    container.innerHTML = '<p class="empty-state">Nenhum plano neste mês.</p>';
    return;
  }
  container.innerHTML = planos.map((p) => `
    <div class="card-plano" data-id="${p.id}" style="--cor-plano: ${p.cor}">
      <div class="card-plano-cor"></div>
      <div class="card-plano-info">
        <span class="card-plano-turma">${p.turmas?.emoji || ''} ${p.turmas?.nome || ''}</span>
        <span class="card-plano-mes">${meses[p.mes - 1]} ${p.ano}</span>
      </div>
      <span class="badge-status ${p.status}">${p.status === 'concluido' ? 'Concluído' : 'Rascunho'}</span>
    </div>
  `).join('');
  container.querySelectorAll('.card-plano').forEach((card) => {
    card.addEventListener('click', () => abrirEditor(card.dataset.id));
  });
}

// --- Novo Planejamento ---

async function carregarFormNovoPlano() {
  try {
    const turmas = await listarTurmas();
    const container = document.getElementById('chips-turmas');
    if (!turmas.length) {
      container.innerHTML = '<p class="muted-txt">Nenhuma turma cadastrada no Supabase.</p>';
      return;
    }
    container.innerHTML = turmas.map((t) => `
      <button type="button" class="chip-turma" data-id="${t.id}" style="--chip-cor: ${t.cor}">
        <span>${t.emoji}</span> ${t.nome}
      </button>
    `).join('');

    container.querySelectorAll('.chip-turma').forEach((chip) => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.chip-turma').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        document.getElementById('input-turma-id').value = chip.dataset.id;
      });
    });
  } catch (err) {
    console.error('Erro ao carregar turmas:', err);
  }

  // Pré-seleciona mês atual
  document.getElementById('input-mes').value = new Date().getMonth() + 1;
}

function configurarFormNovoPlano() {
  // Seleção de cor
  document.querySelectorAll('.chip-cor').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip-cor').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      document.getElementById('input-cor').value = chip.dataset.cor;
    });
  });

  document.getElementById('form-novo-plano').addEventListener('submit', async (e) => {
    e.preventDefault();
    const turmaId = document.getElementById('input-turma-id').value;
    if (!turmaId) {
      mostrarErro('novo-erro', 'Selecione uma turma.');
      return;
    }
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Criando...';
    try {
      const plano = await criarPlanejamento({
        professoraId: estado.professora.id,
        turmaId,
        mes: parseInt(document.getElementById('input-mes').value),
        ano: parseInt(document.getElementById('input-ano').value),
        cor: document.getElementById('input-cor').value,
      });
      await abrirEditor(plano.id);
    } catch (err) {
      mostrarErro('novo-erro', 'Erro ao criar planejamento: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Criar Planejamento';
    }
  });
}

// --- Editor ---

async function abrirEditor(planejamentoId) {
  try {
    const plano = await buscarPlanejamento(planejamentoId);
    estado.planejamentoAtual = plano;

    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    document.getElementById('editor-titulo').textContent = `${plano.turmas?.nome || ''}`;
    document.getElementById('editor-subtitulo').textContent = `${meses[plano.mes - 1]} ${plano.ano}`;

    renderizarEditor(plano);
    navegarPara('editor');
  } catch (err) {
    console.error('Erro ao abrir editor:', err);
  }
}

function renderizarEditor(plano) {
  const abas = document.getElementById('semanas-abas');
  const conteudo = document.getElementById('semanas-conteudo');

  abas.innerHTML = plano.semanas.map((s, i) => `
    <button class="aba-semana ${i === 0 ? 'active' : ''}" data-semana="${i}">
      Semana ${s.numero}
    </button>
  `).join('');

  conteudo.innerHTML = plano.semanas.map((semana, i) => `
    <div class="semana-painel ${i === 0 ? 'active' : ''}" data-semana="${i}">
      ${semana.atividades.map((ativ) => `
        <div class="card-dia">
          <label class="dia-label">${formatarDiaSemana(ativ.dia_semana)}</label>
          <textarea
            class="textarea-atividade"
            data-id="${ativ.id}"
            placeholder="Atividades de ${formatarDiaSemana(ativ.dia_semana)}..."
            rows="4"
          >${ativ.conteudo || ''}</textarea>
        </div>
      `).join('')}
    </div>
  `).join('');

  // Navegação entre abas
  abas.querySelectorAll('.aba-semana').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.semana;
      abas.querySelectorAll('.aba-semana').forEach((b) => b.classList.remove('active'));
      conteudo.querySelectorAll('.semana-painel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      conteudo.querySelector(`[data-semana="${idx}"]`).classList.add('active');
    });
  });

  // Autosave com debounce
  const txtSalvo = document.getElementById('txt-salvo');
  conteudo.querySelectorAll('.textarea-atividade').forEach((textarea) => {
    textarea.addEventListener('input', () => {
      txtSalvo.classList.add('hidden');
      salvarAtividadeDebounce(textarea.dataset.id, textarea.value, () => {
        txtSalvo.classList.remove('hidden');
        setTimeout(() => txtSalvo.classList.add('hidden'), 2000);
      });
    });
  });

  // Exportar PDF
  document.getElementById('btn-exportar-pdf').onclick = () => gerarPDF(plano.id);
}

function formatarDiaSemana(dia) {
  const map = { segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta' };
  return map[dia] || dia;
}

// --- Agenda ---

async function carregarAgenda() {
  if (!estado.professora) return;
  try {
    const eventos = await listarEventosFuturos(estado.professora.id);
    renderizarAgenda(eventos);
  } catch (err) {
    console.error('Erro ao carregar agenda:', err);
  }

  document.getElementById('fab-novo-evento').onclick = () => abrirModalEvento();
}

function renderizarAgenda(eventos) {
  const container = document.getElementById('lista-eventos');
  if (!eventos.length) {
    container.innerHTML = '<p class="empty-state">Nenhum compromisso futuro.</p>';
    return;
  }

  const grupos = agruparEventosPorData(eventos);
  container.innerHTML = Object.entries(grupos).map(([data, evs]) => `
    <div class="grupo-data">
      <h4 class="data-label">${formatarDataExibicao(data)}</h4>
      ${evs.map((ev) => `
        <div class="card-evento" style="--ev-cor: ${CORES_CATEGORIA[ev.categoria] || '#9CA3AF'}">
          <div class="ev-barra"></div>
          <div class="ev-info">
            <span class="ev-titulo">${ev.titulo}</span>
            <span class="ev-meta">
              ${ev.hora_inicio ? ev.hora_inicio.slice(0,5) : ''}
              ${ev.local ? '· ' + ev.local : ''}
            </span>
          </div>
          <button class="btn-deletar-ev" data-id="${ev.id}" title="Remover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      `).join('')}
    </div>
  `).join('');

  container.querySelectorAll('.btn-deletar-ev').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Remover este evento?')) return;
      await deletarEvento(btn.dataset.id);
      carregarAgenda();
    });
  });
}

function abrirModalEvento() {
  const modal = document.getElementById('modal-evento');
  document.getElementById('form-evento').reset();
  document.getElementById('ev-categoria').value = 'reuniao';
  document.querySelectorAll('.chip-cat').forEach((c) => c.classList.remove('active'));
  document.querySelector('.chip-cat[data-cat="reuniao"]').classList.add('active');
  modal.classList.remove('hidden');
}

function configurarFormEvento() {
  document.querySelectorAll('.chip-cat').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip-cat').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      document.getElementById('ev-categoria').value = chip.dataset.cat;
    });
  });

  document.getElementById('btn-fechar-modal').addEventListener('click', () => {
    document.getElementById('modal-evento').classList.add('hidden');
  });

  document.getElementById('modal-evento').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-evento')) {
      document.getElementById('modal-evento').classList.add('hidden');
    }
  });

  document.getElementById('form-evento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      await criarEvento({
        professoraId: estado.professora.id,
        titulo: document.getElementById('ev-titulo').value,
        categoria: document.getElementById('ev-categoria').value,
        data: document.getElementById('ev-data').value,
        horaInicio: document.getElementById('ev-hora-inicio').value,
        horaFim: document.getElementById('ev-hora-fim').value,
        local: document.getElementById('ev-local').value,
        observacao: document.getElementById('ev-obs').value,
      });
      document.getElementById('modal-evento').classList.add('hidden');
      carregarAgenda();
    } catch (err) {
      alert('Erro ao salvar evento: ' + err.message);
      btn.disabled = false;
    }
  });
}

// --- Login ---

function configurarFormLogin() {
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    ocultarErro('login-erro');
    try {
      await login(
        document.getElementById('input-email').value,
        document.getElementById('input-senha').value
      );
    } catch (err) {
      mostrarErro('login-erro', 'E-mail ou senha incorretos.');
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}

function configurarBotaoLogout() {
  document.getElementById('btn-logout').addEventListener('click', async () => {
    if (!confirm('Sair da conta?')) return;
    await logout();
  });
}

// --- Utilitários ---

function mostrarErro(idElemento, mensagem) {
  const el = document.getElementById(idElemento);
  el.textContent = mensagem;
  el.classList.remove('hidden');
}

function ocultarErro(idElemento) {
  document.getElementById(idElemento).classList.add('hidden');
}
