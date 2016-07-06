var yo = require('yo-yo');
var landing = require('../landing/index.js');

 var signinForm = yo`<div class="col s12 m7">
						<div class="row">
							<div class="signup-box">
								<h1 class="timbagram">Timbagram</h1>
								<form class="signup-form">
									<div class="section">
										<a href="" class="btn btn-fb hide-on-small-only">Inicia sesión con Facebook</a>
										<a href="" class="btn btn-fb hide-on-med-and-up">Inicia sesión</a>
									</div>
									<div class="divider"></div>
									<div class="section">
										<input type="text" name="username" id="" placeholder="Nombre de usuario">
										<input type="password" name="password" id="" placeholder="Contraseña">
										<button class="btn waves-effect waves light btn-signup" type="submit">Inicia sesión</button>
									</div>
								</form>
							</div>
						</div>
						<div class="row">
							<div class="login-box">
								¿No tienes una cuenta? <a href="/signup">Regístrate</a>
							</div>
						</div>
					</div>`;

module.exports = landing(signinForm);