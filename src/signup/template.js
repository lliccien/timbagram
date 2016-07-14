var yo = require('yo-yo');
var landing = require('../landing/index.js');
var translate = require('../translate');

 var signupForm = yo`<div class="col s12 m7">
            <div class="row">
              <div class="signup-box">
                <h1 class="timbagram">Timbagram</h1>
                <form class="signup-form">
                  <h2>${translate.message('signup.subheading')}</h2>
                  <div class="section">
                    <a href="" class="btn btn-fb hide-on-small-only">${translate.message('signup.facebook')}</a>
                    <a href="" class="btn btn-fb hide-on-med-and-up"><i class="fa fa-facebook-official" aria-hidden="true"></i>${translate.message('signup.text')}</a>
                  </div>
                  <div class="divider"></div>
                  <div class="section">
                    <input type="email" name="email" id="" placeholder="${translate.message('email')}">
                    <input type="text" name="name" id="" placeholder="${translate.message('fullname')}">
                    <input type="text" name="username" id="" placeholder="${translate.message('username')}">
                    <input type="password" name="password" id="" placeholder="${translate.message('password')}">
                    <button class="btn waves-effect waves light btn-signup" type="submit">${translate.message('signup.call-to-action')}</button>
                  </div>
                </form>
              </div>
            </div>
            <div class="row">
              <div class="login-box">
                ${translate.message('signup.have-account')} <a href="/signin">${translate.message('signin')}</a>
              </div>
            </div>
          </div>`;

module.exports = landing(signupForm);