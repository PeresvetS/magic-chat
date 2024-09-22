// src/services/telegram/services/telegramMailingService.js

const logger = require('../../../utils/logger');
const leadService = require('../../leads');
const { Api } = require('telegram/tl');

async function findUserByPhoneNumber(phoneNumber, client) {
    logger.info(`Searching for user with phone number: ${phoneNumber}`);
    try {
      let user;
  
      // First, try using contacts.ResolvePhone
      try {
        logger.info(`Resolving phone number: ${phoneNumber}`);
        const result = await client.invoke(new Api.contacts.ResolvePhone({
          phone: phoneNumber
        }));
        logger.info(`Phone resolved: ${JSON.stringify(result)}`);
  
        if (result.users && result.users.length > 0) {
          user = result.users[0];
        }
      } catch (error) {
        logger.warn(`Failed to resolve phone using contacts.ResolvePhone: ${error.message}`);
      }
  
      // If that fails, import the contact
      if (!user) {
        logger.info('Falling back to importContacts method');
        const importResult = await client.invoke(
          new Api.contacts.ImportContacts({
            contacts: [
              new Api.InputPhoneContact({
                clientId: BigInt(Math.floor(Math.random() * 1000000000)),
                phone: phoneNumber,
                firstName: "Search",
                lastName: "User",
              }),
            ],
          })
        );
  
        if (importResult.users && importResult.users.length > 0) {
          user = importResult.users[0];
        } else {
          await leadService.setLeadUnavailable(phoneNumber);
          throw new Error(`Cannot find user with phone number ${phoneNumber} in Telegram`);
        }
      }
        return user;
      } catch (error) {
        logger.error(`Error searching for user with phone number ${phoneNumber}:`, error);
        throw error;
      }
    }
  
    async function sendTelegramMessage(recipientPhoneNumber, senderPhoneNumber, campaignId, message, client) {
      try {
  
        logger.info(`Attempting to send message to ${recipientPhoneNumber} using client for ${senderPhoneNumber}`);
  
        // Update entity cache
        logger.info('Updating entity cache...');
        await client.getDialogs({ limit: 1 });
        logger.info('Entity cache updated');
  
        const user = await findUserByPhoneNumber(recipientPhoneNumber, client);
        if (!user) {
          throw new Error(`User not found for phone number: ${recipientPhoneNumber}`);
        }
  
        // Send message directly to the user object
        const sendResult = await client.sendMessage(user, { message });
  
        logger.info(`Message sent successfully. Result: ${JSON.stringify(sendResult, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )}`);
  
        return { success: true, messageId: sendResult.id, status: 'completed' };
      } catch (error) {
        logger.error(
          `Error sending Telegram message for campaign ${campaignId} to ${recipientPhoneNumber}:`,
          error,
        );
        return { success: false, error: error.message, status: 'failed' };
      }
    }

    module.exports = {
      findUserByPhoneNumber,
      sendTelegramMessage
    };