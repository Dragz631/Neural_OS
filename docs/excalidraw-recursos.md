# Lousa = Excalidraw: mapa de recursos

Mapeado em 19/10/2026 com o REA (navegador controlado abrindo https://excalidraw.com em pt-BR, lendo a árvore de acessibilidade de cada menu) e comparado com o pacote instalado.

**Versão usada:** `@excalidraw/excalidraw@0.18.0-17d8904` (canal `next`, publicada no mesmo dia, fixada exata no `package.json`).
A estável `0.18.1` **não tem** nota adesiva, seleção de laço, balde de tinta nem "desenhar e virar forma"; a `next` tem tudo isso e aceita React 19.

Legenda: ✅ veio com o pacote · 🔌 liguei eu · ❌ não dá (e por quê)

## Ferramentas (barra de cima)
| Recurso | Atalho | Situação |
|---|---|---|
| Travar ferramenta | Q | ✅ |
| Mão (mover tela) | H | ✅ |
| Seleção | V / 1 | ✅ |
| Retângulo, losango, elipse | R, D, O (2, 3, 4) | ✅ |
| Seta (reta, curva, cotovelo) | A / 5 | ✅ |
| Linha | L / 6 | ✅ |
| Desenhar à mão livre | P / 7 | ✅ |
| Texto | T / 8 | ✅ |
| Nota adesiva | N | ✅ (só na `next`) |
| Borracha | E / 0 | ✅ |

## "Mais ferramentas"
| Recurso | Situação |
|---|---|
| Inserir imagem (9) | ✅ (fica no IndexedDB e no `.excalidraw`) |
| Quadro / frame (F) | ✅ — bom pra separar "mapa geral" e "detalhes" |
| Página web incorporada | ✅ |
| Desenhar e virar forma (Shift+X) | ✅ (só na `next`) |
| Ponteiro laser (K) | ✅ |
| Balde de tinta (B) | ✅ (só na `next`) |
| Seleção de laço | ✅ (só na `next`) |
| Texto para diagrama (IA) | 🔌 ligado à **nossa** IA (Hermes/NVIDIA/Ollama) em `src/features/lousa/aiDiagram.ts`; no site é pago |
| Mermaid para Excalidraw | ✅ |
| Wireframe para código (IA) | ❌ depende do servidor pago deles |

## Menu principal
| Recurso | Situação |
|---|---|
| Abrir arquivo (Ctrl+O) | ✅ |
| Salvar como… / Exportar imagem (Ctrl+Shift+E) | ✅ |
| Paleta de comandos (Ctrl+/) | ✅ |
| Procurar na tela (Ctrl+F) | ✅ |
| Ajuda e atalhos (?) | ✅ |
| Limpar a tela | ✅ |
| Tema claro/escuro (Alt+Shift+D) | ✅ |
| Fundo da tela | ✅ |
| Idioma | fixo em pt-BR |
| Colaboração ao vivo | ❌ precisa do servidor de salas deles; app é de uma pessoa só |
| Excalidraw+, GitHub, X, Discord, cadastro | removidos (propaganda/conta deles) |

## Painel de propriedades (forma selecionada)
Contorno, fundo, espessura, estilo e precisão do traço, arestas, opacidade, camadas, família/tamanho/alinhamento da fonte, tipo de seta — ✅ todos.

## Atalhos de visualização e edição
Zoom, encaixar tudo (Shift+1), modo Zen (Alt+Z), grade (Ctrl+'), encaixar em objetos (Alt+S), modo visualização (Alt+R), fluxograma por setas (Ctrl+setas), agrupar, alinhar, duplicar, travar, copiar/colar estilos, copiar como PNG — ✅ todos (vêm do pacote).
**Ajuste nosso:** na aba Lousa, as teclas 1–7 **não** trocam de aba do app (lá elas são ferramentas).

## O que o Neural-OS acrescenta
- 🔌 Várias lousas com nome (lista à esquerda, clique duplo renomeia), cada uma ligada (opcional) a um tópico.
- 🔌 Salvamento automático: IndexedDB (0,7 s) + cópia `Estudos-vault/Lousas/<nome>.excalidraw` (3 s, e também ao fechar a página). Abre no Obsidian com o plugin Excalidraw.
- 🔌 **"Prof., olha"**: lê a estrutura da lousa (caixas, textos, setas A → B, quadros) e devolve o que está bom, a maior lacuna, UMA pergunta e UM próximo passo; dá pra anotar isso no tópico.
- 🔌 Mandar a seleção (ou a lousa inteira) pras anotações do tópico ligado.

## Biblioteca (montada em 19/10/2026)
Abra pelo botão **Biblioteca** (canto superior direito da lousa) e use a **busca**: cada item tem o tema no nome.
Exemplos de busca: `grafo`, `UML`, `banco`, `fluxograma`, `porta`, `Autômato`, `Logo IA`, `Logo: Python`.

| Grupo | Itens | De onde vem |
|---|---|---|
| Estrutura de dados, Grafos, Fluxograma, UML/ER, Banco de dados, Arquitetura, Redes, Git, Hardware, Portas lógicas, Matemática, IA/Deep learning, Logo dev | 428 | 36 pacotes da comunidade (MIT) — lista e autores em `public/biblioteca/CREDITOS.md` |
| Logo IA | 17 + 3 selos | Claude, Anthropic, Ollama, Gemini, DeepSeek, Mistral, Meta, Meta AI, Hugging Face, NVIDIA, Perplexity, Copilot, Cursor, Qwen, LangChain, LM Studio, DeepMind (simple-icons, CC0) + selos ChatGPT, OpenAI, Grok |
| Logo (linguagens/ferramentas) | 25 + 3 selos | Python, C, C++, .NET, JS, TS, React, Node, HTML5, CSS, Git, GitHub, Docker, PostgreSQL, MySQL, SQLite, Linux, Obsidian, Notion, OpenJDK, Kotlin, Rust, Go, Jupyter, Mermaid + selos C#, Java, VS Code |
| Autômato (LFA) | 8 | Feitos pro Neural-OS: estado, estado final, estado inicial, transição, laço, AFD pronto, fita de Turing, pilha |

- **Remontar** (pacotes novos, outro commit): `node scripts/montar-biblioteca.mjs`. A versão é uma impressão do conteúdo; o app só recarrega a biblioteca quando ela muda.
- Itens que você salva na biblioteca **não somem** quando ela é atualizada (o app troca só os itens dele, pelo id).
- Logos viram formas editáveis (não imagem), então aparecem na miniatura, inserem e salvam no `.excalidraw`.
- Selos: marcas que o pacote aberto de ícones não tem (removidas por questão legal) viram um selo com o nome, sem imitar o logo.
- Corrigido na montagem: 3 setas de pacotes da comunidade estavam ligadas a elementos fora do item (geravam erro no console).
