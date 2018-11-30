var express = require('express');
var router = express.Router();
var Organisation = require('../models/organisation');

router.use(function(req, res, next) {
    if(!req.body.orgId) return res.status(422).json({message: 'Missing parameter'});
    Organisation.findOne({'_id': req.body.orgId})
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