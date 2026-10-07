const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

/* =========================
   TRACKLINK
========================= */

const requests = new Map();

app.get("/", (req, res) => {
  res.json({
    app: "TrackLink + FindKey",
    status: "online",
    version: "3.0"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    tracklink: true,
    findkey: true
  });
});

app.post("/api/tracklink/create", (req, res) => {
  const id = crypto.randomBytes(6).toString("hex");

  const request = {
    id,
    createdAt: Date.now(),
    data: req.body || {}
  };

  requests.set(id, request);

  res.json({
    success: true,
    id,
    request
  });
});

/* =========================
   FINDKEY
========================= */

const users = new Map();

/*
  Estructura:

  ID:
  FK-XXXXXX

  Usuario:
  {
    id,
    email,
    password,
    location: {
      lat,
      lon,
      accuracy,
      updatedAt
    }
  }
*/

/* CREAR CUENTA */

app.post("/api/findkey/register", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos"
      });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    // Evitar cuentas duplicadas
    for (const user of users.values()) {
      if (user.email === emailNormalizado) {
        return res.status(409).json({
          success: false,
          message: "Ese correo ya está registrado"
        });
      }
    }

    // ID automático permanente
    let id;

    do {
      id =
        "FK-" +
        crypto
          .randomBytes(4)
          .toString("hex")
          .toUpperCase()
          .slice(0, 6);
    } while (users.has(id));

    const user = {
      id,
      email: emailNormalizado,
      password: String(password),
      location: null
    };

    users.set(id, user);

    res.json({
      success: true,
      id,
      message: "Cuenta creada correctamente"
    });

  } catch (error) {
    console.error("FindKey register:", error);

    res.status(500).json({
      success: false,
      message: "Error del servidor"
    });
  }
});

/* INICIAR SESIÓN */

app.post("/api/findkey/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos"
      });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    let foundUser = null;

    for (const user of users.values()) {
      if (
        user.email === emailNormalizado &&
        user.password === String(password)
      ) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({
        success: false,
        message: "Correo o contraseña incorrectos"
      });
    }

    res.json({
      success: true,
      id: foundUser.id,
      message: "Inicio de sesión correcto"
    });

  } catch (error) {
    console.error("FindKey login:", error);

    res.status(500).json({
      success: false,
      message: "Error del servidor"
    });
  }
});

/* GUARDAR UBICACIÓN */

app.post("/api/findkey/location", (req, res) => {
  try {
    const {
      id,
      lat,
      lon,
      accuracy
    } = req.body;

    if (!id || lat === undefined || lon === undefined) {
      return res.status(400).json({
        success: false,
        message: "Datos de ubicación incompletos"
      });
    }

    const user = users.get(String(id).toUpperCase());

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ID de FindKey no encontrado"
      });
    }

    user.location = {
      lat: Number(lat),
      lon: Number(lon),
      accuracy: accuracy ? Number(accuracy) : null,
      updatedAt: Date.now()
    };

    users.set(user.id, user);

    res.json({
      success: true,
      message: "Ubicación actualizada"
    });

  } catch (error) {
    console.error("FindKey location:", error);

    res.status(500).json({
      success: false,
      message: "Error guardando ubicación"
    });
  }
});

/* BUSCAR UBICACIÓN POR ID */

app.get("/api/findkey/location/:id", (req, res) => {
  try {
    const id = String(req.params.id).trim().toUpperCase();

    const user = users.get(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No existe una cuenta con ese ID"
      });
    }

    // Si todavía no ha autorizado/guardado ubicación
    if (!user.location) {
      return res.json({
        success: true,
        available: false,
        id: user.id,
        message: "Esta persona todavía no ha compartido su ubicación"
      });
    }

    res.json({
      success: true,
      available: true,
      id: user.id,
      location: user.location
    });

  } catch (error) {
    console.error("FindKey search:", error);

    res.status(500).json({
      success: false,
      message: "Error buscando ubicación"
    });
  }
});

/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada"
  });
});

/* =========================
   SERVIDOR
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor TrackLink + FindKey funcionando en puerto ${PORT}`);
});
