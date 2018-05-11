var express = require('express');
var router = express.Router();
var UrlHelper = require('../helpers/url_helper.js');

router.get('/makePublic', function(req, res, next) {
  res.locals.organisation.makePublic(function(err, organisation) {
    res.render('index', {
      title: 'Organisation made Public',
      content: organisation
    });
  });
});

module.exports = router;
