import { useCallback, useRef, useState } from 'react';
import { toLocalDate } from '../../domain/dates';
import { XP_POR_TIPO, type TipoEntrega } from '../../domain/entregas';
import { pendente, sugerirCaderno, type CadernoComFontes } from '../../domain/faculdade';
import { lerGrade, materiasDaGrade } from '../../domain/grade';
import { categoriaPorDisciplina, mesmoNome, normalizar } from '../../domain/importacao';
import { gerarMapa } from '../../services/ai/mapa';
import { extrairCronograma, trechosComData, type EventoAchado } from '../../services/ai/cronograma';
import { mapaManual, mapaSemIA } from '../../services/fontesMapa';
import { aplicarMapa } from '../../store/aplicarMapa';
import { iaLigada, useConexoes } from '../../store/conexoes';
import { useEntregas } from '../../store/entregas';
import { useFaculdade } from '../../store/faculdade';
import { useImportacao } from '../../store/importacao';
import { newId, useStudy } from '../../store/study';

// "Montar minha faculdade": lê o Notion e o NotebookLM, mostra o que achou,
// e só cria depois que a pessoa aprova.

export type Fase = 'lendo' | 'escolher' | 'montando' | 'datas' | 'pronto' | 'erro';

export interface LinhaMateria {
  nome: string;
  origem: 'grade' | 'disciplina' | 'estudo';
  marcada: boolean;
  cadernoId?: string;
  jaExiste: boolean;
}

export interface LinhaFac {
  notionId: string;
  titulo: string;
  data?: string;
  status?: string;
  online?: boolean;
}

export interface Faculdade {
  pagina: string;
  gradeLinhas: string[][];
  disciplinas: LinhaFac[];
  estudos: LinhaFac[];
  trabalhos: LinhaFac[];
  provas: LinhaFac[];
  exercicios: LinhaFac[];
  calendario: LinhaFac[];
  tarefas: { texto: string; feita: boolean }[];
  lembretes: string[];
}

export type DataAchada = EventoAchado & { materia: string; marcada: boolean };

const mesmaMateria = (a: string, b: string) => mesmoNome(a, b) || normalizar(a).split(' ')[0] === normalizar(b).split(' ')[0];

const textoDoCaderno = async (c: CadernoComFontes) => {
  const partes: string[] = [];
  for (const f of c.fontes) {
    const r = await fetch(`/api/notebooklm/texto?caderno=${c.id}&fonte=${f.id}`);
    if (r.ok) partes.push(`[${f.titulo}]\n${(await r.json()).texto}`);
  }
  return partes.join('\n\n');
};

