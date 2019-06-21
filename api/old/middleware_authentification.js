var express = require('express');
var router = express.Router();
var request = require('request');
var User = require('../models/user');


router.use(function(req, res, next) {
    request.get({
        url: (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') + process.env.HOST_AUTH + '/isAuth',
        json: true,
        headers: {
            'Authorization': req.get('Authorization'),
            'user-agent': req.headers['user-agent']
        }
    }, (error, requestResponse, body) => {
        if(error) {
            console.log('[Auth middleware] - 403 response - '+error);
            return res.status(403).json({message: 'Invalid token'});
        } 
        if(body && body.status && body.status !== 200) {
            console.log('[Auth middleware] - 403 response - '+body);
            return res.status(body.status).json({message: 'Invalid token'});
        } 
        if(requestResponse.statusCode !== 200) return res.status(requestResponse.statusCode).json({message: requestResponse.statusMessage});
        
        req.user = new User(body);
        return next();
    });
});

module.exports = router;