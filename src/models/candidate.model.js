'use strict';

const TABLE = "candidates";
const COLUMNS = ["id", "user_id", "headline", "skills_json", "resume_document_id", "experience_years", "location", "status", "created_at", "updated_at"];
const SEARCHABLE = ["headline", "location", "status"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
