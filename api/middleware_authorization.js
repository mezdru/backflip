var express = require('express');
var router = express.Router();
var Organisation = require('../models/organisation');
var Record = require('../models/record');

/**
 * @description The easy way to get authorization is to provide orgId in the body of the request.
 *              The other way (for get and delete methods) is that we find orgId thanks to recordId.
 */
router.use(function(req, res, next) {
    let recordId = req.originalUrl.split('/api/profiles/')[1].split('/')[0].trim();
    if(!req.body.orgId && !recordId) return res.status(422).json({message: 'Missing parameter'});
    if(req.body.orgId){
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
    }else if(recordId){
        Record.findOne({'_id': recordId})
        .then(record => {
            if(!record) return res.status(404).json({message: 'Record not found'});
            if( !req.user || (!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(record.organisation)) ) 
                return res.status(403).json({message: 'You haven\'t access to this Organisation.'});
                Organisation.findOne({'_id': record.organisation})
                .then(organisation => {
                    if(!organisation) return res.status(404).json({message: 'Organisation not found'});
                    req.organisation = organisation;
                    return next();
                }).catch(err => {
                    return res.status(500).json({message: 'Internal error', errors: [err]});
                });
        }).catch(err => {
            return res.status(500).json({message: 'Internal error', errors: [err]});
        });
    }
    
});

module.exports = router;