'use strict';

const TABLE = "admissions";
const COLUMNS = ["id", "user_id", "course_id", "college_id", "status", "intake_year", "notes", "created_at", "updated_at"];
const SEARCHABLE = ["status", "notes"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
