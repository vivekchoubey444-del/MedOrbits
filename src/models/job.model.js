'use strict';

const TABLE = "jobs";
const COLUMNS = ["id", "employer_id", "title", "slug", "category", "location", "employment_type", "description", "salary_min", "salary_max", "status", "published_at", "created_at", "updated_at"];
const SEARCHABLE = ["title", "category", "location", "description"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
