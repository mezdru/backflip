/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 18-03-2017 12:22
* @Copyright: Clément Dietschy 2017
*/

require('dotenv').config()
var express = require('express');
var path = require('path');

// App
var app = express();
app.locals.title = 'Lenom';
app.use(express.static(path.join(__dirname, 'public')));

// Database
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/db');
var db = mongoose.connection;

db.on('error', console.error.bind(console));
db.once('open', function() {
  console.log('Connected !');
});

// Views
app.set('views', path.join(__dirname, 'views'));
var hbs = require('./views/hbs.js');
app.set('view engine', 'hbs');


// Generic
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');

app.use(favicon(path.join(__dirname, 'public', 'lenom.png')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Sessions & Auth
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: db}),
    cookie: {maxAge: 2419200000}
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
app.get('/', publicPages);

// Render the demo directory
var demo = require('./routes/demo.js');
app.use('/demo', demo);


/*
* Restricted routes
*/

// restricting
var restrict = require('./routes/restrict.js');
app.use('/', restrict);

// private pages
var privatePages = require('./routes/private.js');
app.use('/', privatePages);

// Render the directory
var directory = require('./routes/directory.js');
app.use('/directory', directory);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.log("Aladin");
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// generic error setter
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  next(err);
});

// 401 error handler
app.use(function(err, req, res, next) {
  if (err.status == 401) {
    res.status(401);
    return res.render('401');
  }
  next(err);
});

// 404 error handler
app.use(function(err, req, res, next) {
  if (err.status == 404) {
    res.status(404);
    return res.render('404');
  }
  next(err);
});

// 418 error handler
app.use(function(err, req, res, next) {
  if (err.status == 418) {
    res.status(418);
    return res.render('418');
  }
  next(err);
});

// generic error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  return res.render('error');
});

module.exports = app;
