'use strict';

const { listPublicReleases } = require('../../src/services/public-releases.service');

const source = { name: 'Official source', url: 'https://example.gov.in/notice' };

describe('public release publication policy', () => {
  test('returns only approved, active, sourced, unexpired notices and bulletins', () => {
    const result = listPublicReleases({
      news: [
        {
          id: 'notice-current',
          newsType: 'official_notice',
          publicationStatus: 'published',
          verificationStatus: 'verified',
          active: true,
          publishedAt: '2026-10-17T10:00:00Z',
          officialNoticeUrl: source.url,
        },
        {
          id: 'notice-draft',
          newsType: 'official_notice',
          publicationStatus: 'draft',
          verificationStatus: 'pending_review',
          active: false,
          source,
        },
        {
          id: 'notice-expired',
          newsType: 'announcement',
          publicationStatus: 'published',
          verificationStatus: 'content_reviewed',
          active: true,
          source,
          expiresAt: '2026-10-16T00:00:00Z',
        },
      ],
      bulletins: [
        {
          id: 'bulletin-current',
          publicationStatus: 'published',
          verificationStatus: 'content_reviewed',
          active: true,
          publishedAt: '2026-10-17T09:00:00Z',
          source,
        },
      ],
      asOf: new Date('2026-10-17T12:00:00Z'),
    });

    expect(result.notices.map((item) => item.id)).toEqual(['notice-current']);
    expect(result.bulletins.map((item) => item.id)).toEqual(['bulletin-current']);
  });

  test('rejects non-HTTPS sources and invalid inputs', () => {
    const result = listPublicReleases({
      news: [{
        newsType: 'announcement',
        publicationStatus: 'published',
        verificationStatus: 'verified',
        active: true,
        sourceUrl: 'http://example.gov.in/notice',
      }],
      bulletins: [],
      asOf: new Date('2026-10-17T00:00:00Z'),
    });

    expect(result.notices).toHaveLength(0);
    expect(() => listPublicReleases({ news: {}, bulletins: [] })).toThrow(TypeError);
  });
});