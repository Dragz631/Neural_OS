import { useEffect } from 'react';
import { acharTopico, mesclarRoadmap } from '../domain/roadmap';
import { palavrasChave } from '../domain/importacao';
import { adaptarRoadmap, gerarRoadmap } from '../services/ai/roadmap';
import { useFaculdade, type FonteNLM } from '../store/faculdade';
import { useImportacao } from '../store/importacao';
import { useRoadmaps } from '../store/roadmaps';
import { useStudy } from '../store/study';
import { rodarTarefa } from '../store/tarefas';
import { toast } from '../store/toast';

// NotebookLM vivo (Hugo, 08/11/2026): pôs slide novo no caderno? O app percebe, avisa
// "chegaram 2 slides novos em Estatística" e, com 1 clique, ADAPTA a trilha: acrescenta
// no roadmap (sem apagar nada), cria os tópicos novos e marca as aulas que ganharam material.

const CONFERIR_A_CADA_MS = 10 * 60 * 1000;
let ultimaConferida = 0;
let conferindo: Promise<void> | undefined;

/** Confere os cadernos ligados às matérias (no máximo a cada 10 min). Nunca lança. */
export function conferirNotebook(forcar = false): Promise<void> {
  if (conferindo) return conferindo;
  if (!forcar && Date.now() - ultimaConferida < CONFERIR_A_CADA_MS) return Promise.resolve();
  ultimaConferida = Date.now();
  conferindo = (async () => {
    const { cadernoDe, registrarFontes } = useFaculdade.getState();
    for (const [subjectId, caderno] of Object.entries(cadernoDe)) {
      if (!useStudy.getState().subjects.some((s) => s.id === subjectId)) continue;
      try {
        const r = await fetch(`/api/notebooklm/fontes?caderno=${encodeURIComponent(caderno)}&forcar=1`, { cache: 'no-store' });
        if (!r.ok) continue; // NotebookLM fora (login caiu, sem rede): tenta na próxima
        const { fontes } = (await r.json()) as { fontes: FonteNLM[] };
        if (Array.isArray(fontes)) registrarFontes(subjectId, fontes.map((f) => ({ id: f.id, titulo: f.titulo, criadaEm: f.criadaEm })));
      } catch {
        // sem servidor (versão publicada) ou sem rede
      }
    }
  })().finally(() => (conferindo = undefined));
  return conferindo;
}

/** Na tela que mostra o aviso (Professor, Lobby): confere ao abrir. */
export function useConferirNotebook() {
  useEffect(() => {
    void conferirNotebook();
  }, []);
}

async function textoDaFonte(caderno: string, fonte: string, signal: AbortSignal): Promise<string> {
  const r = await fetch(`/api/notebooklm/texto?caderno=${encodeURIComponent(caderno)}&fonte=${encodeURIComponent(fonte)}`, { signal });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { erro?: string }).erro ?? 'Não consegui ler o slide no NotebookLM.');
  return ((await r.json()) as { texto: string }).texto ?? '';
}

/** Os slides que o app já guardou desta matéria (título + começo), pro roadmap cobrir. */
export function slidesDaMateria(subjectId: string): { titulo: string; trecho: string }[] {
  return Object.values(useImportacao.getState().porFonte[subjectId] ?? {}).map((f) => ({ titulo: f.titulo, trecho: f.texto.slice(0, 600) }));
}

/** Adaptar a trilha da matéria com as fontes novas (roda como tarefa: trocar de aba não cancela). */
export function adaptarTrilha(subjectId: string) {
  const subject = useStudy.getState().subjects.find((s) => s.id === subjectId);
  const caderno = useFaculdade.getState().cadernoDe[subjectId];
  const novas = useFaculdade.getState().fontesNovas[subjectId] ?? [];
  if (!subject || !caderno || !novas.length) return;
  void rodarTarefa(`adaptar:${subjectId}`, { rotulo: `Professor adaptando a trilha de ${subject.name} com ${novas.length} slide(s) novo(s)`, aba: 'professor', avisarPronto: `Trilha de ${subject.name} adaptada` }, async (signal) => {
    // 1. Lê o texto de cada slide novo e guarda por fonte (a aula escolhe o slide do tópico).
    const lidos: { titulo: string; trecho: string }[] = [];
    const vazios: string[] = [];
    for (const f of novas) {
      const texto = (await textoDaFonte(caderno, f.id, signal)).trim();
      if (!texto) {
        // O NotebookLM não tem o texto (PDF só de imagem, upload que falhou): usa só o título e avisa.
        vazios.push(f.titulo);
        lidos.push({ titulo: f.titulo, trecho: '(o NotebookLM não tem o texto deste arquivo; use só o título pra saber o assunto)' });
        continue;
      }
      useImportacao.getState().guardarFonte(subjectId, f.id, f.titulo, texto);
      useImportacao.getState().juntarContexto(subjectId, `[${f.titulo}]\n${texto.slice(0, 1500)}`);
      lidos.push({ titulo: f.titulo, trecho: texto.slice(0, 3000) });
    }
    if (vazios.length)
      toast({
        title: `${vazios.length === 1 ? 'Um slide chegou' : `${vazios.length} slides chegaram`} sem texto no NotebookLM`,
        description: `${vazios.join(', ')}: o NotebookLM não conseguiu ler (PDF só de imagem ou envio que falhou). A trilha usou só o nome. Reenvie o arquivo lá pra aula usar o conteúdo.`,
        variant: 'destructive',
      });

    // 2. Roadmap: acrescenta (ou cria, se ainda não tinha) — nunca apaga.
    const topicos = () => useStudy.getState().topics.filter((t) => t.subjectId === subjectId);
    const atual = useRoadmaps.getState().porMateria[subjectId];
    const roadmap = atual
      ? mesclarRoadmap(atual, await adaptarRoadmap({ materia: subject.name, roadmap: atual, topicosAtuais: topicos().map((t) => t.title), novos: lidos }, signal))
      : await gerarRoadmap({ materia: subject.name, topicosAtuais: topicos().map((t) => t.title), slides: slidesDaMateria(subjectId) }, signal);
    useRoadmaps.getState().salvar(subjectId, roadmap);

    // 3. Tópicos novos na árvore (só os itens "novo"; num roadmap criado do zero, o tópico nasce no clique).
    for (const item of roadmap.etapas.flatMap((e) => e.itens.filter((i) => i.novo))) {
      if (!acharTopico(topicos(), item.titulo)) useStudy.getState().addTopic({ subjectId, title: item.titulo });
    }

    // 4. Aulas já feitas que ganharam material: selo "material novo · Atualizar aula".
    for (const t of topicos()) {
      if (!t.lesson) continue;
      const chave = palavrasChave(t.title);
      const tem = lidos.filter((s) => chave.some((p) => `${s.titulo} ${s.trecho}`.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').includes(p)));
      if (tem.length) useStudy.getState().updateTopic(t.id, { materialNovo: [...new Set([...(t.materialNovo ?? []), ...tem.map((s) => s.titulo)])] });
    }

    useFaculdade.getState().marcarFontesVistas(subjectId);
  });
}
