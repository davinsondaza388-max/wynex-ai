import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

app.use(express.json({
  limit: "1mb"
}));

const requests = new Map();

/* =========================
   INICIO
========================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "TrackLink",
    status: "online",
    version: "2.0"
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
    version: "2.0"
  });
});

/* =========================
   CREAR SOLICITUD
========================= */

app.post("/api/tracklink/create", (req, res) => {

  try {

    const id = crypto
      .randomBytes(12)
      .toString("hex");

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

  const request =
    requests.get(req.params.id);

  if (!request) {

    return res.status(404).send(`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<title>TrackLink</title>

<style>

body {
  margin: 0;
  min-height: 100vh;
  background: #080808;
  color: white;
  font-family: Arial, sans-serif;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;
}

.box {
  max-width: 420px;
  width: 100%;

  background: #151515;

  border-radius: 24px;

  padding: 28px;

  text-align: center;
}

</style>
</head>

<body>

<div class="box">

<h2>TrackLink</h2>

<p>
Solicitud no encontrada.
</p>

<p>
Este enlace puede haber expirado.
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
content="width=device-width, initial-scale=1.0">

<title>TrackLink</title>

<style>

* {
  box-sizing: border-box;
  font-family: Arial, sans-serif;
}

body {

  margin: 0;

  min-height: 100vh;

  background:
    radial-gradient(
      circle at top,
      #17202c,
      #080808 60%
    );

  color: white;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 20px;
}

.box {

  width: 100%;

  max-width: 430px;

  background: rgba(20,20,20,.96);

  border: 1px solid #292929;

  border-radius: 25px;

  padding: 28px;

  box-shadow:
    0 20px 60px rgba(0,0,0,.6);

}

.logo {

  text-align: center;

  margin-bottom: 25px;

}

.logo h1 {

  font-size: 34px;

  margin: 0;

}

.blue {

  color: #4da3ff;

}

.logo p {

  color: #888;

}

.info {

  background: #1b1b1b;

  border-radius: 15px;

  padding: 15px;

  margin-top: 10px;

  text-align: left;

}

.info strong {

  display: block;

  margin-bottom: 5px;

}

.info span {

  color: #999;

  font-size: 13px;

}

button {

  width: 100%;

  border: 0;

  padding: 16px;

  border-radius: 14px;

  margin-top: 20px;

  background: #4da3ff;

  color: white;

  font-size: 16px;

  font-weight: bold;

}

button:disabled {

  opacity: .5;

}

#message {

  text-align: center;

  color: #aaa;

  line-height: 1.5;

  margin-top: 18px;

}

.consent {

  margin-top: 18px;

  text-align: left;

  background: #111;

  border-radius: 15px;

  padding: 15px;

}

.consent label {

  display: block;

  margin: 12px 0;

  color: #ddd;

}

.consent input {

  width: 18px;

  height: 18px;

  vertical-align: middle;

  margin-right: 8px;

}

.small {

  color: #777;

  font-size: 12px;

  line-height: 1.4;

  margin-top: 15px;

}

</style>

</head>

<body>

<div class="box">

<div class="logo">

<h1>
Track<span class="blue">Link</span>
</h1>

<p>
Solicitud de información
</p>

</div>

<div class="info">

<strong>📍 Ubicación</strong>

<span>
Se solicitará permiso para compartir tu ubicación.
</span>

</div>

<div class="info">

<strong>📷 Cámara</strong>

<span>
Puedes permitir el acceso a la cámara.
TrackLink no la activará sin tu autorización.
</span>

</div>

<div class="info">

<strong>📱 Dispositivo</strong>

<span>
Se enviará información básica disponible del navegador
y dispositivo.
</span>

</div>

<div class="consent">

<label>

<input
type="checkbox"
id="locationConsent"
>

Permito compartir mi ubicación.

</label>

<label>

<input
type="checkbox"
id="cameraConsent"
>

Permito solicitar acceso a mi cámara.

</label>

<label>

<input
type="checkbox"
id="deviceConsent"
>

Permito compartir información básica de mi dispositivo.

</label>

</div>

<button id="shareButton">

Aceptar y continuar

</button>

<p id="message"></p>

<p class="small">

Al continuar, el navegador puede mostrar ventanas
de permiso. Puedes rechazarlas en cualquier momento.

</p>

</div>

<script>

const button =
document.getElementById("shareButton");

const message =
document.getElementById("message");

const locationConsent =
document.getElementById("locationConsent");

const cameraConsent =
document.getElementById("cameraConsent");

const deviceConsent =
document.getElementById("deviceConsent");


button.addEventListener(
"click",
async () => {

  if (!locationConsent.checked) {

    message.textContent =
      "Debes aceptar compartir la ubicación para continuar.";

    return;

  }

  button.disabled = true;

  message.textContent =
    "Solicitando permisos...";


  /* =========================
     INFORMACIÓN DEL DISPOSITIVO
  ========================= */

  let deviceInfo = {

    userAgent:
      navigator.userAgent || "",

    platform:
      navigator.platform || "",

    language:
      navigator.language || "",

    screenWidth:
      window.screen.width,

    screenHeight:
      window.screen.height,

    devicePixelRatio:
      window.devicePixelRatio || 1

  };


  /* =========================
     CÁMARA
  ========================= */

  let cameraPermission =
    "not_requested";

  let cameraStream = null;


  if (cameraConsent.checked) {

    try {

      if (
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      ) {

        cameraStream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });

        cameraPermission =
          "granted";

        /*
          Cerramos la cámara inmediatamente.
          Solo comprobamos el permiso.
        */

        cameraStream
          .getTracks()
          .forEach(track => track.stop());

      } else {

        cameraPermission =
          "not_supported";

      }

    } catch (error) {

      cameraPermission =
        "denied";

    }

  }


  /* =========================
     UBICACIÓN
  ========================= */

  if (!navigator.geolocation) {

    message.textContent =
      "Este navegador no permite obtener ubicación.";

    button.disabled = false;

    return;

  }


  message.textContent =
    "Solicitando ubicación...";


  navigator.geolocation.getCurrentPosition(

    async (position) => {

      const data = {

        latitude:
          position.coords.latitude,

        longitude:
          position.coords.longitude,

        accuracy:
          position.coords.accuracy,

        cameraPermission:
          cameraPermission,

        deviceInfo:
          deviceConsent.checked
            ? deviceInfo
            : null

      };


      try {

        const response =
          await fetch(
            "/api/tracklink/submit/${req.params.id}",
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


        const result =
          await response.json();


        if (result.ok) {

          message.textContent =
            "✓ Información compartida correctamente.";

          button.textContent =
            "✓ Completado";

          button.disabled =
            true;

        } else {

          message.textContent =
            "No se pudo enviar la información.";

          button.disabled =
            false;

        }

      } catch (error) {

        console.error(error);

        message.textContent =
          "Error de conexión con TrackLink.";

        button.disabled =
          false;

      }

    },

    (error) => {

      console.error(error);

      message.textContent =
        "No se concedió el permiso de ubicación.";

      button.disabled =
        false;

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
   RECIBIR INFORMACIÓN
========================= */

app.post(
  "/api/tracklink/submit/:id",
  (req, res) => {

    try {

      const request =
        requests.get(req.params.id);

      if (!request) {

        return res.status(404).json({

          ok: false,

          error:
            "Solicitud no encontrada."

        });

      }


      const {

        latitude,

        longitude,

        accuracy,

        cameraPermission,

        deviceInfo

      } = req.body;


      if (
        typeof latitude !== "number" ||
        typeof longitude !== "number"
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "Ubicación inválida."

        });

      }


      request.status =
        "received";


      request.data = {

        latitude,

        longitude,

        accuracy:
          typeof accuracy === "number"
            ? accuracy
            : null,

        cameraPermission:
          typeof cameraPermission === "string"
            ? cameraPermission
            : "not_requested",

        deviceInfo:
          deviceInfo &&
          typeof deviceInfo === "object"
            ? deviceInfo
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

      console.log(
        "📷 Cámara:",
        request.data.cameraPermission
      );

      console.log(
        "📱 Dispositivo:",
        request.data.deviceInfo
      );


      res.json({

        ok: true,

        message:
          "Información recibida."

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        ok: false,

        error:
          "Error al guardar la información."

      });

    }

  }
);


/* =========================
   RESULTADO
========================= */

app.get(
  "/api/tracklink/result/:id",
  (req, res) => {

    const request =
      requests.get(req.params.id);

    if (!request) {

      return res.status(404).json({

        ok: false,

        error:
          "Solicitud no encontrada."

      });

    }


    res.json({

      ok: true,

      id: request.id,

      status:
        request.status,

      createdAt:
        request.createdAt,

      data:
        request.data

    });

  }
);


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
