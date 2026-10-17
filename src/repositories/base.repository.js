'use strict';

const { query } = require('../db');
const { getPagination } = require('../utils/http');

/*
 * Table and column names must be hard-coded in model definitions.
 * Never pass client-controlled identifiers into this repository.
 */
function createRepository({ table, columns, searchable = [], defaultOrder = 'id' }) {
  if (!/^[a-z_]+$/.test(table)) throw new Error(`Unsafe table name: ${table}`);
  for (const column of [...columns, ...searchable, defaultOrder]) {
    if (!/^[a-z_]+$/.test(column)) throw new Error(`Unsafe column name: ${column}`);
  }

  const allowed = new Set(columns);

  async function findById(id) {
    const rows = await query(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }

  async function list(params = {}) {
    const { page, limit, offset } = getPagination(params);
    const where = [];
    const values = [];

    if (params.q && searchable.length) {
      const term = `%${String(params.q).slice(0, 100)}%`;
      where.push(`(${searchable.map((column) => `\`${column}\` LIKE ?`).join(' OR ')})`);
      searchable.forEach(() => values.push(term));
    }

    if (params.status && allowed.has('status')) {
      where.push('`status` = ?');
      values.push(String(params.status).slice(0, 50));
    }

    if (params.user_id && allowed.has('user_id')) {
      where.push('`user_id` = ?');
      values.push(params.user_id);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRows = await query(`SELECT COUNT(*) AS total FROM \`${table}\` ${whereSql}`, values);
    const order = allowed.has(params.sort) ? params.sort : defaultOrder;
    const direction = String(params.order || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const rows = await query(
      `SELECT * FROM \`${table}\` ${whereSql} ORDER BY \`${order}\` ${direction} LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return {
      items: rows,
      pagination: { page, limit, total: Number(countRows[0].total), totalPages: Math.ceil(Number(countRows[0].total) / limit) },
    };
  }

  async function create(data) {
    const entries = Object.entries(data).filter(([key, value]) => allowed.has(key) && value !== undefined);
    if (!entries.length) throw Object.assign(new Error('No valid fields supplied.'), { status: 400, code: 'EMPTY_INPUT', publicMessage: 'No valid fields supplied.' });
    const columnsSql = entries.map(([key]) => `\`${key}\``).join(', ');
    const placeholders = entries.map(() => '?').join(', ');
    const result = await query(
      `INSERT INTO \`${table}\` (${columnsSql}) VALUES (${placeholders})`,
      entries.map(([, value]) => value)
    );
    return findById(result.insertId);
  }

  async function update(id, data) {
    const entries = Object.entries(data).filter(([key, value]) => allowed.has(key) && key !== 'id' && value !== undefined);
    if (!entries.length) throw Object.assign(new Error('No valid fields supplied.'), { status: 400, code: 'EMPTY_INPUT', publicMessage: 'No valid fields supplied.' });
    const assignments = entries.map(([key]) => `\`${key}\` = ?`).join(', ');
    const result = await query(
      `UPDATE \`${table}\` SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...entries.map(([, value]) => value), id]
    );
    if (!result.affectedRows) return null;
    return findById(id);
  }

  async function remove(id) {
    const result = await query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }

  return { table, columns: [...allowed], findById, list, create, update, remove };
}

module.exports = { createRepository };
