// waha-auto-vote-bot
// Recebe webhooks do WAHA (evento "message") e, assim que detecta uma enquete
// recebida, vota na primeira opção o mais rápido possível.
//
// IMPORTANTE: o endpoint POST /api/sendPollVote do WAHA só é suportado pelas
// engines WEBJS e GOWS. As engines NOWEB e WPP NÃO suportam votar em enquete
// via API (só enviar enquetes). Ver: https://waha.devlike.pro/docs/how-to/polls/
// Este bot checa a engine no startup e avisa se ela não suportar voto.

import express from "express";

const PORT = process.env.PORT || 3001;
const WAHA_URL = (process.env.WAHA_URL || "http://localhost:3000").replace(/\/+$/, "");
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";
const SESSION = process.env.WAHA_SESSION || "default";
// Se true, ignora enquetes enviadas pelo próprio bot/conta (poll.fromMe)
const SKIP_OWN_POLLS = process.env.SKIP_OWN_POLLS !== "0";
// Engines que suportam POST /api/sendPollVote (doc oficial WAHA)
const VOTE_CAPABLE_ENGINES = new Set(["WEBJS", "GOWS"]);

const app = express();
app.use(express.json({ limit: "2mb" }));

function wahaHeaders() {
  return {
    "Content-Type": "application/json",
    ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
  };
}

// Checa a engine da sessão no startup e avisa se ela não suporta sendPollVote.
async function checkEngineSupport() {
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions/${encodeURIComponent(SESSION)}`, {
      headers: wahaHeaders(),
    });
    if (!res.ok) {
      console.warn(
        `[waha-auto-vote-bot] não consegui checar a sessão "${SESSION}" (HTTP ${res.status}). ` +
          `Confirme WAHA_URL/WAHA_API_KEY/WAHA_SESSION.`
      );
      return;
    }
    const data = await res.json();
    const engine = data?.engine?.engine || data?.config?.engine || data?.engine;
    if (!engine) {
      console.warn("[waha-auto-vote-bot] não consegui identificar a engine da sessão na resposta da API.");
      return;
    }
    console.log(`[waha-auto-vote-bot] sessão "${SESSION}" rodando na engine ${engine}`);
    if (!VOTE_CAPABLE_ENGINES.has(String(engine).toUpperCase())) {
      console.warn(
        `[waha-auto-vote-bot] ⚠️  ATENÇÃO: a engine ${engine} NÃO suporta POST /api/sendPollVote. ` +
          `Somente WEBJS e GOWS suportam votar em enquetes via API. ` +
          `O bot vai detectar as enquetes normalmente, mas o voto vai falhar até você trocar de engine.`
      );
    }
  } catch (err) {
    console.warn(`[waha-auto-vote-bot] falha ao checar engine da sessão: ${err.message}`);
  }
}

// Health check simples
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// Responde rápido pro WAHA (evita retries/timeout) e processa em paralelo
app.post("/webhook", (req, res) => {
  res.status(200).send("ok");
  handleWebhook(req.body).catch((err) => {
    console.error("[waha-auto-vote-bot] erro ao processar webhook:", err);
  });
});

async function handleWebhook(body) {
  if (!body || body.event !== "message") return;

  const poll = extractPoll(body.payload || {});
  if (!poll) return;

  if (SKIP_OWN_POLLS && body.payload?.fromMe) {
    console.log("[waha-auto-vote-bot] ignorando enquete enviada pela própria conta");
    return;
  }

  const t0 = Date.now();
  try {
    await vote(poll);
    console.log(
      `[waha-auto-vote-bot] votado em "${poll.firstOption}" (chat ${poll.chatId}) em ${Date.now() - t0}ms`
    );
  } catch (err) {
    console.error(`[waha-auto-vote-bot] falha ao votar (chat ${poll.chatId}):`, err.message);
  }
}

// Cobre os formatos mais comuns entre engines do WAHA (NOWEB/Baileys, GOWS, WEBJS).
// Se sua engine usar um formato diferente, ajuste aqui (rode com DEBUG=1 pra ver o payload cru).
function extractPoll(payload) {
  if (process.env.DEBUG) {
    console.log("[waha-auto-vote-bot] payload cru:", JSON.stringify(payload, null, 2));
  }

  let options = null;

  // NOWEB (Baileys)
  if (payload._data?.message?.pollCreationMessage?.options) {
    options = payload._data.message.pollCreationMessage.options.map((o) => o.optionName ?? o.name);
  } else if (payload._data?.message?.pollCreationMessageV2?.options) {
    options = payload._data.message.pollCreationMessageV2.options.map((o) => o.optionName ?? o.name);
  } else if (payload._data?.message?.pollCreationMessageV3?.options) {
    options = payload._data.message.pollCreationMessageV3.options.map((o) => o.optionName ?? o.name);
  }
  // Formato genérico já normalizado pelo WAHA
  else if (payload.poll?.options) {
    options = payload.poll.options.map((o) => (typeof o === "string" ? o : o.name || o.optionName));
  }
  // GOWS costuma expor os dados brutos em _data também
  else if (payload._data?.pollOptions) {
    options = payload._data.pollOptions.map((o) => (typeof o === "string" ? o : o.name || o.optionName));
  } else if (payload._data?.Message?.pollCreationMessage?.options) {
    options = payload._data.Message.pollCreationMessage.options.map((o) => o.optionName ?? o.name);
  }

  if (!options || options.length === 0) return null;
  options = options.filter((o) => typeof o === "string" && o.length > 0);
  if (options.length === 0) return null;

  const pollMessageId = payload.id || payload._data?.id || payload._data?.key?.id;
  const chatId = payload.from || payload.chatId || payload._data?.key?.remoteJid;

  if (!pollMessageId || !chatId) {
    console.warn("[waha-auto-vote-bot] enquete detectada mas faltam chatId/pollMessageId; rode com DEBUG=1 e ajuste extractPoll()");
    return null;
  }

  return {
    session: SESSION,
    chatId,
    pollMessageId,
    firstOption: options[0],
  };
}

async function vote({ session, chatId, pollMessageId, firstOption }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${WAHA_URL}/api/sendPollVote`, {
      method: "POST",
      headers: wahaHeaders(),
      body: JSON.stringify({
        chatId,
        pollMessageId,
        pollServerId: null,
        votes: [firstOption],
        session,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`sendPollVote falhou (${res.status}): ${text}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

app.listen(PORT, async () => {
  console.log(`[waha-auto-vote-bot] ouvindo em http://localhost:${PORT}/webhook`);
  console.log(`[waha-auto-vote-bot] apontando pra WAHA em ${WAHA_URL} (sessão: ${SESSION})`);
  await checkEngineSupport();
});
