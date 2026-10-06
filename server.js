const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("Wynex está funcionando 🚀");
});

app.post("/chat", async (req, res) => {
  try {
    const mensaje = req.body.message;

    if (!mensaje) {
      return res.status(400).json({
        error: "No recibí ningún mensaje"
      });
    }

    const respuesta = await client.responses.create({
      model: "gpt-5-mini",
      input: mensaje
    });

    res.json({
      reply: respuesta.output_text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al hablar con la IA"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Wynex funcionando en el puerto ${PORT}`);
});
