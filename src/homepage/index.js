var page = require('page');
var empty = require('empty-element');
var template = require('./template.js');
var title = require('title');

page('/', function(ctx, next) {
	title('Timbagram');
	var main = document.getElementById('main-container');
	var pictures = [
	{
		user: {
			username: 'lliccien',
			avatar: 'https://scontent-mia1-1.xx.fbcdn.net/v/t1.0-9/12046790_10153790001424155_2301715220594432632_n.jpg?oh=511ac0b4303aae266995720a06fc7283&oe=57F6EF38'
		},
		imageUrl: 'images/office.jpg',
		likes: 1024,
		liked: true,
		createAt: new Date()

	},
	{
		user: {
			username: 'lliccien',
			avatar: 'https://scontent-mia1-1.xx.fbcdn.net/v/t1.0-9/12046790_10153790001424155_2301715220594432632_n.jpg?oh=511ac0b4303aae266995720a06fc7283&oe=57F6EF38'
		},
		imageUrl: 'images/office.jpg',
		likes: 1024,
		liked: false,
		createAt: new Date().setDate(new Date().getDate() - 10)

	},
	{
		user: {
			username: 'lliccien',
			avatar: 'https://scontent-mia1-1.xx.fbcdn.net/v/t1.0-9/12046790_10153790001424155_2301715220594432632_n.jpg?oh=511ac0b4303aae266995720a06fc7283&oe=57F6EF38'
		},
		imageUrl: 'images/office.jpg',
		likes: 1024,
		liked: true,
		createAt: new Date().setDate(new Date().getDate() - 30)

	},		
	];
	empty(main).appendChild(template(pictures));
})