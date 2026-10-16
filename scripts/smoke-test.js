'use strict';

describe('environment', () => {
  it('runs on Node 20+', () => {
    expect(Number(process.versions.node.split('.')[0])).toBeGreaterThanOrEqual(
      20,
    );
  });
});
