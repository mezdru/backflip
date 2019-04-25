require('dotenv').config();
var express = require('express');
var path = require('path');
var undefsafe = require('undefsafe');
var UrlHelper = require('./helpers/url_helper.js');
var Organisation = require('./models/organisation');

// App
var app = express();
app.locals.title = 'Wingzy';
app.set('trust proxy', true);
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  //intercepts OPTIONS method
  if ('OPTIONS' === req.method) {
    //respond with 200
    res.send(200);
  }
  else {
  //move on
    next();
  }
});


// Database
var mongoose = require('mongoose');
mongoose.plugin(schema => { schema.options.usePushEach = true; });
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true});
var db = mongoose.connection;

db.on('error', console.error.bind(console));
db.once('open', function() {
  console.log('Connected to DB!');
});

// Views
app.set('views', path.join(__dirname, 'views'));
var hbs = require('./views/hbs.js');
app.set('view engine', 'hbs');

if (app.get('env') === 'production') {
  // Redirect non https only in production
  app.use(function(req, res, next) {
      if(req.protocol !== 'https') return res.redirect(301, "https://" + req.headers.host + req.url);
      else return next();
  });

  // Setup organisationTag
  app.use(function(req, res, next) {
    if (req.subdomains.length > 0) req.organisationTag = req.subdomains[0];
    return next();
  });

} else if (app.get('env') === 'staging') {
  // Setup URL for Pull Request apps.
  if(process.env.HEROKU_APP_NAME !== 'wingzy-staging') process.env.HOST = process.env.HEROKU_APP_NAME + ".herokuapp.com";

  // Setup organisationTag
  app.use(function(req, res, next) {
    if (req.query.subdomains) req.organisationTag = req.query.subdomains.split('.')[0];
    return next();
  });

} else if (app.get('env') === 'development') {
  // Setup organisationTag
  app.use(function(req, res, next) {
    if (req.query.subdomains) req.organisationTag = req.query.subdomains.split('.')[0];
    return next();
  });
}

// Forest admin
if(process.env.NODE_ENV !== 'staging'){
  app.use(require('forest-express-mongoose').init({
    modelsDir: __dirname + '/models',
    envSecret: process.env.FOREST_ENV_SECRET,
    authSecret: process.env.FOREST_AUTH_SECRET,
    mongoose: require('mongoose')
  }));
}


// www is not an organisation, it's an 1990 artifact.
app.use(function(req, res, next) {
  if (req.organisationTag === 'www') {
    return res.redirect(301, req.protocol + '://' + process.env.HOST + req.url);
  }
  return next();
});

// i18n logic
const locales = app.get('env') === 'development' ? ['en-UK', 'fr'] : ['en', 'fr', 'zu'];
var i18n = require('i18n');
i18n.configure({
  locales: locales,
  defaultLocale: app.get('env') === 'development' ? 'en-UK' : 'en',
  updateFiles: app.get('env') === 'development',
  directory: "" + __dirname + "/locales"
});

app.use(i18n.init);

var Agenda = require('./models/agenda_scheduler');
Agenda.i18n = i18n;

//@todo the i18n.init is quite heavy, can we avoid this logic when we read the Locale from the URL ?
app.use(function(req, res, next) {
  var match = req.url.match(/^\/([a-z]{2}(\-[A-Z]{2})?)([\/\?].*)?$/i);
  if (match && locales.includes(match[1])) {
    req.setLocale(match[1]);
    req.url = match[3] || '/';
  } else if (req.path == '/') {
    return res.redirect(302, new UrlHelper(req.organisationTag, null, null, req.getLocale()).getUrl());
  }
  return next();
});

app.use(function(req, res, next) {
  if (req.getLocale() === 'zu') {
    res.locals.inContext = true;
  }
  return next();
});

// Generic logging
var morgan = require('morgan');
morgan.token('fullurl', function getFullUrl(req) {
  return req.hostname + req.originalUrl;
});
morgan.token('user', function user(req) {
  return undefsafe(req, 'session.user._id') || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
});
app.use(morgan(':method :fullurl :status - :res[content-length] b in :response-time ms - :user'));

var favicon = require('serve-favicon');
var bodyParser = require('body-parser');


app.use(favicon(path.join(__dirname, 'public', 'wingzy.png')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions & Auth
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

//@todo make sure we're not popping hundreds of sessions for robots, unauth users, etc...
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: db}),
    cookie: {
      domain: (app.get('env') === 'development') ? null : process.env.HOST,
      maxAge: 2419200000
    }
}));

// API needs auth to work, this could be use to desactivate API too
// API should be declared before authentification helper check, which is usefull for server rendering only
var api = require('./api/api');
app.use('/api', api);

/**
 * @description When an user login : we receive a redirection from app.wingzy.com, with 2 cookies : accessToken & refreshToken
 *              We can access them normally because app.wingzy.com is juste a subdomain of us.
 *              If we have only the refreshToken, we should get accessToken with it automatically.
 *              (Cf agent.js of frontflip)
 */
