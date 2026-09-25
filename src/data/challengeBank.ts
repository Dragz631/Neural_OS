// ─── Banco de desafios prontos (usado quando a IA está desligada) ────────────
// Veio do Sandbox antigo. Serve de reserva: com IA ligada, os desafios são
// gerados a partir do SEU tópico e das SUAS anotações.

interface OldChallenge {
  id: string;
  track: 'csharp' | 'c_bases' | 'lfa';
  title: string;
  description: string;
  boilerplate: string;
  hints: string[];
  validationKeywords: string[];
  expectedOutput: string;
  successMessage: string;
  requiredSkills: string[];
  isMini?: boolean;
}

export interface BankChallenge {
  id: string;
  language: string;
  title: string;
  prompt: string;
  starterCode: string;
  hints: string[];
  /** Termos que a checagem básica procura no código. */
  keywords: string[];
  micro: boolean;
}

const TRACK_TO_LANGUAGE = { csharp: 'csharp', c_bases: 'c', lfa: 'automato' } as const;

const STANDARD_CHALLENGES: OldChallenge[] = [
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

const MINI_CHALLENGES: OldChallenge[] = [
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

export const CHALLENGE_BANK: BankChallenge[] = [...STANDARD_CHALLENGES, ...MINI_CHALLENGES].map((c) => ({
  id: c.id,
  language: TRACK_TO_LANGUAGE[c.track],
  title: c.title,
  prompt: c.description,
  starterCode: c.boilerplate,
  hints: c.hints,
  keywords: c.validationKeywords,
  micro: !!c.isMini,
}));
