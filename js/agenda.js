const CORES_CATEGORIA = {
  reuniao: '#7C3AED',
  formacao: '#3B82F6',
  escola: '#F97316',
  pessoal: '#EC4899',
  outro: '#9CA3AF',
};

const LABELS_CATEGORIA = {
  reuniao: 'Reunião',
  formacao: 'Formação',
  escola: 'Escola',
  pessoal: 'Pessoal',
  outro: 'Outro',
};

async function listarEventosFuturos(professoraId) {
  const hoje = new Date().toISOString().split('T')[0];
  const { data, error } = await db
    .from('eventos')
    .select('*')
    .eq('professora_id', professoraId)
    .gte('data', hoje)
    .order('data')
    .order('hora_inicio');
  if (error) throw error;
  return data;
}

async function listarEventosMes(professoraId, mes, ano) {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];
  const { data, error } = await db
    .from('eventos')
    .select('*')
    .eq('professora_id', professoraId)
    .gte('data', inicio)
    .lte('data', fim);
  if (error) return [];
  return data;
}

async function criarEvento({ professoraId, titulo, categoria, data, horaInicio, horaFim, local, observacao, diaTodo }) {
  const { data: evento, error } = await db
    .from('eventos')
    .insert({
      professora_id: professoraId,
      titulo,
      categoria,
      data,
      hora_inicio: horaInicio || null,
      hora_fim: horaFim || null,
      local: local || null,
      observacao: observacao || null,
      dia_todo: diaTodo || false,
    })
    .select()
    .single();
  if (error) throw error;
  return evento;
}

async function contarEventos(professoraId) {
  const { count, error } = await db
    .from('eventos')
    .select('*', { count: 'exact', head: true })
    .eq('professora_id', professoraId);
  if (error) return 0;
  return count ?? 0;
}

async function deletarEvento(id) {
  const { error } = await db.from('eventos').delete().eq('id', id);
  if (error) throw error;
}

function agruparEventosPorData(eventos) {
  const grupos = {};
  eventos.forEach((ev) => {
    if (!grupos[ev.data]) grupos[ev.data] = [];
    grupos[ev.data].push(ev);
  });
  return grupos;
}

function formatarDataExibicao(dataStr) {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  if (data.getTime() === hoje.getTime()) return 'Hoje';
  if (data.getTime() === amanha.getTime()) return 'Amanhã';

  return data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}
