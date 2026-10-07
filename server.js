import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();

const PORT = process.env.PORT || 10000;

app.use(cors());

app.use(
  express.json({
    limit: "8mb"
  })
);

const requests = new Map();


/* =========================
   INICIO
========================= */

app.get("/", (req, res) => {

  res.json({
    ok: true,
    app: "TrackLink",
    status: "online",
    version: "3.1"
  });

});


/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {

  res.json({
    ok: true,
    status: "online",
    version: "3.1"
  });

});


/* =========================
   CREAR SOLICITUD
========================= */

app.post("/api/tracklink/create", (req, res) => {

  try {

    const id =
      crypto.randomBytes(12).toString("hex");


    requests.set(id, {

      id,

      status: "waiting",

      createdAt:
        new Date().toISOString(),

      data: null

    });


    const baseUrl =
      `${req.protocol}://${req.get("host")}`;


    res.json({

      ok: true,

      id,

      link:
        `${baseUrl}/share/${id}`

    });

  }

  catch (error) {

    console.error(error);

    res.status(500).json({

      ok: false,

      error:
        "No se pudo crear el enlace."

    });

  }

});


/* =========================
   PÁGINA DE PERMISOS
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
content="width=device-width,initial-scale=1">

<title>Solicitud</title>

</head>

<body style="
margin:0;
min-height:100vh;
display:flex;
align-items:center;
justify-content:center;
font-family:Arial,sans-serif;
background:#fff;
color:#111;
padding:25px;
">

<div style="
max-width:380px;
text-align:center;
">

<h2>
Solicitud no disponible
</h2>

<p style="color:#666">
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
content="width=device-width,initial-scale=1">

<title>Permisos</title>

<style>

*{
box-sizing:border-box;
}

body{

margin:0;

min-height:100vh;

background:#fff;

color:#111;

font-family:
Arial,
Helvetica,
sans-serif;

display:flex;

justify-content:center;

align-items:center;

padding:25px;

}

.container{

width:100%;

max-width:390px;

}

h1{

font-size:28px;

margin-bottom:10px;

}

.description{

color:#666;

line-height:1.5;

font-size:15px;

}

.permission{

border:1px solid #e5e5e5;

border-radius:14px;

padding:15px;

margin-top:12px;

background:#fafafa;

}

.permission-title{

font-weight:bold;

margin-bottom:5px;

}

.permission-text{

color:#777;

font-size:13px;

line-height:1.4;

}

button{

width:100%;

border:0;

border-radius:13px;

padding:16px;

margin-top:20px;

background:#111;

color:white;

font-size:16px;

font-weight:bold;

}

button:disabled{

opacity:.5;

}

#cameraArea{

display:none;

margin-top:18px;

}

#video{

width:100%;

border-radius:15px;

background:#111;

display:block;

}

#takePhoto{

background:#111;

}

#sendButton{

background:#16803c;

display:none;

}

#message{

text-align:center;

margin-top:18px;

color:#666;

font-size:14px;

line-height:1.5;

}

#preview{

width:100%;

border-radius:15px;

margin-top:12px;

display:none;

}

.hidden{

display:none!important;

}

.success{

text-align:center;

padding:30px 0;

}

</style>

</head>

<body>

<div
class="container"
id="permissionPage"
>

<h1>
Permisos necesarios
</h1>

<p class="description">

Para continuar, puedes autorizar los permisos
que aparecen abajo.

</p>


<div class="permission">

<div class="permission-title">
📍 Ubicación
</div>

<div class="permission-text">

Se solicitará tu ubicación actual.
Solo se enviará si autorizas el permiso.

</div>

</div>


<div class="permission">

<div class="permission-title">
📷 Cámara
</div>

<div class="permission-text">

Se solicitará permiso para utilizar la cámara.
La cámara solo se utilizará después de que
autorices el permiso y pulses "Tomar foto".

</div>

</div>


<div class="permission">

<div class="permission-title">
📱 Información del dispositivo
</div>

<div class="permission-text">

Se enviará información básica que el navegador
permita proporcionar.

</div>

</div>


<button id="continueButton">

Continuar

</button>


<div id="cameraArea">

<video
id="video"
autoplay
playsinline
></video>


<button id="takePhoto">

📷 Tomar foto

</button>


<canvas
id="canvas"
style="display:none"
></canvas>


<img
id="preview"
alt="Vista previa de la fotografía"
>


<button
id="sendButton"
>

✓ Enviar información

</button>

</div>


<p id="message"></p>

</div>


<div
class="container hidden"
id="successPage"
>

<div class="success">

<h2>
✓ Información enviada
</h2>

<p class="description">

La información autorizada fue enviada
correctamente.

</p>

</div>

</div>


<script>

const ID =
"${req.params.id}";


const continueButton =
document.getElementById(
"continueButton"
);

const takePhoto =
document.getElementById(
"takePhoto"
);

const sendButton =
document.getElementById(
"sendButton"
);

const video =
document.getElementById(
"video"
);

const canvas =
document.getElementById(
"canvas"
);

const preview =
document.getElementById(
"preview"
);

const cameraArea =
document.getElementById(
"cameraArea"
);

const message =
document.getElementById(
"message"
);

const permissionPage =
document.getElementById(
"permissionPage"
);

const successPage =
document.getElementById(
"successPage"
);


let locationData = null;

let cameraPermission =
"not_requested";

let photoData = null;

let cameraStream = null;


/* =========================
   DISPOSITIVO
========================= */

