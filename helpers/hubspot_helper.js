"use strict";
let Hubspot = require('hubspot');
let hubspot = new Hubspot({ apiKey: process.env.HUBSPOT_HAPIKEY});
let slack = require('slack-notify')('https://hooks.slack.com/services/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');
let Organisation = require('../models/organisation');
let SlackHelper = require('./slack_helper');

const FILENAME = 'hubspot_helper.js';

class HubspotHelper {

    // @Description Update status_wingzy_com in Hubspot Contact.
    static createOrUpdateContactStatus(user, action){
        if(process.env.NODE_ENV !== "production") return;
        this.userEmail = user.loginEmail;
        HubspotHelper.getContactByEmail(this.userEmail)
        .then((results) => {
            if(results === null || results.properties.status_wingzy_com && (results.properties.status_wingzy_com.value !== 'signinAndAdmin')){
                hubspot.contacts.createOrUpdate(
                    this.userEmail,
                    {properties: [{property: "email", value: this.userEmail}, {property: "status_wingzy_com",value: action}]},
                    function(err, results) {
                        if (err) { SlackHelper.notifyError(err, 23, 'quentin', FILENAME);}
                });    
            }
        }).catch((err)=>{
            SlackHelper.notifyError(err, 28, 'quentin', FILENAME);
        });        
    }

    // @Description Update Wingzy Org List for which the user is linked.
    static updateContactWingzyList(user, organisationId, admin){
        if(process.env.NODE_ENV !== "production") return;
        this.userEmail = user.loginEmail;
        this.orgListParam = admin?'admin_wingzy_com':'org_wingzy_com';
        Organisation.findById(organisationId).exec()
        .then((currentOrg) => {
            HubspotHelper.getContactByEmail(this.userEmail)
            .then((results) => {
                this.prefixListOrg = (results!==null && typeof(results.properties[this.orgListParam])!=='undefined') ?results.properties[this.orgListParam].value+'\r\n':'';
                if(!HubspotHelper.isDuplicate(this.prefixListOrg, currentOrg.tag+'.'+process.env.HOST)){
                    hubspot.contacts.createOrUpdate(
                        this.userEmail,
                        {properties: [{property: "email", value: this.userEmail}, 
                                      {property: this.orgListParam,value: this.prefixListOrg+currentOrg.tag+'.'+process.env.HOST },
                                      {property: 'lastname', value: HubspotHelper.getUserRecordName(user)}]},
                        function(err, results) {
                            if (err) { 
                                SlackHelper.notifyError(err, 51, 'quentin', FILENAME);
                            }
                    });    
                }
            }).catch(error=>{});
        }).catch((err)=>{
            SlackHelper.notifyError(err, 58, 'quentin', FILENAME);
        });
    }

    // @Description Get Hubspot Contact data, fetch by email.
    static getContactByEmail(email){
        if(process.env.NODE_ENV !== "production") return;
        return new Promise((resolve, reject) => {
            hubspot.contacts.getByEmail(email, function( err, results){
                if(err) resolve(null);
                resolve(results);
            });
        });
    }

    //@todo correct this method, not working, return false when it's true.
    static isDuplicate(fieldValue, newValue){
        let arrayValue = fieldValue.split('\r\n');
        arrayValue.forEach(value => {
            if(value.trim() == newValue.trim()) return true;
        });
        return false;
    }
    static getUserRecordName(user){
         for(let orgAndRecord of user.orgsAndRecords){
             if(orgAndRecord.record !== null){
                 return ((user.getOrgAndRecordByRecord(orgAndRecord.record)).record.name);
             }
         }
         return null;
    }
}

module.exports = HubspotHelper;