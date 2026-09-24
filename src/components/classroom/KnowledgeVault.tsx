import React, { useState, useRef } from 'react';
import { 
  Database, 
  Upload, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  RotateCcw, 
  X,
  FileCode
} from 'lucide-react';
import { useNeural } from '../../context/NeuralContext';
import type { KnowledgeSource, TrackId } from '../../types';

export const KnowledgeVault: React.FC = () => {
  const { sources, addSource, removeSource, toggleSource, resetToDefaultSources, activeTrack } = useNeural();
  const [filterTrack, setFilterTrack] = useState<TrackId | 'all'>('all');
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState<KnowledgeSource | null>(null);

  // New source form state
  const [newTitle, setNewTitle] = useState('');
  const [newTrack, setNewTrack] = useState<TrackId>(activeTrack);
  const [newType, setNewType] = useState<KnowledgeSource['type']>('notes');
  const [newContent, setNewContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredSources = sources.filter((s) => (filterTrack === 'all' ? true : s.track === filterTrack));
  const activeSources = sources.filter((s) => s.active);
  const totalActiveWords = activeSources.reduce((sum, s) => sum + s.wordCount, 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const title = file.name.replace(/\.[^/.]+$/, '');
        addSource({
          title: title.toUpperCase(),
          track: activeTrack,
          type: file.name.endsWith('.md') ? 'doc' : 'notes',
          content,
          active: true,
          summary: `Documento "${file.name}" carregado via upload de arquivo.`,
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    addSource({
      title: newTitle.trim(),
      track: newTrack,
      type: newType,
      content: newContent.trim(),
      active: true,
    });

    setNewTitle('');
    setNewContent('');
    setIsAddingModalOpen(false);
  };

  return (
    <div className="space-y-6 font-mono text-[#9dc197]">
      {/* Top Banner / RAG Boundary Info */}
      <div className="border border-[#1b3327] bg-[#0d1612] p-4 shadow-[0_0_15px_rgba(0,255,102,0.05)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded border border-[#00ff66]/30 bg-[#00ff66]/10 p-2 text-[#00ff66]">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#00ff66]">
                  KNOWLEDGE VAULT // MOTOR DE FONTES RAG
                </span>
                <span className="border border-[#00ff66]/40 bg-[#00ff66]/10 px-2 py-0.5 text-[9px] font-bold text-[#00ff66]">
                  ESCOPO RIGIDAMENTE DELIMITADO
                </span>
              </div>
              <p className="mt-1 text-xs text-[#9dc197]/80 leading-relaxed">
                O Prof. A.Ilson e as Provas da Matriz restringem seu vocabulário e perguntas <strong className="text-[#33ff77]">exclusivamente</strong> às fontes ativas abaixo. Nenhum conteúdo externo não ensinado será cobrado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="border border-[#1b3327] bg-[#050807] px-3 py-2 text-right">
              <span className="block text-[10px] text-[#9dc197]/60 uppercase tracking-widest">PALAVRAS ATIVAS NO RAG</span>
              <span className="text-sm font-bold text-[#00ff66]">{totalActiveWords.toLocaleString()} PALAVRAS</span>
            </div>
            <div className="border border-[#1b3327] bg-[#050807] px-3 py-2 text-right">
              <span className="block text-[10px] text-[#9dc197]/60 uppercase tracking-widest">FONTES NO ESCOPO</span>
              <span className="text-sm font-bold text-[#33ff77]">{activeSources.length} / {sources.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b3327] pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] text-[#9dc197]/60 uppercase tracking-widest mr-1">FILTRAR MATÉRIA:</span>
          {(['all', 'csharp', 'c_bases', 'lfa'] as const).map((t) => {
            const labelMap = { all: 'TODAS AS FONTES', csharp: 'C# OOP', c_bases: 'C BASES', lfa: 'LFA & AUTÔMATOS' };
            const isSelected = filterTrack === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTrack(t)}
                className={`border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                  isSelected
                    ? 'border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66] shadow-[0_0_8px_rgba(0,255,102,0.3)]'
                    : 'border-[#1b3327] bg-[#0d1612] text-[#9dc197]/70 hover:border-[#00ff66]/60 hover:text-[#00ff66]'
                }`}
              >
                {labelMap[t]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json"
            onChange={handleFileUpload}
            className="hidden"
            id="knowledge-file-upload"
          />
          <label
            htmlFor="knowledge-file-upload"
            className="flex items-center gap-1.5 border border-[#1b3327] bg-[#0d1612] px-3 py-1.5 text-xs text-[#9dc197] hover:border-[#00ff66] hover:text-[#00ff66] transition cursor-pointer"
          >
            <Upload size={13} />
            <span>CARREGAR .TXT / .MD</span>
          </label>

          <button
            type="button"
            onClick={() => setIsAddingModalOpen(true)}
            className="flex items-center gap-1.5 border border-[#00ff66] bg-[#00ff66] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#33ff77] transition shadow-[0_0_10px_rgba(0,255,102,0.4)]"
          >
            <Plus size={14} />
            <span>COLAR NOVA FONTE</span>
          </button>

          <button
            type="button"
            onClick={resetToDefaultSources}
            title="Restaurar fontes padrão das 3 matérias"
            className="border border-[#1b3327] bg-[#0d1612] p-1.5 text-[#9dc197]/70 hover:text-[#00ff66] hover:border-[#00ff66] transition"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSources.map((source) => {
          const trackColors: Record<TrackId, string> = {
            csharp: 'text-[#00ff66] border-[#00ff66]/40 bg-[#00ff66]/5',
            c_bases: 'text-[#00f0ff] border-[#00f0ff]/40 bg-[#00f0ff]/5',
            lfa: 'text-[#ff33aa] border-[#ff33aa]/40 bg-[#ff33aa]/5',
          };

          const trackLabels: Record<TrackId, string> = {
            csharp: 'C# OOP',
            c_bases: 'C BASES',
            lfa: 'LFA & AUTÔMATOS',
          };

          return (
            <div
              key={source.id}
              className={`relative flex flex-col justify-between border bg-[#0d1612] p-4 transition-all duration-200 ${
                source.active
                  ? 'border-[#00ff66]/60 shadow-[0_0_15px_rgba(0,255,102,0.1)]'
                  : 'border-[#1b3327] opacity-60 hover:opacity-90'
              }`}
            >
              <div>
                {/* Header tag */}
                <div className="flex items-center justify-between gap-2 border-b border-[#1b3327] pb-2">
                  <span className={`border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${trackColors[source.track]}`}>
                    {trackLabels[source.track]}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[#9dc197]/50">
                    {source.wordCount} PALAVRAS
                  </span>
                </div>

                {/* Title */}
                <h4 className="mt-3 text-sm font-bold text-[#00ff66] line-clamp-2 leading-snug">
                  {source.title}
                </h4>

                {/* Summary / Snippet */}
                <p className="mt-2 text-xs text-[#9dc197]/80 line-clamp-3 leading-relaxed">
                  {source.summary || source.content.slice(0, 160)}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 flex items-center justify-between border-t border-[#1b3327] pt-3">
                <button
                  type="button"
                  onClick={() => toggleSource(source.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition ${
                    source.active
                      ? 'text-[#00ff66] hover:text-[#ff3366]'
                      : 'text-[#9dc197]/50 hover:text-[#00ff66]'
                  }`}
                >
                  {source.active ? (
                    <>
                      <CheckCircle2 size={14} className="text-[#00ff66]" />
                      <span>ATIVO NO RAG</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} />
                      <span>INATIVO</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewSource(source)}
                    className="border border-[#1b3327] p-1 text-[#9dc197] hover:border-[#00ff66] hover:text-[#00ff66] transition"
                    title="Visualizar documento completo"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSource(source.id)}
                    className="border border-[#1b3327] p-1 text-[#9dc197] hover:border-[#ff3366] hover:text-[#ff3366] transition"
                    title="Remover fonte"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add / Paste New Knowledge Source */}
      {isAddingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-2xl border-2 border-[#00ff66] bg-[#0a0f0d] p-6 shadow-[0_0_40px_rgba(0,255,102,0.3)]">
            <div className="flex items-center justify-between border-b border-[#1b3327] pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#00ff66]">
                <FileCode size={18} />
                <span>INGERIR NOVO DOCUMENTO NO KNOWLEDGE VAULT</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingModalOpen(false)}
                className="text-[#9dc197] hover:text-[#ff3366] transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSource} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#9dc197]/70">
                  TÍTULO DO MATERIAL / ANOTAÇÃO
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Anotações da Aula de Ponteiros em C ou Ementa de Autômatos"
                  className="mt-1 w-full border border-[#1b3327] bg-[#0d1612] px-3 py-2 text-[#00ff66] outline-none focus:border-[#00ff66]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#9dc197]/70">
                    MATÉRIA / TRILHA
                  </label>
                  <select
                    value={newTrack}
                    onChange={(e) => setNewTrack(e.target.value as TrackId)}
                    className="mt-1 w-full border border-[#1b3327] bg-[#0d1612] px-3 py-2 text-[#00ff66] outline-none focus:border-[#00ff66]"
                  >
                    <option value="csharp">C# OOP (Orientação a Objetos)</option>
                    <option value="c_bases">C Bases (Programação Estruturada)</option>
                    <option value="lfa">LFA & Autômatos (Linguagens Formais)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#9dc197]/70">
                    TIPO DE FONTE
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as KnowledgeSource['type'])}
                    className="mt-1 w-full border border-[#1b3327] bg-[#0d1612] px-3 py-2 text-[#00ff66] outline-none focus:border-[#00ff66]"
                  >
                    <option value="syllabus">Ementa Oficial de Disciplina</option>
                    <option value="notes">Anotações Pessoais de Aula</option>
                    <option value="doc">Documentação Técnica / Artigo</option>
                    <option value="code">Código de Exemplo / Exercícios</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#9dc197]/70">
                  CONTEÚDO DO DOCUMENTO (TEXTO OU MARKDOWN)
                </label>
                <textarea
                  rows={9}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Cole aqui o texto da aula, ementa da faculdade, explicações teóricas ou blocos de código que você quer que o Prof. A.Ilson use como fonte..."
                  className="mt-1 w-full resize-none border border-[#1b3327] bg-[#0d1612] p-3 text-[#00ff66] outline-none focus:border-[#00ff66] font-mono leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-[#1b3327] pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingModalOpen(false)}
                  className="border border-[#1b3327] px-4 py-2 uppercase tracking-widest text-[#9dc197] hover:border-[#ff3366] hover:text-[#ff3366] transition"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="border border-[#00ff66] bg-[#00ff66] px-5 py-2 font-bold uppercase tracking-widest text-black shadow-[0_0_12px_rgba(0,255,102,0.5)] hover:bg-[#33ff77] transition"
                >
                  INGERIR DOCUMENTO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Preview Full Document */}
      {previewSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col border-2 border-[#00ff66] bg-[#0a0f0d] p-6 shadow-[0_0_40px_rgba(0,255,102,0.3)]">
            <div className="flex items-center justify-between border-b border-[#1b3327] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#00ff66]">
                  {previewSource.track.toUpperCase()} // DOCUMENTO DO KNOWLEDGE VAULT
                </span>
                <h3 className="text-base font-bold text-[#00ff66]">{previewSource.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSource(null)}
                className="text-[#9dc197] hover:text-[#ff3366] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto border border-[#1b3327] bg-[#050807] p-4 text-xs font-mono leading-relaxed text-[#9dc197] select-text">
              <pre className="whitespace-pre-wrap font-mono">{previewSource.content}</pre>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#1b3327] pt-3 text-xs">
              <span className="text-[10px] text-[#9dc197]/60">
                {previewSource.wordCount} palavras • Adicionado em {previewSource.createdAt}
              </span>
              <button
                type="button"
                onClick={() => setPreviewSource(null)}
                className="border border-[#00ff66] bg-[#00ff66]/10 px-4 py-1.5 font-bold uppercase tracking-widest text-[#00ff66] hover:bg-[#00ff66] hover:text-black transition"
              >
                FECHAR VISUALIZAÇÃO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
