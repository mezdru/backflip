var express = require('express');
var router = express.Router();
var Organisation = require('../models/organisation');
var Record = require('../models/record');

router.all('/workplace/:id', (req, res, next) => {
    req.bypassFindById = true;
    return next();
});

 /**
  * @description If an Id is in the URL, try to find the orgId with it.
  */
router.all(['/:id', '/:id/*'], (req, res, next) => {
    if(req.bypassFindById) return next();
    Record.findOne({'_id': req.params.id})
    .populate('organisation', '_id name tag logo picture cover google email public premium created canInvite')
    .then(record => {
        if(!record) return next();
        if( !req.user || (!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(record.organisation._id)) ) 
            return res.status(403).json({message: 'You haven\'t access to this Organisation.'});
            req.organisation = record.organisation;
            return next();
    }).catch(err => { return res.status(500).json({message: 'Internal error', errors: [err]});});
});

/**
 * @description No id in the URL, we have to use orgId post parameter.
 */
router.use('', (req, res, next) => {
    if(req.organisation) return next();
    if(!req.body.orgId) return res.status(422).json({message: 'Missing parameter, could not retrieve organisation Id.'});

    Organisation.findOne({'_id': req.body.orgId})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found'});
        if( !req.user || (!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(organisation._id)) ) 
            return res.status(403).json({message: 'You haven\'t access to this Organisation.'});
        req.organisation = organisation;
        return next();
    }).catch(err => { return res.status(500).json({message: 'Internal error', errors: [err]});});
});

module.exports = router;