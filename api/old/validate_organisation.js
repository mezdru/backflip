var express = require('express');
var router = express.Router();
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

router.use((req, res, next) => {
    if(!req.body.organisation) return res.status(422).json({message: 'Missing body parameter : organisation'});
    next();
});

router.use(
    sanitizeBody('organisation.name').trim().escape().stripLow(true),
    sanitizeBody('organisation.tag').trim().escape().stripLow(true),
    body('organisation.tag').matches(/^[a-zA-Z0-9\-]{2,}$/).withMessage((value, {req}) => {
      return req.__('Please provide a valid tag.');
    }),
    body('organisation.name').isLength({ min: 3 }).withMessage((value, {req}) => {
      return req.__('Please provide a valid name.');
    }),
    body('organisation.logo.url').isURL().optional({checkFalsy:true}).withMessage((value, {req}) => {
      return req.__('Please provide a valid {{field}} URL.', {field: 'Logo'});
    })
);

router.use(function(req, res, next) {
    let errors = validationResult(req);
    let errorsArray = errors.array();
    if(errorsArray.length === 0) return next();

    return res.status(422).json({message: 'Organisation not valid', errors: errorsArray});
});

module.exports = router;