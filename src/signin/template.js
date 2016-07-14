var yo = require('yo-yo');
var landing = require('../landing/index.js');
var translate = require('../translate');

 var signinForm = yo`<div class="col s12 m7">
						<div class="row">
							<div class="signup-box">
								<h1 class="timbagram">Timbagram</h1>
								<form class="signup-form">
									<div class="section">
										<a href="" class="btn btn-fb hide-on-small-only">${translate.message('signup.facebook')}</a>
										<a href="" class="btn btn-fb hide-on-med-and-up">${translate.message('signup.text')}</a>
									</div>
									<div class="divider"></div>
									<div class="section">
										<input type="text" name="username" id="" placeholder="${translate.message('username')}">
										<input type="password" name="password" id="" placeholder="${translate.message('password')}">
										<button class="btn waves-effect waves light btn-signup" type="submit">${translate.message('signin')}</button>
									</div>
								</form>
							</div>
						</div>
						<div class="row">
							<div class="login-box">
								${translate.message('signin.no-have-account')} <a href="/signup">${translate.message('signup.call-to-action')}</a>
							</div>
						</div>
					</div>`;

module.exports = landing(signinForm);