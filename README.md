# Neural-OS

Ferramenta pessoal de estudo: **um lugar só** para aprender uma matéria, anotar, praticar e nunca esquecer.
Funciona inteira sem IA. Com IA, o Prof. A.Ilson personaliza aulas, avaliações e desafios usando as suas anotações e o seu histórico.

---

## Instruções para uma IA que está instalando este projeto

> Se você é uma IA (Claude, GPT, Gemini, OpenCode, Cursor ou outra) e recebeu este repositório para instalar, siga esta seção. A pessoa que pediu não é programadora: explique cada passo em português, de forma simples, e **não peça chaves de API no chat**.

### Passo 1: conferir o ambiente

Rode estes comandos e confira o resultado:

```bash
node --version
npm --version
git --version
```

- Precisa do **Node.js 20.19 ou mais novo** (o recomendado é o 22 LTS). Se faltar, diga à pessoa para instalar em https://nodejs.org (a versão LTS) e pare até ela confirmar.
- Se o `git` não existir, ignore: você já está dentro do projeto.

### Passo 2: instalar as dependências

Dentro da pasta do projeto (a que tem o `package.json`):

```bash
npm install
```

Se der erro, leia a mensagem, corrija o que for seu (por exemplo, versão do Node) e rode de novo. **Não apague `package-lock.json`.**

### Passo 3: rodar o app

```bash
npm run dev
```

Deixe esse processo **rodando** (não feche). O app abre em **http://localhost:5173**.

Se a porta 5173 estiver ocupada, o Vite mostra outra porta no terminal. Use a que ele mostrar.

### Passo 4: avisar a pessoa (é aqui que você termina)

Quando o passo 3 estiver rodando sem erro, **pare** e mostre exatamente esta mensagem, trocando só a porta se for diferente:

> **Pronto, o Neural-OS está rodando.**
>
> 1. Abra no navegador: **http://localhost:5173**
> 2. Na primeira vez o app está vazio de propósito. Clique em **"Criar a primeira matéria e tópico"** e escreva o que você está estudando (por exemplo: "Cálculo", "C#", "Inglês").
> 3. **Opcional, para a IA funcionar:** clique em ⚙ (canto superior direito) → **Conexões** → escolha um provedor, cole a sua chave **direto no app** (não no chat) e aperte **Testar conexão**.
> 4. Deixe o terminal aberto enquanto estuda. Para parar, aperte `Ctrl + C` no terminal.
>
> Se algo der errado, me mande a mensagem de erro que aparece no terminal.

Não faça mais nada depois disso, a não ser que a pessoa peça.

### Regras para você, IA

- **Nunca** peça, aceite ou escreva chaves de API no chat. As chaves são configuradas pelo próprio app, em ⚙ → Conexões.
- **Nunca** rode `git push`, `git commit` ou mude o `git` sem o pedido explícito da pessoa.
- **Nunca** exponha o servidor para a rede (não use `--host`). O servidor guarda as chaves de IA e só deve atender `localhost`.
- Não apague dados, não resete o navegador e não edite o `.env.local` sem a pessoa pedir.
- Se a pessoa não tiver Obsidian, ignore a parte de Obsidian. Ela é opcional.

---

## Para quem é humano

### Rodar pela primeira vez

Precisa do [Node.js](https://nodejs.org) 20.19 ou mais novo.

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

### Configurar IA e Obsidian

1. Copie `.env.example` para `.env.local` e preencha o que for usar (ou deixe que o próprio app grave as chaves).
2. Reinicie o `npm run dev`.
3. No app: ⚙ (canto superior direito) → escolha o provedor → 🔄 buscar modelos → **Testar conexão**.

As chaves ficam só no `.env.local` (fora do git). O navegador chama `/ai/<provedor>` e o servidor do Vite repassa com a chave (`server/devApi.ts`).

### Como as abas se conectam

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

### Estrutura

```
server/devApi.ts      proxy de IA + gravação no Obsidian (roda dentro do Vite)
src/domain/           regras puras, sem React: tipos, datas, revisão espaçada, planner, árvore, XP
src/store/            estado (Zustand + persist): study, settings, nav, toast
src/services/         IA (cliente + prompts do professor) e Obsidian
src/components/       peças de interface reutilizáveis
src/features/<aba>/   uma pasta por aba
```

Atalhos: teclas `1`–`7` trocam de aba.
