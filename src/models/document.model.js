'use strict';

const TABLE = "documents";
const COLUMNS = ["id", "user_id", "application_id", "original_name", "storage_key", "mime_type", "size_bytes", "status", "created_at", "updated_at"];
const SEARCHABLE = ["original_name", "status"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
