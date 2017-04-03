/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 04-04-2017 12:15
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
  if (res.locals.organisation) {
    res.render('organisation_homepage');
  } else {
    res.render('homepage');
  }
});

module.exports = router;
