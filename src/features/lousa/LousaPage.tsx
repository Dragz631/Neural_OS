import { useEffect, useMemo, useRef, useState } from 'react';
import { Excalidraw, MainMenu, TTDDialog, TTDDialogTrigger } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { GraduationCap, NotebookPen, PanelLeftClose, PanelLeftOpen, Plus, Trash2, X } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { useSettings } from '../../store/settings';
import { useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { TopicSelect } from '../../components/TopicPicker';
import { Button, ErrorNote } from '../../components/ui';
import { cn } from '../../lib/utils';
import { onTextSubmit, ttdPersistence } from './aiDiagram';
import { useBibliotecaNeural } from './biblioteca/carregar';
import { useBoards } from './boardsStore';
import { describeScene } from './describeScene';
import { lookAtBoard, type BoardLook } from './professorLook';
import { loadScene, mirrorOnExit, mirrorToVault, saveScene } from './sceneStorage';

// Lousa = Excalidraw completo, pra pensar de forma estruturada.
// É SUA: o professor só olha quando você pede ("Prof., olha minha lousa").

const SAVE_DELAY = 700;
const MIRROR_DELAY = 3000;

export default function LousaPage() {
  const { boards, activeId, create, setActive } = useBoards();
  const [sidebar, setSidebar] = useState(true);

  // Primeira vez: já cria uma lousa, pra nunca abrir numa tela vazia de decisão.
  useEffect(() => {
    // Lê o estado na hora (não o da renderização): o React em dev roda o efeito 2x.
    const now = useBoards.getState();
    if (now.boards.length === 0) create('Minha primeira lousa');
    else if (!now.activeId || !now.boards.some((b) => b.id === now.activeId)) setActive(now.boards[0].id);
  }, [boards, activeId, create, setActive]);

  const active = boards.find((b) => b.id === activeId);

  return (
    <div className="flex h-[calc(100vh-96px)] min-h-[480px]">
      {sidebar && <BoardList onClose={() => setSidebar(false)} />}
      <div className="relative flex-1">
        {!sidebar && (
          <button
            type="button"
            onClick={() => setSidebar(true)}
            className="absolute bottom-16 left-3 z-10 rounded border border-line bg-panel p-1.5 text-muted hover:text-accent"
            title="Mostrar lousas"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        {active ? <Board key={active.id} boardId={active.id} name={active.name} topicId={active.topicId} /> : null}
      </div>
    </div>
  );
}

function BoardList({ onClose }: { onClose: () => void }) {
  const { boards, activeId, create, setActive, rename, remove, linkTopic } = useBoards();
  const active = boards.find((b) => b.id === activeId);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Lousas</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => create()} className="rounded p-1 text-muted hover:text-accent" title="Nova lousa">
            <Plus size={15} />
          </button>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:text-fg" title="Esconder">
            <PanelLeftClose size={15} />
          </button>
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {boards.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setActive(b.id)}
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
      {active && (
        <div className="space-y-2 border-t border-line p-3">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">Ligada ao tópico</span>
            <TopicSelect value={active.topicId} onChange={(id) => linkTopic(active.id, id)} allowEmpty="— nenhum —" />
          </label>
          <Button
            variant="danger"
            className="w-full px-2 py-1 text-[10px]"
            onClick={() => confirm(`Apagar a lousa "${active.name}"?`) && remove(active.id)}
          >
            <Trash2 size={12} /> Apagar lousa
          </Button>
        </div>
      )}
    </aside>
  );
}

function Board({ boardId, name, topicId }: { boardId: string; name: string; topicId?: string }) {
  const touch = useBoards((s) => s.touch);
  const topic = useStudy((s) => s.topics.find((t) => t.id === topicId));
  const updateTopic = useStudy((s) => s.updateTopic);
  const aiOn = useSettings((s) => s.provider !== 'off');
  const { run, loading, error } = useAI();
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  useBibliotecaNeural(api);
  const [look, setLook] = useState<BoardLook | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const mirrorTimer = useRef<number | undefined>(undefined);
  // Última mudança ainda não gravada (pra salvar na hora de sair da aba).
  const pending = useRef<{ elements: readonly ExcalidrawElement[]; appState: AppState; files: BinaryFiles } | null>(null);

  // initialData aceita Promise: o Excalidraw espera o IndexedDB carregar.
  const initialData = useMemo(
    () => loadScene(boardId).then((s) => (s ? { elements: s.elements, appState: s.appState, files: s.files } : null)),
    [boardId],
  );

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

  return (
    <div className="relative h-full">
      <Excalidraw
        onExcalidrawAPI={setApi}
        initialData={initialData}
        onChange={onChange}
        theme="dark"
        langCode="pt-BR"
        name={name}
        renderTopRightUI={() => (
          <div className="flex gap-1.5">
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
          <MainMenu.DefaultItems.ToggleTheme allowSystemTheme={false} />
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
