var yo = require('yo-yo');
var layout = require('../layout/index.js')

var homepage = yo`	<div class="container timeline">
						<div class="row">
							<div class="col s12 m10 offset-m1 l6 offset-l3">
								HomePage
							</div>
						</div>
					</div>`;

module.exports = layout(homepage);