const qrcode = require('qrcode');

async function sendQRCode(bot, chatId, qrCode) {
  try {
    // Генерируем изображение QR-кода
    const qrImageBuffer = await qrcode.toBuffer(qrCode);
    
    // Отправляем изображение как файл
    await bot.sendPhoto(chatId, qrImageBuffer, {
      filename: 'qr_code.png',
      contentType: 'image/png',
      caption: 'Отсканируйте этот QR-код в приложении WhatsApp для авторизации основного номера.'
    });
  } catch (error) {
    logger.error('Error sending QR code:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка при отправке QR-кода. Пожалуйста, попробуйте еще раз.');
  }
}

module.exports = {
  sendQRCode
};