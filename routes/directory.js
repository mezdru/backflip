/**
* @Author: Clément Dietschy <bedhed>
* @Date:   16-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 16-03-2017
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('directory', { title: 'Hello World', message: JSON.stringify(res.locals)});
});

module.exports = router;
