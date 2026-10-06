import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

const API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const ai = new GoogleGenAI({
  apiKey: API_KEY
});

/* =========================
   INICIO
========================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "Wynex",
    status: "online"
  });
});

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "online",
    gemini: !!API_KEY
  });
});

/* =========================
   CHAT WYNEX
========================= */

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(400).json({
        ok: false,
        error: "No se recibió ningún mensaje."
      });
    }

    console.log("📩 Mensaje recibido:", message);
    console.log("🤖 Enviando mensaje a Gemini...");

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",

      system_instruction:
        "Tu nombre es Wynex. Eres un asistente de inteligencia artificial amigable, inteligente y útil. Responde siempre de forma clara. Si el usuario habla español, responde en español.",

      input: message
    });

    console.log("✅ Gemini respondió correctamente.");

    const answer = interaction.output_text;

    if (!answer) {
      console.error("❌ Gemini no devolvió output_text.");

      return res.status(500).json({
        ok: false,
        error: "Gemini no devolvió texto."
      });
    }

    return res.json({
      ok: true,
      reply: answer
    });

  } catch (error) {

    console.error("=================================");
    console.error("❌ ERROR DE GEMINI");
    console.error(error);
    console.error("=================================");

    return res.status(500).json({
      ok: false,
      error: error?.message || "Error de Gemini."
    });
  }
});

/* =========================
   SERVIDOR
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log("🟢 SERVIDOR WYNEX INICIADO");
  console.log("🌐 Puerto:", PORT);
});
