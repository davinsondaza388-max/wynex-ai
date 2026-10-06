const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

/* =========================
   CORS
========================= */

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());


/* =========================
   OPENAI
========================= */

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error("❌ FALTA OPENAI_API_KEY EN RENDER");
}

const client = new OpenAI({
    apiKey: apiKey
});


/* =========================
   INICIO
========================= */

app.get("/", (req, res) => {

    res.json({
        status: "online",
        message: "Wynex está funcionando 🚀"
    });

});


/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {

    res.json({
        status: "ok",
        server: "Wynex",
        openai: apiKey ? "configured" : "missing"
    });

});


/* =========================
   CHAT
========================= */

app.post("/chat", async (req, res) => {

    console.log("📩 Mensaje recibido:");

    console.log(req.body);


    try {

        const message =
            req.body?.message;


        /* COMPROBAR MENSAJE */

        if (!message) {

            return res.status(400).json({
                error: "El mensaje está vacío"
            });

        }


        /* COMPROBAR API KEY */

        if (!apiKey) {

            return res.status(500).json({
                error:
                    "OPENAI_API_KEY no está configurada en Render"
            });

        }


        console.log(
            "🤖 Enviando mensaje a OpenAI..."
        );


        /* PETICIÓN A OPENAI */

        const response =
            await client.responses.create({

                model: "gpt-5-mini",

                input: message

            });


        console.log(
            "✅ OpenAI respondió correctamente"
        );


        /* RESPUESTA */

        res.json({

            reply:
                response.output_text

        });


    } catch (error) {

        console.error(
            "❌ ERROR COMPLETO DE OPENAI:"
        );

        console.error(error);


        res.status(500).json({

            error:
                error?.message ||
                "Error desconocido de OpenAI"

        });

    }

});


/* =========================
   SERVIDOR
========================= */

const PORT =
    process.env.PORT || 10000;


app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `🚀 Wynex funcionando en el puerto ${PORT}`
        );

    }
);
