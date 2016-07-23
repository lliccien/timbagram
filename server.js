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
	res.render('index', { title: 'TImbagram'})
})

app.get('/signup', function (req, res) {
	// res.send('Hola Mundo!');
	res.render('index', { title: 'TImbagram - Signup'})
})

app.get('/signin', function (req, res) {
	// res.send('Hola Mundo!');
	res.render('index', { title: 'TImbagram - Signin'})
})

app.get('/api/pictures', function (req, res) {
	var pictures = [
		{
			user: {
				username: 'lliccien',
				avatar: 'https://scontent-mia1-1.xx.fbcdn.net/v/t1.0-9/12046790_10153790001424155_2301715220594432632_n.jpg?oh=511ac0b4303aae266995720a06fc7283&oe=57F6EF38'
			},
			imageUrl: 'images/office.jpg',
			likes: 0,
			liked: false,
			createdAt: new Date().getTime()

		},
		{
			user: {
				username: 'lliccien',
				avatar: 'https://scontent-mia1-1.xx.fbcdn.net/v/t1.0-9/12046790_10153790001424155_2301715220594432632_n.jpg?oh=511ac0b4303aae266995720a06fc7283&oe=57F6EF38'
			},
			imageUrl: 'images/office.jpg',
			likes: 1,
			liked: false,
			createdAt: new Date().setDate(new Date().getDate() - 10)

		},
		{
			user: {
				username: 'lliccien',
				avatar: 'https://scontent-mia1-1.xx.fbcdn.net/v/t1.0-9/12046790_10153790001424155_2301715220594432632_n.jpg?oh=511ac0b4303aae266995720a06fc7283&oe=57F6EF38'
			},
			imageUrl: 'images/office.jpg',
			likes: 31,
			liked: true,
			createdAt: new Date().setDate(new Date().getDate() - 30)

		}
	];

	setTimeout(function () {
		res.send(pictures);
	}, 2000)

})

// Poner al server web a escuchar en el puerto 3000
app.listen(3000, function (err) {
	if (err) return console.log('Hubo un error'), process.exit(1)
	
	console.log('Timbagram escuchando en el puerto 3000');
})