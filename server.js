import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();

const PORT = process.env.PORT || 10000;


/* =========================
   CONFIGURACIÓN
========================= */

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization"
  ]
}));

app.use(express.json({
  limit: "1mb"
}));


/* =========================
   TRACKLINK
========================= */

const requests = new Map();


/* =========================
   FINDKEY
========================= */

const findkeyUsers = new Map();
const findkeyLocations = new Map();
const findkeySessions = new Map();
const findkeyPendingSearches = new Map();


/* =========================
   FUNCIONES FINDKEY
========================= */

function generateFindKeyId() {

  return "FK-" +
    crypto
      .randomBytes(5)
      .toString("hex")
      .toUpperCase();

}


function generateToken() {

  return crypto
    .randomBytes(32)
    .toString("hex");

}


function hashPassword(password) {

  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

}


function getFindKeyUser(req) {

  const header =
    req.headers.authorization;

  if (!header) {
    return null;
  }

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  const token =
    header.substring(7);

  const session =
    findkeySessions.get(token);

  if (!session) {
    return null;
  }

  return findkeyUsers.get(
    session.userId
  ) || null;

}


/* =========================
   INICIO
========================= */

app.get("/", (req, res) => {

  res.json({

    ok: true,

    status: "online",

    server: "TrackLink + FindKey",

    tracklink: true,

    findkey: true,

    version: "4.0"

  });

});


/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {

  res.json({

    ok: true,

    status: "online",

    server: "TrackLink + FindKey",

    tracklink: true,

    findkey: true,

    version: "4.0"

  });

});


/* =====================================================
   ===================== TRACKLINK =====================
   ===================================================== */


/* CREAR SOLICITUD */