export function useMontarFaculdade() {
  const [fase, setFase] = useState<Fase>('lendo');
  const [erro, setErro] = useState('');
  const [fac, setFac] = useState<Faculdade | null>(null);
  const [cadernos, setCadernos] = useState<CadernoComFontes[]>([]);
  const [semNotebook, setSemNotebook] = useState(false);
  const [materias, setMaterias] = useState<LinhaMateria[]>([]);
  const [progresso, setProgresso] = useState('');
  const [datas, setDatas] = useState<DataAchada[]>([]);
  const parar = useRef(new AbortController());

  const carregar = useCallback(async () => {
    setFase('lendo');
    try {
      const r = await fetch('/api/faculdade?forcar=1');
      const f = await r.json();
      if (!r.ok) throw new Error(f.erro);
      setFac(f);
      const rc = await fetch('/api/notebooklm/cadernos');
      const lista: CadernoComFontes[] = rc.ok ? (await rc.json()).cadernos : [];
      setSemNotebook(!rc.ok);
      setCadernos(lista);

      const existentes = useStudy.getState().subjects.map((s) => s.name);
      const linhas: LinhaMateria[] = [];
      const somar = (nome: string, origem: LinhaMateria['origem'], marcada: boolean) => {
        if (linhas.some((l) => mesmaMateria(l.nome, nome))) return;
        const jaExiste = existentes.some((e) => mesmaMateria(e, nome));
        linhas.push({ nome, origem, marcada: marcada && !jaExiste, cadernoId: sugerirCaderno(nome, lista), jaExiste });
      };
      materiasDaGrade(lerGrade(f.gradeLinhas)).forEach((m) => somar(m, 'grade', true));
      (f.disciplinas as LinhaFac[]).forEach((d) => somar(d.titulo, 'disciplina', false));
      (f.estudos as LinhaFac[]).forEach((e) => somar(e.titulo, 'estudo', false));
      setMaterias(linhas);
      setFase('escolher');
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setFase('erro');
    }
  }, []);

  const trocar = (nome: string, patch: Partial<LinhaMateria>) => setMaterias((l) => l.map((m) => (m.nome === nome ? { ...m, ...patch } : m)));

  const montar = async () => {
    if (!fac) return;
    setFase('montando');
    const hoje = toLocalDate();
    const signal = parar.current.signal;
    const achadas: DataAchada[] = [];
    const comIA = iaLigada(useConexoes.getState().motores);
    const fila = materias.filter((m) => m.marcada);
    let primeira = !useStudy.getState().target.topicId;

    useFaculdade.getState().salvarGrade(lerGrade(fac.gradeLinhas));

    for (const [i, m] of fila.entries()) {
      const passo = `${i + 1}/${fila.length} ${m.nome}`;
      const caderno = cadernos.find((c) => c.id === m.cadernoId);
      setProgresso(`${passo}: lendo os slides…`);
      const slides = caderno ? await textoDoCaderno(caderno) : '';
      setProgresso(`${passo}: o professor está montando o caminho…`);
      const { subjects, profile } = useStudy.getState();
      const mapa = await (comIA
        ? gerarMapa({ materia: m.nome, materiasAtuais: subjects.map((s) => s.name), bio: profile.bio, contexto: slides }, signal, 'dificil').catch(async () => (await mapaSemIA(m.nome))?.mapa ?? mapaManual(m.nome))
        : mapaSemIA(m.nome).then((a) => a?.mapa ?? mapaManual(m.nome)));
      const { subjectId } = aplicarMapa({ ...mapa, materia: m.nome }, { definirTarget: primeira });
      primeira = false;
      if (caderno) useFaculdade.getState().ligarCaderno(subjectId, caderno.id);
      if (slides) useImportacao.getState().juntarContexto(subjectId, slides.slice(0, 8000));

      if (slides && comIA) {
        setProgresso(`${passo}: procurando datas de prova e entrega…`);
        const eventos = await extrairCronograma(m.nome, trechosComData(slides), hoje, signal).catch(() => []);
        achadas.push(...eventos.map((e) => ({ ...e, materia: m.nome, marcada: e.data >= hoje })));
      }
    }

    // Avisos soltos do Notion ("Entregar o trabalho até dia 12").
    const avisos = [...fac.lembretes, ...fac.tarefas.filter((t) => !t.feita).map((t) => t.texto)].join('\n');
    if (avisos && comIA) {
      setProgresso('Lendo os seus lembretes…');
      const eventos = await extrairCronograma('Avisos da faculdade', avisos, hoje, signal).catch(() => []);
      achadas.push(...eventos.map((e) => ({ ...e, materia: 'Avisos', marcada: e.data >= hoje })));
    }

    // Prazos que já estão no Notion entram direto (sem repetir).
    const ids = new Set(useEntregas.getState().lista.map((e) => e.notionId));
    const prazos: [LinhaFac[], TipoEntrega][] = [[fac.trabalhos, 'trabalho'], [fac.provas, 'prova'], [fac.exercicios, 'exercicio']];
    for (const [linhas, tipo] of prazos) {
      for (const l of linhas) {
        if (ids.has(l.notionId) || !pendente(l, hoje)) continue;
        useEntregas.getState().criar({ titulo: l.titulo, tipo, categoria: 'estudos', prazo: l.data, tags: ['notion'], xp: XP_POR_TIPO[tipo], notionId: l.notionId });
      }
    }
    useFaculdade.getState().somarEventos(
      fac.calendario.filter((l) => l.data && pendente(l, hoje)).map((l) => ({ id: newId('ev'), titulo: l.titulo, data: l.data!, tipo: 'outro' as const, origem: 'Notion' })),
    );

    // Aula comum a grade já mostra; aqui fica só o que dá pra perder (prova, entrega...).
    const peso = (d: DataAchada) => (d.tipo === 'prova' ? 0 : d.tipo === 'trabalho' ? 1 : 2);
    setDatas(achadas.filter((d) => d.tipo !== 'aula').sort((a, b) => peso(a) - peso(b) || a.data.localeCompare(b.data)));
    setFase('datas');
  };

  const concluir = () => {
    for (const d of datas.filter((x) => x.marcada)) {
      if (d.tipo === 'prova' || d.tipo === 'trabalho') {
        const subjectId = useStudy.getState().subjects.find((s) => mesmaMateria(s.name, d.materia))?.id;
        useEntregas.getState().criar({ titulo: d.titulo, tipo: d.tipo, categoria: categoriaPorDisciplina(d.materia), prazo: d.data, descricao: d.trecho, subjectId, tags: ['slides'], xp: XP_POR_TIPO[d.tipo] });
      } else {
        useFaculdade.getState().somarEventos([{ id: newId('ev'), titulo: d.titulo, data: d.data, tipo: d.tipo, materia: d.materia, origem: `slides: ${d.trecho.slice(0, 60)}` }]);
      }
    }
    useFaculdade.getState().marcarMontada();
    setFase('pronto');
  };

  return { fase, erro, fac, cadernos, semNotebook, materias, progresso, datas, setDatas, carregar, trocar, montar, concluir };
}
