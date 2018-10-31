var express = require('express');
var router = express.Router();
let SearchLog = require('../models/search_log');

/**
 * @description Create a new search log
 * @param {query} - Query of the user (optionnal)
 * @param {tags} - String of a list of tags searched by the user (optionnal)
 */
router.post('/', function(req, res, next){
    let searchedTags = (req.body.tags && req.body.tags.length >0) ?  req.body.tags.split(',') : undefined;
    try{
        let newSearchLog = new SearchLog();
        newSearchLog.organisation = res.locals.organisation._id;
        newSearchLog.user = res.locals.user._id;
        newSearchLog.tags = searchedTags;
        newSearchLog.query = (req.body.query && req.body.query.length > 0) ? req.body.query : undefined;
        
        newSearchLog.save().then(searchSaved=>{
            return res.status(200).json(searchSaved);
        }).catch(error=>{
            console.log(error);
            return res.status(500).json(error);
        });
    }catch(error){
        console.log(error);
        return res.status(500).json(error);
    }
});

module.exports = router;