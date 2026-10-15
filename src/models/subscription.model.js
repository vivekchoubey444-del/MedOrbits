'use strict';

const TABLE = "subscriptions";
const COLUMNS = ["id", "user_id", "plan_code", "status", "starts_at", "ends_at", "provider_reference", "created_at", "updated_at"];
const SEARCHABLE = ["plan_code", "status"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
