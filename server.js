import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ Falta GEMINI_API_KEY en las variables de entorno.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: API_KEY
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({
  limit: "1mb"
}));

// -----------------------------------------
// HEALTH CHECK
// -----------------------------------------

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "Wynex AI",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "online"
  });
});

// -----------------------------------------
// ESPERA
// -----------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -----------------------------------------
// GEMINI
// -----------------------------------------

async function askGemini(message, history = []) {

  const maxAttempts = 4;

  let contents = [];

  // Historial anterior
  if (Array.isArray(history)) {

    for (const item of history) {

      if (!item || !item.role || !item.text) {
        continue;
      }

      if (item.role !== "user" && item.role !== "model") {
        continue;
      }

      contents.push({
        role: item.role,
        parts: [
          {
            text: String(item.text)
          }
        ]
      });
    }
  }

  // Mensaje actual
  contents.push({
    role: "user",
    parts: [
      {
        text: String(message)
      }
    ]
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {

    try {

      console.log(
        `🤖 Enviando solicitud a Gemini (${attempt}/${maxAttempts})`
      );

      const response = await ai.models.generateContent({

        model: "gemini-3.8-flash",

        contents,

        config: {
          temperature: 0.7,
          maxOutputTokens: 2048,

          systemInstruction:
            "Tu nombre es Wynex. " +
            "Eres un asistente de inteligencia artificial útil, " +
            "amable y claro. " +
            "Responde en el idioma del usuario. " +
            "No digas que eres ChatGPT. " +
            "Tu nombre es Wynex."
        }
      });

      const answer = response?.text;

      if (!answer || !answer.trim()) {
        throw new Error("Gemini no devolvió texto.");
      }

      console.log("✅ Respuesta recibida.");

      return answer.trim();

    } catch (error) {

      const status =
        error?.status ||
        error?.code ||
        error?.response?.status;

      console.error(
        `❌ Gemini error (${attempt}/${maxAttempts}):`,
        error?.message || error
      );

      // Solo reintentamos errores temporales
      const temporaryError =
        status === 503 ||
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 504;

      if (!temporaryError || attempt === maxAttempts) {
        throw error;
      }

      // Espera progresiva:
      // 2s → 4s → 8s
      const waitTime = 2000 * Math.pow(2, attempt - 1);

      console.log(
        `⏳ Gemini está ocupado. Reintentando en ${waitTime / 1000}s...`
      );

      await sleep(waitTime);
    }
  }

  throw new Error("No se pudo obtener respuesta de Gemini.");
}

// -----------------------------------------
// API CHAT
// -----------------------------------------

app.post("/api/chat", async (req, res) => {

  try {

    const { message, history } = req.body;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        ok: false,
        error: "El mensaje está vacío."
      });
    }

    // Evita solicitudes gigantes
    if (message.length > 12000) {
      return res.status(413).json({
        ok: false,
        error: "El mensaje es demasiado largo."
      });
    }

    console.log("📩 Wynex recibió:", message);

    const answer = await askGemini(
      message.trim(),
      history
    );

    return res.json({
      ok: true,
      answer
    });

  } catch (error) {

    console.error("🔥 Error en /api/chat:", error);

    const status =
      error?.status ||
      error?.code ||
      error?.response?.status;

    if (
      status === 503 ||
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 504
    ) {

      return res.status(503).json({
        ok: false,
        error:
          "Gemini está temporalmente ocupado. " +
          "Wynex intentó conectarse varias veces. " +
          "Espera unos segundos y vuelve a intentarlo."
      });
    }

    return res.status(500).json({
      ok: false,
      error:
        "Wynex tuvo un problema al comunicarse con la IA."
    });
  }
});

// -----------------------------------------
// MANEJO DE ERRORES
// -----------------------------------------

app.use((err, req, res, next) => {

  console.error("🔥 Error general:", err);

  res.status(500).json({
    ok: false,
    error: "Error interno del servidor."
  });
});

// -----------------------------------------
// INICIAR
// -----------------------------------------

app.listen(PORT, () => {

  console.log("");
  console.log("=================================");
  console.log("        WYNEX AI SERVER");
  console.log("=================================");
  console.log(`🚀 Puerto: ${PORT}`);
  console.log("🤖 Modelo: gemini-3.8-flash");
  console.log("🟢 Servidor iniciado correctamente");
  console.log("=================================");
  console.log("");
});
