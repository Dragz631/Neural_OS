import type { SandboxSkill, SandboxChallenge, TrackId } from '../types';

// ─── DYNAMIC SKILL TREES PER TRACK ───────────────────────────────────────────

export const SANDBOX_SKILLS_BY_TRACK: Record<TrackId, SandboxSkill[]> = {
  c_bases: [
    {
      id: 'c_io',
      name: 'Estrutura Básica & I/O (printf/scanf)',
      track: 'c_bases',
      requiresLevel: 1,
      description: 'Estrutura de programa em C com #include <stdio.h>, função main() e entrada/saída formatada.',
    },
    {
      id: 'c_primitives',
      name: 'Tipos Primitivos & Operadores',
      track: 'c_bases',
      requiresLevel: 1,
      description: 'Tipos int, float, double, char, operadores aritméticos (+, -, *, /, %) e de atribuição.',
    },
    {
      id: 'c_conditionals',
      name: 'Estruturas Condicionais (if/else/switch)',
      track: 'c_bases',
      requiresLevel: 2,
      description: 'Controle de fluxo condicional, comparações relacionais e estruturas de chaveamento switch-case.',
    },
    {
      id: 'c_loops',
      name: 'Laços de Repetição (while/for/do-while)',
      track: 'c_bases',
      requiresLevel: 3,
      description: 'Iterações determinísticas e indeterminísticas com controle de contadores e acumuladores.',
    },
    {
      id: 'c_arrays',
      name: 'Vetores (Arrays) e Strings',
      track: 'c_bases',
      requiresLevel: 4,
      description: 'Alocação estática sequencial indexada e manipulação de strings terminadas em null byte (\\0).',
    },
    {
      id: 'c_functions',
      name: 'Funções e Escopo',
      track: 'c_bases',
      requiresLevel: 5,
      description: 'Modularização com protótipos de funções, passagem de parâmetros por valor e retorno de dados.',
    },
    {
      id: 'c_pointers',
      name: 'Ponteiros e Alocação de Memória (&, *)',
      track: 'c_bases',
      requiresLevel: 6,
      description: 'Aritmética de ponteiros, operadores de endereço (&) e derreferenciação (*), e passagem por referência.',
    },
    {
      id: 'c_structs',
      name: 'Structs & Uniões',
      track: 'c_bases',
      requiresLevel: 7,
      description: 'Tipos de dados estruturados compostos, agrupamento heterogêneo e acesso com operador ponto (.) e seta (->).',
    },
  ],

  lfa: [
    {
      id: 'lfa_alphabet',
      name: 'Alfabetos (Σ), Símbolos e Cadeias',
      track: 'lfa',
      requiresLevel: 1,
      description: 'Definição de alfabeto formal Σ, símbolos atômicos, comprimento de cadeia |w| e cadeia vazia ε.',
    },
    {
      id: 'lfa_operations',
      name: 'Operações sobre Linguagens',
      track: 'lfa',
      requiresLevel: 1,
      description: 'Concatenação, união, interseção, complemento e Fecho de Kleene (L*) sobre linguagens formais.',
    },
    {
      id: 'lfa_dfa',
      name: 'Autômatos Finitos Determinísticos (AFD)',
      track: 'lfa',
      requiresLevel: 2,
      description: 'Definição formal de 5-tupla (Q, Σ, δ, q0, F) e função de transição determinística δ: Q × Σ → Q.',
    },
    {
      id: 'lfa_nfa',
      name: 'Autômatos Finitos Não-Determinísticos (AFND)',
      track: 'lfa',
      requiresLevel: 3,
      description: 'Transições múltiplas simultâneas δ: Q × Σ → P(Q) e transições vazias (ε-transições).',
    },
    {
      id: 'lfa_nfa_to_dfa',
      name: 'Equivalência AFND para AFD',
      track: 'lfa',
      requiresLevel: 4,
      description: 'Algoritmo de construção por subconjuntos (Subset Construction) para determinação de autômatos.',
    },
    {
      id: 'lfa_regex',
      name: 'Expressões Regulares (ER)',
      track: 'lfa',
      requiresLevel: 5,
      description: 'Padrões algébricos equivalentes a linguagens regulares, operadores união (+), concatenação e estrela (*).',
    },
    {
      id: 'lfa_cfg',
      name: 'Gramáticas Livres de Contexto (GLC)',
      track: 'lfa',
      requiresLevel: 6,
      description: '4-tupla (V, Σ, R, S), produções livres de contexto A → α e árvores de derivação sintática.',
    },
    {
      id: 'lfa_pda_tm',
      name: 'Autômatos de Pilha (AP) e Máquinas de Turing',
      track: 'lfa',
      requiresLevel: 7,
      description: 'Reconhecedores com memória auxiliar em pilha LIFO e modelo computacional universal de fita infinita.',
    },
  ],

  csharp: [
    {
      id: 'cs_classes',
      name: 'Classes e Objetos',
      track: 'csharp',
      requiresLevel: 1,
      description: 'Declaração de classes com a palavra-chave class, instanciação com operador new e alocação na Heap.',
    },
    {
      id: 'cs_constructors',
      name: 'Construtores e Sobrecarga',
      track: 'csharp',
      requiresLevel: 2,
      description: 'Métodos especiais de inicialização de estado com o mesmo nome da classe e sobrecarga de assinaturas.',
    },
    {
      id: 'cs_encapsulation',
      name: 'Encapsulamento & Propriedades (get/set)',
      track: 'csharp',
      requiresLevel: 3,
      description: 'Modificadores de acesso private/public, auto-properties e validação de invariantes em setters.',
    },
    {
      id: 'cs_inheritance',
      name: 'Herança e Polimorfismo (override/virtual)',
      track: 'csharp',
      requiresLevel: 4,
      description: 'Reutilização com operador :, métodos virtual na classe base e sobrescrita polimórfica com override.',
    },
    {
      id: 'cs_interfaces',
      name: 'Interfaces e Classes Abstratas',
      track: 'csharp',
      requiresLevel: 5,
      description: 'Contratos formais com interface, classes abstract incompletas e desacoplamento de código.',
    },
    {
      id: 'cs_collections',
      name: 'Coleções Genéricas & LINQ',
      track: 'csharp',
      requiresLevel: 6,
      description: 'List<T>, Dictionary<TKey, TValue> e consultas funcionais declarativas com LINQ (Where, Select, Sum).',
    },
  ],
};

