var express = require('express');
var router = express.Router();
var Organisation = require('../models/organisation');

 /**
  * @description If an Id is in the URL, try to find the orgId with it.
  */
router.all(['/:id/*', '/:id'], (req, res, next) => {
    req.organisationId = req.params.id;
    next();
});

/**
 * @description Last chance to find orgId as body parameter, and perform authorization
 */
router.use(function(req, res, next) {

    if(!req.organisationId) req.organisationId = req.body.orgId;
    if(!req.organisationId) return res.status(422).json({message: 'Missing parameter, could not retrieve organisation Id.'});

    Organisation.findOne({'_id': req.organisationId})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found'});
        if( !req.user || (!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(organisation._id)) ) 
            return res.status(403).json({message: 'You haven\'t access to this Organisation.'});

        req.organisation = organisation;
        return next();
    }).catch(err => {
        return res.status(500).json({message: 'Internal error', errors: [err]});
    });
});

module.exports = router;