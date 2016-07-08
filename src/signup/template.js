var yo = require('yo-yo');
var landing = require('../landing');

 var signupForm = yo`<div class="col s12 m7">
						<div class="row">
							<div class="signup-box">
								<h1 class="timbagram">Timbagram</h1>
								<form class="signup-form">
									<h2>Regitrate para ver fotos de tus Amig@s Casineros</h2>
									<div class="section">
										<a href="" class="btn btn-fb hide-on-small-only">Inicia sesión con Facebook</a>
										<a href="" class="btn btn-fb hide-on-med-and-up"><i class="fa fa-facebook-official" aria-hidden="true"></i>Inicia sesión</a>
									</div>
									<div class="divider"></div>
									<div class="section">
										<input type="email" name="email" id="" placeholder="Correo electrónico">
										<input type="text" name="name" id="" placeholder="Nombre completo">
										<input type="text" name="username" id="" placeholder="Nombre de usuario">
										<input type="password" name="password" id="" placeholder="Contraseña">
										<button class="btn waves-effect waves light btn-signup" type="submit">Registrate</button>
									</div>
								</form>
							</div>
						</div>
						<div class="row">
							<div class="login-box">
								¿Tienes una cuenta? <a href="/signin">Entrar</a>
							</div>
						</div>
					</div>`;

module.exports = landing(signupForm);