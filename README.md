# WAHA Auto Vote Bot (Clean Architecture)

Bot desenvolvido em Node.js especializado em votação automática para enquetes de WhatsApp utilizando a **WhatsApp HTTP API (WAHA)**.

## Arquitetura

O projeto foi construído seguindo os princípios de **Clean Architecture**, **SOLID** e **DRY**, visando alta coesão, baixo acoplamento e fácil escalabilidade.

- **`src/config/`**: Gerenciamento de variáveis de ambiente.
- **`src/constants/`**: Valores estáticos e URLs da API.
- **`src/controllers/`**: Validação de requisições e delegação de lógica de negócios (WebhookController).
- **`src/logger/`**: Sistema de logs estruturados (utilizando `winston`).
- **`src/middleware/`**: Interceptadores como tratamento global de erros para evitar queda da aplicação.
- **`src/routes/`**: Definição de endpoints HTTP (`/webhook`).
- **`src/services/`**: 
  - `WahaService.js`: Camada exclusiva de comunicação com o WAHA (isolamento HTTP).
  - `VoteService.js`: Regras de negócio como processamento de enquetes, whitelist e agendamento de delay.
- **`src/utils/`**: Funções auxiliares puras (gerador de delay randômico e extrator de dados de enquete).

## Fluxo da Aplicação

1. O WAHA envia um webhook de evento (`message`) para a rota `POST /webhook`.
2. O `WebhookController` responde com HTTP 200 (OK) instantaneamente para não bloquear o WAHA.
3. Em *background*, ele extrai os dados via `pollExtractor.js`.
4. Se for uma enquete válida, aciona o `VoteService.processVote()`.
5. O `VoteService` valida se o grupo remetente consta na `TARGET_GROUPS` (Whitelist).
6. Aguarda o `randomDelay()` definido para humanizar a ação.
7. Dispara o voto via `WahaService.sendPollVote()`, consumindo a API oficial REST do WAHA.

## Instalação

1. Clone ou extraia o repositório.
2. Acesse a pasta do projeto e instale as dependências:
   ```bash
   npm install
   ```
3. Crie o arquivo de configuração:
   ```bash
   cp .env.example .env
   ```

## Configuração (`.env`)

Configure o arquivo `.env` gerado:

```env
# URL da sua instância do WAHA
WAHA_URL=http://localhost:3000

# Nome da sessão do WAHA configurada
WAHA_SESSION=default

# Porta onde este bot irá rodar e escutar o Webhook
PORT=8080

# Humanização: Delay aleatório antes de votar (em milissegundos)
VOTE_DELAY_MIN=3000
VOTE_DELAY_MAX=7000

# Whitelist de Grupos autorizados (separados por vírgula).
# Se deixado em branco, TODOS os grupos estarão autorizados.
TARGET_GROUPS=Grupo A,Grupo B,Projeto Alpha

# Opção padrão para votação. 
# Se não encontrar exatamente esse texto, votará na primeira opção da enquete.
DEFAULT_VOTE=Sim
```

## Configuração do WAHA

1. Certifique-se de estar rodando uma Engine do WAHA compatível com votos (como **WEBJS** ou **GOWS**).
2. Configure o Webhook do WAHA para apontar para este bot.
   ```json
   {
     "url": "http://SUA-MAQUINA-OU-IP:8080/webhook",
     "events": ["message"]
   }
   ```
3. Inicie a sessão no WAHA (ex: `default`).

> **Atenção:** A engine NOWEB e WPP não suportam `POST /api/sendPollVote` no WAHA no momento desta versão.

## Execução

**Em ambiente de Desenvolvimento:**
Possui Hot-Reload com o Nodemon ativado.
```bash
npm run dev
```

**Em ambiente de Produção:**
```bash
npm start
```

## Logs e Tratamento de Exceções

A aplicação nunca é encerrada por erros no processamento de votos. Os erros, exceções síncronas/assíncronas e status de reconexão são registrados estruturalmente no console via `Winston` (com timestamp), facilitando monitoramento e uso no PM2 ou Docker.
