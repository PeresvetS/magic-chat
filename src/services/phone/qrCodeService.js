// src/services/qrCodeService.js

const qrcode = require('qrcode');
const config = require('../../config');
const logger = require('../../utils/logger');

class QRCodeService {
  async generateLoginQRCode(client, phoneNumber) {
    try {
      const { login_token } = await client('auth.exportLoginToken', {
        api_id: config.API_ID,
        api_hash: config.API_HASH,
        except_ids: [],
      });

      const qrCodeData = `tg://login?token=${login_token.toString('base64')}`;
      const qrCodeImage = await qrcode.toDataURL(qrCodeData);

      return {
        qrCodeImage: Buffer.from(qrCodeImage.split(',')[1], 'base64'),
        loginToken: login_token
      };
    } catch (error) {
      logger.error(`Error generating QR code for ${phoneNumber}:`, error);
      throw error;
    }
  }
}

module.exports = new QRCodeService();