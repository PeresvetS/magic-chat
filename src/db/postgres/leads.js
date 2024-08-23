// src/db/postgres/leads.js

const { pool } = require('../../../db');
const logger = require('../../../utils/logger');

async function saveLead({ bitrix_id, name, phone, source, status }) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO leads (bitrix_id, name, phone, source, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (bitrix_id) DO UPDATE
      SET name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          source = EXCLUDED.source
      RETURNING *
    `;
    const values = [bitrix_id, name, phone, source];
    const result = await client.query(query, values);
    logger.info(`Lead saved/updated: ${bitrix_id}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error saving lead to database', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getLead(bitrix_id) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM leads WHERE bitrix_id = $1';
    const result = await client.query(query, [bitrix_id]);
    return result.rows[0];
  } catch (error) {
    logger.error('Error getting lead from database', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  saveLead,
  getLead
};