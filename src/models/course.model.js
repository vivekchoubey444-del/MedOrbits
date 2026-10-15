'use strict';

const TABLE = "courses";
const COLUMNS = ["id", "title", "slug", "category", "level", "description", "fees", "duration", "status", "created_at", "updated_at"];
const SEARCHABLE = ["title", "slug", "category", "description"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
