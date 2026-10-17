"use strict";

const {
  CATEGORIES,
  createUniversityRecord,
  normalizeWebsite,
  slugify,
} = require("../../scripts/import-ugc-universities");

describe("UGC university importer", () => {
  test("creates stable, source-backed records without private feed fields", () => {
    const category = CATEGORIES.find((item) => item.label === "Private");
    const record = createUniversityRecord({
      ID: "42",
      uni_name: "Example University",
      uni_type: "Private",
      state: "Maharashtra",
      address: "Pune",
      Zip: "411001",
      status: "2(f)",
      url: "www.example.edu",
      user_password: "must-not-be-copied",
    }, category, new Map([["maharashtra", "state-in-mh"]]), "2026-10-17", "2026-10-17T00:00:00.000Z");

    expect(record.id).toBe("inst-in-ugc-42");
    expect(record.slug).toBe("example-university-42");
    expect(record.stateId).toBe("state-in-mh");
    expect(record.website).toBe("https://www.example.edu/");
    expect(record.verificationStatus).toBe("pending-review");
    expect(record.verifiedAt).toBeNull();
    expect(record.sourceUrls[0].sourceType).toBe("government-directory");
    expect(record).not.toHaveProperty("user_password");
  });

  test("rejects ambiguous or malformed website values", () => {
    expect(normalizeWebsite("Null")).toBeNull();
    expect(normalizeWebsite("first.example.edu, second.example.edu")).toBeNull();
    expect(normalizeWebsite("javascript:alert(1)")).toBeNull();
    expect(normalizeWebsite("https://www.example.edu")).toBe("https://www.example.edu/");
  });

  test("creates URL-safe slugs", () => {
    expect(slugify("Banaras Hindu University")).toBe("banaras-hindu-university");
  });
});