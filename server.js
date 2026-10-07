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
    version: "3.0"
  });
});

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "online"
  });
});

/* =========================
   CREAR ENLACE
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
      error: "No se pudo crear el enlace."
    });
  }
});

/* =========================
   PÁGINA DE PERMISOS
========================= */

app.get("/share/:id", (req, res) => {

  const request = requests.get(req.params.id);

  if (!request) {
    return res.status(404).send(`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Solicitud</title>
</head>

<body style="
margin:0;
background:#fff;
font-family:Arial,sans-serif;
display:flex;
align-items:center;
justify-content:center;
min-height:100vh;
">

<div style="
width:90%;
max-width:380px;
text-align:center;
">

<h2>Solicitud no disponible</h2>

<p>
Este enlace ya no está disponible.
</p>

</div>

</body>
</html>
    `);
  }

  res.send(`
<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1.0">

<title>Permisos</title>

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  min-height: 100vh;

  background: #ffffff;

  color: #111;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  display: flex;

  justify-content: center;

  align-items: center;

  padding: 25px;

}

.container {

  width: 100%;

  max-width: 390px;

}

h1 {

  font-size: 28px;

  margin-bottom: 10px;

}

.description {

  color: #666
