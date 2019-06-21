// OAuth2 security
let passport                = require('passport');
let BasicStrategy           = require('passport-http').BasicStrategy;
let ClientPasswordStrategy  = require('passport-oauth2-client-password').Strategy;
let BearerStrategy          = require('passport-http-bearer').Strategy;
let User                    = require('../../models/user');
let ClientModel             = require('../../models/auth/tokenModels').ClientModel;
let AccessTokenModel        = require('../../models/auth/tokenModels').AccessTokenModel;
let UserSession             = require('../../models/auth/userSession'); 

// responsible of Client strategy, for client which supports HTTP Basic authentication (required)
passport.use(new BasicStrategy(
    function(username, password, done) {
        ClientModel.findOne({ clientId: username }, function(err, client) {
            if (err) { return done(err); }
            if (!client) { return done(null, false); }
            if (client.clientSecret != password) { return done(null, false); }

            return done(null, client);
        });
    }
));

// responsible of Client strategy, for client which not supports HTTP Basic authentication (Optionnal)
passport.use(new ClientPasswordStrategy(
    function(clientId, clientSecret, done) {
        ClientModel.findOne({ clientId: clientId }, function(err, client) {
            if (err) { return done(err); }
            if (!client) { return done(null, false); }
            if (client.clientSecret != clientSecret) { return done(null, false); }
            return done(null, client);
        });
    }
));

// responsible of Access strategy
passport.use(new BearerStrategy({ passReqToCallback: true }, function(req, accessToken, done) {
  if(!accessToken) return done(null, false);
  AccessTokenModel.findOne({token: accessToken})
  .then(accessTokenObject => {
    if (!accessTokenObject) return done(null, false);

    UserSession.findByAccessToken(accessTokenObject._id)
    .then(userSession => {
      if(!userSession) return done(null, false);
  
      // token expired
      if(Math.round((Date.now()-userSession.accessToken.created)/1000) > process.env.DEFAULT_TOKEN_TIMEOUT){
        AccessTokenModel.remove({token: userSession.accessToken.token}, function(err){
            if(err) return done(err);
        });
        return done(null, false, {message: 'Token expired'});
      }
  
      // token not expired
      User.findById(userSession.user, function(err, user){
        if(err) return done(err);
        if(!user) return done(null, false, {message: 'Unknown user'});

        user.last_action = Date.now();
        user.save();
        
        var info = {scope: '*'};
        done(null, user, info);
      });

    }).catch(err => done(err));
  }).catch(err => done(err));
}));