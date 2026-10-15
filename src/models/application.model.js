'use strict';

const TABLE = "applications";
const COLUMNS = ["id", "user_id", "course_id", "college_id", "application_number", "status", "form_data_json", "submitted_at", "created_at", "updated_at"];
const SEARCHABLE = ["application_number", "status"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
