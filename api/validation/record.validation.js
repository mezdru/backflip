var express = require("express");
var router = express.Router();
const { body, validationResult } = require("express-validator/check");
const { sanitizeBody } = require("express-validator/filter");
var ProperCase = require("proper-case");

router.use(
  sanitizeBody("record.name")
    .trim()
    .stripLow(true),
  sanitizeBody("record.intro")
    .trim()
    .escape()
    .stripLow(true),
  body("record.name")
    .isLength({ min: 0, max: 64 })
    .withMessage((value, { req }) => {
      return req.__("Please write a name (no larger than 64 characters).");
    }),
  body("record.intro")
    .isLength({ max: 256 })
    .withMessage((value, { req }) => {
      return req.__("Please write an intro no larger than 256 characters.");
    }),
  body("record.picture.url")
    .optional({ checkFalsy: true })
    .isURL({ protocols: ["https"] })
    .withMessage((value, { req }) => {
      return req.__("Please provide a profile picture");
    })
);

router.use(function(req, res, next) {
  let errors = validationResult(req);
  let errorsArray = errors.array();

  if (!(errorsArray.length === 0 && req.body.record))
    return res
      .status(422)
      .json({ message: "Record not valid", errors: errorsArray });

  return next();
});

router.use((req, res, next) => {
  if (req.body.record.name) {
    try {
      req.body.record.name = ProperCase(req.body.record.name);
    } catch (e) {}
  }

  return next();
});

module.exports = router;