// ─── DEFAULT BOILERPLATES PER TRACK ──────────────────────────────────────────

export const BOILERPLATES_BY_TRACK: Record<TrackId, string> = {
  c_bases: `#include <stdio.h>

int main() {
    // Digite sua solução em C aqui
    printf(">> Sistema C inicializado.\\n");
    return 0;
}
`,

  lfa: `{
  "alfabeto": ["0", "1"],
  "estados": ["q0", "q1"],
  "inicial": "q0",
  "finais": ["q1"],
  "transicoes": [
    { "de": "q0", "simbolo": "0", "para": "q0" },
    { "de": "q0", "simbolo": "1", "para": "q1" },
    { "de": "q1", "simbolo": "0", "para": "q1" },
    { "de": "q1", "simbolo": "1", "para": "q1" }
  ]
}
`,

  csharp: `using System;

public class Program {
    public static void Main(string[] args) {
        // Digite sua solução em C# aqui
        Console.WriteLine(">> Sistema C# inicializado.");
    }
}
`,
};

// ─── TRACK METADATA ───────────────────────────────────────────────────────────

export interface TrackMetadata {
  track: TrackId;
  label: string;
  fileTab: string;
  compilerChannel: string;
  languageBadge: string;
}

export const TRACK_METADATA: Record<TrackId, TrackMetadata> = {
  c_bases: {
    track: 'c_bases',
    label: 'C BASES',
    fileTab: 'MAIN.C',
    compilerChannel: 'GCC / C11 (GNU COMPILER COLLECTION)',
    languageBadge: 'C11',
  },
  lfa: {
    track: 'lfa',
    label: 'LFA & AUTÔMATOS',
    fileTab: 'AUTOMATO_DEF.JSON',
    compilerChannel: 'LFA SIMULATOR v1.0 (FORMAL ENGINE)',
    languageBadge: 'LFA / JSON',
  },
  csharp: {
    track: 'csharp',
    label: 'C# OOP',
    fileTab: 'PROGRAM.CS',
    compilerChannel: 'ROSLYN / .NET 9.0 COMPILER',
    languageBadge: 'C# 13',
  },
};

