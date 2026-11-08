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
> 3. **Opcional, para a IA funcionar:** clique no botão do modelo (topo, ao lado de "Fontes") → escolha um provedor, cole a sua chave **direto no app** (não no chat) e aperte **Testar conexão**.
> 4. **Opcional, para o professor ler as suas notas:** clique em **Fontes** (topo). Cada cartão diz o que fazer agora (Obsidian, Notion, NotebookLM e outras pastas).
> 5. O visual é seu: no botão de paleta (topo) você muda cores, letras e efeitos.
> 6. Deixe o terminal aberto enquanto estuda. Para parar, aperte `Ctrl + C` no terminal.
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

### Conectar IA e fontes (tudo guiado dentro do app)

Nada exige editar arquivo nem abrir terminal:

- **IA:** botão do modelo, no topo (ou ⚙ → Conexões) → escolha o provedor → cole a chave → **Testar conexão**.
- **Fontes:** botão **Fontes**, no topo. Cada cartão diz o que fazer agora:
  - **Obsidian:** "Escolher a pasta do meu cofre" abre a janela do sistema e você navega até a pasta.
  - **Outras pastas de estudo:** "Adicionar uma pasta" (o app só lê `.md` e `.txt`, nunca escreve nelas).
  - **Notion:** passo a passo para criar a sua integração e liberar as páginas.
  - **NotebookLM:** "Instalar" (precisa de Python 3.10+) e depois "Entrar no Google".
- **Aparência:** botão de paleta, no topo. O tema padrão é o do Neural-OS; você muda cores, letras e efeitos, ou importa o tema de um amigo (arquivo `.json`).

As chaves ficam só no `.env.local` (fora do git); o navegador nunca as vê. O servidor do Vite repassa os pedidos de IA com a chave (`server/devApi.ts`). As escolhas de pasta ficam em `fontes.local.json` (também fora do git).

### Como as abas se conectam

| Aba | Pra quê |
|---|---|
| **Lobby** | Widgets numa grade que você arruma (arrasta e redimensiona), Target, missões, Feed de minijogos em ASCII (chuva, comilão, batalha, cobrinha, invasores, corrida, forca; a matéria escolhe o jogo, e com IA ela inventa um por pergunta), revisões vencidas |
| **Árvore** | Matérias → tópicos → tópicos derivados. Cresce conforme você cria e domina |
| **Prof. A.Ilson** | Professor de qualquer matéria, que explica desenhando (fluxo, árvore, conjuntos, grade, tabela, gráfico). Aula no quadro, suas anotações, "prove que entendeu", **chat de ajustes** ("mais fácil", "desenha isso", selecione uma parte do quadro) e o **Roadmap** da matéria. O quadro e o roadmap ficam aqui dentro: o professor não mexe na sua Lousa |
| **Sandbox** | Desafios do que você já estudou; correção de lógica e sintaxe sem executar |
| **Molda-Horário** | Planejar a semana (domingo) + check-in diário de energia/tempo que ajusta o dia. Os dias ficam recolhidos numa linha-resumo; hoje abre sozinho |
| **Lousa** | Só suas lousas livres (Excalidraw no tema do app), organizadas em **grupos** (por matéria automático, ou os que você criar) |
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
