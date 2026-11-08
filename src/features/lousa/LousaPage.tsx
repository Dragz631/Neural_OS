import { useEffect, useMemo, useRef, useState } from 'react';
import { Excalidraw, MainMenu, TTDDialog, TTDDialogTrigger } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { ChevronDown, ChevronRight, Code2, FolderPlus, GraduationCap, NotebookPen, PanelLeftClose, PanelLeftOpen, Plus, Trash2, X } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { useCelular } from '../../hooks/useCelular';
import { useNav } from '../../store/nav';
import { useIALigada } from '../../store/conexoes';
import { useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { TopicSelect } from '../../components/TopicPicker';
import { Button, ErrorNote } from '../../components/ui';
import { cn } from '../../lib/utils';
import { onTextSubmit, ttdPersistence } from './aiDiagram';
import { useBibliotecaNeural } from './biblioteca/carregar';
import { ehDoProfessor, useBoards, type BoardMeta } from './boardsStore';
import { describeScene } from './describeScene';
import { lookAtBoard, type BoardLook } from './professorLook';
import { loadScene, mirrorOnExit, mirrorToVault, saveScene } from './sceneStorage';
import { modoQuadro, paletaQuadro } from './temaQuadro';
import { useTema } from '../../store/tema';
import { useSelecaoQuadro } from '../../store/selecaoQuadro';
import { mapaParaElementos } from './mapaParaLousa';
import { roadmapParaElementos } from './roadmapParaLousa';

// Lousa = Excalidraw completo, pra pensar de forma estruturada.
// É SUA: o professor só olha quando você pede ("Prof., olha minha lousa").

const SAVE_DELAY = 700;
const MIRROR_DELAY = 3000;

export default function LousaPage() {
  const { boards: todas, activeId, create, setActive } = useBoards();
  // As lousas do professor (aula e roadmap) ficam na aba Professor; aqui só as suas.
  const boards = useMemo(() => todas.filter((b) => !ehDoProfessor(b)), [todas]);
  const celular = useCelular();
  // No celular a lista de lousas começa fechada e abre como gaveta por cima da lousa.
  const [sidebar, setSidebar] = useState(() => !(typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches));

  // Primeira vez: já cria uma lousa, pra nunca abrir numa tela vazia de decisão.
  useEffect(() => {
    // Lê o estado na hora (não o da renderização): o React em dev roda o efeito 2x.
    const now = useBoards.getState();
    const suas = now.boards.filter((b) => !ehDoProfessor(b));
    if (suas.length === 0) create('Minha primeira lousa');
    else if (!now.activeId || !suas.some((b) => b.id === now.activeId)) setActive(suas[0].id);
  }, [boards, activeId, create, setActive]);

  const active = boards.find((b) => b.id === activeId);

  return (
    // dvh = altura que sobra de verdade no celular (a barra do navegador some e volta); no PC segue 100vh.
    <div className="relative flex h-[calc(100dvh-12rem)] min-h-[420px] md:h-[calc(100vh-96px)] md:min-h-[480px]">
      {sidebar && !celular && <BoardList onClose={() => setSidebar(false)} />}
      {sidebar && celular && (
        // Gaveta: cobre a lousa, e tocar fora (ou escolher uma lousa) fecha.
        <div className="absolute inset-0 z-30 flex">
          <BoardList onClose={() => setSidebar(false)} aoEscolher={() => setSidebar(false)} className="w-[min(18rem,85%)] shadow-2xl" />
          <button type="button" aria-label="Fechar a lista de lousas" onClick={() => setSidebar(false)} className="flex-1 bg-bg/70" />
        </div>
      )}
      <div className="relative min-w-0 flex-1">
        {!sidebar && (
          <button
            type="button"
            onClick={() => setSidebar(true)}
            className="absolute left-3 top-14 z-10 flex items-center gap-1.5 rounded border border-line bg-panel px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted hover:text-accent md:bottom-16 md:top-auto"
            title="Mostrar lousas"
          >
            <PanelLeftOpen size={16} /> <span className="md:hidden">Lousas</span>
          </button>
        )}
        {active ? <Board key={active.id} boardId={active.id} name={active.name} topicId={active.topicId} /> : null}
      </div>
    </div>
  );
}

const SEM_GRUPO = 'Sem grupo';

function BoardList({ onClose, aoEscolher, className }: { onClose: () => void; aoEscolher?: () => void; className?: string }) {
  const { boards: todas, grupos, activeId, create, setActive, rename, remove, linkTopic, criarGrupo, renomearGrupo, apagarGrupo, moverParaGrupo } = useBoards();
  const topics = useStudy((s) => s.topics);
  const subjects = useStudy((s) => s.subjects);
  const [fechados, setFechados] = useState<Record<string, boolean>>({});
  const boards = useMemo(() => todas.filter((b) => !ehDoProfessor(b)), [todas]);
  const active = boards.find((b) => b.id === activeId);

  // Grupo de cada lousa: o que a pessoa escolheu, senão o da matéria do tópico dela, senão "Sem grupo".
  const grupoDe = (b: BoardMeta): string => {
    if (b.grupo) return b.grupo;
    const t = b.topicId ? topics.find((x) => x.id === b.topicId) : undefined;
    return (t && subjects.find((x) => x.id === t.subjectId)?.name) || SEM_GRUPO;
  };
  const secoes = useMemo(() => {
    const mapa = new Map<string, BoardMeta[]>();
    grupos.forEach((g) => mapa.set(g, []));
    boards.forEach((b) => {
      const g = grupoDe(b);
      mapa.set(g, [...(mapa.get(g) ?? []), b]);
    });
    const nomes = [...mapa.keys()].filter((g) => g !== SEM_GRUPO).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (mapa.has(SEM_GRUPO)) nomes.push(SEM_GRUPO);
    return nomes.map((nome) => ({ nome, lousas: mapa.get(nome)! }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, grupos, topics, subjects]);

  const novoGrupo = (): string | undefined => {
    const nome = prompt('Nome do grupo (ex.: Matemática, Inglês, Programação)')?.trim();
    if (nome) criarGrupo(nome);
    return nome || undefined;
  };

  return (
    <aside className={cn('flex w-60 shrink-0 flex-col border-r border-line bg-panel', className)}>
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Lousas</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => novoGrupo()} className="rounded p-1 text-muted hover:text-accent" title="Novo grupo">
            <FolderPlus size={15} />
          </button>
          <button type="button" onClick={() => create(undefined, active?.grupo ? { grupo: active.grupo } : undefined)} className="rounded p-1 text-muted hover:text-accent" title="Nova lousa (no grupo da que está aberta)">
            <Plus size={15} />
          </button>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:text-fg" title="Esconder">
            <PanelLeftClose size={15} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {secoes.map(({ nome, lousas }) => {
          const fechado = !!fechados[nome];
          const criado = grupos.includes(nome);
          return (
            <section key={nome} className="mb-2">
              <div className="flex items-center gap-1 px-1 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                <button type="button" onClick={() => setFechados((f) => ({ ...f, [nome]: !f[nome] }))} className="flex min-w-0 flex-1 items-center gap-1 text-left hover:text-fg" aria-expanded={!fechado}>
                  {fechado ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span className="truncate">{nome}</span>
                  <span className="font-normal opacity-70">({lousas.length})</span>
                </button>
                {criado && (
                  <>
                    <button
                      type="button"
                      className="hover:text-accent"
                      title="Renomear o grupo"
                      onClick={() => {
                        const n = prompt('Novo nome do grupo', nome);
                        if (n?.trim()) renomearGrupo(nome, n.trim());
                      }}
                    >
                      ✎
                    </button>
                    <button type="button" className="hover:text-danger" title="Apagar o grupo (as lousas ficam soltas, nada é apagado)" onClick={() => confirm(`Apagar o grupo "${nome}"? As ${lousas.length} lousas dele ficam soltas.`) && apagarGrupo(nome)}>
                      <X size={12} />
                    </button>
                  </>
                )}
              </div>
              {!fechado && (
                <ul>
                  {lousas.length === 0 && <li className="px-2 py-1 text-[11px] text-muted">Vazio. Abra uma lousa e mude o grupo dela.</li>}
                  {lousas.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActive(b.id);
                          aoEscolher?.();
                        }}
                        onDoubleClick={() => {
                          const name = prompt('Nome da lousa', b.name);
                          if (name?.trim()) rename(b.id, name.trim());
                        }}
                        title="Clique duplo pra renomear"
                        className={cn('mb-1 w-full rounded px-2 py-1.5 text-left text-xs', b.id === activeId ? 'bg-accent/15 text-accent' : 'text-fg hover:bg-panel-2')}
                      >
                        <div className="truncate font-bold">{b.name}</div>
                        <div className="text-[10px] text-muted">
                          {b.elementCount} elementos · {new Date(b.updatedAt).toLocaleDateString('pt-BR')}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {active && (
        <div className="space-y-2 border-t border-line p-3">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">Grupo</span>
            <select
              value={active.grupo ?? ''}
              onChange={(e) => {
                if (e.target.value === '__novo') {
                  const n = novoGrupo();
                  if (n) moverParaGrupo(active.id, n);
                } else moverParaGrupo(active.id, e.target.value || undefined);
              }}
              className="w-full rounded border border-line bg-bg px-2 py-1.5 text-xs text-fg"
            >
              <option value="">Automático ({grupoDe({ ...active, grupo: undefined })})</option>
              {grupos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
              <option value="__novo">+ Novo grupo…</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">Ligada ao tópico</span>
            <TopicSelect value={active.topicId} onChange={(id) => linkTopic(active.id, id)} allowEmpty="— nenhum —" />
          </label>
          <Button variant="danger" className="w-full px-2 py-1 text-[10px]" onClick={() => confirm(`Apagar a lousa "${active.name}"?`) && remove(active.id)}>
            <Trash2 size={12} /> Apagar lousa
          </Button>
        </div>
      )}
    </aside>
  );
}

/** Algo pra desenhar no quadro UMA vez (a `chave` fica gravada no quadro). Ex.: a aula do professor. */
export interface DesenhoNovo {
  chave: string;
  criar: () => readonly ExcalidrawElement[];
}

export function Board({ boardId, name, topicId, desenho }: { boardId: string; name: string; topicId?: string; desenho?: DesenhoNovo }) {
  const touch = useBoards((s) => s.touch);
  const topic = useStudy((s) => s.topics.find((t) => t.id === topicId));
  const updateTopic = useStudy((s) => s.updateTopic);
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const modo = useTema((s) => modoQuadro(s.valores));
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  useBibliotecaNeural(api);
  const [look, setLook] = useState<BoardLook | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const mirrorTimer = useRef<number | undefined>(undefined);
  // Última mudança ainda não gravada (pra salvar na hora de sair da aba).
  const pending = useRef<{ elements: readonly ExcalidrawElement[]; appState: AppState; files: BinaryFiles } | null>(null);
  const selecaoAnterior = useRef('');

  // initialData aceita Promise: o Excalidraw espera o IndexedDB carregar.
  const initialData = useMemo(
    () =>
      loadScene(boardId).then((s) => {
        const p = paletaQuadro();
        // Fundo transparente: quem pinta é o tema do app (o branco antigo vira transparente).
        if (s) return { elements: s.elements, appState: { ...s.appState, viewBackgroundColor: !s.appState.viewBackgroundColor || s.appState.viewBackgroundColor === '#ffffff' ? 'transparent' : s.appState.viewBackgroundColor }, files: s.files };
        // Lousa nova vinda do "Nova matéria": desenha o mapa na primeira abertura.
        const meta = useBoards.getState().boards.find((b) => b.id === boardId);
        const mapa = meta?.mapa;
        const roadmap = meta?.roadmap;
        // Traço, fonte e cantos já saem no estilo do tema.
        const appState = { viewBackgroundColor: 'transparent', currentItemStrokeColor: p.texto, currentItemFontFamily: p.fonte, currentItemRoughness: 0, currentItemRoundness: p.arredondado ? ('round' as const) : ('sharp' as const) };
        if (roadmap) return { elements: roadmapParaElementos(roadmap), appState, scrollToContent: true, mapaNovo: true };
        return mapa ? { elements: mapaParaElementos(mapa), appState, scrollToContent: true, mapaNovo: true } : { elements: [], appState };
      }),
    [boardId],
  );

  // Mapa recém-desenhado: cabe inteiro na tela (sem passar de 100% de zoom).
  useEffect(() => {
    if (!api) return;
    let vivo = true;
    void initialData.then((d) => {
      if (!vivo || !d || !('mapaNovo' in d)) return;
      requestAnimationFrame(() => api.setViewport({ target: api.getSceneElements(), fit: 'scale-down', offsets: { ui: true } }));
    });
    return () => {
      vivo = false;
    };
  }, [api, initialData]);

  // Desenho novo (ex.: aula do professor): entra ao lado do que já existe,
  // nunca por cima das anotações, e só uma vez por chave.
  useEffect(() => {
    if (!api || !desenho) return;
    let vivo = true;
    void initialData.then(() => {
      const quadro = useBoards.getState().boards.find((b) => b.id === boardId);
      if (!vivo || !quadro || quadro.desenhados?.includes(desenho.chave)) return;
      useBoards.getState().marcarDesenhado(boardId, desenho.chave); // marca antes: o React em dev roda 2x
      const atuais = api.getSceneElements();
      const direita = atuais.reduce((max, el) => Math.max(max, el.x + el.width), -Infinity);
      const dx = Number.isFinite(direita) ? direita + 200 : 0;
      const novos = desenho.criar().map((el) => ({ ...el, x: el.x + dx }));
      api.updateScene({ elements: [...atuais, ...novos] });
      requestAnimationFrame(() => api.setViewport({ target: novos, fit: 'scale-down', offsets: { ui: true } }));
    });
    return () => {
      vivo = false;
    };
  }, [api, initialData, boardId, desenho]);

  // Fechou/recarregou a página com algo pendente: manda pro cofre na saída.
  useEffect(() => {
    const onExit = () => {
      const p = pending.current;
      if (p) mirrorOnExit(name, p.elements, p.appState, p.files);
    };
    window.addEventListener('pagehide', onExit);
    return () => window.removeEventListener('pagehide', onExit);
  }, [name]);

  // Ao sair da aba ou trocar de lousa: grava o que estiver pendente na hora.
  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current);
      window.clearTimeout(mirrorTimer.current);
      const p = pending.current;
      if (p) {
        void saveScene(boardId, p.elements, p.appState, p.files);
        void mirrorToVault(name, p.elements, p.appState, p.files);
        touch(boardId, p.elements.filter((e) => !e.isDeleted).length);
      }
    },
    [boardId, name, touch],
  );

  const onChange = (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
    // Seleção mudou: o chat do professor passa a saber de qual parte a pessoa está falando.
    const ids = Object.keys(appState.selectedElementIds).filter((k) => appState.selectedElementIds[k]);
    const chaveSel = ids.sort().join(',');
    if (chaveSel !== selecaoAnterior.current) {
      selecaoAnterior.current = chaveSel;
      const sel = useSelecaoQuadro.getState();
      if (!ids.length) {
        if (sel.boardId === boardId) sel.limpar();
      } else {
        const marcados = new Set(ids);
        const els = elements.filter((e) => !e.isDeleted && (marcados.has(e.id) || (e.type === 'text' && 'containerId' in e && e.containerId && marcados.has(e.containerId))));
        sel.definir(boardId, describeScene(els).text);
      }
    }
    pending.current = { elements, appState, files };
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveScene(boardId, elements, appState, files);
      touch(boardId, elements.filter((e) => !e.isDeleted).length);
    }, SAVE_DELAY);
    window.clearTimeout(mirrorTimer.current);
    mirrorTimer.current = window.setTimeout(() => {
      void mirrorToVault(name, elements, appState, files);
      pending.current = null;
    }, MIRROR_DELAY);
  };

  const askProfessor = () =>
    run(async (signal) => {
      if (!api) return;
      const { text, counts } = describeScene(api.getSceneElements());
      if (counts.shapes + counts.texts === 0) {
        toast({ title: 'A lousa está vazia', description: 'Escreva ou desenhe algo primeiro.' });
        return;
      }
      setLook(await lookAtBoard(name, text, topic?.title, signal));
    });

  const saveLookToTopic = () => {
    if (!topic || !look) return;
    const date = new Date().toLocaleDateString('pt-BR');
    const block = `\n\n### Lousa "${name}" (${date})\n- Bom: ${look.strength}\n- Lacuna: ${look.gap}\n- Pergunta: ${look.question}`;
    updateTopic(topic.id, { notes: topic.notes + block });
    toast({ title: 'Anotado no tópico', description: topic.title, variant: 'success' });
  };

  const sendSelectionToTopic = () => {
    if (!api || !topic) return;
    const selected = api.getAppState().selectedElementIds;
    const els = api.getSceneElements().filter((e) => selected[e.id]);
    const { text } = describeScene(els.length ? els : api.getSceneElements());
    updateTopic(topic.id, { notes: `${topic.notes}\n\n### Da lousa "${name}"\n${text}` });
    toast({ title: els.length ? 'Seleção enviada pras anotações' : 'Lousa enviada pras anotações', description: topic.title, variant: 'success' });
  };

  // Texto selecionado (ex.: código escrito na lousa) vira desafio no Sandbox.
  const sendSelectionToSandbox = () => {
    if (!api) return;
    const selected = api.getAppState().selectedElementIds;
    const textos = api
      .getSceneElements()
      .filter((e) => selected[e.id] && e.type === 'text')
      .sort((a, b) => a.y - b.y)
      .map((e) => ('originalText' in e ? e.originalText : ''))
      .filter(Boolean);
    if (!textos.length) return toast({ title: 'Selecione o texto com o código', description: 'Depois aperte de novo pra mandar pro Sandbox.' });
    useNav.getState().mandarProSandbox({ texto: textos.join('\n'), origem: `Lousa "${name}"` }, topic?.id);
  };

  return (
    <div className="relative h-full">
      <Excalidraw
        onExcalidrawAPI={setApi}
        initialData={initialData}
        onChange={onChange}
        theme={modo}
        langCode="pt-BR"
        name={name}
        renderTopRightUI={() => (
          <div className="flex gap-1.5">
            <button type="button" onClick={sendSelectionToSandbox} title="Mandar o texto selecionado (código) pro Sandbox" className="excali-btn">
              <Code2 size={15} />
            </button>
            {topic && (
              <button type="button" onClick={sendSelectionToTopic} title={`Mandar pras anotações de "${topic.title}"`} className="excali-btn">
                <NotebookPen size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={askProfessor}
              disabled={!aiOn || loading}
              title={aiOn ? 'Prof., olha minha lousa' : 'Ative a IA nas configurações'}
              className="excali-btn excali-btn--accent"
            >
              <GraduationCap size={15} /> {loading ? 'Olhando…' : 'Prof., olha'}
            </button>
          </div>
        )}
      >
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.CommandPalette />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
        <TTDDialogTrigger />
        <TTDDialog onTextSubmit={onTextSubmit} persistenceAdapter={ttdPersistence} />
      </Excalidraw>

      {(look || error) && (
        <div className="absolute bottom-16 right-3 z-10 w-80 rounded border border-accent/50 bg-panel p-3 text-xs shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold uppercase tracking-widest text-accent">Prof. A.Ilson</span>
            <button type="button" onClick={() => setLook(null)} className="text-muted hover:text-fg" aria-label="Fechar">
              <X size={14} />
            </button>
          </div>
          <ErrorNote error={error} />
          {look && (
            <div className="space-y-2 leading-relaxed">
              <p>
                <b className="text-accent">Bom:</b> {look.strength}
              </p>
              <p>
                <b className="text-warn">Lacuna:</b> {look.gap}
              </p>
              {look.missingLinks.length > 0 && <p className="text-muted">Falta ligar: {look.missingLinks.join(' · ')}</p>}
              <p>
                <b className="text-info">Pergunta:</b> {look.question}
              </p>
              <p className="rounded border border-accent/40 bg-accent/10 p-2">
                <b>Próximo passo:</b> {look.nextStep}
              </p>
              {topic && (
                <Button className="w-full px-2 py-1 text-[10px]" onClick={saveLookToTopic}>
                  Anotar em "{topic.title}"
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