// ─── CHALLENGES BANK FOR ALL TRACKS ───────────────────────────────────────────

export const STANDARD_CHALLENGES: SandboxChallenge[] = [
  // ─── C BASES ───────────────────────────────────────────────────────────────
  {
    id: 'c_std_1',
    track: 'c_bases',
    title: 'Processador de I/O Formatado',
    description: 'Crie um programa em C que declare duas variáveis inteiras `a = 15` e `b = 27`, calcule a soma e exiba exatamente `SOMA = 42` na tela usando `printf`.',
    boilerplate: `#include <stdio.h>

int main() {
    int a = 15;
    int b = 27;
    // Calcule a soma e imprima usando printf formatado:
    
    return 0;
}
`,
    hints: [
      'Use a função printf com o especificador %d para imprimir inteiros.',
      'A formatação esperada no console é "SOMA = %d\\n".',
      'Lembre-se de terminar sua instrução com ponto e vírgula (;).'
    ],
    validationKeywords: ['printf', 'a', 'b', 'return 0'],
    expectedOutput: 'SOMA = 42',
    successMessage: 'I/O em C validado com sucesso pelo GCC!',
    requiredSkills: ['c_io'],
  },
  {
    id: 'c_std_2',
    track: 'c_bases',
    title: 'Classificador Condicional de Média',
    description: 'Declare uma variável `float media = 7.5;`. Se a média for maior ou igual a 7.0, imprima `[APROVADO]`, caso contrário `[REPROVADO]`.',
    boilerplate: `#include <stdio.h>

int main() {
    float media = 7.5;
    
    // Implemente a estrutura condicional if/else:
    
    return 0;
}
`,
    hints: [
      'Use a instrução if (media >= 7.0) { ... } else { ... }',
      'Imprima exatamente a string [APROVADO] na tela.',
    ],
    validationKeywords: ['if', 'media', 'APROVADO', 'printf'],
    expectedOutput: '[APROVADO]',
    successMessage: 'Fluxo condicional executado com precisão!',
    requiredSkills: ['c_io', 'c_conditionals'],
  },
  {
    id: 'c_std_3',
    track: 'c_bases',
    title: 'Acumulador em Laço de Repetição',
    description: 'Utilize um laço `for` de 1 a 5 para somar os números (1+2+3+4+5). Exiba o total com `TOTAL = 15`.',
    boilerplate: `#include <stdio.h>

int main() {
    int total = 0;
    
    // Escreva o laço for para acumular de 1 a 5:
    
    return 0;
}
`,
    hints: [
      'Declare o laço: for (int i = 1; i <= 5; i++) total += i;',
      'Ao final do laço, imprima printf("TOTAL = %d\\n", total);',
    ],
    validationKeywords: ['for', 'total', 'printf'],
    expectedOutput: 'TOTAL = 15',
    successMessage: 'Iteração e acumulação determinística concluída!',
    requiredSkills: ['c_io', 'c_loops'],
  },
  {
    id: 'c_std_4',
    track: 'c_bases',
    title: 'Manipulador de Ponteiros e Referência',
    description: 'Crie uma função `void dobrar(int *ptr)` que dobre o valor apontado. Na main, declare `int x = 10;`, chame `dobrar(&x);` e imprima `X = 20`.',
    boilerplate: `#include <stdio.h>

void dobrar(int *ptr) {
    // Altere o valor do endereço apontado por ptr:
    
}

int main() {
    int x = 10;
    dobrar(&x);
    printf("X = %d\\n", x);
    return 0;
}
`,
    hints: [
      'Dentro da função dobrar, use *ptr = (*ptr) * 2; para desreferenciar o ponteiro.',
      'O operador & passa o endereço de memória de x para a função.',
    ],
    validationKeywords: ['void dobrar', '*ptr', '&x', 'printf'],
    expectedOutput: 'X = 20',
    successMessage: 'Passagem por referência e manipulação de ponteiros validada!',
    requiredSkills: ['c_pointers'],
  },

  // ─── LFA & AUTÔMATOS ───────────────────────────────────────────────────────
  {
    id: 'lfa_std_1',
    track: 'lfa',
    title: 'AFD Reconhecedor de Cadeias Terminadas em 1',
    description: 'Configure um Autômato Finito Determinístico com alfabeto `["0", "1"]` que inicie no estado `q0` e aceite qualquer cadeia binária que termine com o dígito `1` (estado final `q1`).',
    boilerplate: `{
  "alfabeto": ["0", "1"],
  "estados": ["q0", "q1"],
  "inicial": "q0",
  "finais": ["q1"],
  "transicoes": [
    { "de": "q0", "simbolo": "0", "para": "q0" },
    { "de": "q0", "simbolo": "1", "para": "q1" },
    { "de": "q1", "simbolo": "0", "para": "q0" },
    { "de": "q1", "simbolo": "1", "para": "q1" }
  ]
}
`,
    hints: [
      'Verifique se a transição ao ler "0" em q1 retorna para q0.',
      'O estado q1 é o único estado final que garante que o último símbolo lido foi 1.',
      'Todas as transições determinísticas devem cobrir o alfabeto completo para cada estado.'
    ],
    validationKeywords: ['"alfabeto"', '"estados"', '"inicial"', '"finais"', '"transicoes"'],
    expectedOutput: '[LFA_SIMULATOR] AFD Validado. Cadeia "01011" -> ESTADO FINAL: q1 (ACEITA)',
    successMessage: 'Autômato Finito Determinístico sintetizado e aceito pela Matriz!',
    requiredSkills: ['lfa_alphabet', 'lfa_dfa'],
  },
  {
    id: 'lfa_std_2',
    track: 'lfa',
    title: 'AFD para Múltiplos de 2 (Binário Par)',
    description: 'Defina a 5-tupla de um AFD que reconheça números binários pares (isto é, cadeias binárias não-vazias que terminam com `0`). O estado inicial é `q0` e o estado final é `q_par`.',
    boilerplate: `{
  "alfabeto": ["0", "1"],
  "estados": ["q0", "q_par", "q_impar"],
  "inicial": "q0",
  "finais": ["q_par"],
  "transicoes": [
    { "de": "q0", "simbolo": "0", "para": "q_par" },
    { "de": "q0", "simbolo": "1", "para": "q_impar" },
    { "de": "q_par", "simbolo": "0", "para": "q_par" },
    { "de": "q_par", "simbolo": "1", "para": "q_impar" },
    { "de": "q_impar", "simbolo": "0", "para": "q_par" },
    { "de": "q_impar", "simbolo": "1", "para": "q_impar" }
  ]
}
`,
    hints: [
      'Em binário, um número é par se e somente se o bit menos significativo for 0.',
      'Qualquer leitura de "0" deve conduzir ao estado de aceitação q_par.',
    ],
    validationKeywords: ['"q_par"', '"q_impar"', '"transicoes"'],
    expectedOutput: '[LFA_SIMULATOR] Cadeias "10", "110", "1000" -> ACEITAS (PAR)',
    successMessage: 'Linguagem regular de números pares reconhecida!',
    requiredSkills: ['lfa_dfa'],
  },

  // ─── CSHARP OOP ────────────────────────────────────────────────────────────
  {
    id: 'cs_std_1',
    track: 'csharp',
    title: 'Modelagem de Entidade e Instanciação',
    description: 'Implemente uma classe `Nave` com propriedade pública `string Nome` e método `void Decolar()`, instancie na `Main` e imprima `Nave Apollo decolou!`.',
    boilerplate: `using System;

public class Nave {
    public string Nome { get; set; }

    public void Decolar() {
        Console.WriteLine($"Nave {Nome} decolou!");
    }
}

public class Program {
    public static void Main(string[] args) {
        // Instancie a Nave, atribua Nome = "Apollo" e chame Decolar():
        
    }
}
`,
    hints: [
      'Instancie com: Nave nave = new Nave();',
      'Defina nave.Nome = "Apollo"; e execute nave.Decolar();',
    ],
    validationKeywords: ['class Nave', 'new Nave', 'Decolar', 'Console.WriteLine'],
    expectedOutput: 'Nave Apollo decolou!',
    successMessage: 'Classe instanciada na Heap e executada com sucesso!',
    requiredSkills: ['cs_classes'],
  },
  {
    id: 'cs_std_2',
    track: 'csharp',
    title: 'Construtor com Invariante de Estado',
    description: 'Adicione um construtor parametrizado `public Servidor(string ip, int porta)` na classe `Servidor` e inicialize os campos correspondentes.',
    boilerplate: `using System;

public class Servidor {
    public string IP { get; set; }
    public int Porta { get; set; }

    // Implemente o construtor aqui:
    
    public void Conectar() {
        Console.WriteLine($"Conectado ao servidor {IP}:{Porta}");
    }
}

public class Program {
    public static void Main(string[] args) {
        Servidor s = new Servidor("192.168.1.1", 8080);
        s.Conectar();
    }
}
`,
    hints: [
      'O construtor deve ter exatamente o mesmo nome da classe: public Servidor(string ip, int porta)',
      'Atribua this.IP = ip; e this.Porta = porta;',
    ],
    validationKeywords: ['public Servidor', 'IP', 'Porta', 'Conectar'],
    expectedOutput: 'Conectado ao servidor 192.168.1.1:8080',
    successMessage: 'Construtor customizado inicializou o objeto perfeitamente!',
    requiredSkills: ['cs_constructors'],
  },
  {
    id: 'cs_std_3',
    track: 'csharp',
    title: 'Encapsulamento com Validação em Propriedade',
    description: 'Crie uma propriedade `Saldo` com backing field privado `_saldo`. Garanta que depósitos negativos não sejam permitidos.',
    boilerplate: `using System;

public class ContaBancaria {
    private decimal _saldo;

    public decimal Saldo {
        get { return _saldo; }
        set {
            if (value >= 0) _saldo = value;
        }
    }
}

public class Program {
    public static void Main(string[] args) {
        ContaBancaria c = new ContaBancaria();
        c.Saldo = 500;
        Console.WriteLine($"Saldo atual: R$ {c.Saldo}");
    }
}
`,
    hints: [
      'Use o modificador private para proteger o _saldo.',
      'O get retorna _saldo e o set aplica a regra de negócio com if (value >= 0).',
    ],
    validationKeywords: ['private decimal _saldo', 'get', 'set', 'Saldo'],
    expectedOutput: 'Saldo atual: R$ 500',
    successMessage: 'Encapsulamento e proteção de estado consolidados!',
    requiredSkills: ['cs_encapsulation'],
  },
];

