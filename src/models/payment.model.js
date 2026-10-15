'use strict';

const TABLE = "payments";
const COLUMNS = ["id", "user_id", "subscription_id", "provider", "provider_reference", "amount_minor", "currency", "status", "verified_at", "created_at", "updated_at"];
const SEARCHABLE = ["provider_reference", "status"];
const DEFAULT_ORDER = "id";

module.exports = { TABLE, COLUMNS, SEARCHABLE, DEFAULT_ORDER };
