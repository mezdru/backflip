var express = require('express');
var path = require('path');

// App
var app = express();
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
var secrets = require('./secrets.json');
app.use(session({
    //Hide Secret in secrets !
    secret: secrets.session.secret,
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


// Routes
var index = require('./routes/index');
app.use('/', index);

//var google = require('./routes/google');
//app.use('/google', google);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// 401 error handler
app.use(function(err, req, res, next) {
  if (err.status == 401) {
    res.locals.loginUrl = 'google/login';
    res.status(401);
    return res.render('please_login');
  }
  next(err);
});

// generic error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
