var express = require('express');
var router = express.Router();
var printObject = require('print-object')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Lenom' });
});

router.get('/welcome', function(req, res, next) {
  if (!req.user) res.redirect('/')
  console.log(req.user);
  res.render('welcome', { user: req.user, html: printObject(req.user, {html:true}) });
});

module.exports = router;
