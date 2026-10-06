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

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("Wynex está funcionando 🚀");
});

app.post("/chat", async (req, res) => {

  console.log("📩 MENSAJE RECIBIDO:", req.body);

  try {

    const mensaje = req.body.message;

    if (!mensaje) {
      return res.status(400).json({
        error: "No recibí ningún mensaje"
      });
    }

    console.log("🧠 Enviando a OpenAI...");

    const respuesta = await client.responses.create({
      model: "gpt-5-mini",
      input: mensaje
    });

    console.log("✅ Respuesta recibida");

    res.json({
      reply: respuesta.output_text
    });

  } catch (error) {

    console.error("❌ ERROR OPENAI:", error);

    res.status(500).json({
      error: error.message || "Error al hablar con la IA"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Wynex funcionando en el puerto ${PORT}`);
});
