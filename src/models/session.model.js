'use strict';

const TABLE = "sessions";
const COLUMNS = ["id", "user_id", "token_hash", "expires_at", "revoked_at", "ip_address", "user_agent", "created_at", "updated_at"];
const SEARCHABLE = ["user_id", "token_hash"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
