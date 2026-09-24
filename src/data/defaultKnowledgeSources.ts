import type { KnowledgeSource } from '../types';

export const DEFAULT_KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  // ─── TRILHA C# OOP ────────────────────────────────────────────────────────
  {
    id: 'src_csharp_poo_core',
    title: 'Ementa C#: Paradigma Orientado a Objetos e Encapsulamento',
    track: 'csharp',
    type: 'syllabus',
    active: true,
    createdAt: '2026-08-20',
    wordCount: 840,
    summary: 'Classes, instâncias, modificadores de acesso (private, public, protected), auto-properties e integridade de estado.',
    content: `# C# // PARADIGMAS DE PROGRAMAÇÃO & ORIENTAÇÃO A OBJETOS

## 1. Classes, Instâncias e Ciclo de Vida
- Uma **classe** é a planta conceitual (molde) que define tipos definidos pelo usuário na heap gerenciada.
- O operador \`new\` aloca memória na **Heap** e aciona o **Construtor** da classe para inicializar campos.
- Exemplo canônico:
\`\`\`csharp
public class SensorNeural {
    private double _temperatura;
    public string Identificador { get; private set; }

    public SensorNeural(string id, double tempInicial) {
        Identificador = id;
        _temperatura = tempInicial;
    }
}
\`\`\`

## 2. Encapsulamento e Invariâncias de Negócio
- **Encapsulamento** é o mecanismo de isolar o estado interno de um objeto, impedindo mutações espúrias por agentes externos.
- Campos de dados devem ser mantidos como \`private\` (com convenção de sublinhado inicial, ex: \`_saldo\`).
- O acesso seguro é exposto através de **Propriedades** (\`Properties\`) com acessores controlados:
  - \`get\`: Leitura do valor.
  - \`private set\` ou \`init\`: Modificação restrita apenas aos métodos internos da própria classe ou na inicialização.
- Se o estado de uma conta bancária puder ser modificado sem passar por uma validação de regras de negócio, o sistema corre risco de corrupção ou injeção de valores negativos.

## 3. Construtores & Construtores Primários (C# 12+)
- Construtores asseguram que uma instância nunca nasça em estado inválido ou incompleto.
- Suportam sobrecarga (*overloading*) de assinaturas.

## 4. Herança, Polimorfismo e Classes Abstratas
- A herança estabelece a relação "É-UM" (\`class SubClasse : SuperClasse\`).
- A palavra-chave \`virtual\` na classe base autoriza a redefinição de comportamento.
- A palavra-chave \`override\` na subclasse implementa o comportamento polimórfico especializado.
- A palavra-chave \`base\` referencia construtores e métodos da superclasse.
- **Interfaces** (\`interface IProcessador\`) definem contratos puros sem estado, viabilizando inversão de dependência.`
  },
  {
    id: 'src_csharp_memory',
    title: 'Anotações: Memória Stack vs Heap & Garbage Collector em C#',
    track: 'csharp',
    type: 'notes',
    active: true,
    createdAt: '2026-08-22',
    wordCount: 620,
    summary: 'Diferenças de alocação de tipos de valor (struct) e tipos de referência (class), além do ciclo do GC.',
    content: `# C# MEMORY MANAGEMENT // STACK VS HEAP

## 1. Stack (Pilha de Execução)
- Armazena **Value Types** (\`int\`, \`double\`, \`bool\`, \`struct\`) e ponteiros de referência locais para a Heap.
- Alocação e desalocação em tempo O(1), estritamente determinística no fechamento do escopo de função (\`stack frame\`).

## 2. Heap Gerenciada (Managed Heap)
- Armazena instâncias de **Reference Types** (\`class\`, \`string\`, \`arrays\`, \`delegates\`).
- Alocação dinâmica sob demanda.
- Desalocação não é imediata: depende dos ciclos de coleta do **Garbage Collector (GC)** nas Gerações 0, 1 e 2.

## 3. Boxing e Unboxing
- **Boxing**: Conversão implícita de um Value Type para o tipo \`object\` (movendo o valor da Stack para uma nova alocação na Heap). Causa pressão sobre o GC.
- **Unboxing**: Conversão explícita de volta do objeto para o Value Type original.`
  },

  // ─── TRILHA C BASES ────────────────────────────────────────────────────────
  {
    id: 'src_c_bases_pointers',
    title: 'Ementa C: Fundamentos, Ponteiros, Aritmética e Memória',
    track: 'c_bases',
    type: 'syllabus',
    active: true,
    createdAt: '2026-08-21',
    wordCount: 920,
    summary: 'Ponteiros em C, operadores & e *, alocação malloc/free, estruturas e passagem por referência.',
    content: `# BASES DE PROGRAMAÇÃO EM C // PONTEIROS & GERENCIAMENTO DE MEMÓRIA

## 1. Tipos Primitivos e Tamanhos em Bytes
- \`char\` (1 byte), \`int\` (geralmente 4 bytes), \`float\` (4 bytes), \`double\` (8 bytes).
- O operador \`sizeof()\` calcula o tamanho em tempo de compilação.

## 2. O Conceito de Ponteiro
- Um **ponteiro** é uma variável cujo valor armazenado é o endereço de memória de outra variável.
- Operador de Endereço (\`&\`): Obtém a posição hexadecimal da variável na memória.
- Operador de Desreferenciação (\`*\`): Acessa ou modifica o conteúdo apontado pelo endereço.
\`\`\`c
int valor = 42;
int *ptr = &valor; // ptr armazena o endereço de 'valor'
*ptr = 100;        // 'valor' agora vale 100
\`\`\`

## 3. Passagem de Parâmetros: Cópia vs Referência
- Em C, **todas as passagens de argumentos são estritamente por valor (cópia)**.
- Para simular passagem por referência e permitir que uma função altere variáveis do chamador, passamos o ponteiro do endereço da variável:
\`\`\`c
void duplicar(int *num) {
    *num = (*num) * 2;
}
\`\`\`

## 4. Aritmética de Ponteiros e Vetores
- Em C, o nome de um vetor decai para um ponteiro constante apontando para o seu primeiro elemento: \`vet == &vet[0]\`.
- A expressão \`*(ptr + i)\` é rigorosamente equivalente a \`vet[i]\`. O compilador multiplica \`i\` pelo \`sizeof(tipo)\`.

## 5. Alocação Dinâmica de Memória (Heap em C)
- \`malloc(size_t bytes)\`: Aloca bloco contínuo de bytes não inicializados. Retorna \`void*\` ou \`NULL\` se faltar memória.
- \`free(void *ptr)\`: Libera a memória alocada.
- Esquecer de chamar \`free\` gera **Memory Leak**; desreferenciar após o \`free\` gera **Dangling Pointer** ou **Segmentation Fault**.`
  },
  {
    id: 'src_c_structs_safety',
    title: 'Anotações: Structs, Buffer Overflow e Segurança em C',
    track: 'c_bases',
    type: 'notes',
    active: true,
    createdAt: '2026-08-23',
    wordCount: 580,
    summary: 'Modelagem de registros com typedef struct, limites de vetores e prevenção de estouro de buffer.',
    content: `# REGISTROS E SEGURANÇA EM C // STRUCTS & BUFFERS

## 1. Structs e o Operador Seta (\`->\`)
- \`struct\` agrupa variáveis heterogêneas sob um mesmo bloco contíguo de memória.
- Se você tem um ponteiro para uma struct (\`Registro *r\`), utilize a sintaxe de flecha: \`r->campo\` (equivalente a \`(*r).campo\`).

## 2. Buffer Overflow (Estouro de Buffer)
- C não realiza checagem de limites de índice em arrays em tempo de execução (*bounds checking*).
- Escrever em índices além do tamanho alocado (\`buffer[10]\` num array de tamanho 10) sobrescreve a memória adjacente na Stack, podendo corromper o endereço de retorno da função e causar vulnerabilidades críticas ou falhas de segmentação.`
  },

  // ─── TRILHA LFA & AUTÔMATOS ────────────────────────────────────────────────
  {
    id: 'src_lfa_core_syllabus',
    title: 'Ementa LFA: Alfabetos, AFD, AFN, Expressões Regulares e Gramáticas',
    track: 'lfa',
    type: 'syllabus',
    active: true,
    createdAt: '2026-08-22',
    wordCount: 960,
    summary: 'Conceitos formais de autômatos finitos determinísticos (AFD), não determinísticos (AFN), Regex e GLC.',
    content: `# LINGUAGENS FORMALS E TEORIA DE AUTÔMATOS (LFA)

## 1. Alfabetos, Cadeias e Linguagens
- **Alfabeto ($\Sigma$)**: Conjunto finito e não-vazio de símbolos (ex: $\Sigma = \{0, 1\}$ ou $\Sigma = \{a, b\}$).
- **Cadeia/Palavra ($w$)**: Sequência finita de símbolos do alfabeto. O comprimento de $w$ é denotado por $|w|$.
- **Palavra Vazia ($\epsilon$ ou $\lambda$)**: Cadeia com comprimento zero ($|\epsilon| = 0$).
- **Fecho de Kleene ($\Sigma^*$)**: Conjunto de todas as palavras possíveis sobre $\Sigma$, incluindo $\epsilon$.
- **Linguagem ($L$)**: Um subconjunto de $\Sigma^*$ ($L \subseteq \Sigma^*$).

## 2. Autômato Finito Determinístico (AFD)
- Modelo formal definido pela 5-upla: $M = (Q, \Sigma, \delta, q_0, F)$
  - $Q$: Conjunto finito de estados.
  - $\Sigma$: Alfabeto de entrada.
  - $\delta: Q \times \Sigma \rightarrow Q$: Função de transição total e determinística (para cada par estado/símbolo, existe exatamente um único estado de destino).
  - $q_0 \in Q$: Estado inicial.
  - $F \subseteq Q$: Conjunto de estados de aceitação (finais).
- Uma cadeia $w$ é **aceita** se a aplicação sucessiva da função de transição $\delta^*$ a partir de $q_0$ termina em um estado $q_f \in F$.

## 3. Autômato Finito Não-Determinístico (AFN / $\epsilon$-AFN)
- A função de transição mapeia para o conjunto das partes dos estados: $\delta: Q \times (\Sigma \cup \{\epsilon\}) \rightarrow \mathcal{P}(Q)$.
- Um AFN pode ter 0, 1 ou múltiplos caminhos simultâneos para um mesmo símbolo, além de transições espontâneas ($\epsilon$).
- Uma cadeia é aceita se **ao menos um** ramo de execução terminar em estado de aceitação.
- **Teorema de Equivalência**: Para todo AFN existe um AFD equivalente que reconhece rigorosamente a mesma linguagem (conversão via algoritmo de Construção de Subconjuntos).

## 4. Expressões Regulares (Regex) e Linguagens Regulares
- Operações fundamentais: Concatenação ($ab$), União/Alternância ($a + b$ ou $a|b$) e Fecho de Kleene ($a^*$).
- Uma linguagem é **Regular** se e somente se puder ser reconhecida por um AFD, AFN ou gerada por uma Expressão Regular (Teorema de Kleene).

## 5. Gramáticas Livres de Contexto (GLC)
- Definidas por $G = (V, \Sigma, R, S)$ onde as regras de produção têm a forma $A \rightarrow \alpha$, com $A \in V$ e $\alpha \in (V \cup \Sigma)^*$.
- Reconhecidas por **Autômatos com Pilha (AP)**. Utilizadas para definir a sintaxe de linguagens de programação e parsers de compiladores.`
  }
];
