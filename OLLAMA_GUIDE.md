2# Manual de Operação e Integração IA Local // NEURAL_OS

Este guia ensina como configurar e executar sua **Inteligência Artificial Local (Ollama)** para atuar como o **Professor A.Ilson** e mentor da plataforma **Neural-OS**.

---

## 1. O que é o Ollama?

O [Ollama](https://ollama.com) é um software gratuito que permite executar Modelos de Linguagem de Grande Porte (LLMs) diretamente na GPU/CPU do seu computador, com **100% de privacidade**, **zero custo de API** e **alta velocidade de resposta**.

> [!NOTE]
> O Neural-OS possui um **Motor Heurístico Integrado**. Se o Ollama não estiver instalado ou estiver desligado, a plataforma continuará funcionando normalmente com respostas inteligentes e avaliações pedagógicas locais.

---

## 2. Passo a Passo de Instalação do Ollama

### Passo 1: Baixar e Instalar
1. Acesse o site oficial: **[https://ollama.com/download](https://ollama.com/download)**
2. Baixe o instalador para **Windows**.
3. Execute o instalador e conclua a instalação padrão.

---

### Passo 2: Baixar os Modelos Recomendados
Abra o seu **Terminal / PowerShell** e execute um (ou mais) dos modelos recomendados:

#### 1. DeepSeek R1 (Raciocínio Lógico & Explicação Detalhada) - **RECOMENDADO**
```powershell
ollama run deepseek-r1:8b
```

#### 2. Qwen 2.5 Coder (Especialista em Programação C# e Arquitetura) - **MUITO RECOMENDADO**
```powershell
ollama run qwen2.5-coder:7b
```

#### 3. Llama 3 (Equilibrado e Rápido)
```powershell
ollama run llama3
```

---

## 3. Conectando o Ollama ao Neural-OS

1. Com o Ollama rodando no seu computador (porta padrão `http://localhost:11434`), abra o **Neural-OS**.
2. Na barra superior (Navbar), clique no botão **`[IA: CONFIGURAR]`** ou **`[OLLAMA]`**.
3. Clique em **`TESTAR CONEXÃO`**.
4. O sistema detectará automaticamente todos os modelos instalados no seu PC.
5. Selecione o modelo desejado no dropdown (ex: `deepseek-r1:8b` ou `qwen2.5-coder:7b`) e clique em **`SALVAR CONFIGURAÇÃO`**.

---

## 4. Resolução de Problemas (CORS no Windows)

Se o navegador bloquear requisições para `localhost:11434` devido a restrições de CORS:

1. Feche o Ollama na bandeja do sistema (perto do relógio do Windows).
2. Abra o PowerShell como Administrador e defina a variável de ambiente:
   ```powershell
   [System.Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', '*', 'User')
   ```
3. Reinicie o aplicativo Ollama.
