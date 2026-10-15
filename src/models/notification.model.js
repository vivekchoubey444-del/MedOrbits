'use strict';

const TABLE = "notifications";
const COLUMNS = ["id", "user_id", "type", "title", "message", "read_at", "metadata_json", "created_at", "updated_at"];
const SEARCHABLE = ["title", "message", "type"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
