import React, { useEffect, useState } from 'react';
import { PlayCircle, RefreshCw, Code2, BookOpen } from 'lucide-react';
import { useNeural } from '../../context/NeuralContext';
import { ollamaService, type ClassroomLectureData } from '../../services/ai/ollamaService';
import type { TrackId } from '../../types';

interface BlackboardProps {
  onStartExam: () => void;
  onNavigateTab?: (tab: 'sandbox') => void;
}

interface TopicPreset {
  title: string;
  lecture: ClassroomLectureData;
  snippet: string;
}

const CANONICAL_TOPICS: Record<TrackId, TopicPreset[]> = {
  c_bases: [
    {
      title: 'Ponteiros, Memória Física e Operadores & e *',
      lecture: {
        topic: 'C BASES // Ponteiros, Memória Física e Endereços',
        whyItExists: 'C foi projetada para dar controle determinístico e de baixo nível sobre a arquitetura do processador e memória RAM, sem overhead de garbage collector.',
        whereToLook: 'K&R ("The C Programming Language"), ISO C11 Standard e fontes ativas no Knowledge Vault.',
        blackboardAdvice: 'Lembre-se: variáveis são endereços na pilha (Stack). O operador & extrai o endereço; o operador * desreferencia o ponteiro.',
        realWorldScenario: 'Sistemas operacionais (Linux/Windows Kernel), drivers de hardware e emuladores de alta performance.',
      },
      snippet: `// Exemplo Canônico C Bases (Ponteiros e Passagem por Referência):
#include <stdio.h>

void duplicarValor(int *ptr) {
    if (ptr != NULL) {
        *ptr = (*ptr) * 2;
    }
}

int main() {
    int vida = 50;
    duplicarValor(&vida);
    printf("Vida Duplicada: %d\\n", vida); // Saída: 100
    return 0;
}`,
    },
    {
      title: 'Função main, Header stdio.h e I/O Formatado',
      lecture: {
        topic: 'C BASES // Ponto de Entrada main e Entrada/Saída com printf/scanf',
        whyItExists: 'Garante que o runtime C estabeleça o ponto de entrada padrão pelo SO, com retorno inteiro de status (0 = sucesso).',
        whereToLook: 'Man pages do GCC (man 3 printf, man 3 scanf) e Vault.',
        blackboardAdvice: 'Sempre passe &variavel no scanf para passar o ponteiro do buffer de destino na memória.',
        realWorldScenario: 'CLIs de infraestrutura, utilitários Unix e firmware embarcado.',
      },
      snippet: `// Exemplo Canônico C (Entrada e Saída com scanf e printf):
#include <stdio.h>

int main() {
    int nivel = 1;
    printf("Digite o nível do operador: ");
    if (scanf("%d", &nivel) == 1) {
        printf("[SISTEMA] Nível configurado para: %d\\n", nivel);
    }
    return 0;
}`,
    },
    {
      title: 'Structs, Tipos Definidos (typedef) e Agrupamento',
      lecture: {
        topic: 'C BASES // Estruturas Heterogêneas (structs) e typedef',
        whyItExists: 'Permite compor tipos de dados complexos em blocos contíguos de memória sem sobrecarga orientada a objetos.',
        whereToLook: 'Documentação da glibc e livros de Estrutura de Dados.',
        blackboardAdvice: 'Use typedef struct { ... } Nome; para simplificar declarações no código.',
        realWorldScenario: 'Cabeçalhos de pacotes de rede (TCP/IP) e estruturas de tabelas de partições.',
      },
      snippet: `// Exemplo Canônico C (Structs e typedef):
#include <stdio.h>

typedef struct {
    int id;
    int nivel;
    char tag[16];
} Operador;

int main() {
    Operador op = { .id = 101, .nivel = 3, .tag = "HUGO_DEV" };
    printf("Operador %s // Nível %d\\n", op.tag, op.nivel);
    return 0;
}`,
    },
  ],
  lfa: [
    {
      title: 'Autômatos Finitos Determinísticos (AFD) e 5-Tupla Formal',
      lecture: {
        topic: 'LFA // Autômatos Finitos Determinísticos (AFD) e 5-Tupla',
        whyItExists: 'Para formalizar matematicamente o que uma máquina computacional com memória finita é capaz de reconhecer (Linguagens Regulares).',
        whereToLook: 'Hopcroft & Ullman ("Introdução à Teoria de Autômatos"), Michael Sipser e fontes ativas do Vault.',
        blackboardAdvice: 'Um AFD é uma 5-tupla M = (Q, Sigma, delta, q0, F). A cada símbolo lido da cadeia, a transição delta(q, a) leva a exatamente UM estado.',
        realWorldScenario: 'Analisadores léxicos de compiladores (Lex/Flex), parsers de protocolos de rede e validação de Regex.',
      },
      snippet: `// Exemplo Canônico LFA (AFD: Reconhecedor de Cadeias com Final '1'):
// M = (Q={q0, q1}, Sigma={0, 1}, delta, q0, F={q1})
// delta(q0, '0') = q0; delta(q0, '1') = q1;
// delta(q1, '0') = q0; delta(q1, '1') = q1;

{
  "alfabeto": ["0", "1"],
  "estados": ["q0", "q1"],
  "inicial": "q0",
  "finais": ["q1"],
  "transicoes": {
    "q0,0": "q0",
    "q0,1": "q1",
    "q1,0": "q0",
    "q1,1": "q1"
  }
}`,
    },
    {
      title: 'Autômatos Finitos Não-Determinísticos (AFN) e Transições-Epsilon',
      lecture: {
        topic: 'LFA // AFN, Não-Determinismo e Múltiplos Caminhos de Computação',
        whyItExists: 'Simplifica o desenho e a modelagem de linguagens complexas permitindo múltiplos estados ativos simultaneamente e transições sem consumo de símbolo.',
        whereToLook: 'Teoria da Computação e algoritmos de conversão AFN->AFD.',
        blackboardAdvice: 'Uma cadeia é aceita por um AFN se PELO MENOS UM dos caminhos computacionais terminar em um estado de aceitação em F.',
        realWorldScenario: 'Motores de Regex com backtracking ou Thompson NFA (grep, ripgrep).',
      },
      snippet: `// Exemplo Canônico LFA (AFN com múltiplos caminhos):
// Aceita cadeias contendo a substring '01'
{
  "alfabeto": ["0", "1"],
  "estados": ["q0", "q1", "q2"],
  "inicial": "q0",
  "finais": ["q2"],
  "transicoes": {
    "q0,0": ["q0", "q1"],
    "q0,1": ["q0"],
    "q1,1": ["q2"],
    "q2,0": ["q2"],
    "q2,1": ["q2"]
  }
}`,
    },
    {
      title: 'Expressões Regulares & Hierarquia de Chomsky',
      lecture: {
        topic: 'LFA // Gramáticas Regulares (Tipo 3) e Hierarquia de Chomsky',
        whyItExists: 'Classifica linguagens formais por poder gerativo, distinguindo linguagens regulares de linguagens livres de contexto.',
        whereToLook: 'Hierarquia de Chomsky e Teorema de Kleene.',
        blackboardAdvice: 'Gramáticas Regulares só possuem produções A -> aB ou A -> a (lineares à direita) ou A -> Ba (lineares à esquerda).',
        realWorldScenario: 'Gramáticas de linguagens de programação e parsers sintáticos (Yacc/Bison/ANTLR).',
      },
      snippet: `// Exemplo Canônico LFA (Gramática Regular Tipo 3):
// G = (Vn={S, A}, Vt={0, 1}, P, S)
// Produções:
// S -> 0S | 1A
// A -> 1A | 0S | eps (finaliza com 1)`,
    },
  ],
  csharp: [
    {
      title: 'Encapsulamento, Propriedades e Estado Seguro',
      lecture: {
        topic: 'C# OOP // Encapsulamento, Propriedades e Estado Seguro',
        whyItExists: 'Para o estado interno dos objetos não ser violado ou mutado por agentes externos, garantindo invariâncias e contratos de negócio.',
        whereToLook: 'Documentação oficial da Microsoft (.NET 9 / C# 13) e livros de Arquitetura de Software no Vault.',
        blackboardAdvice: 'Mantenha campos como private _field e exponha apenas propriedades public get / init / set com validação.',
        realWorldScenario: 'Sistemas bancários, motores de jogos (Unity) e microsserviços corporativos de alta escala.',
      },
      snippet: `// Exemplo Canônico C# (Encapsulamento e Invariâncias):
using System;

public class ContaSegura {
    private decimal _saldo;
    public decimal Saldo => _saldo;

    public void Depositar(decimal valor) {
        if (valor > 0) {
            _saldo += valor;
            Console.WriteLine($"[KERNEL] Deposito de R$ {valor} confirmado.");
        }
    }
}`,
    },
    {
      title: 'Construtores, Sobrecarga e Imutabilidade com init',
      lecture: {
        topic: 'C# OOP // Construtores, Inicialização Segura e Records',
        whyItExists: 'Garante que um objeto nunca nasça em estado inválido ou incompleto na memória gerenciada (Heap).',
        whereToLook: 'Microsoft Learn (.NET Constructors and Records) e Clean Code.',
        blackboardAdvice: 'Use construtores para exigir todas as dependências essenciais do objeto na criação.',
        realWorldScenario: 'DTOs imutáveis em APIs REST e entidades de domínio em DDD.',
      },
      snippet: `// Exemplo Canônico C# (Construtor e Auto-Properties com init):
using System;

public class OperadorNeural {
    public string Nome { get; }
    public int Nivel { get; private set; }

    public OperadorNeural(string nome, int nivelInicial = 1) {
        Nome = nome ?? throw new ArgumentNullException(nameof(nome));
        Nivel = nivelInicial;
    }
}`,
    },
    {
      title: 'Herança, Polimorfismo e Contratos com Interfaces',
      lecture: {
        topic: 'C# OOP // Interfaces (Contratos) e Polimorfismo',
        whyItExists: 'Permite desacoplamento entre componentes, facilitando testes unitários, injeção de dependências e extensibilidade sem alterar código existente (OCP).',
        whereToLook: 'Princípios SOLID e Microsoft.Extensions.DependencyInjection.',
        blackboardAdvice: 'Programe para interfaces, não para implementações concretas.',
        realWorldScenario: 'Sistemas de pagamento múltiplos (Pix, Cartão, Boleto) sob a interface IPagamentoService.',
      },
      snippet: `// Exemplo Canônico C# (Interfaces e Polimorfismo):
using System;

public interface IAutenticavel {
    bool ValidarToken(string token);
}

public class OperadorAdmin : IAutenticavel {
    public bool ValidarToken(string token) => token == "NEURAL_ROOT_KEY";
}`,
    },
  ],
};

