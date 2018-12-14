var express = require('express');
var router = express.Router();
var auth = require('../middleware_auth');
var authorization = require('../middleware_authorization');
var EmailUser = require('../../models/email/email_user');
var User = require('../../models/user');

// for the moment, confirm the login email of the user
router.post('/confirmation', auth, (req, res, next) => {
    EmailUser.sendEmailConfirmation(req.user, res)
    .then((response)=>{
        return res.status(200).json({message: 'Email send with success.'});
    }).catch((err)=>{return next(err);});
});

// @todo Should not be inside API, this is not an API route.
// @todo Should handle the error for the User.
router.get('/confirmation/callback/:token/:hash', (req, res, next) => {
    EmailUser.login(req.params.hash, req.params.token, function(err, user){
        if(err) return next(err);
        if(user.email.validated) return res.redirect( 'https://' + process.env.HOST_FRONTFLIP + '/redirect');
        
        user.email.validated = true;
        User.updateOne({'_id': user._id}, {$set: {email : user.email}})
        .then((response) => {
            return res.redirect( 'https://' + process.env.HOST_FRONTFLIP + '/redirect');
        }).catch((err) => {
            console.log(err.message);
            return next(err);
        });
    });
});

router.post('/password', (req, res, next) => {
    if(!req.body.userEmail) return res.status(422).send({message: 'Missing parameter : userEmail'});
    User.findOne({'email.normalized': User.normalizeEmail(req.body.userEmail)})
    .then((user) => {
        if(!user) return res.status(404).send({message: 'User not found with this email : ' + req.body.userEmail});
        EmailUser.sendPasswordRecoveryEmail(user, res)
        .then((response) => {
            return res.status(200).json({message: 'Email send with success.'});
        }).catch((err)=>{return next(err);});
    }).catch((err)=>{return next(err);});
});

router.post('/invite', auth, authorization, (req, res, next) => {
    return res.status(200).json({message: 'TODO'});
});

router.use(function(err, req, res, next){
    if(err) return res.status(500).json({message: 'Internal error', errors: [err.message]});
    return res.status(500).json({message: 'Unexpected error'});
});

module.exports = router;