app.post(
  "/api/tracklink/create",
  (req, res) => {

    const id =
      crypto
        .randomBytes(12)
        .toString("hex");


    requests.set(id, {

      id,

      status: "waiting",

      createdAt:
        new Date().toISOString(),

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

  }
);


/* PÁGINA SHARE */

app.get(
  "/share/:id",
  (req, res) => {

    const id =
      req.params.id;


    if (!requests.has(id)) {

      return res
        .status(404)
        .send(`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width,initial-scale=1">
<title>TrackLink</title>
</head>

<body>

<p>Solicitud no encontrada.</p>

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

<title>TrackLink</title>

<style>

html,
body{

  margin:0;

  width:100%;

  height:100%;

  background:#ffffff;

}

body{

  display:flex;

  align-items:center;

  justify-content:center;

  font-family:Arial,sans-serif;

}

button{

  border:0;

  border-radius:12px;

  padding:16px 45px;

  background:#111111;

  color:#ffffff;

  font-size:16px;

  font-weight:bold;

}

button:disabled{

  opacity:.5;

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
function(){

  if(!navigator.geolocation){

    alert("Este dispositivo no permite ubicación.");

    return;

  }


  button.disabled=true;

  button.textContent="Obteniendo ubicación...";


  navigator.geolocation.getCurrentPosition(

    async function(position){

      const data={

        latitude:
          position.coords.latitude,

        longitude:
          position.coords.longitude,

        accuracy:
          position.coords.accuracy

      };


      try{

        const response =
          await fetch(
            "/api/tracklink/submit/${id}",
            {

              method:"POST",

              headers:{
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(data)

            }
          );


        if(response.ok){

          button.textContent=
            "Ubicación enviada";

        }else{

          button.disabled=false;

        }

      }catch(error){

        console.error(error);

        button.disabled=false;

        button.textContent="Aceptar";

      }

    },

    function(error){

      console.error(error);

      alert(
        "No se pudo obtener la ubicación."
      );

      button.disabled=false;

      button.textContent="Aceptar";

    },

    {

      enableHighAccuracy:true,

      timeout:15000,

      maximumAge:0

    }

  );

});

</script>

</body>

</html>

`);

  }
);


/* RECIBIR UBICACIÓN TRACKLINK */

app.post(
  "/api/tracklink/submit/:id",
  (req, res) => {

    const request =
      requests.get(req.params.id);


    if(!request){

      return res
        .status(404)
        .json({

          ok:false,

          error:
            "Solicitud no encontrada."

        });

    }


    const {
      latitude,
      longitude,
      accuracy
    } = req.body;


    if(
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ){

      return res
        .status(400)
        .json({

          ok:false,

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

      receivedAt:
        new Date().toISOString()

    };


    requests.set(
      req.params.id,
      request
    );


    console.log(
      "📍 TrackLink:",
      req.params.id
    );


    res.json({

      ok:true

    });

  }
);


/* RESULTADO TRACKLINK */

app.get(
  "/api/tracklink/result/:id",
  (req, res) => {

    const request =
      requests.get(req.params.id);


    if(!request){

      return res
        .status(404)
        .json({

          ok:false,

          error:
            "Solicitud no encontrada."

        });

    }


    res.json({

      ok:true,

      id:
        request.id,

      status:
        request.status,

      createdAt:
        request.createdAt,

      data:
        request.data

    });

  }
);


/* =====================================================
   ====================== FINDKEY ======================
   ===================================================== */


/* REGISTRO */

app.post(
  "/api/findkey/register",
  (req, res) => {

    try{

      const {
        name,
        email,
        password
      } = req.body;


      if(
        !name ||
        !email ||
        !password
      ){

        return res
          .status(400)
          .json({

            ok:false,

            error:
              "Completa todos los campos."

          });

      }


      if(password.length < 6){

        return res
          .status(400)
          .json({

            ok:false,

            error:
              "La contraseña debe tener mínimo 6 caracteres."

          });

      }


      const emailNormalizado =
        email
          .trim()
          .toLowerCase();


      for(
        const user of findkeyUsers.values()
      ){

        if(
          user.email ===
          emailNormalizado
        ){

          return res
            .status(409)
            .json({

              ok:false,

              error:
                "Este correo ya está registrado."

            });

        }

      }


      const id =
        generateFindKeyId();


      const user = {

        id,

        name:
          name.trim(),

        email:
          emailNormalizado,

        password:
          hashPassword(password),

        device: {

          model: null,

          android: null,

          battery: null

        },

        locationPermission:
          false,

        online:
          true,

        createdAt:
          new Date().toISOString(),

        lastConnection:
          new Date().toISOString()

      };


      findkeyUsers.set(
        id,
        user
      );


      const token =
        generateToken();


      findkeySessions.set(
        token,
        {

          userId:id,

          createdAt:
            new Date().toISOString()

        }
      );


      console.log(
        "🟣 FindKey cuenta creada:",
        id
      );


      res.json({

        ok:true,

        id,

        token,

        user:{

          id:user.id,

          name:user.name,

          email:user.email

        }

      });

    }catch(error){

      console.error(
        "FindKey register:",
        error
      );


      res
        .status(500)
        .json({

          ok:false,

          error:
            "Error interno del servidor."

        });

    }

  }
);


/* LOGIN */

app.post(
  "/api/findkey/login",
  (req, res) => {

    try{

      const {
        email,
        password
      } = req.body;


      if(
        !email ||
        !password
      ){

        return res
          .status(400)
          .json({

            ok:false,

            error:
              "Completa correo y contraseña."

          });

      }


      const emailNormalizado =
        email
          .trim()
          .toLowerCase();


      let foundUser = null;


      for(
        const user of findkeyUsers.values()
      ){

        if(
          user.email ===
          emailNormalizado
        ){

          foundUser = user;

          break;

        }

      }


      if(!foundUser){

        return res
          .status(401)
          .json({

            ok:false,

            error:
              "Correo o contraseña incorrectos."

          });

      }


      const passwordHash =
        hashPassword(password);


      if(
        passwordHash !==
        foundUser.password
      ){

        return res
          .status(401)
          .json({

            ok:false,

            error:
              "Correo o contraseña incorrectos."

          });

      }


      foundUser.online = true;

      foundUser.lastConnection =
        new Date().toISOString();


      const token =
        generateToken();


      findkeySessions.set(
        token,
        {

          userId:
            foundUser.id,

          createdAt:
            new Date().toISOString()

        }
      );


      console.log(
        "🟢 FindKey login:",
        foundUser.id
      );


      res.json({

        ok:true,

        token,

        id:
          foundUser.id,

        user:{

          id:
            foundUser.id,

          name:
            foundUser.name,

          email:
            foundUser.email

        }

      });

    }catch(error){

      console.error(
        "FindKey login:",
        error
      );


      res
        .status(500)
        .json({

          ok:false,

          error:
            "Error interno del servidor."

        });

    }

  }
);


/* PERFIL */

app.get(
  "/api/findkey/profile",
  (req, res) => {

    const user =
      getFindKeyUser(req);


    if(!user){

      return res
        .status(401)
        .json({

          ok:false,

          error:
            "Sesión no válida."

        });

    }


    res.json({

      ok:true,

      user:{

        id:
          user.id,

        name:
          user.name,

        email:
          user.email,

        device:
          user.device,

        locationPermission:
          user.locationPermission,

        online:
          user.online,

        lastConnection:
          user.lastConnection,

        createdAt:
          user.createdAt

      }

    });

  }
);


/* INFORMACIÓN DEL DISPOSITIVO */

app.post(
  "/api/findkey/device",
  (req, res) => {

    const user =
      getFindKeyUser(req);


    if(!user){

      return res
        .status(401)
        .json({

          ok:false,

          error:
            "Sesión no válida."

        });

    }


    const {
      model,
      android,
      battery
    } = req.body;


    if(
      model !== undefined
    ){

      user.device.model =
        model;

    }


    if(
      android !== undefined
    ){

      user.device.android =
        android;

    }


    if(
      battery !== undefined
    ){

      user.device.battery =
        battery;

    }


    user.online = true;

    user.lastConnection =
      new Date().toISOString();


    res.json({

      ok:true

    });

  }
);


/* PERMISO DE UBICACIÓN */

app.post(
  "/api/findkey/location/permission",
  (req, res) => {

    const user =
      getFindKeyUser(req);


    if(!user){

      return res
        .status(401)
        .json({

          ok:false,

          error:
            "Sesión no válida."

        });

    }


    user.locationPermission =
      req.body.allowed === true;


    res.json({

      ok:true,

      locationPermission:
        user.locationPermission

    });

  }
);


/* GUARDAR UBICACIÓN */

app.post(
  "/api/findkey/location",
  (req, res) => {

    const user =
      getFindKeyUser(req);


    if(!user){

      return res
        .status(401)
        .json({

          ok:false,

          error:
            "Sesión no válida."

        });

    }


    const {
      latitude,
      longitude,
      accuracy
    } = req.body;


    if(
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ){

      return res
        .status(400)
        .json({

          ok:false,

          error:
            "Ubicación inválida."

        });

    }


    if(!user.locationPermission){

      return res
        .status(403)
        .json({

          ok:false,

          error:
            "La ubicación no está autorizada."

        });

    }


    const location = {

      latitude,

      longitude,

      accuracy:
        typeof accuracy === "number"
          ? accuracy
          : null,

      receivedAt:
        new Date().toISOString()

    };


    findkeyLocations.set(
      user.id,
      location
    );


    user.online = true;

    user.lastConnection =
      location.receivedAt;


    console.log(
      "📍 FindKey ubicación:",
      user.id
    );


    res.json({

      ok:true,

      location

    });

  }
);


/* BUSCAR UBICACIÓN */

app.get(
  "/api/findkey/location/:id",
  (req, res) => {

    const requester =
      getFindKeyUser(req);


    if(!requester){

      return res
        .status(401)
        .json({

          ok:false,

          error:
            "Sesión no válida."

        });

    }


    const targetId =
      req.params.id
        .trim()
        .toUpperCase();


    const target =
      findkeyUsers.get(
        targetId
      );


    if(!target){

      return res
        .status(404)
        .json({

          ok:false,

          error:
            "ID de FindKey no encontrado."

        });

    }


    const location =
      findkeyLocations.get(
        targetId
      );


    if(!location){

      return res
        .status(404)
        .json({

          ok:false,

          error:
            "Este dispositivo todavía no ha enviado una ubicación."

        });

    }


    res.json({

      ok:true,

      user:{

        id:
          target.id,

        name:
          target.name,

        email:
          target.email,

        device:
          target.device,

        online:
          target.online,

        lastConnection:
          target.lastConnection

      },

      location

    });

  }
);


/* =========================
   BÚSQUEDA SIN INTERNET
========================= */

app.post(
  "/api/findkey/offline/search",
  (req, res) => {

    const requester =
      getFindKeyUser(req);


    if(!requester){

      return res
        .status(401)
        .json({

          ok:false,

          error:
            "Sesión no válida."

        });

    }


    const targetId =
      String(
        req.body.targetId || ""
      )
      .trim()
      .toUpperCase();


    if(!targetId){

      return res
        .status(400)
        .json({

          ok:false,

          error:
            "Debes indicar un ID."

        });

    }


    const target =
      findkeyUsers.get(
        targetId
      );


    if(!target){

      return res
        .status(404)
        .json({

          ok:false,

          error:
            "ID de FindKey no encontrado."

        });

    }


    const searchId =
      crypto
        .randomBytes(12)
        .toString("hex");


    const search = {

      id:
        searchId,

      requesterId:
        requester.id,

      targetId,

      status:
        "waiting",

      createdAt:
        new Date().toISOString(),

      completedAt:
        null

    };


    findkeyPendingSearches.set(
      searchId,
      search
    );


    console.log(
      "📵 FindKey búsqueda offline:",
      targetId
    );


    res.json({

      ok:true,

      searchId,

      targetId,

      status:
        "waiting"

    });

  }
);


/* CONSULTAR BÚSQUEDA OFFLINE */

app.get(
  "/api/findkey/offline/search/:id",
  (req, res) => {

    const user =
      getFindKeyUser(req);


    if(!user){

      return res
        .status(401)
        .json({

          ok:false,

          error:
            "Sesión no válida."

        });

    }


    const search =
      findkeyPendingSearches.get(
        req.params.id
      );


    if(!search){

      return res
        .status(404)
        .json({

          ok:false,

          error:
            "Búsqueda no encontrada."

        });

    }


    if(
      search.requesterId !==
      user.id
    ){

      return res
        .status(403)
        .json({

          ok:false,

          error:
            "No tienes acceso a esta búsqueda."

        });

    }


    const location =
      findkeyLocations.get(
        search.targetId
      );


    if(location){

      search.status =
        "located";

      search.completedAt =
        location.receivedAt;

      findkeyPendingSearches.set(
        search.id,
        search
      );

    }


    res.json({

      ok:true,

      search,

      location:
        location || null

    });

  }
);


/* LOGOUT */

app.post(
  "/api/findkey/logout",
  (req, res) => {

    const header =
      req.headers.authorization;


    if(
      header &&
      header.startsWith("Bearer ")
    ){

      const token =
        header.substring(7);

      const session =
        findkeySessions.get(token);


      if(session){

        const user =
          findkeyUsers.get(
            session.userId
          );


        if(user){

          user.online = false;

        }

      }


      findkeySessions.delete(
        token
      );

    }


    res.json({

      ok:true

    });

  }
);


/* =========================
   404
========================= */

app.use(
  (req, res) => {

    res
      .status(404)
      .json({

        ok:false,

        error:
          "Ruta no encontrada."

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
      "🟢 TRACKLINK + FINDKEY INICIADO"
    );

    console.log(
      "🌐 Puerto:",
      PORT
    );

  }
);
