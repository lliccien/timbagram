// Requerir express
var express = require('express');

// Inicializar express en la variable app
var app = express();

// Setear pug como motor de plantillas html
app.set('view engine', 'pug');

// Servir o dar acceso a la carpeta public de forma virtual no es necesario colocar public en las rutas html
app.use(express.static('public'));

// Crear ruta / y responder a ella
app.get('/', function (req, res) {
	// res.send('Hola Mundo!');
	res.render('index')
})

// Poner al server web a escuchar en el puerto 3000
app.listen(3000, function (err) {
	if (err) return console.log('Hubo un error'), process.exit(1)
	
	console.log('Timbagram escuchando en el puerto 3000');
})