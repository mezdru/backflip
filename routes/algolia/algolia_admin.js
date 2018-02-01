var express = require('express');
var router = express.Router();
var AlgoliaOrganisation = require('../../models/algolia/algolia_organisation.js');

router.get('/csv', function(req, res, next) {
  AlgoliaOrganisation.browse(res.locals.organisation._id, function(err, records) {
    if (err) return next(err);
    res.setHeader('Content-disposition', `attachment; filename=algolia_${res.locals.organisation.tag}.csv`);
    res.csv(AlgoliaOrganisation.exportHits4Csv(records.hits));
  });
});

router.get('/clear', function(req, res, next) {
  AlgoliaOrganisation.clear(res.locals.organisation._id, function(err, result) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Algolia Index has bean cleared',
        details: 'This function does not clear Records. Use admin/records/clear to clear Records.',
        content: result,
      }
    );
  });
});

module.exports = router;