var User = require('./models/user');
var AuthentificationHelper = require('./helpers/authentification_helper');
app.use((req, res, next) => {
  let authentificationHelper = new AuthentificationHelper(req.cookies.accessToken, req.cookies.refreshToken);
  authentificationHelper.performAuth().then(currentUser => {
    if(currentUser && currentUser.isValidated() ){
      if (req.session.impersonator && req.session.user) {
        res.locals.user = req.session.user;
      } else {
        res.locals.user = new User(currentUser);
        req.session.user = res.locals.user;
      }
      if(authentificationHelper.getNewTokens){
        let expDate = new Date();
        expDate.setMinutes(expDate.getMinutes()+55);
        res.cookie('accessToken', authentificationHelper.accessToken, {expires: expDate, path: '/'});
        let expDate2 = new Date();
        expDate2.setFullYear(expDate2.getFullYear() + 1);
        res.cookie('refreshToken', authentificationHelper.refreshToken, {expires: expDate2, path:'/'});
      }
    }else if(authentificationHelper.needClearCookies){
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
    }
    return next();
  });
});

var flash = require('express-flash');
app.use(flash());

app.use(function(req, res, next) {
  res.locals.logoutUrl = new UrlHelper(req.organisationTag, 'logout', null, req.getLocale()).getUrl();
  res.locals.signinUrl = new UrlHelper(req.organisationTag, 'login', null, req.getLocale()).getUrl();
  return next();
});


// Production only settings
app.use(function(req, res, next) {
  res.locals.track = false;
  res.locals.isProduction = false;
  if (req.app.get('env') === 'production') {
    res.locals.track = true;
    res.locals.isProduction = true;
  }
  return next();
});

// Looking for the org and setup res.locals.organisation
var org = require('./routes/org.js');
app.use('/', org);

// Taking care of Google Auth
var googleAuth = require('./routes/google/google_auth.js');
app.use('/google', googleAuth);

// Taking care of Email Auth
var emailAuth = require('./routes/email/email_auth.js');
app.use('/email', emailAuth);

// Taking care of general Auth
var auth = require('./routes/auth.js');
app.use('/', auth);

// Redirection after Login
var authRedirect = require('./routes/auth_redirect.js');
app.use('/', authRedirect);

// public pages
var publicPages = require('./routes/public.js');
app.use('/', publicPages);

// Super admin
var superadmin = require('./routes/superadmin.js');
app.use('/superadmin', superadmin);

// Create new Wingzy
var newWingzy = require('./routes/new_wingzy.js');
app.use('/new', newWingzy);

/*
* Restricted routes
*/

// restricting
var restrict = require('./routes/restrict.js');
app.use('/', restrict);

// private pages
var privatePages = require('./routes/private.js');
app.use('/', privatePages);

// redirect profile to PWA
app.use('/profile/:tag', function(req, res, next) {
  return res.redirect(
    (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') +
    process.env.HOST_FRONTFLIP +
    '/' +
    req.getLocale() +
    '/' +
    res.locals.organisation.tag +
    '/' +
    req.params.tag
    );
});

var oldprofile = require('./routes/profile.js');
app.use('/oldprofile', oldprofile);

var searchLog = require('./routes/searchLog');
app.use('/searchLog', searchLog);

// restricting
var block = require('./routes/block.js');
app.use('/', block);

var statistics = require('./routes/statistics');
app.use('/statistics', statistics);

// onboarding
var onboard = require('./routes/onboard.js');
app.use('/onboard', onboard);
app.use('/onboard', (req, res, next) => {
  return res.redirect(
    (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') +
    process.env.HOST_FRONTFLIP +
    '/' +
    req.getLocale() +
    '/' +
    res.locals.organisation.tag +
    '/onboard' );
});

// edit
var cover = require('./routes/cover.js');
app.use('/cover', cover);

var about = require('./routes/about.js');
app.use('/about', about);

var emoji = require('./routes/emoji.js');
app.use('/emoji', emoji);

var picturePath = require('./routes/picture_path.js');
app.use('/picturePath', picturePath);

var suspend = require('./routes/suspend.js');
app.use('/suspend', suspend);

// onboarding
var invite = require('./routes/invite.js');
app.use('/invite', invite);

// restricting admin access
var restrictAdmin = require('./routes/restrict_admin.js');
app.use('/admin', restrictAdmin);

var googleAdmin = require('./routes/google/google_admin.js');
app.use('/admin/google', googleAdmin);

var algoliaAdmin = require('./routes/algolia/algolia_admin.js');
app.use('/admin/algolia', algoliaAdmin);

var organisationAdmin = require('./routes/organisation_admin.js');
app.use('/admin/organisation', organisationAdmin);// admin

var recordAdmin = require('./routes/record_admin.js');
app.use('/admin/record', recordAdmin);

var userAdmin = require('./routes/user/user_admin.js');
app.use('/admin/user', userAdmin);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// generic error setter
app.use(function(err, req, res, next) {
  res.locals.error = err || {};
  res.locals.status = (err.status || 500);
  res.locals.error.date = new Date().toISOString();

  // During early Beta log verbose 500 errors to Heroku console
  if (res.locals.status >= 500) console.error(err);

  // only print stacktrace in development
  res.locals.error.stack = req.app.get('env') === 'production' ? null : err.stack;

  next(err);
});

// generic error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  return res.render('error', {bodyClass: 'error'});
});

module.exports = app;