export const Blackboard: React.FC<BlackboardProps> = ({ onStartExam, onNavigateTab }) => {
  const { activeSession, aiConfig, activeTrack, sources, exportToSandbox, studyTelemetry } = useNeural();
  
  const activeSourcesForTrack = sources.filter((s) => s.track === activeTrack && s.active);
  const trackTopics = CANONICAL_TOPICS[activeTrack] || CANONICAL_TOPICS.csharp;
  
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number>(0);
  const currentPreset = trackTopics[selectedTopicIndex % trackTopics.length] || trackTopics[0];

  const [loading, setLoading] = useState(false);
  const [lecture, setLecture] = useState<ClassroomLectureData>(currentPreset.lecture);

  // Sync lecture state when active track or preset changes
  useEffect(() => {
    setSelectedTopicIndex(0);
    setLecture(trackTopics[0]?.lecture || currentPreset.lecture);
  }, [activeTrack]);

  const handleSelectTopic = (index: number) => {
    setSelectedTopicIndex(index);
    const preset = trackTopics[index];
    if (preset) {
      setLecture(preset.lecture);
    }
  };

  const getCodeSnippetForTrack = () => {
    return currentPreset.snippet;
  };

  const fetchLecture = async () => {
    setLoading(true);
    try {
      const sourceContext = activeSourcesForTrack.map((s) => s.content).join('\n\n').slice(0, 3000);
      const telemetrySummary = studyTelemetry
        .filter((t) => t.track === activeTrack)
        .slice(0, 3)
        .map((t) => `Desafio resolvido: ${t.challengeTitle} (Skills: ${t.skills.join(', ')})`)
        .join('; ');

      const combinedContext = `${sourceContext}\n\nTelemetria de Desempenho do Aluno na Sandbox: ${telemetrySummary || 'Iniciando estudos da trilha.'}`;

      const data = await ollamaService.generateLecture(
        currentPreset.title,
        combinedContext || (activeSession?.notesSummary || []).join('; '),
        aiConfig.endpoint,
        aiConfig.selectedModel
      );
      setLecture(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleExportExample = () => {
    const snippet = getCodeSnippetForTrack();
    exportToSandbox(snippet, activeTrack, `Quadro Negro: ${lecture.topic}`, 'professor');
    onNavigateTab?.('sandbox');
  };

  const steps = [
    {
      label: '1. POR QUE EXISTE',
      text: lecture.whyItExists,
    },
    {
      label: '2. ONDE VER & PESQUISAR',
      text: `${lecture.whereToLook} (${activeSourcesForTrack.length} fontes ativas no Knowledge Vault)`,
    },
    {
      label: '3. NA LOUSA // SITUAÇÃO PRÁTICA',
      text: `${lecture.blackboardAdvice} ${lecture.realWorldScenario ? `(${lecture.realWorldScenario})` : ''}`,
    },
  ];

  return (
    <section className="font-mono">
      <div
        className="relative flex h-full min-h-[560px] flex-col border-4 border-[#1b3327] bg-[#090e0a] p-6 sm:p-10 shadow-2xl"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(0,255,102,0.04) 0, transparent 40%), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
        }}
      >
        {/* Top Blackboard Label & Refresh Button */}
        <div className="flex items-center justify-between border-b border-[#1b3327]/60 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00ff66] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00ff66]">
              HOLO_BOARD // QUADRO NEGRO DO PROF. A.ILSON [TRILHA: {activeTrack.toUpperCase()}]
            </span>
          </div>
          <button
            type="button"
            onClick={fetchLecture}
            disabled={loading}
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#9dc197]/70 hover:text-[#00ff66] transition border border-[#1b3327] bg-[#0d1612] px-2.5 py-1"
            title="Regenerar síntese com base no Knowledge Vault e Telemetria"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            {loading ? 'SINTETIZANDO COM RAG...' : 'RE-SINTETIZAR QUADRO'}
          </button>
        </div>

        {/* Topic Selector Pills for Active Track */}
        <div className="mt-4 flex items-center gap-2 flex-wrap border-b border-[#1b3327]/40 pb-3">
          <span className="text-[10px] text-[#9dc197]/60 uppercase font-bold flex items-center gap-1">
            <BookOpen size={12} />
            <span>TÓPICOS DA EMENTA:</span>
          </span>
          {trackTopics.map((tp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectTopic(idx)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition border ${
                selectedTopicIndex === idx
                  ? 'border-[#00ff66] bg-[#00ff66]/15 text-[#00ff66] shadow-[0_0_8px_rgba(0,255,102,0.3)]'
                  : 'border-[#1b3327] bg-[#050807] text-[#9dc197]/70 hover:border-[#00ff66]/50 hover:text-[#00ff66]'
              }`}
            >
              {tp.title}
            </button>
          ))}
        </div>

        {/* Title */}
        <div className="mt-4">
          <h2 className="font-mono text-2xl leading-tight text-[#00ff66] sm:text-3xl">
            <span className="text-[#9dc197]/70">HOJE APRENDEMOS: </span>
            <span style={{ textShadow: '0 0 12px rgba(0,255,102,0.6)' }}>
              {lecture.topic}
            </span>
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-[#9dc197]/60">
            Escopo fundamentado em {activeSourcesForTrack.length} documento(s) ativo(s) do Knowledge Vault // Telemetria ativa
          </p>
        </div>

        <div className="mt-5 h-px w-full bg-gradient-to-r from-[#1b3327] via-[#00ff66]/40 to-transparent" />

        {/* Lecture Steps */}
        <ol className="mt-5 flex flex-col gap-4">
          {steps.map((step) => (
            <li key={step.label} className="font-mono">
              <p
                className="text-sm sm:text-base text-[#00ff66] font-bold tracking-wide"
                style={{ textShadow: '0 0 6px rgba(0,255,102,0.4)' }}
              >
                {step.label}
              </p>
              <p className="mt-1 pl-4 text-xs sm:text-sm leading-relaxed text-[#9dc197] border-l-2 border-[#1b3327]">
                {step.text}
              </p>
            </li>
          ))}
        </ol>

        {/* Code Example Preview on Blackboard */}
        <div className="mt-5 border border-[#1b3327] bg-[#050807] p-4 text-xs">
          <div className="flex items-center justify-between border-b border-[#1b3327] pb-2 mb-2 text-[10px] text-[#00ff66] uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5">
              <Code2 size={13} /> EXEMPLO TÁTICO NO QUADRO // {activeTrack.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={handleExportExample}
              className="flex items-center gap-1 text-[#00ff66] hover:underline"
            >
              [ COPIAR SNIPPET PARA SANDBOX &gt; ]
            </button>
          </div>
          <pre className="overflow-x-auto text-[#00ff66] font-mono text-[11px] leading-relaxed select-all">
            {getCodeSnippetForTrack()}
          </pre>
        </div>

        {/* Exam & Actions Footer */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#1b3327]/60">
          <button
            type="button"
            onClick={handleExportExample}
            className="flex items-center gap-2 border border-[#1b3327] bg-[#0d1612] px-4 py-2.5 text-xs text-[#9dc197] hover:border-[#00ff66] hover:text-[#00ff66] transition"
          >
            <Code2 size={14} />
            <span>TESTAR CÓDIGO NA SANDBOX</span>
          </button>

          <button
            type="button"
            onClick={onStartExam}
            className="group flex items-center gap-3 border-2 border-[#00ff66] bg-[#0a0f0d] px-6 py-3 font-mono text-xs sm:text-sm tracking-widest text-[#00ff66] transition-all hover:bg-[#00ff66] hover:text-[#0a0f0d] shadow-[0_0_15px_rgba(0,255,102,0.4)] hover:shadow-[0_0_25px_rgba(0,255,102,0.8)]"
          >
            <PlayCircle className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-bold">[ GERAR PROVA DA MATRIZ DO PROFESSOR ]</span>
          </button>
        </div>
      </div>
    </section>
  );
};
