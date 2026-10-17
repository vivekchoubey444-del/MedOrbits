'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

describe('environment', () => {
  it('runs on Node 20+', () => {
    assert.ok(Number(process.versions.node.split('.')[0]) >= 20);
  });
});
