/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 26-06-2017 07:15
* @Copyright: Clément Dietschy 2017
*/

require('dotenv').config();
var express = require('express');
var path = require('path');

// App
var app = express();
app.locals.title = 'Lenom';
app.set('trust proxy', true);
app.use(express.static(path.join(__dirname, 'public')));

// Database
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
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

} else if (app.get('env') === 'development') {
  // Setup organisationTag
  app.use(function(req, res, next) {
    if (req.query.subdomains) req.organisationTag = req.query.subdomains.split('.')[0];
    return next();
  });

}

// www is not an organisation, it's an 1990 artifact.
app.use(function(req, res, next) {
  if (req.organisationTag === 'www') {
    return res.redirect(301, 'https://lenom.io' + req.url);
  }
  return next();
});

// i18n logic
const locales = app.get('env') === 'development' ? ['en-UD', 'zu'] : ['en', 'fr', 'zu'];
var i18n = require('i18n');
i18n.configure({
  locales: locales,
  defaultLocale: app.get('env') === 'development' ? 'en-UD' : 'en',
  updateFiles: app.get('env') === 'development',
  directory: "" + __dirname + "/locales"
});

app.use(i18n.init);

//@todo the i18n.init is quite heavy, can we avoid this logic when we read the Locale from the URL ?
app.use(function(req, res, next) {
  var match = req.url.match(/^\/([a-z]{2}(\-[A-Z]{2})?)([\/\?].*)?$/i);
  if (match && locales.includes(match[1])) {
    req.setLocale(match[1]);
    req.url = match[3] || '/';
  } else if (req.path == '/' && !req.organisationTag) {
    return res.redirect(302, req.getLocale() + '/');
  }
  return next();
});

app.use(function(req, res, next) {
  if (req.getLocale() === 'zu') {
    res.locals.inContext = true;
  }
  return next();
});

// Generic
var morgan = require('morgan');
morgan.token('fullurl', function getFullUrl(req) {
  return req.hostname + req.originalUrl;
});
app.use(morgan(':method :fullurl :status :res[content-length] - :response-time ms'));

var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');


app.use(favicon(path.join(__dirname, 'public', 'lenom.png')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());

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
      domain: (app.get('env') === 'development') ? null : 'lenom.io',
      maxAge: 2419200000
    }
}));

// Taking care of general Auth
var auth = require('./routes/auth.js');
app.use('/', auth);

var UrlHelper = require('./helpers/url_helper.js');
app.use(function(req, res, next) {
  res.locals.loginUrl = new UrlHelper(req.organisationTag, 'google/login', null, req.getLocale()).getUrl();
  res.locals.logoutUrl = new UrlHelper(req.organisationTag, 'logout', null, req.getLocale()).getUrl();
  return next();
});

// Taking care of Google Auth
var googleAuth = require('./routes/google/google_auth.js');
app.use('/google', googleAuth);

// Taking care of Email Auth
var emailAuth = require('./routes/email/email_auth.js');
app.use('/email', emailAuth);

// public pages
var publicPages = require('./routes/public.js');
app.use('/', publicPages);


/*
* Restricted routes
*/

// restricting
var restrict = require('./routes/restrict.js');
app.use('/', restrict);

// private pages
var privatePages = require('./routes/private.js');
app.use('/', privatePages);

// compose
var compose = require('./routes/compose.js');
app.use('/compose', compose);


// Super admin
var superadmin = require('./routes/superadmin.js');
app.use('/superadmin', superadmin);

// restricting admin access
var restrictAdmin = require('./routes/restrict_admin.js');
app.use('/admin', restrictAdmin);

var googleAdmin = require('./routes/google/google_admin.js');
app.use('/admin/google', googleAdmin);

var googleAdmin = require('./routes/email/email_admin.js');
app.use('/admin/email', googleAdmin);

var fullContactAdmin = require('./routes/fullcontact/fullcontact_admin.js');
app.use('/admin/fullcontact', fullContactAdmin);

var algoliaAdmin = require('./routes/algolia/algolia_admin.js');
app.use('/admin/algolia', algoliaAdmin);

var organisationAdmin = require('./routes/organisation_admin.js');
app.use('/admin/organisation', organisationAdmin);// admin

var recordAdmin = require('./routes/record_admin.js');
app.use('/admin/record', recordAdmin);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// generic error setter
app.use(function(err, req, res, next) {
  res.locals.error = err || {};
    // only providing stacktrace in development
  res.locals.error.stack = req.app.get('env') === 'development' ? err.stack : null;
  res.locals.status = (err.status || 500);
  res.locals.error.date = new Date().toISOString();

  // During early Beta log verbose 500 errors to Heroku console
  // @todo remove
  if (res.locals.status === 403) console.error(err);

  next(err);
});

// generic error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  return res.render('error');
});

module.exports = app;
