// src/services/phone/src/PhoneNumberManagerFactory.js

const PhoneNumberManagerService = require('./PhoneNumberManagerService');
const {
  phoneNumberRepo,
  phoneNumberCampaignRepo,
  campaignsMailingRepo,
  phoneNumberRotationRepo,
} = require('../../../db');
const WABAAccountService = require('../../waba/services/WABAAccountService');

class PhoneNumberManagerFactory {
  static create() {
    return new PhoneNumberManagerService(
      phoneNumberRepo,
      phoneNumberCampaignRepo,
      campaignsMailingRepo,
      phoneNumberRotationRepo,
      WABAAccountService
    );
  }
}

module.exports = PhoneNumberManagerFactory;
