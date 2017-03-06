var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var bodyParser = require('body-parser');

//connect DB
var mongoose = require('mongoose');
var dbUrl = 'mongodb://localhost:27017/db';
mongoose.connect(dbUrl);
db = mongoose.connection;


db.on('error', console.error.bind(console));
db.once('open', function() {
  console.log('Connected !');
});

var index = require('./routes/index');
var google = require('./routes/google');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// app setup
app.use(favicon(path.join(__dirname, 'public', 'lenom.png')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret: 'doublebackflip',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection}),
    cookie: {maxAge: 2419200000}
}));
app.use(express.static(path.join(__dirname, 'public')));

// routers setup
app.use('/', index);
app.use('/google', google);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
