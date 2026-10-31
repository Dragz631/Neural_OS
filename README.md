# Neural-OS

Ferramenta pessoal de estudo: **um lugar só** para aprender uma matéria, anotar, praticar e nunca esquecer.
Funciona inteira sem IA. Com IA (Hermes Agent / NVIDIA NIM / Ollama), o Prof. A.Ilson personaliza aulas, avaliações e desafios usando as suas anotações e o seu histórico.

## Rodar (primeira vez)

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
git clone https://github.com/Dragz631/Neural_OS.git
cd Neural_OS
npm install
npm run dev
```

Abra http://localhost:5173. Na primeira vez o app está vazio de propósito: ele pede pra você criar a **sua** primeira matéria e tópico, e tudo nasce do que você estuda. Os dados ficam no navegador deste computador (faça backup em ⚙ Configurações).

- **Sem IA ele funciona inteiro.** A IA só deixa as aulas, os desafios e o feed mais personalizados.
- **Seus dados e suas chaves são seus:** ninguém recebe o que você estuda, e as chaves nunca saem do seu `.env.local`.
- O app roda só neste computador (`localhost`). Não abra a porta pra rede: o servidor guarda as suas chaves de IA.

## Configurar IA e Obsidian

1. Copie `.env.example` para `.env.local` e preencha o que for usar.
2. Reinicie o `npm run dev`.
3. No app: ⚙ (canto superior direito) → escolha o provedor → 🔄 buscar modelos → **Testar conexão**.

As chaves ficam só no `.env.local` (fora do git). O navegador chama `/ai/<provedor>` e o servidor do Vite repassa com a chave (`server/devApi.ts`).

## Como as abas se conectam

| Aba | Pra quê |
|---|---|
| **Lobby** | Widgets numa grade que você arruma (arrasta e redimensiona), Target, missões, Feed de minijogos em ASCII (com IA, ela inventa um jogo por pergunta), revisões vencidas |
| **Árvore** | Matérias → tópicos → tópicos derivados. Cresce conforme você cria e domina |
| **Prof. A.Ilson** | Quadro (explicação, pontos-chave, vídeos, onde pesquisar, dicas) + suas anotações + "prove que entendeu" |
| **Sandbox** | Desafios do que você já estudou; correção de lógica e sintaxe sem executar |
| **Molda-Horário** | Planejar a semana (domingo) + check-in diário de energia/tempo que ajusta o dia |
| **Lousa** | Quadros livres (Excalidraw no tema do app). O professor também desenha aqui: fluxos, estados e gráficos de funções |
| **Dungeon** | Modo diversão de fim de semana (trilhas fixas C#, C, LFA) |

Toda avaliação (explicação ou desafio) alimenta a **revisão espaçada**: o tópico volta pra revisão em 1, 3, 7… dias conforme você lembra.

## Estrutura

```
server/devApi.ts      proxy de IA + gravação no Obsidian (roda dentro do Vite)
src/domain/           regras puras, sem React: tipos, datas, revisão espaçada, planner, árvore, XP
src/store/            estado (Zustand + persist): study, settings, nav, toast
src/services/         IA (cliente OpenAI-compatível + prompts do professor) e Obsidian
src/components/       peças de interface reutilizáveis
src/features/<aba>/   uma pasta por aba
```

Atalhos: teclas `1`–`7` trocam de aba.
