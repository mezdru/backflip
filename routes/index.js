var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var db = mongoose.connection;

var coworkerSchema = mongoose.Schema({
  name: String,
  age: Number,
  aliases: [{name: String}],
});

coworkerSchema.methods.introduce = function() {
  console.log('My name is ' + this.name);
};

var Coworker = mongoose.model('Coworker', coworkerSchema);

var arthur = new Coworker({name: 'Francois', age:'25'});

/*arthur.save(function (err, arthur) {
  if (err) return console.error(err);
  console.log('Saved !');
  arthur.introduce();
});*/

db.on('error', console.error.bind(console));
db.once('open', function() {
  console.log('Connected !');
});

/* GET home page. */
router.get('/', function(req, res, next) {
    Coworker.find({}, function (err, coworkers) {
      if (err) return next(err);
      res.render('index', { title: 'Lenom Bis', coworkers: coworkers});
    });
});

module.exports = router;
