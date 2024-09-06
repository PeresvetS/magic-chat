// src/api/middleware/checkApiTokens.js

const { crmRepo } = require('../../db/');
const querystring = require('querystring');
const logger = require('../../utils/logger');
const { safeStringify } = require('../../utils/helpers');

const checkBitrixToken = async (req, res, next) => {
    let rawBody = req.body;
    if (Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString('utf8');
    }

    logger.info('Incoming Bitrix24 webhook request', {
        headers: req.headers,
        rawBody: rawBody
    });

    let parsedBody = querystring.parse(rawBody);

    logger.info('Parsed request body', { parsedBody: safeStringify(parsedBody) });

    // Извлекаем все поля auth из parsedBody
    const authFields = Object.keys(parsedBody)
        .filter(key => key.startsWith('auth['))
        .reduce((acc, key) => {
            const cleanKey = key.replace('auth[', '').replace(']', '');
            acc[cleanKey] = parsedBody[key];
            return acc;
        }, {});

    logger.info('Extracted authentication data', { auth: safeStringify(authFields) });

    if (!authFields.application_token) {
        logger.warn('Invalid Bitrix24 application token', { 
            receivedAuth: safeStringify(authFields)
        });
        return res.status(401).json({ error: 'Invalid Bitrix24 application token' });
    }

    const bitrixOutboundToken = authFields.application_token;
    logger.info('Attempting to find user with Bitrix token', { token: bitrixOutboundToken });

    const user = await crmRepo.getUserByBitrixToken(bitrixOutboundToken);

    if (!user || !user.bitrixIntegration) {
        logger.warn('No Bitrix user found', { token: bitrixOutboundToken });
        return res.status(401).json({ error: 'No Bitrix user found' });
    }
    
    logger.info('Bitrix user found', { userId: user.id });
    req.user = user;
    req.parsedBody = parsedBody;  // Передаем parsedBody в req
    next();
};

module.exports = { checkBitrixToken };