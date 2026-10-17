'use strict';

const path = require('node:path');
const faqs = require(path.join(__dirname, '../../assets/data/faqs.json'));

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'how', 'i', 'in',
  'is', 'it', 'me', 'my', 'of', 'on', 'or', 'the', 'to', 'we', 'what',
  'when', 'where', 'which', 'who', 'with', 'you', 'your',
]);

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function findAnswer(question) {
  const queryWords = new Set(tokenize(question));
  if (!queryWords.size) return null;

  const entries = Array.isArray(faqs.faqs) ? faqs.faqs : [];
  let best = null;
  let bestScore = 0;

  for (const item of entries) {
    if (item.active !== true || typeof item.answer !== 'string') continue;
    const questionWords = new Set([
      ...tokenize(item.question),
      ...tokenize(item.category),
      ...(Array.isArray(item.tags) ? item.tags.flatMap(tokenize) : []),
    ]);
    let score = 0;
    queryWords.forEach((word) => {
      if (questionWords.has(word)) score += 1;
    });

    const normalizedQuery = String(question).toLowerCase().trim();
    if (normalizedQuery.length >= 8 && item.question?.toLowerCase().includes(normalizedQuery)) {
      score += 3;
    }

    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  if (!best || bestScore < 2) return null;
  return {
    id: best.id,
    question: best.question,
    answer: best.answer,
    category: best.category,
    score: bestScore,
  };
}

module.exports = { findAnswer, tokenize };
