var page = require('page');
var empty = require('empty-element');
var template = require('./template.js');
var title = require('title');
//var request = require('superagent');
var header = require('../header');
var axios = require('axios');

page('/', header, asyncLoad, function (ctx, next) {
  title('Platzigram');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template(ctx.pictures));
})

// Con superagent
// function loadPictures(ctx, next) {
// 	request
// 		.get('/api/pictures')
// 		.end(function (err, res) {
// 			if (err) return console.log(err);

// 			ctx.pictures = res.body;
// 			next();
// 		})	
// }

// usando axios
// function loadPictures(ctx, next) {
// 	axios
// 		.get('/api/pictures')
// 		.then(function (res) {
// 			ctx.pictures = res.data;
// 			next();
// 		})
// 		.catch(function (err) {
// 			console.log(err);
// 		})
// }

// con fetch
// function loadPictures(ctx, next) {
// 	fetch('/api/pictures')
// 		.then(function (res) {
// 			return res.json();
// 			next();
// 		})
// 		.catch(function (err) {
// 			console.log(err);
// 		})
// }


//asyncLoad
async function asyncLoad(ctx, next) {
  try {
    ctx.pictures = await fetch('/api/pictures').then(res => res.json());
    next();
  } catch (err) {
    return console.log(err);
  }
}