// ─── MINI CHALLENGES FOR FATIGUE / QUICK DRILLS ──────────────────────────────

export const MINI_CHALLENGES: SandboxChallenge[] = [
  // ─── C BASES ───────────────────────────────────────────────────────────────
  {
    id: 'c_mini_1',
    track: 'c_bases',
    title: 'Mini C: Printf de Sinal de Vida',
    description: 'Escreva um comando `printf("NEURAL_ONLINE\\n");` dentro da função `main`.',
    boilerplate: `#include <stdio.h>

int main() {
    // Escreva sua instrução printf abaixo:
    
    return 0;
}
`,
    hints: ['Chame printf("NEURAL_ONLINE\\n");'],
    validationKeywords: ['printf', 'NEURAL_ONLINE'],
    expectedOutput: 'NEURAL_ONLINE',
    successMessage: 'Sinal de vida C11 emitido com sucesso!',
    requiredSkills: ['c_io'],
    isMini: true,
  },
  {
    id: 'c_mini_2',
    track: 'c_bases',
    title: 'Mini C: Operador de Atribuição e Incremento',
    description: 'Declare `int vida = 100;`, subtraia 15 de dano e imprima `VIDA = 85`.',
    boilerplate: `#include <stdio.h>

int main() {
    int vida = 100;
    // Subtraia 15 e imprima VIDA = %d:
    
    return 0;
}
`,
    hints: ['vida -= 15;', 'printf("VIDA = %d\\n", vida);'],
    validationKeywords: ['vida', 'printf', '85'],
    expectedOutput: 'VIDA = 85',
    successMessage: 'Operações com tipos primitivos executadas!',
    requiredSkills: ['c_primitives'],
    isMini: true,
  },
  {
    id: 'c_mini_3',
    track: 'c_bases',
    title: 'Mini C: Condicional Rápido',
    description: 'Se a variável `int energia = 80;` for maior que 50, imprima `PRONTO`.',
    boilerplate: `#include <stdio.h>

int main() {
    int energia = 80;
    if (energia > 50) {
        printf("PRONTO\\n");
    }
    return 0;
}
`,
    hints: ['Mantenha a condição if (energia > 50) e execute o programa.'],
    validationKeywords: ['if', 'energia', 'PRONTO'],
    expectedOutput: 'PRONTO',
    successMessage: 'Condição booleana avaliada positivamente!',
    requiredSkills: ['c_conditionals'],
    isMini: true,
  },

  // ─── LFA & AUTÔMATOS ───────────────────────────────────────────────────────
  {
    id: 'lfa_mini_1',
    track: 'lfa',
    title: 'Mini LFA: Declaração de Alfabeto Binário',
    description: 'Defina um alfabeto formal com os símbolos `"0"` e `"1"` no objeto JSON.',
    boilerplate: `{
  "alfabeto": ["0", "1"],
  "estados": ["q0"],
  "inicial": "q0",
  "finais": ["q0"],
  "transicoes": []
}
`,
    hints: ['Mantenha o campo "alfabeto": ["0", "1"] formatado corretamente.'],
    validationKeywords: ['"alfabeto"', '"0"', '"1"'],
    expectedOutput: '[LFA_SIMULATOR] Alfabeto Σ = {0, 1} registrado.',
    successMessage: 'Alfabeto formal configurado na 5-tupla!',
    requiredSkills: ['lfa_alphabet'],
    isMini: true,
  },
  {
    id: 'lfa_mini_2',
    track: 'lfa',
    title: 'Mini LFA: Estado Final de Aceitação',
    description: 'Indique que o estado `q_aceita` é o estado final de aceitação no array `finais`.',
    boilerplate: `{
  "alfabeto": ["a", "b"],
  "estados": ["q0", "q_aceita"],
  "inicial": "q0",
  "finais": ["q_aceita"],
  "transicoes": [
    { "de": "q0", "simbolo": "a", "para": "q_aceita" }
  ]
}
`,
    hints: ['Defina "finais": ["q_aceita"] para designar o conjunto F.'],
    validationKeywords: ['"finais"', '"q_aceita"'],
    expectedOutput: '[LFA_SIMULATOR] Conjunto de estados de aceitação F = {q_aceita}.',
    successMessage: 'Estados finais configurados com sucesso!',
    requiredSkills: ['lfa_dfa'],
    isMini: true,
  },

  // ─── CSHARP OOP ────────────────────────────────────────────────────────────
  {
    id: 'cs_mini_1',
    track: 'csharp',
    title: 'Mini C#: Declaração de Classe Vazia',
    description: 'Declare uma classe pública chamada `Drone` com escopo `{}`.',
    boilerplate: `using System;

// Declare a classe Drone abaixo:
public class Drone {
}

public class Program {
    public static void Main() {
        Drone d = new Drone();
        Console.WriteLine("Drone instanciado!");
    }
}
`,
    hints: ['Use a sintaxe: public class Drone { }'],
    validationKeywords: ['public class Drone', 'new Drone'],
    expectedOutput: 'Drone instanciado!',
    successMessage: 'Tipo de referência declarado e alocado na Heap!',
    requiredSkills: ['cs_classes'],
    isMini: true,
  },
  {
    id: 'cs_mini_2',
    track: 'csharp',
    title: 'Mini C#: Construtor Padrão Explícito',
    description: 'Adicione um construtor sem parâmetros na classe `Motor` que imprima `Motor Ligado`.',
    boilerplate: `using System;

public class Motor {
    public Motor() {
        Console.WriteLine("Motor Ligado");
    }
}

public class Program {
    public static void Main() {
        Motor m = new Motor();
    }
}
`,
    hints: ['O construtor não possui tipo de retorno: public Motor() { ... }'],
    validationKeywords: ['public Motor', 'Motor Ligado'],
    expectedOutput: 'Motor Ligado',
    successMessage: 'Construtor sem parâmetros disparado no new!',
    requiredSkills: ['cs_constructors'],
    isMini: true,
  },
];