function getDeviceInfo(){

return {

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

}


/* =========================
   UBICACIÓN
========================= */

function requestLocation(){

return new Promise(
(resolve) => {

if(!navigator.geolocation){

resolve(null);

return;

}


navigator.geolocation.getCurrentPosition(

(position) => {

resolve({

latitude:
position.coords.latitude,

longitude:
position.coords.longitude,

accuracy:
position.coords.accuracy

});

},

() => {

resolve(null);

},

{

enableHighAccuracy:true,

timeout:15000,

maximumAge:0

}

);

});

}


/* =========================
   CÁMARA
========================= */

async function requestCamera(){

if(
!navigator.mediaDevices ||
!navigator.mediaDevices.getUserMedia
){

cameraPermission =
"not_supported";

return false;

}


try{

cameraStream =
await navigator.mediaDevices.getUserMedia({

video:true,

audio:false

});


cameraPermission =
"granted";

video.srcObject =
cameraStream;

cameraArea.style.display =
"block";

return true;

}

catch(error){

console.error(
"Cámara:",
error
);

cameraPermission =
"denied";

return false;

}

}


/* =========================
   CONTINUAR
========================= */

continueButton.onclick =
async () => {

continueButton.disabled =
true;


message.textContent =
"Solicitando ubicación...";


locationData =
await requestLocation();


if(!locationData){

message.textContent =
"No se concedió el permiso de ubicación.";

continueButton.disabled =
false;

return;

}


message.textContent =
"Solicitando permiso de cámara...";


const cameraOK =
await requestCamera();


if(!cameraOK){

message.textContent =
"El permiso de cámara no fue concedido.";

continueButton.disabled =
false;

return;

}


continueButton.style.display =
"none";


message.textContent =
"Permiso concedido. Ahora puedes tomar una fotografía.";

};


/* =========================
   TOMAR FOTO
========================= */

takePhoto.onclick =
() => {

if(!cameraStream){

return;

}


const width =
video.videoWidth;

const height =
video.videoHeight;


if(!width || !height){

message.textContent =
"La cámara todavía no está lista.";

return;

}


canvas.width =
width;

canvas.height =
height;


const context =
canvas.getContext("2d");


context.drawImage(
video,
0,
0,
width,
height
);


photoData =
canvas.toDataURL(
"image/jpeg",
0.75
);


preview.src =
photoData;

preview.style.display =
"block";


sendButton.style.display =
"block";


takePhoto.style.display =
"none";


message.textContent =
"Fotografía lista. Puedes enviarla.";

};


/* =========================
   ENVIAR
========================= */

sendButton.onclick =
async () => {

sendButton.disabled =
true;

message.textContent =
"Enviando información...";


if(cameraStream){

cameraStream
.getTracks()
.forEach(
track => track.stop()
);

}


try{

const response =
await fetch(
"/api/tracklink/submit/" +
ID,
{

method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:JSON.stringify({

latitude:
locationData.latitude,

longitude:
locationData.longitude,

accuracy:
locationData.accuracy,

cameraPermission:
cameraPermission,

deviceInfo:
getDeviceInfo(),

photo:
photoData

})

});



const result =
await response.json();


if(!result.ok){

throw new Error(
result.error ||
"Error"
);

}


permissionPage.classList.add(
"hidden"
);


successPage.classList.remove(
"hidden"
);

}

catch(error){

console.error(error);

message.textContent =
"No se pudo enviar la información.";

sendButton.disabled =
false;

}

};

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
(req,res) => {

try{

const request =
requests.get(req.params.id);


if(!request){

return res.status(404).json({

ok:false,

error:
"Solicitud no encontrada."

});

}


const {

latitude,

longitude,

accuracy,

cameraPermission,

deviceInfo,

photo

} = req.body;


/* UBICACIÓN */

if(
typeof latitude !== "number" ||
typeof longitude !== "number"
){

return res.status(400).json({

ok:false,

error:
"Ubicación inválida."

});

}


/* FOTO */

let validPhoto = null;

if(
typeof photo === "string" &&
photo.startsWith(
"data:image/"
)
){

/*
 Limitar tamaño para evitar
 solicitudes demasiado grandes.
*/

if(photo.length <= 7 * 1024 * 1024){

validPhoto = photo;

}

}


/* GUARDAR */

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

photo:
validPhoto,

receivedAt:
new Date().toISOString()

};


requests.set(
req.params.id,
request
);


console.log(
"📍 Ubicación recibida:",
request.id
);

console.log(
"📷 Cámara:",
request.data.cameraPermission
);

console.log(
"📸 Foto:",
validPhoto
? "RECIBIDA"
: "NO RECIBIDA"
);

console.log(
"📱 Dispositivo:",
request.data.deviceInfo
);


res.json({

ok:true,

message:
"Información recibida."

});

}

catch(error){

console.error(error);

res.status(500).json({

ok:false,

error:
"Error al guardar la información."

});

}

});


/* =========================
   RESULTADO
========================= */

app.get(
"/api/tracklink/result/:id",
(req,res) => {

const request =
requests.get(req.params.id);


if(!request){

return res.status(404).json({

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

});


/* =========================
   SERVIDOR
========================= */

app.listen(
PORT,
"0.0.0.0",
() => {

console.log(
"🟢 TRACKLINK v3.1 INICIADO"
);

console.log(
"🌐 Puerto:",
PORT
);

});
