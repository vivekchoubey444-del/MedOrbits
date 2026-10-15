'use strict';

const TABLE = "employers";
const COLUMNS = ["id", "user_id", "company_name", "website", "industry", "company_size", "description", "verification_status", "status", "created_at", "updated_at"];
const SEARCHABLE = ["company_name", "industry", "description"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
