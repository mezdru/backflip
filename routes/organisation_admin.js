/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 03-05-2017 03:51
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();
var UrlHelper = require('../helpers/url_helper.js');

// Here we provide the action url to the view.
// Needs some logic because of subdomain handling in development
// @todo find a way to not do this check at each call
router.use('/tree', function(req, res, next) {
  res.locals.formAction = new UrlHelper(req.organisationTag, 'admin/organisation/tree', null, req.getLocale()).getUrl();
  return next();
});

router.get('/tree', function(req, res, next) {
  res.render('tree');
});

router.post('/tree', function(req, res, next) {
  errors = [];
  successes = [];
  try {
    res.locals.organisation.tree = JSON.parse(req.body.tree);
  } catch (e) {
     if (e instanceof SyntaxError) {
       errors.push(e);
     }
  }
  if (errors.length > 0) {
    res.render('tree', {textfield: req.body.tree, errors: errors});
  } else {
    res.locals.organisation.save(function(err, organisation) {
      if(err) return next(err);
      successes.push({message: "Your tree has been saved."});
      res.render('tree', {successes: successes});
    });
  }
});

module.exports = router;
