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

if (!API_KEY) {
  console.error("❌ Falta GEMINI_API_KEY en las variables de entorno.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

/* =========================
   INICIO
========================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "Wynex AI",
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
   CHAT
========================= */

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY || !ai) {
      return res.status(500).json({
        ok: false,
        error: "Falta GEMINI_API_KEY en Render."
      });
    }

    const message = req.body?.message;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Falta el mensaje."
      });
    }

    const history = Array.isArray(req.body?.history)
      ? req.body.history
      : [];

    let conversation = "";

    for (const item of history) {
      if (!item || !item.content) continue;

      const role = item.role === "assistant"
        ? "Wynex"
        : "Usuario";

      conversation += `${role}: ${String(item.content)}\n`;
    }

    conversation += `Usuario: ${message}\nWynex:`;

    const result = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: conversation,
      config: {
        systemInstruction:
          "Tu nombre es Wynex. Eres un asistente de inteligencia artificial útil, claro y amigable. Responde en español cuando el usuario hable español."
      }
    });

    const answer =
      result?.text ||
      result?.response?.text?.() ||
      "";

    if (!answer) {
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

    console.error("❌ ERROR EN /api/chat:");
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Error interno del servidor."
    });
  }
});

/* =========================
   SERVIDOR
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log("🟢 Servidor Wynex iniciado correctamente");
  console.log("🌐 Puerto:", PORT);
});
