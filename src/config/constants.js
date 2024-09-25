// src/config/constants.js

// Время в разных единицах
const HOURS_IN_A_DAY = 24;
const MINUTES_IN_AN_HOUR = 60;
const SECONDS_IN_A_MINUTE = 60;
const MILLISECONDS_IN_A_SECOND = 1000;

const RETRY_OPTIONS = {
  MAX_WAITING_TIME: 1000,
  MAX_RETRIES: 3,
  DELAY: 2000, // ms
  TIMEOUT: 30000,
  SHOULD_RETRY: (error) => error.message !== 'FATAL_ERROR',
};

module.exports = {
  HOURS_IN_A_DAY,
  MINUTES_IN_AN_HOUR,
  SECONDS_IN_A_MINUTE,
  MILLISECONDS_IN_A_SECOND,

  RETRY_OPTIONS,
};
