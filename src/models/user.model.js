'use strict';

const TABLE = "users";
const COLUMNS = ["id", "name", "email", "password_hash", "phone", "status", "email_verified_at", "created_at", "updated_at"];
const SEARCHABLE = ["name", "email", "phone"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
