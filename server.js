import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Solicitudes guardadas temporalmente en memoria.
// Se borran si el servidor se reinicia.
const requests = new Map();

/* =========================
   INICIO
========================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "TrackLink",
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
    app: "TrackLink"
  });
});

/* =========================
   CREAR SOLICITUD
========================= */

app.post("/api/tracklink/create", (req, res) => {
  try {
    const id = crypto.randomBytes(12).toString("hex");

    requests.set(id, {
      id,
      status: "waiting",
      createdAt: new Date().toISOString(),
      data: null
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    res.json({
      ok: true,
      id,
      link: `${baseUrl}/share/${id}`
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: "No se pudo crear la solicitud."
    });
  }
});

/* =========================
   PÁGINA DE CONSENTIMIENTO
========================= */

app.get("/share/:id", (req, res) => {
  const request = requests.get(req.params.id);

  if (!request) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TrackLink</title>
      </head>
      <body>
        <h2>Solicitud no encontrada</h2>
        <p>Este enlace ya no existe o ha expirado.</p>
      </body>
      </html>
    `);
  }

  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrackLink</title>

  <style>
    * {
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: #080808;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .box {
      width: 100%;
      max-width: 420px;
      background: #151515;
      border-radius: 24px;
      padding: 28px;
      text-align: center;
    }

    h1 {
      margin-bottom: 8px;
    }

    .blue {
      color: #4da3ff;
    }

    p {
      color: #aaa;
      line-height: 1.5;
    }

    .item {
      background: #202020;
      padding: 14px;
      border-radius: 12px;
      margin: 10px 0;
      text-align: left;
    }

    button {
      width: 100%;
      border: 0;
      padding: 16px;
      border-radius: 14px;
      margin-top: 15px;
      background: #4da3ff;
      color: white;
      font-size: 16px;
      font-weight: bold;
    }

    #message {
      margin-top: 18px;
    }
  </style>
</head>

<body>

<div class="box">

  <h1>Track<span class="blue">Link</span></h1>

  <p>
    Esta página te permite decidir voluntariamente
    si deseas compartir tu ubicación.
  </p>

  <div class="item">📍 Ubicación — requiere tu permiso</div>
  <div class="item">📱 Información básica del navegador — se enviará con tu autorización</div>

  <button id="shareButton">
    Aceptar y compartir ubicación
  </button>

  <p id="message"></p>

</div>

<script>
  const button = document.getElementById("shareButton");
  const message = document.getElementById("message");

  button.addEventListener("click", () => {

    if (!navigator.geolocation) {
      message.textContent =
        "Este navegador no permite obtener ubicación.";
      return;
    }

    message.textContent =
      "Solicitando permiso de ubicación...";

    navigator.geolocation.getCurrentPosition(
      async (position) => {

        const data = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          userAgent: navigator.userAgent
        };

        try {

          const response = await fetch(
            "/api/tracklink/submit/${req.params.id}",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(data)
            }
          );

          const result = await response.json();

          if (result.ok) {
            message.textContent =
              "✓ Ubicación compartida correctamente.";
            button.disabled = true;
          } else {
            message.textContent =
              "No se pudo enviar la información.";
          }

        } catch (error) {

          message.textContent =
            "Error de conexión con TrackLink.";

        }

      },

      () => {
        message.textContent =
          "No se concedió el permiso de ubicación.";
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

  });
</script>

</body>
</html>
  `);
});

/* =========================
   RECIBIR UBICACIÓN
========================= */

app.post("/api/tracklink/submit/:id", (req, res) => {
  try {

    const request = requests.get(req.params.id);

    if (!request) {
      return res.status(404).json({
        ok: false,
        error: "Solicitud no encontrada."
      });
    }

    const {
      latitude,
      longitude,
      accuracy,
      userAgent
    } = req.body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return res.status(400).json({
        ok: false,
        error: "Ubicación inválida."
      });
    }

    request.status = "received";

    request.data = {
      latitude,
      longitude,
      accuracy: typeof accuracy === "number"
        ? accuracy
        : null,
      userAgent: typeof userAgent === "string"
        ? userAgent
        : null,
      receivedAt: new Date().toISOString()
    };

    requests.set(req.params.id, request);

    console.log("📍 Ubicación recibida:", req.params.id);

    res.json({
      ok: true,
      message: "Ubicación recibida."
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      error: "Error al guardar la ubicación."
    });
  }
});

/* =========================
   CONSULTAR RESULTADO
========================= */

app.get("/api/tracklink/result/:id", (req, res) => {

  const request = requests.get(req.params.id);

  if (!request) {
    return res.status(404).json({
      ok: false,
      error: "Solicitud no encontrada."
    });
  }

  res.json({
    ok: true,
    id: request.id,
    status: request.status,
    createdAt: request.createdAt,
    data: request.data
  });

});

/* =========================
   SERVIDOR
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log("🟢 TRACKLINK INICIADO");
  console.log("🌐 Puerto:", PORT);
});
