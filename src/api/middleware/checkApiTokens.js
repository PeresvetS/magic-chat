// src/api/middleware/checkApiTokens.js

const logger = require('../../utils/logger');
const { crmRepo } = require('../../db/');
const { safeStringify, parsePHPSerialized, safeJSONParse } = require('../../utils/helpers');

// Middleware для проверки токена Bitrix24
const checkBitrixToken = async (req, res, next) => {
    const { webhookId } = req.params;
    const user = await crmRepo.getUserByBitrixWebhookId(webhookId);

    if (!user || !user.bitrixIntegration) {
      logger.warn('Invalid Bitrix webhook ID', { webhookId });
      return res.status(401).json({ error: 'Invalid Bitrix webhook ID' });
    }

    let auth;
    if (typeof req.body.auth === 'string') {
      auth = safeJSONParse(req.body.auth) || parsePHPSerialized(req.body.auth);
    } else if (typeof req.body.auth === 'object') {
      auth = req.body.auth;
    }
  
    if (!auth || auth.application_token !== user.bitrixIntegration.bitrixOutboundToken) {
      logger.warn('Invalid Bitrix24 application token', { 
        receivedToken: auth ? auth.application_token : 'undefined',
        body: safeStringify(req.body)
      });
      return res.status(401).json({ error: 'Invalid Bitrix24 application token' });
    }
    
    req.user = user;
    next();
};

// Middleware для проверки токена AmoCRM
const checkAmoCrmToken = async (req, res, next) => {
    const { webhookId } = req.params;
    const user = await crmRepo.getUserByAmoCrmWebhookId(webhookId);

    if (!user || !user.amoCrmIntegration) {
      logger.warn('Invalid AmoCRM webhook ID', { webhookId });
      return res.status(401).json({ error: 'Invalid AmoCRM webhook ID' });
    }

    const amoCrmToken = req.headers['x-auth-token']; // Предполагаемый заголовок для токена AmoCRM

    if (!amoCrmToken || amoCrmToken !== user.amoCrmIntegration.amoCrmOutboundToken) {
      logger.warn('Invalid AmoCRM token', { 
        receivedToken: amoCrmToken || 'undefined',
        body: safeStringify(req.body)
      });
      return res.status(401).json({ error: 'Invalid AmoCRM token' });
    }
    
    req.user = user;
    next();
};

module.exports = { checkBitrixToken, checkAmoCrmToken };