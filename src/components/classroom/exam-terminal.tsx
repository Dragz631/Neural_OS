import React, { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Send, X, Sparkles, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTypewriter } from '../../hooks/use-typewriter';
import { useNeural } from '../../context/NeuralContext';
import { ollamaService, type FeynmanEvaluation } from '../../services/ai/ollamaService';
import type { TrackId } from '../../types';

interface ExamTerminalProps {
  examStep: number;
  setExamStep: Dispatch<SetStateAction<number>>;
  onAbort: () => void;
  onFinish: () => void;
  onNavigateTab?: (tab: 'sandbox') => void;
}

interface Choice {
  label: string;
  correct?: boolean;
  explanation: string;
}

interface ExamQuestion {
  tag: string;
  prompt: string;
  codeSnippet?: string;
  options: Choice[];
}

interface DiscursiveChallenge {
  tag: string;
  prompt: string;
  idealKeywords: string[];
  sampleIdealContext: string;
  codeSnippet?: string;
}

// ─── Prova da Matriz Database (5 Questões Múltipla Escolha + 1 Discursiva por Matéria) ────

const EXAMS_BY_TRACK: Record<TrackId, { questions: ExamQuestion[]; discursive: DiscursiveChallenge }> = {
  csharp: {
    questions: [
      {
        tag: 'Q1 // SINTAXE & MODIFICADORES',
        prompt: 'Qual modificador de acesso garante que campos ou métodos sejam estritamente inacessíveis fora do escopo da própria classe?',
        options: [
          { label: 'public', correct: false, explanation: 'public torna o membro visível e mutável por qualquer código externo.' },
          { label: 'private', correct: true, explanation: 'Correto! private isola o membro no escopo interno da classe.' },
          { label: 'protected', correct: false, explanation: 'protected permite acesso pelas subclasses derivadas.' },
          { label: 'internal', correct: false, explanation: 'internal permite acesso por qualquer classe dentro do mesmo assembly.' },
        ],
      },
      {
        tag: 'Q2 // PROPRIEDADES AUTOMÁTICAS',
        prompt: 'Qual a sintaxe correta e idiomática em C# para expor leitura pública e restringir a gravação apenas aos métodos internos da classe?',
        options: [
          { label: 'public decimal Saldo { get; private set; }', correct: true, explanation: 'Exato! O acessor get é público e o set é restrito ao escopo privado.' },
          { label: 'private decimal Saldo { get; set; }', correct: false, explanation: 'Incorreto. Isso torna até mesmo a leitura do saldo privada.' },
          { label: 'public decimal Saldo() => get;', correct: false, explanation: 'Incorreto. Erro de sintaxe em propriedades C#.' },
          { label: 'public readonly decimal Saldo;', correct: false, explanation: 'Incorreto. Campos readonly só podem ser gravados no construtor.' },
        ],
      },
      {
        tag: 'Q3 // ALOCAÇÃO DE MEMÓRIA',
        prompt: 'O que acontece na memória gerenciada quando executamos a instrução "Sensor s = new Sensor();"?',
        options: [
          { label: 'O objeto é alocado na Heap gerenciada e a variável local "s" armazena uma referência na Stack.', correct: true, explanation: 'Correto! Reference types vivem na Heap e o ponteiro local reside na Stack frame.' },
          { label: 'Todo o objeto é copiado bit a bit para a Stack sem passar pelo Garbage Collector.', correct: false, explanation: 'Incorreto. Classes são tipos por referência alocados na Heap.' },
          { label: 'A memória é desalocada imediatamente após o encerramento do operador new.', correct: false, explanation: 'Incorreto. A desalocação ocorre de forma assíncrona pelo Garbage Collector.' },
          { label: 'Ocorre boxing automático de todos os campos.', correct: false, explanation: 'Incorreto. Boxing só ocorre ao converter tipos de valor para object/interfaces.' },
        ],
      },
      {
        tag: 'Q4 // HERANÇA & POLIMORFISMO',
        prompt: 'Para que um método da classe base possa ser sobrescrito com novo comportamento em uma subclasse derivada, quais palavras-chave devem ser empregadas?',
        options: [
          { label: 'virtual na classe base e override na classe derivada.', correct: true, explanation: 'Perfeito! virtual autoriza o polimorfismo e override implementa o despacho dinâmico.' },
          { label: 'static na classe base e dynamic na classe derivada.', correct: false, explanation: 'Incorreto. Métodos estáticos não suportam polimorfismo dinâmico.' },
          { label: 'sealed na classe base e new na classe derivada.', correct: false, explanation: 'Incorreto. sealed impede herança e new apenas oculta o método sem polimorfismo.' },
          { label: 'const na classe base e override na classe derivada.', correct: false, explanation: 'Incorreto. const não é aplicável a métodos.' },
        ],
      },
      {
        tag: 'Q5 // ARQUITETURA & INVARIANÇAS',
        prompt: 'Por que o encapsulamento é considerado o pilar fundamental de blindagem de integridade em sistemas financeiros?',
        options: [
          { label: 'Para impedir que código externo atribua saldos negativos ou mutações sem passar pelas validações de negócio.', correct: true, explanation: 'Correto! Encapsulamento protege as invariâncias de negócio e previne bugs de corrupção.' },
          { label: 'Para dobrar a velocidade de compilação da linguagem C#.', correct: false, explanation: 'Incorreto. Encapsulamento é uma decisão de design e segurança de software.' },
          { label: 'Para desabilitar as threads em background do .NET Runtime.', correct: false, explanation: 'Incorreto. Não possui relação com concorrência ou runtime.' },
          { label: 'Para obrigar todas as classes a implementarem IDisposable.', correct: false, explanation: 'Incorreto. IDisposable é para liberação de recursos não gerenciados.' },
        ],
      },
    ],
    discursive: {
      tag: 'Q6 // AVALIAÇÃO DISCURSIVA SOCRÁTICA',
      prompt: 'Explique com rigor técnico: Por que manter campos de estado de uma classe como "private" e expor apenas acessores com validação é essencial para a manutenção de invariâncias de negócio? Dê um exemplo de falha que ocorreria sem esse padrão.',
      idealKeywords: ['private', 'encapsulamento', 'invariância', 'validação', 'saldo', 'estado interno', 'segurança'],
      sampleIdealContext: 'Campos privados garantem que mutações no estado interno passem exclusivamente por métodos ou propriedades que validem pré-condições, prevenindo saldos negativos ou estados corrompidos.',
      codeSnippet: `// Exemplo para sua reflexão:
public class ContaBancaria {
    public decimal Saldo { get; private set; } // Protegido contra escrita externa
    public void Sacar(decimal valor) {
        if (valor > 0 && valor <= Saldo) Saldo -= valor;
    }
}`,
    },
  },
  c_bases: {
    questions: [
      {
        tag: 'Q1 // OPERADORES DE PONTEIRO',
        prompt: 'Qual é a diferença funcional entre os operadores "&" e "*" em relação a ponteiros na linguagem C?',
        options: [
          { label: '"&" obtém o endereço de memória de uma variável e "*" desreferencia para acessar ou modificar o valor naquele endereço.', correct: true, explanation: 'Correto! & = endereço, * = conteúdo desreferenciado.' },
          { label: '"*" obtém o endereço e "&" multiplica o valor do ponteiro.', correct: false, explanation: 'Incorreto. A função de endereço é do operador &.' },
          { label: '"&" aloca memória na Heap e "*" libera a memória.', correct: false, explanation: 'Incorreto. Alocação é realizada por malloc() e liberação por free().' },
          { label: 'Ambos são sinônimos intercambiáveis em tempo de compilação.', correct: false, explanation: 'Incorreto. Possuem funções estritamente opostas.' },
        ],
      },
      {
        tag: 'Q2 // PASSAGEM DE PARÂMETROS',
        prompt: 'Como a linguagem C permite que uma função chamada modifique diretamente o valor de uma variável declarada na função main()?',
        options: [
          { label: 'Passando o endereço de memória da variável com "&" e recebendo como ponteiro na função com "*".', correct: true, explanation: 'Exato! A simulação de passagem por referência em C é feita através de ponteiros.' },
          { label: 'Declarando o parâmetro da função com a palavra-chave "reference".', correct: false, explanation: 'Incorreto. A palavra reference não existe em C.' },
          { label: 'Utilizando passagem normal por valor, pois o compilador C sincroniza a pilha automaticamente.', correct: false, explanation: 'Incorreto. Passagem por valor apenas cria uma cópia isolada na pilha.' },
          { label: 'Tornando a variável "const" antes de passá-la.', correct: false, explanation: 'Incorreto. const impede a modificação.' },
        ],
      },
      {
        tag: 'Q3 // ARITMÉTICA DE PONTEIROS',
        prompt: 'Se "int *p" aponta para o primeiro elemento de um vetor de inteiros (onde sizeof(int) = 4), para onde a expressão "p + 2" apontará?',
        options: [
          { label: 'Avançará exatamente 8 bytes na memória, apontando para o terceiro elemento do vetor (índice 2).', correct: true, explanation: 'Correto! Aritmética de ponteiros multiplica o deslocamento pelo tamanho do tipo (2 * 4 = 8 bytes).' },
          { label: 'Avançará apenas 2 bytes na memória.', correct: false, explanation: 'Incorreto. O compilador C escala automaticamente o deslocamento pelo sizeof do tipo base.' },
          { label: 'Somará o número 2 ao conteúdo do primeiro elemento do vetor.', correct: false, explanation: 'Incorreto. Somar ao conteúdo exigiria *p + 2.' },
          { label: 'Causará erro de compilação imediato.', correct: false, explanation: 'Incorreto. Aritmética de ponteiros é uma operação nativa fundamental em C.' },
        ],
      },
      {
        tag: 'Q4 // GERENCIAMENTO DE MEMÓRIA',
        prompt: 'O que acontece quando um programa em C aloca memória com malloc() mas nunca chama free() antes de encerrar tarefas contínuas?',
        options: [
          { label: 'Ocorre vazamento de memória (Memory Leak), consumindo RAM progressivamente até o esgotamento.', correct: true, explanation: 'Correto! A memória da Heap alocada pelo processo não é devolvida automaticamente sem o free().' },
          { label: 'O Garbage Collector do C libera a memória a cada 10 segundos.', correct: false, explanation: 'Incorreto. C puro não possui Garbage Collector.' },
          { label: 'O compilador gera erro de compilação antes da execução.', correct: false, explanation: 'Incorreto. O compilador não detecta vazamentos dinâmicos em tempo de compilação.' },
          { label: 'A memória é transferida automaticamente para a Stack.', correct: false, explanation: 'Incorreto. A Heap é independente da Stack.' },
        ],
      },
      {
        tag: 'Q5 // STRUCTS & ACESSO A MEMBROS',
        prompt: 'Dado um ponteiro para uma estrutura "Registro *r", qual é a sintaxe canônica para acessar o campo "idade"?',
        options: [
          { label: 'r->idade (que é equivalente a (*r).idade)', correct: true, explanation: 'Perfeito! O operador de seta "->" desreferencia o ponteiro da struct e acessa o membro.' },
          { label: 'r.idade', correct: false, explanation: 'Incorreto. O operador ponto só se aplica a variáveis de struct direta, não a ponteiros.' },
          { label: '*r.idade', correct: false, explanation: 'Incorreto. A precedência do ponto é maior que a do asterisco, causando erro de compilação.' },
          { label: '&r->idade', correct: false, explanation: 'Incorreto. Isso obteria o endereço do campo idade, não seu valor.' },
        ],
      },
    ],
    discursive: {
      tag: 'Q6 // AVALIAÇÃO DISCURSIVA SOCRÁTICA',
      prompt: 'Explique detalhadamente: Como funciona o modelo de memória em C (Stack vs Heap) no contexto de ponteiros? Por que retornar o endereço de uma variável local alocada na Stack a partir de uma função é um erro grave que causa ponteiros selvagens (Dangling Pointers)?',
      idealKeywords: ['stack', 'heap', 'escopo', 'stack frame', 'dangling pointer', 'desalocação', 'ponteiro selvagem', 'malloc'],
      sampleIdealContext: 'Variáveis locais da Stack são destruídas assim que o stack frame da função encerra. Retornar seu endereço faz o ponteiro apontar para memória inválida/sobrescrita.',
      codeSnippet: `// Exemplo do erro crítico:
int *funcaoPerigosa() {
    int x = 42; // Alocado na Stack local
    return &x;  // ERRO: x deixa de existir no retorno da função!
}`,
    },
  },
  lfa: {
    questions: [
      {
        tag: 'Q1 // ALFABETO & PALAVRAS',
        prompt: 'Dado o alfabeto Σ = {0, 1}, qual é a diferença formal entre a palavra vazia (ε) e a linguagem vazia (∅)?',
        options: [
          { label: 'ε é uma palavra com comprimento zero (|ε| = 0), enquanto ∅ é um conjunto que não contém nenhuma palavra (|∅| = 0 elementos).', correct: true, explanation: 'Correto! A linguagem {ε} tem 1 palavra, enquanto ∅ tem 0 palavras.' },
          { label: 'Ambas representam exatamente o mesmo conjunto com 1 elemento.', correct: false, explanation: 'Incorreto. ∅ é o conjunto vazio; {ε} é um conjunto unitário.' },
          { label: 'ε não pertence ao fecho de Kleene Σ*.', correct: false, explanation: 'Incorreto. ε obrigatoriamente pertence a Σ* para qualquer alfabeto.' },
          { label: 'A linguagem vazia aceita qualquer cadeia.', correct: false, explanation: 'Incorreto. A linguagem vazia não aceita nenhuma cadeia.' },
        ],
      },
      {
        tag: 'Q2 // AUTÔMATO DETERMINÍSTICO (AFD)',
        prompt: 'Qual característica define a função de transição δ: Q × Σ → Q de um Autômato Finito Determinístico puro?',
        options: [
          { label: 'Para cada par (estado atual, símbolo lido), existe rigorosamente UMA ÚNICA transição para um único estado de destino.', correct: true, explanation: 'Exato! O determinismo exige função de transição total e unívoca sem bifurcações simultâneas ou ε-transições.' },
          { label: 'Um estado pode ter múltiplos destinos para o mesmo símbolo.', correct: false, explanation: 'Incorreto. Isso caracterizaria um AFN (Não-Determinístico).' },
          { label: 'Transições espontâneas com palavra vazia são permitidas.', correct: false, explanation: 'Incorreto. Transições com ε só existem em AFNs.' },
          { label: 'O autômato possui memória infinita em pilha.', correct: false, explanation: 'Incorreto. Memória em pilha caracteriza Autômatos com Pilha (AP).' },
        ],
      },
      {
        tag: 'Q3 // EQUIVALÊNCIA FORMAL',
        prompt: 'O Teorema de Rabin-Scott (Construção de Subconjuntos) prova qual relação formal entre AFDs e AFNs?',
        options: [
          { label: 'Para todo AFN com N estados, existe um AFD equivalente com no máximo 2^N estados que reconhece rigorosamente a mesma linguagem regular.', correct: true, explanation: 'Correto! O não-determinismo não amplia o poder computacional de reconhecimento de linguagens regulares.' },
          { label: 'AFNs conseguem reconhecer gramáticas livres de contexto e AFDs não.', correct: false, explanation: 'Incorreto. Ambos reconhecem estritamente a mesma classe das linguagens regulares.' },
          { label: 'É impossível converter um AFN com ε-transições em um AFD.', correct: false, explanation: 'Incorreto. O algoritmo de fecho-ε permite a conversão direta.' },
          { label: 'AFDs são mais rápidos para todas as operações matemáticas que Máquinas de Turing.', correct: false, explanation: 'Incorreto. AFDs são modelos de menor poder computacional.' },
        ],
      },
      {
        tag: 'Q4 // EXPRESSÕES REGULARES (REGEX)',
        prompt: 'Qual linguagem regular é descrita pela Expressão Regular r = (0|1)*00 ?',
        options: [
          { label: 'Todas as cadeias binárias que terminam com o sufixo "00".', correct: true, explanation: 'Perfeito! (0|1)* aceita qualquer prefixo binário e "00" força os dois últimos dígitos a serem zeros.' },
          { label: 'Apenas cadeias que contenham exatamente dois zeros no total.', correct: false, explanation: 'Incorreto. O prefixo (0|1)* pode conter outros zeros.' },
          { label: 'Cadeias binárias de comprimento par.', correct: false, explanation: 'Incorreto. O comprimento pode ser ímpar (ex: "100" tem tamanho 3).' },
          { label: 'Apenas a cadeia "00".', correct: false, explanation: 'Incorreto. "00" é uma das cadeias, mas qualquer prefixo é aceito.' },
        ],
      },
      {
        tag: 'Q5 // HIERARQUIA DE CHOMSKY & LIMITES',
        prompt: 'Por que a linguagem L = {a^n b^n | n ≥ 0} NÃO pode ser reconhecida por nenhum Autômato Finito (AFD ou AFN)?',
        options: [
          { label: 'Porque autômatos finitos possuem memória finita e não conseguem contar uma quantidade arbitrária de "a"s para comparar com "b"s (provado pelo Lema do Bombeamento).', correct: true, explanation: 'Correto! Contagem ilimitada exige Autômato com Pilha ou Gramática Livre de Contexto.' },
          { label: 'Porque o alfabeto só aceita caracteres maiúsculos.', correct: false, explanation: 'Incorreto. Símbolos do alfabeto podem ser quaisquer caracteres.' },
          { label: 'Porque a palavra vazia não é permitida.', correct: false, explanation: 'Incorreto. Para n=0 a palavra vazia pertence à linguagem.' },
          { label: 'Porque a linguagem é indecidível em Máquinas de Turing.', correct: false, explanation: 'Incorreto. A linguagem é decidível e livre de contexto.' },
        ],
      },
    ],
    discursive: {
      tag: 'Q6 // AVALIAÇÃO DISCURSIVA SOCRÁTICA',
      prompt: 'Explique formalmente: O que é o determinismo em um Autômato Finito (AFD) e como o algoritmo de Construção de Subconjuntos permite converter um Autômato Não-Determinístico (AFN) em um AFD equivalente sem perda de capacidade de reconhecimento de linguagem?',
      idealKeywords: ['determinismo', 'função de transição total', 'construção de subconjuntos', 'afn', 'afd', 'conjunto das partes', 'potência', 'estados finais'],
      sampleIdealContext: 'Cada estado do AFD resultante representa um conjunto de estados simultâneos do AFN original, preservando a semântica da linguagem.',
      codeSnippet: `// Transição de Subconjunto:
// Se no AFN delta(q0, 'a') = {q1, q2},
// No AFD o novo macro-estado é Q_{q1,q2} = {q1, q2}.`,
    },
  },
};

