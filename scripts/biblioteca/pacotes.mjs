// Pacotes da comunidade (github.com/excalidraw/excalidraw-libraries, licença MIT),
// escolhidos pra estudar computação, agrupados por tema.
// Fixados num commit pra o resultado ser sempre o mesmo.

export const COMMIT = '297a349eaff859e678f78d4dbc8e68df5fce42e5';

// Nome que aparece antes de cada item (a biblioteca do Excalidraw tem busca por nome).
export const ROTULO = {
  'estruturas-de-dados': 'Estrutura de dados',
  grafos: 'Grafos',
  fluxograma: 'Fluxograma',
  'uml-er': 'UML/ER',
  'banco-de-dados': 'Banco de dados',
  arquitetura: 'Arquitetura',
  redes: 'Redes',
  git: 'Git',
  hardware: 'Hardware',
  'portas-logicas': 'Portas lógicas',
  matematica: 'Matemática',
  'ia-deep-learning': 'IA/Deep learning',
  'logos-dev': 'Logo dev',
};

export const TEMAS = {
  'estruturas-de-dados': [
    'intradeus/algorithms-and-data-structures-arrays-matrices-trees.excalidrawlib',
    'https-github-com-sly-dog/ds-visualizations.excalidrawlib',
    'molibden/types-and-values-in-javascript.excalidrawlib',
    'cengizhanparlak/code-essentials.excalidrawlib',
  ],
  grafos: ['jakubpawlina/graphs.excalidrawlib'],
  fluxograma: [
    'finfin/flow-chart-symbols.excalidrawlib',
    'aretecode/decision-flow-control.excalidrawlib',
    'wmartzh/data-flow.excalidrawlib',
  ],
  'uml-er': [
    'BjoernKW/UML-ER-library.excalidrawlib',
    'https-github-com-papacrispy/uml-library-activity-diagram.excalidrawlib',
    'jordangeurtsen/uml-component-diagram.excalidrawlib',
    'jordangeurtsen/uml-deployment-diagram.excalidrawlib',
  ],
  'banco-de-dados': ['oehrlis/db-eng.excalidrawlib'],
  arquitetura: [
    'rohanp/system-design.excalidrawlib',
    'anna-pastushko/architecture-diagram-components.excalidrawlib',
    'dmitry-burnyshev/c4-architecture.excalidrawlib',
    'youritjang/software-architecture.excalidrawlib',
    'cespin/domain-driven-design.excalidrawlib',
  ],
  redes: [
    'dwelle/network-topology-icons.excalidrawlib',
    'samu_x86/network-elements.excalidrawlib',
    'kvchitrapu/secure_shell.excalidrawlib',
  ],
  git: ['marwinburesch/github-icons.excalidrawlib'],
  hardware: [
    'rochacbruno/computer-parts.excalidrawlib',
    'ei-au/computers.excalidrawlib',
    'jgodoy/racks-and-servers-components.excalidrawlib',
  ],
  'portas-logicas': [
    'thebrahmnicboy/Logic-Gates.excalidrawlib',
    'mppowell/circuit-components.excalidrawlib',
  ],
  matematica: ['jjadup/mathematical-symbols.excalidrawlib'],
  'ia-deep-learning': ['yuelfei/deep-learning.excalidrawlib'],
  'logos-dev': [
    'pclainchard/it-logos.excalidrawlib',
    'maeddes/technology-logos.excalidrawlib',
    'drwnio/drwnio.excalidrawlib',
    'madhusuthanan-b/html-css-js-icons.excalidrawlib',
    'madhusuthanan-b/front-end-tech-and-tools.excalidrawlib',
    'esteevens/logos.excalidrawlib',
    'farisology/data-science.excalidrawlib',
  ],
};

// Logos convertidos do simple-icons (CC0). `git` é CC-BY 3.0: crédito no CREDITOS.md.
export const LOGOS_IA = [
  'claude', 'anthropic', 'ollama', 'googlegemini', 'deepseek', 'mistralai', 'meta', 'metaai',
  'huggingface', 'nvidia', 'perplexity', 'githubcopilot', 'cursor', 'qwen', 'langchain', 'lmstudio', 'deepmind',
];

export const LOGOS_LINGUAGENS = [
  'python', 'c', 'cplusplus', 'dotnet', 'javascript', 'typescript', 'react', 'nodedotjs', 'html5', 'css',
  'git', 'github', 'docker', 'postgresql', 'mysql', 'sqlite', 'linux', 'obsidian', 'notion', 'openjdk',
  'kotlin', 'rust', 'go', 'jupyter', 'mermaid',
];

// Marcas que não existem no pacote aberto: viram selo com o nome (não imitam o logo).
export const SELOS_IA = [
  { nome: 'ChatGPT', cor: '#10A37F' },
  { nome: 'OpenAI', cor: '#000000' },
  { nome: 'Grok', cor: '#000000' },
];

export const SELOS_LINGUAGENS = [
  { nome: 'C#', cor: '#9B4F96' },
  { nome: 'Java', cor: '#ED8B00' },
  { nome: 'VS Code', cor: '#007ACC' },
];
