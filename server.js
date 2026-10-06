const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey
  ? new GoogleGenAI({ apiKey })
  : null;

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Wynex está funcionando 🚀"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    server: "Wynex",
    gemini: apiKey ? "configured" : "missing"
  });
});

app.post("/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(400).json({
        error: "El mensaje está vacío"
      });
    }

    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY no está configurada"
      });
    }

    console.log("📩 Mensaje:", message);
    console.log("🤖 Enviando a Gemini...");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message
    });

    const reply = response.text || "No recibí una respuesta.";

    console.log("✅ Gemini respondió");

    res.json({
      reply: reply
    });

  } catch (error) {
    console.error("❌ Error Gemini:", error);

    res.status(500).json({
      error: error.message || "Error de Gemini"
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Wynex funcionando en puerto ${PORT}`);
});
