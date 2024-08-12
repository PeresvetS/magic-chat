// src/db/postgres/config.js

const { Pool } = require('pg');
const config = require('../../config');

const isProduction = process.env.NODE_ENV === 'production';

let poolConfig;

if (isProduction) {
  // Конфигурация для Railway (production)
  poolConfig = {
    connectionString: config.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  // Конфигурация для локальной разработки
  poolConfig = {
    user: config.POSTGRES_USER || 'postgres',
    host: config.POSTGRES_HOST || 'localhost',
    database: config.POSTGRES_DATABASE || 'postgres',
    password: config.POSTGRES_PASSWORD || 'password',
    port: config.POSTGRES_PORT || 5432,
  };
}

const pool = new Pool(poolConfig);

// Проверка подключения
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to the database');
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool, // Экспортируем сам пул, если он понадобится
};
