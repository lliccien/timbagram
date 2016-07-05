var page = require('page');

page('/', function (ctx, next) {
	var main = document.getElementById('main-container');
1	main.innerHTML = 'Home <a href="/signup">Signup</a>';
})
