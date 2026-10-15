'use strict';

const TABLE = "universities";
const COLUMNS = ["id", "name", "slug", "city", "state", "country", "website", "description", "status", "created_at", "updated_at"];
const SEARCHABLE = ["name", "slug", "city", "state"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