const TOTAL_CHOICE_QUESTIONS = 5;

export const ExamTerminal: React.FC<ExamTerminalProps> = ({
  examStep,
  setExamStep,
  onAbort,
  onFinish,
  onNavigateTab,
}) => {
  const { activeTrack, aiConfig, recordExamCompletion, exportToSandbox } = useNeural();
  const examData = EXAMS_BY_TRACK[activeTrack];

  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);

  const [discursiveAnswer, setDiscursiveAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<FeynmanEvaluation>({
    score: 85,
    passed: true,
    feedback: '>_ PROF. A.ILSON: "Conceito fundamentado com clareza. Você demonstrou domínio das invariâncias de estado e vocabulário canônico. Nó neural validado!"',
    formalCorrection: 'Definição formal satisfatória com base no Knowledge Vault.',
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isChoiceStep = examStep < TOTAL_CHOICE_QUESTIONS;
  const isDiscursiveStep = examStep === TOTAL_CHOICE_QUESTIONS;
  const isResultStep = examStep > TOTAL_CHOICE_QUESTIONS;

  const currentQuestion = examData.questions[examStep];
  const discursiveChallenge = examData.discursive;

  const { output: evalOutput, done: evalDone } = useTypewriter(
    isResultStep ? evalResult.feedback : '',
    16,
    80
  );

  useEffect(() => {
    if (isDiscursiveStep) {
      textareaRef.current?.focus();
    }
  }, [isDiscursiveStep]);

  const handleSelectOption = (index: number) => {
    if (selectedChoiceIdx !== null) return;
    setSelectedChoiceIdx(index);
    setShowExplanation(true);

    const isCorrect = currentQuestion.options[index].correct;
    if (isCorrect) {
      setUserScore((s) => s + 15);
    }
    setUserAnswers((prev) => [...prev, index]);
  };

  const handleNextStep = () => {
    setSelectedChoiceIdx(null);
    setShowExplanation(false);
    setExamStep((s) => s + 1);
  };

  const handleSubmitDiscursive = async () => {
    if (!discursiveAnswer.trim()) return;
    setEvaluating(true);

    try {
      const evaluation = await ollamaService.evaluateFeynman(
        discursiveChallenge.prompt,
        discursiveAnswer,
        aiConfig.endpoint,
        aiConfig.selectedModel
      );
      setEvalResult(evaluation);
      setExamStep(TOTAL_CHOICE_QUESTIONS + 1);
    } catch {
      setExamStep(TOTAL_CHOICE_QUESTIONS + 1);
    } finally {
      setEvaluating(false);
    }
  };

  const handleFinishExam = () => {
    const finalScore = Math.min(100, Math.round(userScore + (evalResult.passed ? evalResult.score * 0.25 : 0)));
    recordExamCompletion(`Prova da Matriz // ${activeTrack.toUpperCase()}`, finalScore, evalResult.passed);
    onFinish();
  };

  const handleExportDiscursiveCode = () => {
    if (discursiveChallenge.codeSnippet) {
      exportToSandbox(discursiveChallenge.codeSnippet, activeTrack, `Prova da Matriz: ${discursiveChallenge.tag}`, 'professor');
      onNavigateTab?.('sandbox');
      onAbort();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Terminal de Avaliação Formal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-mono text-[#9dc197]"
    >
      {/* Dim backdrop */}
      <button
        type="button"
        aria-label="Fechar prova"
        onClick={onAbort}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />

      {/* Terminal window */}
      <div className="relative flex w-full max-w-3xl flex-col border-2 border-[#00ff66] bg-[#0a0f0d] shadow-[0_0_60px_rgba(0,255,102,0.35)] max-h-[90vh] overflow-y-auto">
        {/* Title bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1b3327] bg-[#090e0a] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#00ff66] animate-pulse shadow-[0_0_8px_#00ff66]" />
            <span className="font-mono text-xs tracking-widest text-[#00ff66] font-bold">
              {'>_ THE_EXAM_CORE // PROVA DA MATRIZ: '} {activeTrack.toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={onAbort}
            aria-label="Abortar"
            className="text-[#9dc197] transition hover:text-[#ff3366]"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Progress ticker */}
        <div className="flex items-center gap-2 border-b border-[#1b3327] bg-[#0d1612] px-4 py-2 text-xs">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9dc197]/60">
            ETAPA DA PROVA:
          </span>
          <div className="flex flex-1 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 transition-all ${
                  i < examStep ? 'bg-[#00ff66] shadow-[0_0_6px_#00ff66]' : 'bg-[#1b3327]'
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] text-[#00ff66] font-bold">
            {Math.min(examStep + 1, 6)}/6
          </span>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Steps 0 to 4: Multiple Choice */}
          {isChoiceStep && currentQuestion && (
            <div className="space-y-4">
              <div>
                <span className="border border-[#00ff66]/40 bg-[#00ff66]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#00ff66]">
                  {currentQuestion.tag}
                </span>
                <p className="mt-3 text-sm sm:text-base font-bold text-[#00ff66] leading-relaxed">
                  {currentQuestion.prompt}
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2.5">
                {currentQuestion.options.map((opt, optIdx) => {
                  const isSelected = selectedChoiceIdx === optIdx;
                  const isCorrect = opt.correct;

                  let buttonStyles = 'border-[#1b3327] bg-[#0d1612] text-[#9dc197] hover:border-[#00ff66] hover:bg-[#00ff66]/5';
                  if (showExplanation) {
                    if (isCorrect) {
                      buttonStyles = 'border-[#00ff66] bg-[#00ff66]/20 text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.3)]';
                    } else if (isSelected && !isCorrect) {
                      buttonStyles = 'border-[#ff3366] bg-[#ff3366]/20 text-[#ff3366]';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={selectedChoiceIdx !== null}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`group flex items-start gap-3 border p-3.5 text-left font-mono text-xs sm:text-sm transition-all ${buttonStyles}`}
                    >
                      <span className="font-bold shrink-0 mt-0.5">
                        [{String.fromCharCode(65 + optIdx)}] &gt;
                      </span>
                      <div className="flex-1">
                        <span>{opt.label}</span>
                        {showExplanation && (isSelected || isCorrect) && (
                          <p className={`mt-2 text-[11px] font-mono leading-relaxed border-t pt-1.5 ${isCorrect ? 'border-[#00ff66]/40 text-[#00ff66]' : 'border-[#ff3366]/40 text-[#ff3366]'}`}>
                            <strong>{isCorrect ? '✓ RESPOSTA CORRETA: ' : '✗ RESPOSTA INCORRETA: '}</strong>
                            {opt.explanation}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {showExplanation && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 border-2 border-[#00ff66] bg-[#00ff66] px-6 py-2.5 font-bold uppercase tracking-widest text-black shadow-[0_0_15px_rgba(0,255,102,0.6)] hover:bg-[#33ff77] transition"
                  >
                    <span>{examStep < 4 ? 'PRÓXIMA QUESTÃO' : 'AVANÇAR PARA A QUESTÃO DISCURSIVA'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Discursive Feynman Question */}
          {isDiscursiveStep && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#00ff66] font-bold">
                  <Sparkles size={13} /> {discursiveChallenge.tag}
                </div>
                <p className="mt-2 text-sm sm:text-base font-bold text-[#00ff66] leading-relaxed">
                  {discursiveChallenge.prompt}
                </p>
              </div>

              {discursiveChallenge.codeSnippet && (
                <div className="border border-[#1b3327] bg-[#050807] p-3 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-[#1b3327] pb-1.5 mb-1.5 text-[9px] text-[#00ff66] uppercase tracking-widest font-bold">
                    <span>CÓDIGO DE APOIO DA QUESTÃO</span>
                    <button
                      type="button"
                      onClick={handleExportDiscursiveCode}
                      className="text-[#00ff66] hover:underline"
                    >
                      [ EXPORTAR PARA SANDBOX ]
                    </button>
                  </div>
                  <pre className="text-[#00ff66] text-[11px] leading-relaxed overflow-x-auto">
                    {discursiveChallenge.codeSnippet}
                  </pre>
                </div>
              )}

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-3 font-mono text-sm text-[#00ff66]">
                  {'>'}
                </span>
                <textarea
                  ref={textareaRef}
                  value={discursiveAnswer}
                  onChange={(e) => setDiscursiveAnswer(e.target.value)}
                  rows={6}
                  placeholder="Escreva sua explicação técnica formal com suas próprias palavras aqui..."
                  className="w-full resize-none border-2 border-[#1b3327] bg-[#0d1612] p-3 pl-7 font-mono text-xs sm:text-sm text-[#00ff66] caret-[#00ff66] outline-none placeholder:text-[#9dc197]/30 focus:border-[#00ff66] focus:shadow-[0_0_15px_rgba(0,255,102,0.2)]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-[10px] text-[#9dc197]/60">
                  // O Prof. A.Ilson analisa vocabulário canônico e causalidade conceitual.
                </span>

                <button
                  type="button"
                  onClick={handleSubmitDiscursive}
                  disabled={discursiveAnswer.trim().length === 0 || evaluating}
                  className="flex items-center justify-center gap-2 border-2 border-[#00ff66] bg-[#00ff66] px-6 py-2.5 font-mono text-xs font-bold tracking-widest text-black transition-all hover:bg-[#33ff77] disabled:opacity-40 shadow-[0_0_15px_rgba(0,255,102,0.4)]"
                >
                  <Send className="h-3.5 w-3.5" />
                  {evaluating ? 'AVALIANDO COM O PROF. A.ILSON...' : 'SUBMETER AVALIAÇÃO DISCURSIVA'}
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Evaluation Results */}
          {isResultStep && (
            <div className="space-y-4">
              <div
                className={`border p-5 ${
                  evalResult.passed
                    ? 'border-[#00ff66]/70 bg-[#00ff66]/10 text-[#00ff66]'
                    : 'border-[#ff3366]/70 bg-[#ff3366]/10 text-[#ff3366]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-current pb-2 mb-3 text-xs font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    {evalResult.passed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>AVALIAÇÃO DO PROF. A.ILSON // NOTA: {evalResult.score}/100</span>
                  </div>
                  <span>{evalResult.passed ? '✓ APROVADO NA MATRIZ' : '⚠ REVISÃO SOLICITADA'}</span>
                </div>

                <p className="font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {evalOutput}
                  {!evalDone && (
                    <span className="ml-1 inline-block h-3.5 w-2 animate-pulse bg-current align-middle" />
                  )}
                </p>

                {evalResult.formalCorrection && (
                  <p className="mt-3 text-[11px] text-[#9dc197]/80 italic border-t border-current/30 pt-2">
                    Síntese canônica do Knowledge Vault: {evalResult.formalCorrection}
                  </p>
                )}
              </div>

              {/* Objective questions answers summary */}
              <div className="border border-[#1b3327] bg-[#050807] p-3 text-[11px] space-y-1.5">
                <span className="text-[#00ff66] font-bold block text-[10px] uppercase tracking-widest">
                  RESUMO DAS RESPOSTAS OBJETIVAS ({userAnswers.length} QUESTÕES PROCESSADAS):
                </span>
                <div className="flex gap-2 flex-wrap">
                  {userAnswers.map((ansIdx, qIdx) => (
                    <span key={qIdx} className="border border-[#1b3327] bg-[#0d1612] px-2 py-0.5 text-[10px] text-[#9dc197]">
                      Q{qIdx + 1}: [{String.fromCharCode(65 + ansIdx)}]
                    </span>
                  ))}
                </div>
              </div>

              {evalResult.passed && (
                <div className="border border-[#00ff66]/40 bg-black/50 p-3 text-[10px] uppercase tracking-widest text-[#00ff66] flex items-center justify-between">
                  <span>RECOMPENSA DE MATRIZ: +150 XP</span>
                  <span>ÁRVORE NEURAL: NÓ VALIDADO COM SUCESSO</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleFinishExam}
                  className="border-2 border-[#00ff66] bg-[#00ff66] px-6 py-2.5 font-mono text-xs font-bold tracking-widest text-black shadow-[0_0_20px_rgba(0,255,102,0.6)] hover:bg-[#33ff77] transition"
                >
                  {evalResult.passed ? 'CONSOLIDAR NOTA & RETORNAR' : 'REVISAR FONTES NO KNOWLEDGE VAULT'}
                </button>
              </div>
            </div>
          )}

          {/* Abort button when not on result */}
          {!isResultStep && (
            <div className="flex justify-start border-t border-[#1b3327] pt-3">
              <button
                type="button"
                onClick={onAbort}
                className="border border-[#1b3327] px-4 py-2 font-mono text-xs tracking-widest text-[#9dc197]/70 transition hover:border-[#ff3366] hover:text-[#ff3366]"
              >
                ABORTAR AVALIAÇÃO
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
