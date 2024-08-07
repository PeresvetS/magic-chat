// src/db/index.js

const phoneNumbers = require('./phoneNumbers');
const campaigns = require('./campaigns');
const parsedUsers = require('./parsedUsers');
const admins = require('./admins');

module.exports = {
  ...phoneNumbers,
  ...campaigns,
  ...parsedUsers,
  ...admins
};