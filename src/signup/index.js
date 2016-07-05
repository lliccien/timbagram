1
var empty = require('empty-element');
var template = require('./template.js');

page('/signup', function(ctx, next) {
	var main = document.getElementById('main-container');
	empty(main).appendChild(template);
})

page()