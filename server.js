const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ Falta OPENAI_API_KEY en Render");
}

const client = new OpenAI({
  apiKey: apiKey
});

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Wynex está funcionando 🚀"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.post("/chat", async (req, res) => {
  console.log("📩 Mensaje recibido:", req.body);

  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(400).json({
        error: "El mensaje está vacío"
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY no está configurada en Render"
      });
    }

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: message
    });

    console.log("✅ Respuesta generada");

    res.json({
      reply: response.output_text
    });

  } catch (error) {
    console.error("❌ Error:", error);

    res.status(500).json({
      error: "No pude obtener una respuesta de la IA"
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Wynex funcionando en el puerto ${PORT}`);
});
