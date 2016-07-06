var page = require('page');
var title = require('title');

page('/', function (ctx, next) {
	title('Timbagram');
	var main = document.getElementById('main-container');
	main.innerHTML = 'Home <a href="/signup">Signup</a>';
})
