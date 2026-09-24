import type { DungeonStage, TrackId } from '../../types';

export const DUNGEON_STAGES_BY_TRACK: Record<TrackId, DungeonStage[]> = {
  // ─────────────────────────────────────────────────────────────────────────
  // TRILHA 1: C# OOP (ORIENTAÇÃO A OBJETOS)
  // ─────────────────────────────────────────────────────────────────────────
  csharp: [
    {
      id: 'cs_stage_1',
      number: 1,
      title: 'Nó 01: Instanciação e o Operador new',
      track: 'csharp',
      isBoss: false,
      guardianName: 'Sentinela de Instância Vazia',
      synapticReward: 'Sinapse: Alocação na Heap Gerenciada',
      xpReward: 80,
      codex: {
        topic: 'Classes e Criação de Instâncias com new',
        essence: 'Uma classe é apenas uma planta conceitual. Para dar vida e alocar espaço na memória Heap gerenciada, usamos o operador new, que executa o construtor do objeto.',
        syntaxBreakdown: [
          { term: 'class NomeClasse', explanation: 'Define o molde de um novo tipo de dado em C#.' },
          { term: 'new NomeClasse()', explanation: 'Aloca o objeto na memória Heap e retorna sua referência.' },
          { term: 'Objeto.Metodo()', explanation: 'Invoca uma operação definida no interior da instância.' },
        ],
        codeExample: `public class TerminalNeural {
    public void Inicializar() {
        Console.WriteLine("[KERNEL] Terminal Ativado.");
    }
}

// Utilização correta:
TerminalNeural t = new TerminalNeural();
t.Inicializar();`,
        pitfalls: [
          'Tentar invocar métodos em uma variável declarada mas nunca instanciada resulta em NullReferenceException.',
          'Esquecer o operador new ao declarar uma classe de referência.',
        ],
      },
      battle: {
        type: 'bug_fix',
        questionPrompt: 'O Sentinela bloqueou a inicialização do núcleo. O código abaixo gera NullReferenceException ao executar. Corrija o bug selecionando a instrução correta para a linha com erro.',
        codeSnippet: `using System;

public class Program {
    public static void Main() {
        TerminalNeural terminal; // <-- Falta inicializar
        terminal.Inicializar();
    }
}`,
        buggyLineTarget: 5,
        options: [
          {
            id: 'opt_1',
            label: 'TerminalNeural terminal = new TerminalNeural();',
            correct: true,
            explanation: 'Correto! O operador new aloca a instância na Heap antes de qualquer chamada de método.',
          },
          {
            id: 'opt_2',
            label: 'TerminalNeural terminal = TerminalNeural.Inicializar();',
            correct: false,
            explanation: 'Incorreto. O método Inicializar() não é estático nem retorna um tipo TerminalNeural.',
          },
          {
            id: 'opt_3',
            label: 'TerminalNeural terminal = null;',
            correct: false,
            explanation: 'Incorreto. Atribuir null continuará disparando NullReferenceException na chamada subsequente.',
          },
        ],
        hint: 'Instancie a classe utilizando o operador new para alocar a memória.',
      },
    },
    {
      id: 'cs_stage_2',
      number: 2,
      title: 'Nó 02: Encapsulamento e Blindagem de Estado',
      track: 'csharp',
      isBoss: false,
      guardianName: 'Gárgula de Corrupção de Memória',
      synapticReward: 'Sinapse: Modificadores de Acesso & Auto-Properties',
      xpReward: 100,
      codex: {
        topic: 'Modificadores private, public e Properties',
        essence: 'Encapsulamento é a prática de esconder os campos internos de um objeto com private e fornecer leitura/gravação controlada através de Properties ({ get; private set; }) para proteger as regras de negócio.',
        syntaxBreakdown: [
          { term: 'private double _saldo', explanation: 'Campo oculto que código externo não pode mutar arbitrariamente.' },
          { term: 'public double Saldo { get; private set; }', explanation: 'Propriedade com leitura pública e escrita restrita à própria classe.' },
          { term: 'public void Depositar(double v)', explanation: 'Método público que valida a entrada antes de alterar o estado interno.' },
        ],
        codeExample: `public class CofreDigital {
    public decimal Saldo { get; private set; }

    public void Creditar(decimal valor) {
        if (valor > 0) {
            Saldo += valor;
        }
    }
}`,
        pitfalls: [
          'Deixar campos financeiros como "public decimal Saldo;" permite que qualquer hacker ou controller zere o saldo diretamente.',
        ],
      },
      battle: {
        type: 'output_predict',
        questionPrompt: 'A Gárgula tenta corromper o saldo da conta com injeção de valor negativo. Qual será a saída do console após a execução das instruções?',
        codeSnippet: `using System;

public class ContaSegura {
    public decimal Saldo { get; private set; } = 100;

    public void Sacar(decimal valor) {
        if (valor > 0 && valor <= Saldo) {
            Saldo -= valor;
        }
    }
}

public class Program {
    public static void Main() {
        ContaSegura c = new ContaSegura();
        c.Sacar(150); // Tentativa de saque maior que o saldo
        c.Sacar(40);  // Saque válido
        Console.WriteLine($"SALDO_FINAL: {c.Saldo}");
    }
}`,
        options: [
          {
            id: 'opt_1',
            label: 'SALDO_FINAL: 60',
            correct: true,
            explanation: 'Exato! O saque de 150 foi bloqueado pela validação do encapsulamento. Apenas o saque de 40 foi efetivado (100 - 40 = 60).',
          },
          {
            id: 'opt_2',
            label: 'SALDO_FINAL: -90',
            correct: false,
            explanation: 'Incorreto. O encapsulamento barrou o saque de 150 porque era maior que o saldo disponível.',
          },
          {
            id: 'opt_3',
            label: 'SALDO_FINAL: 100',
            correct: false,
            explanation: 'Incorreto. O segundo saque de 40 era válido e foi descontado com sucesso.',
          },
        ],
        hint: 'Observe a condição if dentro do método Sacar.',
      },
    },
    {
      id: 'cs_stage_3',
      number: 3,
      title: 'Nó 03: Construtores e Invariâncias de Instância',
      track: 'csharp',
      isBoss: false,
      guardianName: 'Espectro de Instância Nula',
      synapticReward: 'Sinapse: Construtores Parametrizados',
      xpReward: 120,
      codex: {
        topic: 'Construtores Obrigatórios e Construtores Primários',
        essence: 'Um construtor garante que um objeto nunca exista com atributos vitais nulos ou incompletos. Ele possui o mesmo nome da classe e não tem tipo de retorno.',
        syntaxBreakdown: [
          { term: 'public NomeClasse(parametros)', explanation: 'Assinatura do construtor tradicional de inicialização.' },
          { term: 'this.campo = parametro', explanation: 'Diferencia o campo da instância do argumento recebido.' },
          { term: 'public class User(string nome)', explanation: 'Construtor primário moderno introduzido no C# 12.' },
        ],
        codeExample: `public class AgenteCyber {
    public string Codinome { get; }
    public int NivelAcesso { get; }

    public AgenteCyber(string codinome, int nivel) {
        Codinome = codinome ?? throw new ArgumentNullException(nameof(codinome));
        NivelAcesso = nivel > 0 ? nivel : 1;
    }
}`,
        pitfalls: [
          'Ao declarar um construtor com parâmetros, o compilador C# remove o construtor padrão vazio sem parâmetros.',
        ],
      },
      battle: {
        type: 'architecture_choice',
        questionPrompt: 'O Espectro corrompeu o sistema ao instanciar um Agente sem fornecer seu código de identificação. Qual é a forma correta de forçar que todo Agente nasça obrigatoriamente com um Codinome válido?',
        codeSnippet: `public class Agente {
    public string Codinome { get; private set; }
    // Como devemos estruturar a classe para impedir instâncias sem nome?
}`,
        options: [
          {
            id: 'opt_1',
            label: 'Declarar public Agente(string codinome) { Codinome = codinome; } e não fornecer construtor sem parâmetros.',
            correct: true,
            explanation: 'Perfeito! Exigir o parâmetro no construtor garante em tempo de compilação que nenhum objeto seja instanciado sem nome.',
          },
          {
            id: 'opt_2',
            label: 'Deixar o campo público e confiar que quem chamar o código atribuirá o nome mais tarde.',
            correct: false,
            explanation: 'Incorreto. Isso viola a invariância de estado e abre brecha para bugs de referência nula.',
          },
          {
            id: 'opt_3',
            label: 'Criar um método void SetNome(string n) e chamar depois de new Agente().',
            correct: false,
            explanation: 'Incorreto. Essa abordagem permite que o objeto fique em estado inconsistente entre o new e o SetNome.',
          },
        ],
        hint: 'Pense em como o construtor obriga a passagem de argumentos na alocação.',
      },
    },
    {
      id: 'cs_stage_4',
      number: 4,
      title: 'Nó 04: Herança e a Palavra-Chave base',
      track: 'csharp',
      isBoss: false,
      guardianName: 'Androide de Tipagem Genérica',
      synapticReward: 'Sinapse: Reutilização via Herança e base()',
      xpReward: 140,
      codex: {
        topic: 'Herança de Classes e Construtores Base',
        essence: 'Herança permite que uma subclasse herde atributos e métodos de uma superclasse (relação "É-UM"). A palavra-chave base() invoca o construtor e métodos da classe pai.',
        syntaxBreakdown: [
          { term: 'class Derivada : Base', explanation: 'Declaração de herança em C#.' },
          { term: ': base(argumentos)', explanation: 'Encaminha os argumentos para o construtor da classe base.' },
          { term: 'protected', explanation: 'Modificador visível na classe atual e em todas as suas classes filhas.' },
        ],
        codeExample: `public class Drone {
    public string Modelo { get; }
    public Drone(string modelo) {
        Modelo = modelo;
    }
}

public class DroneCombate : Drone {
    public int DanoLaser { get; }
    public DroneCombate(string modelo, int dano) : base(modelo) {
        DanoLaser = dano;
    }
}`,
        pitfalls: [
          'Se a classe base não possuir construtor vazio, a classe filha DEVE obrigatoriamente invocar : base(...) no seu construtor.',
        ],
      },
      battle: {
        type: 'bug_fix',
        questionPrompt: 'O Androide está com erro de compilação CS7036 (a classe base Dispositivo não contém construtor que receba 0 argumentos). Corrija o construtor da classe Derivada.',
        codeSnippet: `public class Dispositivo {
    public string Serie { get; }
    public Dispositivo(string serie) {
        Serie = serie;
    }
}

public class DroneVoador : Dispositivo {
    public double Altitude { get; set; }
    
    // LINHA COM ERRO:
    public DroneVoador(string serie, double alt) {
        Altitude = alt;
    }
}`,
        buggyLineTarget: 11,
        options: [
          {
            id: 'opt_1',
            label: 'public DroneVoador(string serie, double alt) : base(serie) { Altitude = alt; }',
            correct: true,
            explanation: 'Correto! A sintaxe : base(serie) repassa a string de série para a classe pai Dispositivo satisfazendo o construtor obrigatório.',
          },
          {
            id: 'opt_2',
            label: 'public DroneVoador(string serie, double alt) { base.Serie = serie; Altitude = alt; }',
            correct: false,
            explanation: 'Incorreto. A propriedade Serie é somente-leitura e a chamada ao construtor base deve ocorrer antes do corpo.',
          },
          {
            id: 'opt_3',
            label: 'public DroneVoador(string serie, double alt) : this(serie) { Altitude = alt; }',
            correct: false,
            explanation: 'Incorreto. : this() chamaria outro construtor da própria classe DroneVoador, e não da classe pai.',
          },
        ],
        hint: 'Use a palavra-chave : base(parametro) após o cabeçalho do construtor derivado.',
      },
    },
    {
      id: 'cs_stage_5',
      number: 5,
      title: 'Nó 05: Polimorfismo Dinâmico (virtual / override)',
      track: 'csharp',
      isBoss: false,
      guardianName: 'Víbora Polimórfica',
      synapticReward: 'Sinapse: Despacho Dinâmico de Métodos',
      xpReward: 160,
      codex: {
        topic: 'Polimorfismo com virtual, override e Tipos Base',
        essence: 'Polimorfismo permite tratar objetos derivados através de sua referência de tipo base, executando a implementação especializada correspondente em tempo de execução.',
        syntaxBreakdown: [
          { term: 'virtual', explanation: 'Autoriza explicitamente na classe base que o método seja sobrescrito.' },
          { term: 'override', explanation: 'Sobrescreve a implementação do método virtual na classe filha.' },
          { term: 'abstract', explanation: 'Declara métodos sem corpo em classes abstratas, forçando implementação nas filhas.' },
        ],
        codeExample: `public class Inimigo {
    public virtual void Atacar() {
        Console.WriteLine("Ataque básico de 10 de dano.");
    }
}

public class InimigoBoss : Inimigo {
    public override void Atacar() {
        Console.WriteLine("Ataque supremo de 100 de dano!");
    }
}

// Polimorfismo em ação:
Inimigo vilao = new InimigoBoss();
vilao.Atacar(); // Imprime o ataque supremo de 100 de dano!`,
        pitfalls: [
          'Esquecer a palavra "override" faz o compilador emitir aviso de ocultação de método ("shadowing" com new) em vez de polimorfismo.',
        ],
      },
      battle: {
        type: 'output_predict',
        questionPrompt: 'A Víbora Polimórfica executa um array de armas polimórficas. Qual será a saída exata da execução?',
        codeSnippet: `using System;

public class Arma {
    public virtual string Disparar() => "Laser Padrao";
}

public class CanhaoPlasma : Arma {
    public override string Disparar() => "Plasma Pesado 500MW";
}

public class Program {
    public static void Main() {
        Arma a1 = new Arma();
        Arma a2 = new CanhaoPlasma();
        Console.WriteLine($"{a1.Disparar()} | {a2.Disparar()}");
    }
}`,
        options: [
          {
            id: 'opt_1',
            label: 'Laser Padrao | Plasma Pesado 500MW',
            correct: true,
            explanation: 'Exato! A chamada a2.Disparar() é resolvida dinamicamente para o método override da classe CanhaoPlasma.',
          },
          {
            id: 'opt_2',
            label: 'Laser Padrao | Laser Padrao',
            correct: false,
            explanation: 'Incorreto. Como o método é virtual e override, o C# resolve a chamada para o tipo da instância real (CanhaoPlasma).',
          },
          {
            id: 'opt_3',
            label: 'Plasma Pesado 500MW | Plasma Pesado 500MW',
            correct: false,
            explanation: 'Incorreto. a1 é uma instância da classe base Arma e executará a versão padrão.',
          },
        ],
        hint: 'Lembre-se: em métodos virtuais com override, a instância real determina qual método é invocado.',
      },
    },
    // CHEFE FINAL C#
    {
      id: 'cs_stage_boss',
      number: 6,
      title: 'Nó Central // CHEFE: NullPointer Overlord & Corrupt Memory Engine',
      track: 'csharp',
      isBoss: true,
      guardianName: 'NULLPOINTER OVERLORD',
      bossName: 'NULLPOINTER OVERLORD',
      bossTitle: 'Guardião da Heap Corrompida // Rank Alfa',
      synapticReward: 'TROFÉU & NÓ SUPREMO: Mestre de Orientação a Objetos C#',
      xpReward: 350,
      codex: {
        topic: 'Confronto Supremo: Arquitetura Orientada a Objetos Completa',
        essence: 'O Chefe combina todos os conceitos: encapsulamento rígido, inicialização segura em construtores e polimorfismo via interfaces e classes abstratas para neutralizar vazamentos de memória e referências nulas.',
        syntaxBreakdown: [
          { term: 'interface IServicoSeguro', explanation: 'Contrato puro desacoplado de implementação.' },
          { term: 'readonly struct', explanation: 'Estruturas imutáveis de alto desempenho alocadas na pilha.' },
          { term: 'sealed class', explanation: 'Impede herança indesejada garantindo integridade de regras.' },
        ],
        codeExample: `public interface IEscudoNeural {
    bool AbsorverDano(int quantidade);
}

public class EscudoCriogenico : IEscudoNeural {
    public int Energia { get; private set; }

    public EscudoCriogenico(int energiaInicial) {
        Energia = Math.Max(0, energiaInicial);
    }

    public bool AbsorverDano(int dano) {
        if (Energia >= dano) {
            Energia -= dano;
            return true;
        }
        return false;
    }
}`,
        pitfalls: [
          'Expor coleções mutáveis diretamente (List<T>) permite adulteração externa. Prefira IReadOnlyList<T>.',
        ],
      },
      battle: {
        type: 'bug_fix',
        questionPrompt: 'O NULLPOINTER OVERLORD disparou um raio de corrupção que tenta modificar uma coleção de transações protegidas diretamente. Qual é a melhor refatoração para impedir a corrupção?',
        codeSnippet: `// Código Vulnerável do Overlord:
public class SistemaBancario {
    // ERRO: expõe a lista interna diretamente
    public List<string> LogsTransacoes { get; set; } = new();
}`,
        options: [
          {
            id: 'opt_1',
            label: 'private readonly List<string> _logs = new();\npublic IReadOnlyList<string> LogsTransacoes => _logs.AsReadOnly();\npublic void Registrar(string log) => _logs.Add(log);',
            correct: true,
            explanation: 'VITÓRIA SUPREMA! A lista original é mantida privada e o mundo externo só recebe uma visão somente-leitura (IReadOnlyList), impedindo injeções arbitrárias.',
          },
          {
            id: 'opt_2',
            label: 'public static List<string> LogsTransacoes = new();',
            correct: false,
            explanation: 'Incorreto. Tornar a lista estática e pública piora a situação, tornando-a vulnerável a race conditions globais.',
          },
          {
            id: 'opt_3',
            label: 'public List<string> LogsTransacoes { private get; set; }',
            correct: false,
            explanation: 'Incorreto. Essa sintaxe impede a leitura mas ainda permite que qualquer um sobrescreva a lista inteira.',
          },
        ],
        hint: 'Use encapsulamento de coleções com campo privado e exposição via IReadOnlyList.',
      },
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // TRILHA 2: C BASES (PROGRAMAÇÃO ESTRUTURADA EM C)
  // ─────────────────────────────────────────────────────────────────────────
  c_bases: [
    {
      id: 'c_stage_1',
      number: 1,
      title: 'Nó 01: Tipos Primitivos, Bytes e sizeof',
      track: 'c_bases',
      isBoss: false,
      guardianName: 'Sentinela dos Registradores',
      synapticReward: 'Sinapse: Mapeamento de Bytes & Tipos em C',
      xpReward: 80,
      codex: {
        topic: 'Tamanho em Memória dos Tipos em C',
        essence: 'Em C, cada tipo primitivo ocupa um número exato de bytes na memória. O operador sizeof() calcula o tamanho em tempo de compilação.',
        syntaxBreakdown: [
          { term: 'char', explanation: 'Ocupa 1 byte (8 bits), capaz de armazenar caracteres ASCII ou inteiros de -128 a 127.' },
          { term: 'int', explanation: 'Geralmente ocupa 4 bytes em arquiteturas de 32/64 bits (32 bits).' },
          { term: 'sizeof(tipo)', explanation: 'Retorna a quantidade de bytes ocupada pelo tipo ou variável.' },
        ],
        codeExample: `#include <stdio.h>

int main() {
    int numeros[5];
    printf("Tamanho total do vetor: %zu bytes\\n", sizeof(numeros)); // 5 * 4 = 20 bytes
    printf("Quantidade de elementos: %zu\\n", sizeof(numeros) / sizeof(numeros[0])); // 20 / 4 = 5
    return 0;
}`,
        pitfalls: [
          'sizeof em um parâmetro de função declarado como "int vet[]" retorna o tamanho do ponteiro (4 ou 8 bytes), e não do array inteiro.',
        ],
      },
      battle: {
        type: 'output_predict',
        questionPrompt: 'O Sentinela escaneia a pilha de execução. Em um sistema padrão de 64 bits onde sizeof(int) = 4 e sizeof(double) = 8, qual será a saída do código abaixo?',
        codeSnippet: `#include <stdio.h>

int main() {
    int a = 10;
    double b = 25.5;
    int array[3] = {1, 2, 3};
    
    size_t total = sizeof(a) + sizeof(b) + sizeof(array);
    printf("BYTES: %zu", total);
    return 0;
}`,
        options: [
          {
            id: 'opt_1',
            label: 'BYTES: 24',
            correct: true,
            explanation: 'Correto! sizeof(a) = 4 + sizeof(b) = 8 + sizeof(array) = 3 * 4 = 12. Total: 4 + 8 + 12 = 24 bytes.',
          },
          {
            id: 'opt_2',
            label: 'BYTES: 15',
            correct: false,
            explanation: 'Incorreto. O array de 3 inteiros ocupa 12 bytes (3 * 4 bytes cada), não 3 bytes.',
          },
          {
            id: 'opt_3',
            label: 'BYTES: 16',
            correct: false,
            explanation: 'Incorreto. Você esqueceu de somar o tamanho dos 3 inteiros do array.',
          },
        ],
        hint: 'Some 4 bytes do int, 8 bytes do double e 3 * 4 bytes do array.',
      },
    },
    {
      id: 'c_stage_2',
      number: 2,
      title: 'Nó 02: O Operador de Endereço & e Desreferenciação *',
      track: 'c_bases',
      isBoss: false,
      guardianName: 'Gárgula de Endereços Hexadecimais',
      synapticReward: 'Sinapse: Ponteiros & Manipulação de Endereços',
      xpReward: 100,
      codex: {
        topic: 'Ponteiros: O Operador & e o Operador *',
        essence: 'Um ponteiro armazena o endereço de memória de outra variável. O operador & pega o endereço; o operador * na frente do ponteiro acessa ou altera o valor gravado naquele endereço.',
        syntaxBreakdown: [
          { term: 'int *ptr', explanation: 'Declara uma variável ponteiro capaz de apontar para um endereço de memória de um int.' },
          { term: '&variavel', explanation: 'Retorna a posição de memória (endereço) onde a variável reside.' },
          { term: '*ptr = 99', explanation: 'Desreferencia o ponteiro e grava o valor 99 na memória apontada.' },
        ],
        codeExample: `#include <stdio.h>

int main() {
    int valor = 50;
    int *p = &valor; // p guarda o endereço de 'valor'

    *p = 100; // Altera o conteúdo na memória de 'valor'
    printf("Valor atual: %d\\n", valor); // Imprime 100
    return 0;
}`,
        pitfalls: [
          'Desreferenciar um ponteiro não inicializado (ponteiro selvagem / wild pointer) causa travamento ou corrupção de memória.',
        ],
      },
      battle: {
        type: 'output_predict',
        questionPrompt: 'A Gárgula manipula ponteiros encadeados. Qual será o valor impresso no terminal ao final da execução?',
        codeSnippet: `#include <stdio.h>

int main() {
    int x = 10;
    int y = 20;
    int *p1 = &x;
    int *p2 = &y;

    *p1 = *p2 + 5; // x = 20 + 5 = 25
    p2 = p1;       // p2 agora aponta para x
    *p2 = *p2 + 10;// x = 25 + 10 = 35

    printf("x=%d, y=%d", x, y);
    return 0;
}`,
        options: [
          {
            id: 'opt_1',
            label: 'x=35, y=20',
            correct: true,
            explanation: 'Perfeito! x recebeu 25, depois p2 passou a apontar para x, somando mais 10 em x (totalizando 35). y permaneceu intacto com 20.',
          },
          {
            id: 'opt_2',
            label: 'x=25, y=30',
            correct: false,
            explanation: 'Incorreto. A linha p2 = p1 fez p2 apontar para x, portanto a modificação subsequente afetou x, não y.',
          },
          {
            id: 'opt_3',
            label: 'x=10, y=20',
            correct: false,
            explanation: 'Incorreto. O valor de x foi mutado duas vezes via desreferenciação.',
          },
        ],
        hint: 'Rastreie para qual endereço cada ponteiro está apontando passo a passo.',
      },
    },
    {
      id: 'c_stage_3',
      number: 3,
      title: 'Nó 03: Passagem de Parâmetros por Referência',
      track: 'c_bases',
      isBoss: false,
      guardianName: 'Espectro da Cópia de Pilha',
      synapticReward: 'Sinapse: Modificação de Variáveis do Chamador',
      xpReward: 120,
      codex: {
        topic: 'Passagem por Valor vs Simulação de Referência com Ponteiros',
        essence: 'Em C, todas as funções recebem parâmetros por cópia (valor). Para que uma função possa alterar uma variável do chamador, devemos passar o endereço de memória dela (&var) e recebê-la como ponteiro (int *p).',
        syntaxBreakdown: [
          { term: 'void trocar(int *a, int *b)', explanation: 'Função que recebe endereços de memória para trocar valores.' },
          { term: 'int temp = *a; *a = *b; *b = temp;', explanation: 'Troca os conteúdos das variáveis originais na memória.' },
          { term: 'trocar(&x, &y);', explanation: 'O chamador passa os endereços com & para permitir a mutação.' },
        ],
        codeExample: `void incrementar(int *contador) {
    (*contador)++; // Parênteses obrigatórios por conta da precedência dos operadores
}

int main() {
    int vida = 100;
    incrementar(&vida);
    printf("Vida: %d\\n", vida); // 101
    return 0;
}`,
        pitfalls: [
          'Escrever *contador++ incrementa o endereço do ponteiro e não o valor apontado! O correto é (*contador)++ ou *contador += 1.',
        ],
      },
      battle: {
        type: 'bug_fix',
        questionPrompt: 'O Espectro da Cópia de Pilha tentou resetar o status de energia, mas a função abaixo não está alterando a variável "energia" da main. Corrija o bug.',
        codeSnippet: `#include <stdio.h>

// LINHA COM PROBLEMA: Recebe por cópia
void restaurarEnergia(int energia) {
    energia = 100;
}

int main() {
    int energia = 25;
    restaurarEnergia(energia);
    printf("Energia: %d", energia); // Imprime 25 em vez de 100
    return 0;
}`,
        options: [
          {
            id: 'opt_1',
            label: 'void restaurarEnergia(int *energia) { *energia = 100; }\n// Na main chamar: restaurarEnergia(&energia);',
            correct: true,
            explanation: 'Correto! Passando o endereço com & e recebendo como ponteiro com *, a alteração é feita diretamente na memória da variável original.',
          },
          {
            id: 'opt_2',
            label: 'int restaurarEnergia(int energia) { return 100; }\n// Na main apenas chamar restaurarEnergia(energia); sem atribuir',
            correct: false,
            explanation: 'Incorreto. Sem atribuir o retorno à variável na main, o valor de energia continuará inalterado.',
          },
          {
            id: 'opt_3',
            label: 'void restaurarEnergia(int &energia) { energia = 100; }',
            correct: false,
            explanation: 'Incorreto. A sintaxe de referência "&" em parâmetros existe em C++, mas é erro de sintaxe em C puro.',
          },
        ],
        hint: 'Use int * no parâmetro e passe &energia na chamada da função.',
      },
    },
    {
      id: 'c_stage_4',
      number: 4,
      title: 'Nó 04: Aritmética de Ponteiros e Decaimento de Vetores',
      track: 'c_bases',
      isBoss: false,
      guardianName: 'Vetor Autômato de Baixa Latência',
      synapticReward: 'Sinapse: Aritmética de Ponteiros & *(p + i)',
      xpReward: 140,
      codex: {
        topic: 'Aritmética de Ponteiros e a Equivalência *(p + i) == p[i]',
        essence: 'Em C, o identificador de um vetor decai para um ponteiro constante apontando para o seu primeiro elemento (vet == &vet[0]). A operação *(vet + i) avança i posições multiplicando automaticamente pelo sizeof do tipo.',
        syntaxBreakdown: [
          { term: 'ptr + 1', explanation: 'Avança o endereço em 1 * sizeof(tipo) bytes na memória.' },
          { term: '*(ptr + i)', explanation: 'Acessa o i-ésimo elemento a partir de ptr (estritamente idêntico a ptr[i]).' },
          { term: 'ptr2 - ptr1', explanation: 'Retorna a distância em quantidade de elementos entre dois ponteiros do mesmo tipo.' },
        ],
        codeExample: `#include <stdio.h>

int main() {
    int dados[4] = {10, 20, 30, 40};
    int *p = dados;

    printf("Primeiro: %d\\n", *p);       // 10
    printf("Segundo: %d\\n", *(p + 1));  // 20
    printf("Terceiro: %d\\n", p[2]);     // 30
    return 0;
}`,
        pitfalls: [
          'Aritmética de ponteiros avança em blocos de bytes do tamanho do tipo, não em bytes unitários individuais.',
        ],
      },
      battle: {
        type: 'output_predict',
        questionPrompt: 'O Vetor Autômato avança ponteiros pelo barramento. Qual será o valor exibido no terminal?',
        codeSnippet: `#include <stdio.h>

int main() {
    int grid[5] = {100, 200, 300, 400, 500};
    int *p = grid + 1; // Aponta para o elemento com valor 200
    
    int val1 = *p;         // 200
    int val2 = *(p + 2);   // Pula 2 posições a partir de p -> elemento 400
    
    printf("RESULTADO: %d", val1 + val2);
    return 0;
}`,
        options: [
          {
            id: 'opt_1',
            label: 'RESULTADO: 600',
            correct: true,
            explanation: 'Exato! p aponta para grid[1] (200). *(p + 2) aponta para grid[3] (400). A soma 200 + 400 resulta em 600.',
          },
          {
            id: 'opt_2',
            label: 'RESULTADO: 500',
            correct: false,
            explanation: 'Incorreto. *(p + 2) salta dois elementos à frente do 200, atingindo 400.',
          },
          {
            id: 'opt_3',
            label: 'RESULTADO: 300',
            correct: false,
            explanation: 'Incorreto. Reveja as posições do array na memória.',
          },
        ],
        hint: 'p está no índice 1. Somar 2 ao ponteiro leva ao índice 1 + 2 = 3.',
      },
    },
    {
      id: 'c_stage_5',
      number: 5,
      title: 'Nó 05: Alocação Dinâmica com malloc e free',
      track: 'c_bases',
      isBoss: false,
      guardianName: 'Verme de Memory Leak',
      synapticReward: 'Sinapse: Alocação Dinâmica na Heap & Liberação de Memória',
      xpReward: 160,
      codex: {
        topic: 'Alocação Dinâmica com malloc() e free() na Heap',
        essence: 'malloc() aloca blocos de bytes na Heap durante a execução do programa e retorna um ponteiro void*. Sempre teste se o retorno é NULL e sempre libere a memória com free() para evitar vazamentos (Memory Leaks).',
        syntaxBreakdown: [
          { term: 'int *p = malloc(n * sizeof(int))', explanation: 'Aloca espaço contíguo para n inteiros na Heap.' },
          { term: 'if (p == NULL)', explanation: 'Verificação defensiva obrigatória contra esgotamento de memória.' },
          { term: 'free(p)', explanation: 'Devolve o bloco alocado de volta ao sistema operacional.' },
        ],
        codeExample: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int tamanho = 5;
    int *vetor = (int *) malloc(tamanho * sizeof(int));
    if (vetor == NULL) {
        printf("Falha na alocacao!\\n");
        return 1;
    }

    for (int i = 0; i < tamanho; i++) {
        vetor[i] = i * 10;
    }

    free(vetor); // Libera o bloco para não vazar memória
    vetor = NULL; // Boa prática contra dangling pointers
    return 0;
}`,
        pitfalls: [
          'Desreferenciar um ponteiro após chamar free() gera um Dangling Pointer e corrupção imprevisível de memória.',
          'Esquecer de chamar free() em laços contínuos causa consumo descontrolado de RAM (Memory Leak).',
        ],
      },
      battle: {
        type: 'bug_fix',
        questionPrompt: 'O Verme de Memory Leak está infectando o sistema com alocações inválidas e vazamento de memória. Qual das correções abaixo aloca e limpa a memória com máxima segurança?',
        codeSnippet: `// Código com falha:
int *criarBuffer(int tamanho) {
    int *buf = malloc(tamanho * sizeof(int));
    // Falta checagem de NULL e uso correto
    return buf;
}`,
        options: [
          {
            id: 'opt_1',
            label: 'int *buf = (int *) malloc(tamanho * sizeof(int));\nif (!buf) return NULL;\n// e garantir que o chamador faça free(buf) após o uso.',
            correct: true,
            explanation: 'Correto! Sempre checar se malloc retornou NULL antes de usar o buffer e documentar a responsabilidade do free().',
          },
          {
            id: 'opt_2',
            label: 'int buf[tamanho]; return buf;',
            correct: false,
            explanation: 'GRAVE ERRO: Retornar o endereço de um array local da pilha causa Dangling Pointer assim que a função encerra.',
          },
          {
            id: 'opt_3',
            label: 'int *buf = malloc(sizeof(int)); return buf;',
            correct: false,
            explanation: 'Incorreto. Aloca espaço para apenas 1 inteiro, gerando Buffer Overflow se tamanho for maior que 1.',
          },
        ],
        hint: 'Nunca retorne ponteiros para variáveis locais da pilha e sempre valide retornos nulos.',
      },
    },
    // CHEFE FINAL C BASES
    {
      id: 'c_stage_boss',
      number: 6,
      title: 'Nó Central // CHEFE: Segmentation Fault Titan & Stack Crusher',
      track: 'c_bases',
      isBoss: true,
      guardianName: 'SEGMENTATION FAULT TITAN',
      bossName: 'SEGMENTATION FAULT TITAN',
      bossTitle: 'Guardião dos Ponteiros Corrompidos // Rank Alfa',
      synapticReward: 'TROFÉU & NÓ SUPREMO: Mestre de Pointers & Memória em C',
      xpReward: 350,
      codex: {
        topic: 'Confronto Supremo: Structs Dinâmicas, Ponteiros Duplos e Proteção contra Buffer Overflow',
        essence: 'O Titan ataca corrompendo a pilha com estouro de buffer e desreferenciação nula. Você precisará dominar structs dinâmicas com o operador -> e manipulação rigorosa de ponteiros para vencer.',
        syntaxBreakdown: [
          { term: 'typedef struct { ... } Nodo', explanation: 'Cria um novo tipo estruturado contendo múltiplos campos.' },
          { term: 'ptr->campo', explanation: 'Acessa um membro de uma struct através de seu ponteiro (equivalente a (*ptr).campo).' },
          { term: 'int **ptr_duplo', explanation: 'Ponteiro para ponteiro, essencial para matrizes dinâmicas ou alterar ponteiros em funções.' },
        ],
        codeExample: `typedef struct {
    char id[16];
    int energia;
} Reator;

void recarregar(Reator *r, int qtd) {
    if (r != NULL) {
        r->energia += qtd;
    }
}`,
        pitfalls: [
          'Usar "." em vez de "->" em um ponteiro de struct causa erro imediato de compilação.',
        ],
      },
      battle: {
        type: 'bug_fix',
        questionPrompt: 'O TITAN disparou um golpe de quebra de pilha tentando acessar uma struct dinamicamente sem o operador correto e sem validar o ponteiro. Qual é a correção perfeita?',
        codeSnippet: `typedef struct {
    int integridade;
    int potencia;
} EscudoTitan;

// LINHA COM ERRO:
void reparar(EscudoTitan *e) {
    e.integridade = 100; // Erro de compilação
}`,
        options: [
          {
            id: 'opt_1',
            label: 'void reparar(EscudoTitan *e) {\n    if (e != NULL) {\n        e->integridade = 100;\n    }\n}',
            correct: true,
            explanation: 'VITÓRIA SUPREMA! O operador seta "->" acessa o membro através do ponteiro da struct com verificação defensiva contra NULL.',
          },
          {
            id: 'opt_2',
            label: 'void reparar(EscudoTitan *e) {\n    *e.integridade = 100;\n}',
            correct: false,
            explanation: 'Incorreto. O operador ponto "." tem precedência sobre o asterisco "*". O correto seria (*e).integridade ou e->integridade.',
          },
          {
            id: 'opt_3',
            label: 'void reparar(EscudoTitan e) {\n    e.integridade = 100;\n}',
            correct: false,
            explanation: 'Incorreto. Passar a struct por cópia não altera a struct original do chamador.',
          },
        ],
        hint: 'Use o operador de seta "->" e verifique contra ponteiro nulo.',
      },
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // TRILHA 3: LFA & AUTÔMATOS (LINGUAGENS FORMAIS E TEORIA DE AUTÔMATOS)
  // ─────────────────────────────────────────────────────────────────────────
  lfa: [
    {
      id: 'lfa_stage_1',
      number: 1,
      title: 'Nó 01: Alfabetos, Palavras e a Linguagem Vazia',
      track: 'lfa',
      isBoss: false,
      guardianName: 'Sentinela dos Símbolos Formais',
      synapticReward: 'Sinapse: Alfabeto Σ, Cadeias & Fecho de Kleene Σ*',
      xpReward: 80,
      codex: {
        topic: 'Definições Fundamentais: Σ, Palavras e Fecho de Kleene',
        essence: 'Um alfabeto Σ é um conjunto finito de símbolos. Uma palavra w é uma sequência finita de símbolos. A palavra vazia ε tem comprimento 0 (|ε| = 0). O fecho de Kleene Σ* representa todas as palavras possíveis formadas pelo alfabeto, incluindo a palavra vazia.',
        syntaxBreakdown: [
          { term: 'Σ = {a, b}', explanation: 'Alfabeto com dois símbolos a e b.' },
          { term: '|w| = 3', explanation: 'Comprimento da palavra w (número de símbolos).' },
          { term: 'Σ* (Fecho de Kleene)', explanation: 'União de todas as potências de Σ: {ε, a, b, aa, ab, ba, bb, ...}.' },
          { term: 'Σ+ (Fecho Positivo)', explanation: 'Todas as palavras exceto a palavra vazia: Σ+ = Σ* - {ε}.' },
        ],
        codeExample: `// Seja o alfabeto Σ = {0, 1}
// Cadeias válidas em Σ*: "", "0", "1", "00", "01", "10", "11", ...
// Comprimento da palavra w = "1010": |w| = 4`,
        pitfalls: [
          'Confundir a linguagem vazia ∅ (conjunto sem elementos) com a linguagem que contém a palavra vazia {ε} (conjunto com 1 elemento de tamanho zero).',
        ],
      },
      battle: {
        type: 'output_predict',
        questionPrompt: 'O Sentinela testa sua base teórica. Dado o alfabeto Σ = {a, b}, qual das seguintes afirmações sobre a linguagem L = {w ∈ Σ* | |w| ≤ 2} é rigorosamente verdadeira?',
        codeSnippet: `Alfabeto: Σ = {a, b}
Linguagem: L = {w em Σ* com comprimento menor ou igual a 2}
Elementos: {ε, a, b, aa, ab, ba, bb}`,
        options: [
          {
            id: 'opt_1',
            label: 'A linguagem L possui exatamente 7 elementos: {ε, a, b, aa, ab, ba, bb}.',
            correct: true,
            explanation: 'Exato! Comprimento 0: 1 palavra (ε); Comprimento 1: 2 palavras (a, b); Comprimento 2: 4 palavras (aa, ab, ba, bb). Total: 1 + 2 + 4 = 7 palavras.',
          },
          {
            id: 'opt_2',
            label: 'A linguagem L possui 6 elementos porque a palavra vazia não conta.',
            correct: false,
            explanation: 'Incorreto. A palavra vazia ε possui |ε| = 0, e como 0 ≤ 2, ela obrigatoriamente pertence a L.',
          },
          {
            id: 'opt_3',
            label: 'A linguagem L é infinita.',
            correct: false,
            explanation: 'Incorreto. O comprimento está limitado a ≤ 2, gerando um conjunto finito de 7 palavras.',
          },
        ],
        hint: 'Conte as palavras de comprimento 0, 1 e 2 formadas pelas combinações de a e b.',
      },
    },
    {
      id: 'lfa_stage_2',
      number: 2,
      title: 'Nó 02: Autômatos Finitos Determinísticos (AFD)',
      track: 'lfa',
      isBoss: false,
      guardianName: 'Gárgula dos Estados Deterministas',
      synapticReward: 'Sinapse: Função de Transição Total δ: Q × Σ → Q',
      xpReward: 100,
      codex: {
        topic: 'Autômato Finito Determinístico (AFD) e Reconhecimento de Cadeias',
        essence: 'Um AFD é uma 5-upla M = (Q, Σ, δ, q0, F). Para cada estado e cada símbolo do alfabeto, existe exatamente UMA ÚNICA transição determinística. Uma cadeia é aceita se, ao final da leitura de todos os símbolos, o autômato estiver em um estado pertencente ao conjunto F (estados finais).',
        syntaxBreakdown: [
          { term: 'Q = {q0, q1, q2}', explanation: 'Conjunto de todos os estados possíveis da máquina.' },
          { term: 'δ(q, s) = q_destino', explanation: 'Função de transição: dado o estado atual q e o símbolo s lido, vai para q_destino.' },
          { term: 'F ⊆ Q', explanation: 'Conjunto dos estados finais (aceitação), representados graficamente com círculo duplo.' },
        ],
        codeExample: `// AFD que aceita cadeias sobre {0, 1} que terminam com '1':
// Estados: Q = {q0, q1}, Inicial: q0, Finais: F = {q1}
// Transições:
// δ(q0, '0') = q0
// δ(q0, '1') = q1
// δ(q1, '0') = q0
// δ(q1, '1') = q1`,
        pitfalls: [
          'Em um AFD puro, a função de transição deve ser TOTAL: não podem faltar saídas para nenhum símbolo do alfabeto em nenhum estado.',
        ],
      },
      battle: {
        type: 'output_predict',
        questionPrompt: 'A Gárgula submete a cadeia "0101" ao AFD abaixo. Qual será o estado final e a cadeia será aceita ou rejeitada?',
        codeSnippet: `Estados: Q = {q0, q1}, Inicial: q0, Final: F = {q1}
Transições:
δ(q0, '0') = q0
δ(q0, '1') = q1
δ(q1, '0') = q0
δ(q1, '1') = q1

Entrada: "0101"
Passo 1: Lê '0' em q0 -> vai para q0
Passo 2: Lê '1' em q0 -> vai para q1
Passo 3: Lê '0' em q1 -> vai para q0
Passo 4: Lê '1' em q0 -> vai para ???`,
        options: [
          {
            id: 'opt_1',
            label: 'Termina no estado q1 -> CADEIA ACEITA (porque q1 ∈ F).',
            correct: true,
            explanation: 'Perfeito! A sequência de estados foi: q0 -> q0 -> q1 -> q0 -> q1. Como q1 é estado final, a cadeia é aceita.',
          },
          {
            id: 'opt_2',
            label: 'Termina no estado q0 -> CADEIA REJEITADA.',
            correct: false,
            explanation: 'Incorreto. O último símbolo lido foi "1", que a partir de q0 leva a transição para q1.',
          },
          {
            id: 'opt_3',
            label: 'O autômato trava por falta de transição.',
            correct: false,
            explanation: 'Incorreto. O AFD é completo e possui transição definida para todos os símbolos.',
          },
        ],
        hint: 'Acompanhe a transição no último caractere "1" a partir do estado q0.',
      },
    },
    {
      id: 'lfa_stage_3',
      number: 3,
      title: 'Nó 03: Autômatos Não-Determinísticos (AFN e ε-Transições)',
      track: 'lfa',
      isBoss: false,
      guardianName: 'Espectro dos Múltiplos Ramos',
      synapticReward: 'Sinapse: Não-Determinismo δ: Q × (Σ ∪ {ε}) → P(Q)',
      xpReward: 120,
      codex: {
        topic: 'Autômatos Finitos Não-Determinísticos (AFN)',
        essence: 'Em um AFN, um estado pode ter 0, 1 ou múltiplos caminhos possíveis para o mesmo símbolo de entrada, além de transições espontâneas com palavra vazia (ε). Uma cadeia é aceita se pelo menos UM dos caminhos possíveis de execução terminar em um estado final.',
        syntaxBreakdown: [
          { term: 'δ(q, a) = {q1, q2}', explanation: 'O autômato se bifurca/explora ambos os caminhos em paralelo.' },
          { term: 'ε-transição', explanation: 'Transição espontânea que ocorre sem consumir nenhum símbolo da fita de entrada.' },
          { term: 'Equivalência AFD = AFN', explanation: 'Todo AFN pode ser convertido em um AFD equivalente pelo algoritmo de construção de subconjuntos.' },
        ],
        codeExample: `// AFN que reconhece cadeias que contêm "ab" como subpalavra:
// δ(q0, 'a') = {q0, q1}  // Não determinismo no 'a'
// δ(q0, 'b') = {q0}
// δ(q1, 'b') = {q2}      // q2 é estado final
// δ(q2, 'a') = {q2}, δ(q2, 'b') = {q2}`,
        pitfalls: [
          'Um AFN NÃO rejeita uma palavra só porque um dos ramos morreu; basta que um único ramo atinja o estado final.',
        ],
      },
      battle: {
        type: 'architecture_choice',
        questionPrompt: 'O Espectro tenta confundir os conceitos de poder computacional. Qual é a relação formal correta entre o poder de reconhecimento de linguagens de um AFD e de um AFN?',
        codeSnippet: `Teorema Fundamental de Rabin-Scott:
Seja L uma linguagem reconhecida por um AFN com N estados.
Existe um AFD equivalente com no máximo 2^N estados que reconhece exatamente L.`,
        options: [
          {
            id: 'opt_1',
            label: 'AFDs e AFNs possuem rigorosamente o MESMO poder computacional: ambos reconhecem exatamente a classe das Linguagens Regulares.',
            correct: true,
            explanation: 'Correto! Apesar de o AFN permitir projeto conceitual mais simples, o Teorema de Rabin-Scott prova que todo AFN tem um AFD equivalente.',
          },
          {
            id: 'opt_2',
            label: 'O AFN é mais poderoso que o AFD e consegue reconhecer linguagens livres de contexto.',
            correct: false,
            explanation: 'Incorreto. AFNs continuam restritos à memória finita e não reconhecem linguagens livres de contexto (como a^n b^n).',
          },
          {
            id: 'opt_3',
            label: 'O AFD é mais poderoso porque sua função de transição é total.',
            correct: false,
            explanation: 'Incorreto. Ambos possuem o mesmo poder formal de reconhecimento.',
          },
        ],
        hint: 'Lembre-se do algoritmo de Construção de Subconjuntos (Subset Construction).',
      },
    },
    {
      id: 'lfa_stage_4',
      number: 4,
      title: 'Nó 04: Expressões Regulares (Regex) e Operações',
      track: 'lfa',
      isBoss: false,
      guardianName: 'Autômaton de Expressões Formais',
      synapticReward: 'Sinapse: Álgebra de Regex (Concatenação, União e Fecho)',
      xpReward: 140,
      codex: {
        topic: 'Expressões Regulares Formais (Regex)',
        essence: 'Uma Expressão Regular descreve algebricamente uma Linguagem Regular através de 3 operadores fundamentais: Concatenação (ab), União/Alternância (a + b ou a|b) e Fecho de Kleene (a*). O Teorema de Kleene estabelece que Regex, AFD e AFN são equivalentes.',
        syntaxBreakdown: [
          { term: 'a*', explanation: 'Zero ou mais repetições de "a" ({ε, a, aa, aaa, ...}).' },
          { term: '(a|b)*', explanation: 'Qualquer sequência de letras "a" e "b", incluindo a palavra vazia.' },
          { term: 'a(ba)*', explanation: 'Palavras que começam com "a" e continuam com pares "ba": "a", "aba", "ababa", ...' },
        ],
        codeExample: `// Expressão Regular para números binários ímpares (terminam em 1):
// Regex: (0|1)*1
// Exemplos aceitos: "1", "01", "11", "101", "11101"
// Exemplos rejeitados: "0", "10", "1100"`,
        pitfalls: [
          'A expressão a*b* NÃO é igual a (ab)*! a*b* aceita "aaabbb", enquanto (ab)* aceita apenas "ababab".',
        ],
      },
      battle: {
        type: 'output_predict',
        questionPrompt: 'O Autômaton exige a validação da expressão regular: r = 0(10)*1. Qual das cadeias abaixo é ACEITA pela expressão r?',
        codeSnippet: `Expressão Regular: r = 0(10)*1
Significado:
- Começa obrigatoriamente com '0'
- No meio possui zero ou mais repetições do bloco '10'
- Termina obrigatoriamente com '1'`,
        options: [
          {
            id: 'opt_1',
            label: '"010101" (formada por 0 + "10" + "10" + 1)',
            correct: true,
            explanation: 'Exato! 0 + (10 duas vezes) + 1 = "010101". Todos os blocos casam perfeitamente com a especificação da Regex.',
          },
          {
            id: 'opt_2',
            label: '"01101"',
            correct: false,
            explanation: 'Incorreto. Há dois "1" consecutivos ("11"), que não formam o bloco "10".',
          },
          {
            id: 'opt_3',
            label: '"10101"',
            correct: false,
            explanation: 'Incorreto. A cadeia começa com "1", mas a Regex exige início com "0".',
          },
        ],
        hint: 'Analise o bloco do meio (10)* que só permite repetições exatas de "10".',
      },
    },
    {
      id: 'lfa_stage_5',
      number: 5,
      title: 'Nó 05: Gramáticas Livres de Contexto (GLC)',
      track: 'lfa',
      isBoss: false,
      guardianName: 'Verme da Árvore Sintática',
      synapticReward: 'Sinapse: Gramáticas Livres de Contexto & Derivações',
      xpReward: 160,
      codex: {
        topic: 'Gramáticas Livres de Contexto (GLC) e a Hierarquia de Chomsky',
        essence: 'Uma GLC é uma 4-upla G = (V, Σ, R, S) onde as regras de produção têm um único não-terminal à esquerda (A -> α). GLCs são mais poderosas que autômatos finitos porque conseguem expressar estruturas aninhadas e balanceadas (como parênteses ou a^n b^n).',
        syntaxBreakdown: [
          { term: 'V (Variáveis/Não-Terminais)', explanation: 'Símbolos maiúsculos (ex: S, A, B) que são expandidos por regras.' },
          { term: 'Σ (Terminais)', explanation: 'Símbolos do alfabeto final (ex: a, b, 0, 1).' },
          { term: 'S -> aSb | ε', explanation: 'Regra de produção clássica que gera a linguagem L = {a^n b^n | n ≥ 0}.' },
        ],
        codeExample: `// Gramática para parênteses balanceados:
// G = ({S}, {'(', ')'}, R, S)
// Regras R:
// S -> (S) | SS | ε
// Derivação de "()()": S -> SS -> (S)S -> ()S -> ()(S) -> ()()`,
        pitfalls: [
          'Linguagens regulares NÃO conseguem contar infinitamente (ex: a^n b^n). Elas precisam de Gramáticas Livres de Contexto ou Autômatos com Pilha.',
        ],
      },
      battle: {
        type: 'output_predict',
        questionPrompt: 'O Verme testa a derivação sintática da gramática G com regras: S -> aSb | ab. Qual linguagem é gerada por esta gramática?',
        codeSnippet: `Gramática G:
S -> aSb
S -> ab

Derivação de n=1: S => ab
Derivação de n=2: S => aSb => a(ab)b = aabb
Derivação de n=3: S => aSb => a(aSb)b => a(aabb)b = aaabbb`,
        options: [
          {
            id: 'opt_1',
            label: 'L = {a^n b^n | n ≥ 1} (número igual de "a"s seguido do mesmo número de "b"s com pelo menos 1 par).',
            correct: true,
            explanation: 'Perfeito! Cada aplicação da regra S -> aSb adiciona um "a" na esquerda e um "b" na direita, e a terminação S -> ab garante n ≥ 1 sem a palavra vazia.',
          },
          {
            id: 'opt_2',
            label: 'L = (ab)* (qualquer repetição de pares "ab").',
            correct: false,
            explanation: 'Incorreto. A gramática gera todos os "a"s antes de todos os "b"s (ex: aaabbb), não alternâncias como "abab".',
          },
          {
            id: 'opt_3',
            label: 'L = a* b* (qualquer quantidade de "a"s e qualquer quantidade de "b"s).',
            correct: false,
            explanation: 'Incorreto. A quantidade de "a"s é estritamente IGUAL à quantidade de "b"s.',
          },
        ],
        hint: 'Observe como cada expansão adiciona um "a" no início e um "b" no fim simultaneamente.',
      },
    },
    // CHEFE FINAL LFA
    {
      id: 'lfa_stage_boss',
      number: 6,
      title: 'Nó Central // CHEFE: Leviatã dos Autômatos Indeterministas',
      track: 'lfa',
      isBoss: true,
      guardianName: 'LEVIATÃ INDETERMINISTA',
      bossName: 'LEVIATÃ INDETERMINISTA',
      bossTitle: 'Soberano das Linguagens Irregulares // Rank Alfa',
      synapticReward: 'TROFÉU & NÓ SUPREMO: Mestre de Teoria da Computação & LFA',
      xpReward: 350,
      codex: {
        topic: 'Confronto Supremo: Lema do Bombeamento e Limites da Computabilidade',
        essence: 'O Leviatã tenta provar que linguagens infinitas não regulares podem ser processadas por AFDs simples. Para derrotá-lo, você deve aplicar o Lema do Bombeamento (Pumping Lemma) e reconhecer os limites dos autômatos finitos.',
        syntaxBreakdown: [
          { term: 'Lema do Bombeamento para Regulares', explanation: 'Se L é regular, qualquer palavra longa w (|w| ≥ p) pode ser dividida em w = xyz tal que xy^i z ∈ L para todo i ≥ 0.' },
          { term: 'Autômato com Pilha (AP)', explanation: 'Autômato equipado com uma pilha de memória infinita (LIFO), reconhecendo Linguagens Livres de Contexto.' },
          { term: 'Máquina de Turing (MT)', explanation: 'Modelo computacional universal com fita bidirecional de leitura/escrita ilimitada.' },
        ],
        codeExample: `// Linguagem Clássica NÃO Regular:
// L = {0^n 1^n | n >= 0}
// Tentativa com AFD: Requereria estados infinitos para lembrar quantos '0's foram lidos.
// Solução correta: Autômato com Pilha (Pushdown Automaton) ou GLC.`,
        pitfalls: [
          'Tentar criar um AFD ou Expressão Regular para validar parênteses aninhados arbitrariamente é impossível por conta do limite de memória finita.',
        ],
      },
      battle: {
        type: 'architecture_choice',
        questionPrompt: 'O LEVIATÃ INDETERMINISTA afirma que criou um AFD simples de 4 estados capaz de validar se qualquer expressão aritmética possui parênteses aninhados perfeitamente balanceados com profundidade ilimitada. Por que a afirmação do Leviatã é falsa?',
        codeSnippet: `Proposição do Leviatã:
"Criei um AFD que valida expressões como '((((...))))' para qualquer profundidade N."`,
        options: [
          {
            id: 'opt_1',
            label: 'A linguagem de parênteses balanceados não é Regular: requer memória em pilha para contagem ilimitada, violando a premissa de estados finitos do AFD (provado pelo Lema do Bombeamento).',
            correct: true,
            explanation: 'VITÓRIA SUPREMA! Para contar profundidade arbitrária de parênteses é necessário um Autômato com Pilha (Pushdown Automaton) ou uma Gramática Livre de Contexto, sendo impossível em um AFD.',
          },
          {
            id: 'opt_2',
            label: 'A afirmação é falsa apenas porque ele precisaria de 5 estados em vez de 4.',
            correct: false,
            explanation: 'Incorreto. Nenhum número finito de estados é capaz de reconhecer contagens ilimitadas.',
          },
          {
            id: 'opt_3',
            label: 'A afirmação é falsa porque autômatos finitos só trabalham com números, não com caracteres como parênteses.',
            correct: false,
            explanation: 'Incorreto. Autômatos finitos aceitam qualquer alfabeto finito de símbolos.',
          },
        ],
        hint: 'Lembre-se do motivo pelo qual a linguagem a^n b^n não pode ser reconhecida por autômatos finitos.',
      },
    },
  ],
};
