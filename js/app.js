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
  configurarFormCadastro();
  configurarFormNovoPlano();
  configurarFormEvento();
  configurarBotaoLogout();
  configurarModalCelula();
  configurarToggleAgenda();

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
  iniciarHeaderDinamico();
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
  const nomeCompleto = estado.professora?.nome || '';
  const primeiroNome = nomeCompleto.split(' ')[0] || nomeCompleto;
  const iniciais = estado.professora?.initials ||
    nomeCompleto.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

  const elSaudacao = document.getElementById('txt-saudacao-home');
  if (elSaudacao) elSaudacao.textContent = `${saudacao}, ${primeiroNome}!`;

  const elAvatar = document.getElementById('home-avatar-iniciais');
  if (elAvatar) elAvatar.textContent = iniciais;
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
    const [planos, turmas, totalEventos] = await Promise.all([
      listarPlanejamentos(estado.professora.id),
      listarTurmas(),
      contarEventos(estado.professora.id),
    ]);

    document.getElementById('stat-planos').textContent = planos.length;
    document.getElementById('stat-turmas').textContent = turmas.length;
    document.getElementById('stat-eventos').textContent = totalEventos;

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
    <div class="card-recente" data-id="${p.id}" style="--cor-plano: ${p.cor || '#F97316'}">
      <div class="card-recente-top">
        <span class="badge-status ${p.status}">${p.status === 'concluido' ? 'Concluído' : 'Em edição'}</span>
      </div>
      <span class="card-recente-mes">${meses[p.mes - 1]} ${p.ano}</span>
      <span class="card-recente-turma">${p.turmas?.nome || ''}</span>
    </div>
  `).join('');

  container.querySelectorAll('.card-recente').forEach((card) => {
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
        <span class="card-plano-turma">${p.turmas?.nome || ''}</span>
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
  document.getElementById('input-mes').value = new Date().getMonth() + 1;
  try {
    const turmas = await listarTurmas();
    renderizarChipsTurmas(turmas);
  } catch (err) {
    console.error('Erro ao carregar turmas:', err);
  }
}

function renderizarChipsTurmas(turmas, idParaSelecionar = null) {
  const container = document.getElementById('chips-turmas');

  const chipsHtml = turmas.map((t) => `
    <button type="button" class="chip-turma" data-id="${t.id}" style="--chip-cor: ${t.cor || '#F97316'}">
      ${t.nome}
    </button>
  `).join('');

  container.innerHTML = `
    ${chipsHtml}
    <div id="nova-turma-inline" class="${turmas.length ? 'hidden' : ''}">
      <div class="nova-turma-form">
        <input type="text" id="input-nova-turma" placeholder="Nome da turma (ex: Maternal 2)" maxlength="40">
        <button type="button" id="btn-confirmar-turma" class="btn-confirmar-turma" title="Confirmar">✓</button>
      </div>
    </div>
    ${turmas.length ? `<button type="button" id="btn-mostrar-nova-turma" class="btn-link-turma">＋ Nova turma</button>` : ''}
  `;

  // Seleção de chip
  container.querySelectorAll('.chip-turma').forEach((chip) => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.chip-turma').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      document.getElementById('input-turma-id').value = chip.dataset.id;
    });
  });

  // Auto-seleciona turma recém-criada
  if (idParaSelecionar) {
    const alvo = container.querySelector(`[data-id="${idParaSelecionar}"]`);
    if (alvo) {
      alvo.classList.add('active');
      document.getElementById('input-turma-id').value = idParaSelecionar;
    }
  }

  // Mostra campo inline
  const btnMostrar = document.getElementById('btn-mostrar-nova-turma');
  if (btnMostrar) {
    btnMostrar.addEventListener('click', () => {
      document.getElementById('nova-turma-inline').classList.remove('hidden');
      document.getElementById('input-nova-turma').focus();
      btnMostrar.classList.add('hidden');
    });
  }

  // Confirma nova turma
  document.getElementById('btn-confirmar-turma').addEventListener('click', () => confirmarNovaTurma());
  document.getElementById('input-nova-turma').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmarNovaTurma(); }
  });
}

async function confirmarNovaTurma() {
  const input = document.getElementById('input-nova-turma');
  const nome = input.value.trim();
  if (!nome) { input.focus(); return; }

  const btn = document.getElementById('btn-confirmar-turma');
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const turma = await criarTurma(nome, estado.professora.id);
    const turmas = await listarTurmas();
    renderizarChipsTurmas(turmas, turma.id);
  } catch (err) {
    mostrarErro('novo-erro', 'Erro ao criar turma: ' + err.message);
    btn.disabled = false;
    btn.textContent = '✓';
  }
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
  // Toggle de modo
  const toggleEditor = document.getElementById('toggle-editor');
  toggleEditor.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleEditor.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.modo === 'grade') {
        renderizarGradeEditor(plano);
      } else {
        renderizarListaEditor(plano);
      }
    });
  });

  // Inicia no modo lista
  toggleEditor.querySelector('[data-modo="lista"]').classList.add('active');
  toggleEditor.querySelector('[data-modo="grade"]').classList.remove('active');
  renderizarListaEditor(plano);

  // Exportar PDF
  document.getElementById('btn-exportar-pdf').onclick = () => gerarPDF(plano.id);
}

function renderizarListaEditor(plano) {
  const abas = document.getElementById('semanas-abas');
  const conteudo = document.getElementById('semanas-conteudo');
  abas.classList.remove('hidden');

  abas.innerHTML = plano.semanas.map((s, i) => `
    <button class="aba-semana ${i === 0 ? 'active' : ''}" data-semana="${i}" data-semana-id="${s.id}">
      Semana ${s.numero}
    </button>
  `).join('');

  conteudo.innerHTML = plano.semanas.map((semana, i) => `
    <div class="semana-painel ${i === 0 ? 'active' : ''}" data-semana="${i}" data-semana-num="${semana.numero}">
      ${semana.atividades.map((ativ) => `
        <div class="card-dia">
          <label class="dia-label">${formatarDiaSemana(ativ.dia_semana)}</label>
          <textarea
            class="textarea-atividade"
            data-id="${ativ.id}"
            data-original="${escapeHtml(ativ.conteudo || '')}"
            placeholder="Atividades de ${formatarDiaSemana(ativ.dia_semana)}..."
            rows="4"
          >${ativ.conteudo || ''}</textarea>
          <button class="btn-salvar-dia" data-id="${ativ.id}">💾 Salvar</button>
        </div>
      `).join('')}
    </div>
  `).join('');

  // Registra botões salvar por dia
  conteudo.querySelectorAll('.btn-salvar-dia').forEach((btn) => {
    btn.addEventListener('click', () => salvarDia(btn));
  });

  // Marca textarea como alterado
  conteudo.querySelectorAll('.textarea-atividade').forEach((textarea) => {
    textarea.addEventListener('input', () => {
      textarea.dataset.alterado = textarea.value !== textarea.dataset.original ? '1' : '';
    });
  });

  // Navegação entre abas com verificação de não salvos
  abas.querySelectorAll('.aba-semana').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idxAtivo = conteudo.querySelector('.semana-painel.active')?.dataset.semana;
      const numAtivo = conteudo.querySelector('.semana-painel.active')?.dataset.semanaNum;

      // Checa não salvos no painel atual
      if (idxAtivo !== undefined) {
        const naoSalvos = conteudo.querySelectorAll(
          `.semana-painel[data-semana="${idxAtivo}"] .textarea-atividade[data-alterado="1"]`
        );
        if (naoSalvos.length) {
          const confirmar = confirm(
            `Você tem alterações não salvas na Semana ${numAtivo}.\nDeseja continuar sem salvar?`
          );
          if (!confirmar) return;
          // Descarta marcação de alterado
          naoSalvos.forEach((t) => { t.dataset.alterado = ''; });
        }
      }

      const novoIdx = btn.dataset.semana;
      const semanaId = btn.dataset.semanaId;

      // Troca visual imediata
      abas.querySelectorAll('.aba-semana').forEach((b) => b.classList.remove('active'));
      conteudo.querySelectorAll('.semana-painel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const painel = conteudo.querySelector(`[data-semana="${novoIdx}"]`);
      painel.classList.add('active');

      // Recarrega dados frescos do Supabase para essa semana
      try {
        const atividades = await buscarAtividadesSemana(semanaId);
        painel.querySelectorAll('.textarea-atividade').forEach((ta) => {
          const ativ = atividades.find((a) => a.id === ta.dataset.id);
          if (ativ) {
            ta.value = ativ.conteudo || '';
            ta.dataset.original = escapeHtml(ativ.conteudo || '');
            ta.dataset.alterado = '';
          }
        });
      } catch (err) {
        console.error('Erro ao recarregar semana:', err);
      }
    });
  });
}

async function salvarDia(btn) {
  const atividadeId = btn.dataset.id;
  const textarea = btn.closest('.card-dia').querySelector('.textarea-atividade');
  const novoConteudo = textarea.value;

  btn.disabled = true;
  btn.textContent = 'Salvando...';
  btn.className = 'btn-salvar-dia salvando';

  try {
    await salvarAtividade(atividadeId, novoConteudo);
    textarea.dataset.original = escapeHtml(novoConteudo);
    textarea.dataset.alterado = '';
    btn.textContent = '✅ Salvo!';
    btn.className = 'btn-salvar-dia salvo';
    setTimeout(() => {
      btn.textContent = '💾 Salvar';
      btn.className = 'btn-salvar-dia';
      btn.disabled = false;
    }, 2000);
  } catch (err) {
    btn.textContent = '❌ Erro — tentar novamente';
    btn.className = 'btn-salvar-dia erro';
    btn.disabled = false;
    console.error('Erro ao salvar atividade:', err);
  }
}

function renderizarGradeEditor(plano) {
  const abas = document.getElementById('semanas-abas');
  const conteudo = document.getElementById('semanas-conteudo');
  abas.classList.add('hidden');

  const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const labelDias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

  const linhas = plano.semanas.map((semana) => {
    const celulas = dias.map((dia) => {
      const ativ = semana.atividades.find((a) => a.dia_semana === dia);
      const temConteudo = ativ?.conteudo?.trim();
      const resumoHtml = temConteudo
        ? `<span class="grade-resumo">${escapeHtml(ativ.conteudo)}</span>`
        : `<span class="grade-vazia">+</span>`;
      return `<td class="grade-celula" data-id="${ativ?.id || ''}" data-semana="${semana.numero}" data-dia="${dia}">${resumoHtml}</td>`;
    }).join('');
    return `<tr><th class="grade-semana-label">S${semana.numero}</th>${celulas}</tr>`;
  }).join('');

  const cabecalho = labelDias.map((l) => `<th class="grade-cabecalho">${l}</th>`).join('');

  conteudo.innerHTML = `
    <div class="grade-wrapper">
      <table class="grade-mensal">
        <colgroup>
          <col class="col-semana">
          ${dias.map(() => '<col>').join('')}
        </colgroup>
        <thead><tr><th></th>${cabecalho}</tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;

  conteudo.querySelectorAll('.grade-celula').forEach((celula) => {
    celula.addEventListener('click', () => abrirModalCelula(celula, plano));
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function abrirModalCelula(celula, plano) {
  const atividadeId = celula.dataset.id;
  const dia = celula.dataset.dia;
  const semanaNum = celula.dataset.semana;
  const labelDia = { segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta' }[dia];

  let conteudoAtual = '';
  plano.semanas.forEach((s) => {
    if (String(s.numero) === String(semanaNum)) {
      const a = s.atividades.find((av) => av.dia_semana === dia);
      if (a) conteudoAtual = a.conteudo || '';
    }
  });

  document.getElementById('modal-celula-titulo').textContent = `Semana ${semanaNum} · ${labelDia}`;
  document.getElementById('modal-celula-textarea').value = conteudoAtual;
  document.getElementById('modal-celula').classList.remove('hidden');

  document.getElementById('btn-salvar-celula').onclick = async () => {
    const novoConteudo = document.getElementById('modal-celula-textarea').value;
    if (atividadeId) {
      await salvarAtividade(atividadeId, novoConteudo);
      plano.semanas.forEach((s) => {
        if (String(s.numero) === String(semanaNum)) {
          const a = s.atividades.find((av) => av.dia_semana === dia);
          if (a) a.conteudo = novoConteudo;
        }
      });
      const temConteudo = novoConteudo.trim();
      celula.innerHTML = temConteudo
        ? `<span class="grade-resumo">${escapeHtml(novoConteudo)}</span>`
        : `<span class="grade-vazia">+</span>`;
    }
    document.getElementById('modal-celula').classList.add('hidden');
  };
}

function configurarModalCelula() {
  document.getElementById('btn-fechar-celula').addEventListener('click', () => {
    document.getElementById('modal-celula').classList.add('hidden');
  });
  document.getElementById('modal-celula').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-celula')) {
      document.getElementById('modal-celula').classList.add('hidden');
    }
  });
}

