"use strict";
let Hubspot = require('hubspot');
let hubspot = new Hubspot({ apiKey: process.env.HUBSPOT_HAPIKEY});
let slack = require('slack-notify')('https://hooks.slack.com/services/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');
let Organisation = require('../models/organisation');

const FILENAME = 'hubspot_helper.js';

class HubspotHelper {

    // @Description Update status_wingzy_com in Hubspot Contact.
    static createOrUpdateContactStatus(user, action){
        this.userEmail = HubspotHelper.getUserEmail(user);
        HubspotHelper.getContactByEmail(this.userEmail)
        .then((results) => {
            if(results === null || results.properties.status_wingzy_com.value !== 'signinAndAdmin'){
                hubspot.contacts.createOrUpdate(
                    this.userEmail,
                    {properties: [{property: "email", value: this.userEmail}, {property: "status_wingzy_com",value: action}]},
                    function(err, results) {
                        if (err) { 
                            HubspotHelper.printError(err, 22);
                        }
                });    
            }
        }).catch((err)=>{
            if (err) { 
                HubspotHelper.printError(err, 28);
            }
        });        
    }

    // @Description Update Wingzy Org List for which the user is linked.
    static updateContactWingzyList(user, organisationId, admin){
        this.userEmail = HubspotHelper.getUserEmail(user);
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
                                HubspotHelper.printError(err, 48);
                            }
                    });    
                }
            });
        }).catch((err)=>{
            if (err) { 
                HubspotHelper.printError(err, 54);
            }
        });
    }

    // @Description Get Hubspot Contact data, fetch by email.
    static getContactByEmail(email){
        return new Promise((resolve, reject) => {
            hubspot.contacts.getByEmail(email, function( err, results){
                if(err) resolve(null);
                resolve(results);
            });
        });
    }

    static getUserEmail(user){
        return user.google.email || user.email.value;
    }

    //@todo correct this method, not working, return false when it's true.
    static isDuplicate(fieldValue, newValue){
        let arrayValue = fieldValue.split('\r\n');
        arrayValue.forEach(value => {
            if(value.trim() == newValue.trim()) return true;
        });
        return false;
    }

    static printError(err, line){
        console.error(FILENAME + ' - line:'+ line +' - '+ err);
        slack.send({channel : "#errors-quentin", text : FILENAME + 'line:'+line+ ' - ' + err});
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