// src/api/middleware/checkApiTokens.js

const logger = require('../../utils/logger');
const config = require('../../config');
const { safeStringify, parsePHPSerialized, safeJSONParse } = require('../../utils/helpers');

// Middleware для проверки токена Bitrix24
const checkBitrix24Token = (req, res, next) => {
    let auth;
    if (typeof req.body.auth === 'string') {
      auth = safeJSONParse(req.body.auth) || parsePHPSerialized(req.body.auth);
    } else if (typeof req.body.auth === 'object') {
      auth = req.body.auth;
    }
  
    if (!auth || auth.application_token !== config.BITRIX24_OUTBOUND_WEBHOOK_TOKEN) {
      logger.warn('Invalid Bitrix24 application token', { 
        receivedToken: auth ? auth.application_token : 'undefined',
        body: safeStringify(req.body)
      });
      return res.status(401).json({ error: 'Invalid Bitrix24 application token' });
    }
    
    next();
  };


module.exports = { checkBitrix24Token };