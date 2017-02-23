var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Lenom' });
});

router.get('/welcome', function(req, res, next) {
  console.log(req.user);
  res.render('welcome', { user: req.user});
});

module.exports = router;
