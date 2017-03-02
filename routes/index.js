var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var dbUrl = 'mongodb://localhost:27017/myproject';

/* GET home page. */
router.get('/', function(req, res, next) {
  MongoClient.connect(dbUrl, function (err, db) {
    if (err) {
      return next(err);
    }
    console.log("Connceted to MongoDB");
    db.close();
    res.render('index', { title: 'Lenom' });
  });
});

module.exports = router;
