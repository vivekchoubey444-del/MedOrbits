'use strict';

const TABLE = "colleges";
const COLUMNS = ["id", "name", "slug", "city", "state", "country", "type", "website", "description", "status", "created_at", "updated_at"];
const SEARCHABLE = ["name", "slug", "city", "state"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
