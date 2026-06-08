async function listarTurmas() {
  const { data, error } = await db.from('turmas').select('*').order('nome');
  if (error) throw error;
  return data;
}

async function criarTurma(nome, userId) {
  const { data, error } = await db
    .from('turmas')
    .insert({ nome: nome.trim(), created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function listarPlanejamentos(professoraId) {
  const { data, error } = await db
    .from('planejamentos')
    .select('*, turmas(nome, emoji, cor)')
    .eq('professora_id', professoraId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false });
  if (error) throw error;
  return data;
}

async function listarPlanejamentosMes(professoraId, mes, ano) {
  const { data, error } = await db
    .from('planejamentos')
    .select('*, turmas(nome, emoji, cor)')
    .eq('professora_id', professoraId)
    .eq('mes', mes)
    .eq('ano', ano);
  if (error) throw error;
  return data;
}

async function criarPlanejamento({ professoraId, turmaId, mes, ano, cor }) {
  const { data: plano, error } = await db
    .from('planejamentos')
    .insert({ professora_id: professoraId, turma_id: turmaId, mes, ano, cor })
    .select()
    .single();
  if (error) throw error;

  // Cria as 4 semanas automaticamente
  const semanas = [1, 2, 3, 4].map((n) => ({ planejamento_id: plano.id, numero: n }));
  const { data: semanasData, error: errSemanas } = await db
    .from('semanas')
    .insert(semanas)
    .select();
  if (errSemanas) throw errSemanas;

  // Cria atividades em branco para cada dia de cada semana
  const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const atividades = semanasData.flatMap((semana) =>
    dias.map((dia) => ({ semana_id: semana.id, dia_semana: dia, conteudo: '' }))
  );
  const { error: errAtiv } = await db.from('atividades').insert(atividades);
  if (errAtiv) throw errAtiv;

  return plano;
}

async function buscarPlanejamento(id) {
  const { data: plano, error } = await db
    .from('planejamentos')
    .select('*, turmas(nome, emoji, cor), semanas(*, atividades(*))')
    .eq('id', id)
    .single();
  if (error) throw error;

  // Ordena semanas e atividades
  plano.semanas.sort((a, b) => a.numero - b.numero);
  const ordemDias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  plano.semanas.forEach((s) => {
    s.atividades.sort((a, b) => ordemDias.indexOf(a.dia_semana) - ordemDias.indexOf(b.dia_semana));
  });
  return plano;
}

async function listarAtividadesFixas(turmaId) {
  const { data, error } = await db
    .from('atividades_fixas')
    .select('*')
    .eq('turma_id', turmaId)
    .order('ordem');
  if (error) return [];
  return data;
}

let _debounceTimer = null;

function salvarAtividadeDebounce(atividadeId, conteudo, onSalvo) {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(async () => {
    await salvarAtividade(atividadeId, conteudo);
    if (onSalvo) onSalvo();
  }, 1500);
}

async function salvarAtividade(atividadeId, conteudo) {
  const { error } = await db
    .from('atividades')
    .update({ conteudo, updated_at: new Date().toISOString() })
    .eq('id', atividadeId);
  if (error) throw error;
}

async function buscarAtividadesSemana(semanaId) {
  const { data, error } = await db
    .from('atividades')
    .select('*')
    .eq('semana_id', semanaId);
  if (error) throw error;
  return data;
}

async function deletarPlanejamento(id) {
  const { error } = await db.from('planejamentos').delete().eq('id', id);
  if (error) throw error;
}