function formatarDiaSemana(dia) {
  const map = { segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta' };
  return map[dia] || dia;
}

// --- Agenda ---

async function carregarAgenda() {
  if (!estado.professora) return;

  // Sempre inicia no modo lista ao entrar na tela
  const toggle = document.getElementById('toggle-agenda');
  toggle.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
  toggle.querySelector('[data-modo="lista"]').classList.add('active');
  document.getElementById('agenda-calendario').classList.add('hidden');
  document.getElementById('lista-eventos').classList.remove('hidden');

  try {
    const eventos = await listarEventosFuturos(estado.professora.id);
    renderizarAgenda(eventos);
  } catch (err) {
    console.error('Erro ao carregar agenda:', err);
  }

  document.getElementById('fab-novo-evento').onclick = () => abrirModalEvento();
}

const EMOJI_CATEGORIA = {
  reuniao: '🟣',
  formacao: '🔵',
  escola: '🟠',
  pessoal: '🩷',
  outro: '⚪',
};

function renderizarAgenda(eventos) {
  const container = document.getElementById('lista-eventos');
  if (!eventos.length) {
    container.innerHTML = '<p class="empty-state">Nenhum compromisso futuro.</p>';
    return;
  }

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
  const fimSemana = new Date(hoje); fimSemana.setDate(fimSemana.getDate() + 7);
  const fimMes = new Date(hoje); fimMes.setDate(fimMes.getDate() + 30);

  const buckets = { hoje: [], amanha: [], semana: [], mes: [], depois: [] };

  eventos.forEach((ev) => {
    const [a, m, d] = ev.data.split('-').map(Number);
    const dt = new Date(a, m - 1, d);
    if (dt.getTime() === hoje.getTime()) buckets.hoje.push(ev);
    else if (dt.getTime() === amanha.getTime()) buckets.amanha.push(ev);
    else if (dt < fimSemana) buckets.semana.push(ev);
    else if (dt < fimMes) buckets.mes.push(ev);
    else buckets.depois.push(ev);
  });

  const labels = {
    hoje: 'Hoje',
    amanha: 'Amanhã',
    semana: 'Esta semana',
    mes: 'Próximo mês',
    depois: 'Mais adiante',
  };

  let html = '';
  Object.entries(buckets).forEach(([chave, evs]) => {
    if (!evs.length) return;
    html += `<div class="separador-periodo"><span>${labels[chave]}</span></div>`;
    html += evs.map((ev) => `
      <div class="card-evento" style="--ev-cor: ${CORES_CATEGORIA[ev.categoria] || '#9CA3AF'}">
        <div class="ev-barra"></div>
        <div class="ev-info">
          <span class="ev-titulo">${ev.titulo}</span>
          <span class="ev-meta">
            <span class="ev-cat-badge" style="background:${CORES_CATEGORIA[ev.categoria] || '#9CA3AF'}">${LABELS_CATEGORIA[ev.categoria] || 'Outro'}</span>
            ${ev.hora_inicio ? ev.hora_inicio.slice(0, 5) : 'Dia todo'}
            ${ev.local ? '· ' + ev.local : ''}
          </span>
        </div>
        <button class="btn-deletar-ev" data-id="${ev.id}" title="Remover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    `).join('');
  });

  container.innerHTML = html;

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
    btn.textContent = 'Salvando...';
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
      document.getElementById('form-evento').reset();
      carregarAgenda();
    } catch (err) {
      alert('Erro ao salvar evento: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar';
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

function configurarFormCadastro() {
  document.getElementById('btn-ir-cadastro').addEventListener('click', () => {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-cadastro').classList.remove('hidden');
    ocultarErro('cadastro-erro');
    document.getElementById('cadastro-ok').classList.add('hidden');
  });

  document.getElementById('btn-ir-login').addEventListener('click', () => {
    document.getElementById('form-cadastro').classList.add('hidden');
    document.getElementById('form-login').classList.remove('hidden');
    ocultarErro('login-erro');
  });

  document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarErro('cadastro-erro');
    document.getElementById('cadastro-ok').classList.add('hidden');

    const nome = document.getElementById('cad-nome').value.trim();
    const email = document.getElementById('cad-email').value.trim();
    const senha = document.getElementById('cad-senha').value;
    const senha2 = document.getElementById('cad-senha2').value;

    if (senha !== senha2) {
      mostrarErro('cadastro-erro', 'As senhas não coincidem.');
      return;
    }
    if (senha.length < 6) {
      mostrarErro('cadastro-erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const btn = document.getElementById('btn-cadastrar');
    btn.disabled = true;
    btn.textContent = 'Criando conta...';
    try {
      await fazerCadastro(nome, email, senha);
      document.getElementById('form-cadastro').reset();
      const okMsg = document.getElementById('cadastro-ok');
      okMsg.textContent = 'Conta criada! Faça login para continuar.';
      okMsg.classList.remove('hidden');
    } catch (err) {
      mostrarErro('cadastro-erro', err.message || 'Erro ao criar conta.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Criar conta';
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

// --- Calendário da Agenda ---

const estadoAgendaCal = {
  mes: new Date().getMonth() + 1,
  ano: new Date().getFullYear(),
  eventos: [],
};

function configurarToggleAgenda() {
  const toggle = document.getElementById('toggle-agenda');
  toggle.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggle.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const modoCalendario = btn.dataset.modo === 'calendario';
      document.getElementById('agenda-calendario').classList.toggle('hidden', !modoCalendario);
      document.getElementById('lista-eventos').classList.toggle('hidden', modoCalendario);
      if (modoCalendario) renderizarCalendarioAgenda();
    });
  });

  document.getElementById('btn-agenda-mes-ant').addEventListener('click', () => {
    estadoAgendaCal.mes--;
    if (estadoAgendaCal.mes < 1) { estadoAgendaCal.mes = 12; estadoAgendaCal.ano--; }
    renderizarCalendarioAgenda();
  });
  document.getElementById('btn-agenda-mes-prox').addEventListener('click', () => {
    estadoAgendaCal.mes++;
    if (estadoAgendaCal.mes > 12) { estadoAgendaCal.mes = 1; estadoAgendaCal.ano++; }
    renderizarCalendarioAgenda();
  });
}

async function renderizarCalendarioAgenda() {
  if (!estado.professora) return;
  const { mes, ano } = estadoAgendaCal;
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('txt-agenda-mes-ano').textContent = `${meses[mes - 1]} ${ano}`;

  try {
    const eventos = await listarEventosMes(estado.professora.id, mes, ano);
    estadoAgendaCal.eventos = eventos;

    const eventosPorDia = {};
    eventos.forEach((ev) => {
      if (!eventosPorDia[ev.data]) eventosPorDia[ev.data] = [];
      eventosPorDia[ev.data].push(ev);
    });

    const grid = document.getElementById('agenda-cal-grid');
    renderizarCalendarioAgendaGrid(grid, mes, ano, eventosPorDia);

    // Clique nos dias
    grid.querySelectorAll('.cal-dia:not(.vazio)').forEach((cel) => {
      cel.addEventListener('click', () => {
        const dataStr = cel.dataset.data;
        const evsDia = eventosPorDia[dataStr] || [];
        mostrarDetalheAgendaDia(dataStr, evsDia);
        // Marca selecionado
        grid.querySelectorAll('.cal-dia').forEach((c) => c.classList.remove('selecionado'));
        if (evsDia.length) cel.classList.add('selecionado');
      });
    });

    document.getElementById('agenda-cal-detalhe').classList.add('hidden');
  } catch (err) {
    console.error('Erro ao carregar calendário agenda:', err);
  }
}

function renderizarCalendarioAgendaGrid(container, mes, ano, eventosPorDia) {
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const totalDias = new Date(ano, mes, 0).getDate();
  const hoje = new Date();

  const cabecalho = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    .map((d) => `<div class="cal-dia-semana">${d}</div>`).join('');

  let celulas = '';
  for (let i = 0; i < primeiroDia; i++) celulas += '<div class="cal-dia vazio"></div>';

  for (let d = 1; d <= totalDias; d++) {
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ehHoje = d === hoje.getDate() && mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
    const evsDia = eventosPorDia[dataStr] || [];

    // Uma bolinha por categoria distinta (máx 3)
    const categorias = [...new Set(evsDia.map((ev) => ev.categoria))].slice(0, 3);
    const pontos = categorias.map((cat) =>
      `<span class="cal-ponto-cor" style="background:${CORES_CATEGORIA[cat] || '#9CA3AF'}"></span>`
    ).join('');

    let classes = 'cal-dia';
    if (ehHoje) classes += ' hoje';
    if (evsDia.length) classes += ' tem-evento clicavel';

    celulas += `<div class="${classes}" data-data="${dataStr}">
      <span>${d}</span>
      ${evsDia.length ? `<span class="cal-pontos-wrap">${pontos}</span>` : ''}
    </div>`;
  }

  container.innerHTML = `
    <div class="cal-cabecalho">${cabecalho}</div>
    <div class="cal-dias">${celulas}</div>
  `;
}

function mostrarDetalheAgendaDia(dataStr, eventos) {
  const detalhe = document.getElementById('agenda-cal-detalhe');
  if (!eventos.length) { detalhe.classList.add('hidden'); return; }

  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  const labelData = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  detalhe.innerHTML = `
    <h4 class="detalhe-data-label">${labelData}</h4>
    ${eventos.map((ev) => `
      <div class="card-evento" style="--ev-cor: ${CORES_CATEGORIA[ev.categoria] || '#9CA3AF'}">
        <div class="ev-barra"></div>
        <div class="ev-info">
          <span class="ev-titulo">${ev.titulo}</span>
          <span class="ev-meta">
            ${ev.hora_inicio ? ev.hora_inicio.slice(0, 5) : 'Dia todo'}
            ${ev.local ? '· ' + ev.local : ''}
          </span>
        </div>
      </div>
    `).join('')}
  `;
  detalhe.classList.remove('hidden');
}

// --- Header dinâmico (clima + hora + data) ---

function iniciarHeaderDinamico() {
  atualizarRelogio();
  setInterval(atualizarRelogio, 60000);
  buscarClima();
}

function atualizarRelogio() {
  const agora = new Date();
  const diasSemana = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const diaSem = diasSemana[agora.getDay()];
  const dia = agora.getDate().toString().padStart(2, '0');
  const mes = meses[agora.getMonth()];
  const hora = agora.getHours().toString().padStart(2, '0');
  const min = agora.getMinutes().toString().padStart(2, '0');

  const el = document.getElementById('clima-info');
  if (el) {
    const tempEl = el.dataset.temp || '';
    const sep = tempEl ? ' · ' : '';
    el.textContent = `${tempEl}${sep}${diaSem}, ${dia} de ${mes} · ${hora}:${min}`;
  }
}

async function buscarClima() {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-22.11&longitude=-43.18&current=temperature_2m,weathercode&timezone=America%2FSao_Paulo'
    );
    if (!res.ok) return;
    const dados = await res.json();
    const temp = Math.round(dados.current.temperature_2m);
    const code = dados.current.weathercode;

    const emoji = emojiClima(code);
    document.getElementById('clima-emoji').textContent = emoji;

    const infoEl = document.getElementById('clima-info');
    if (infoEl) {
      infoEl.dataset.temp = `${temp}°C`;
      atualizarRelogio();
    }
  } catch (_) {
    atualizarRelogio();
  }
}

function emojiClima(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}
