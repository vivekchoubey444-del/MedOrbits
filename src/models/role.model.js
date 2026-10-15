'use strict';

const TABLE = "roles";
const COLUMNS = ["id", "name", "slug", "permissions_json", "created_at", "updated_at"];
const SEARCHABLE = ["name", "slug"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
