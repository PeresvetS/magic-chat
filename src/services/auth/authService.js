// src/services/auth/authService.js

const { client } = require('../../main');
const readline = require('readline');
const { getPhoneNumber } = require('../../db');
const logger = require('../../utils/logger');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function authenticate() {
  try {
    const phoneNumber = await getPhoneNumber();
    if (!phoneNumber) {
      throw new Error('Номер телефона не установлен. Используйте команду /setnumber в админ-боте.');
    }

    const { phone_code_hash } = await client('auth.sendCode', {
      phone_number: phoneNumber,
      settings: {
        _: 'codeSettings',
      },
    });

    const code = await question('Введите код подтверждения, полученный в Telegram: ');

    try {
      const signInResult = await client('auth.signIn', {
        phone_number: phoneNumber,
        phone_code_hash,
        phone_code: code
      });
      logger.info('Аутентификация успешна!');
      return signInResult;
    } catch (error) {
      if (error.error_message === 'SESSION_PASSWORD_NEEDED') {
        logger.info('Требуется двухфакторная аутентификация.');
        const password = await question('Введите ваш пароль 2FA: ');
        const { srp_id, current_algo, srp_B } = await client('account.getPassword');
        const { g, p, salt1, salt2 } = current_algo;
        const { A, M1 } = await client.crypto.getSRPParams({
          g, p, salt1, salt2, gB: srp_B, password,
        });
        const checkPasswordResult = await client('auth.checkPassword', {
          password: {
            _: 'inputCheckPasswordSRP',
            srp_id,
            A,
            M1,
          },
        });
        logger.info('Двухфакторная аутентификация успешна!');
        return checkPasswordResult;
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Ошибка аутентификации:', error);
    throw error;
  } finally {
    rl.close();
  }
}

module.exports = { authenticate };