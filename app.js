/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 11-04-2017 02:53
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

app.use(function(req, res, next) {
  err = new Error();
  err.status = 869;
  return next(err);
});

// Database
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
var db = mongoose.connection;

db.on('error', console.error.bind(console));
db.once('open', function() {
  console.log('Connected !');
});

// Views
app.set('views', path.join(__dirname, 'views'));
var hbs = require('./views/hbs.js');
app.set('view engine', 'hbs');

// Redirect non https only in production
if (app.get('env') === 'production') {
  app.use(function(req, res, next) {
      if(req.protocol !== 'https') return res.redirect(301, "https://" + req.headers.host + req.url);
      else return next();
  });
}

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

// Taking care of Google Auth
var googleAuth = require('./routes/google/google_auth.js');
app.use('/google', googleAuth);

// Taking care of general Auth
var auth = require('./routes/auth.js');
app.use('/', auth);
app.locals.loginUrl = '/google/login';
app.locals.logoutUrl = '/logout';

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

// admin
var admin = require('./routes/admin.js');
app.use('/admin', admin);

// Lenom admin
var superadmin = require('./routes/superadmin.js');
app.use('/superadmin', superadmin);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// generic error setter
app.use(function(err, req, res, next) {
  // During early Beta log verbose errors to Heroku console
  // @todo remove
  console.error(err);
  // set locals, only providing error in development
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // but the error status is not private
  res.locals.status = err.status;
  next(err);
});

// generic error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  return res.render('error');
});

module.exports = app;
