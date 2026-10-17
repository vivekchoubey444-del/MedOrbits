
'use strict';

const {
  crudController,
} = require('./controller.helpers');
const { asyncHandler, sendSuccess, httpError } = require('../utils/http');
const { findAnswer } = require('../services/faq-answer.service');

const repository = require('../repositories/faq.repository');

const controller = crudController(
  repository,
  null,
  {
    writable: false,
    removeAllowed: false,
    validate: false,
  }
);

controller.answer = asyncHandler(async (req, res) => {
  const question = req.body?.question;
  if (typeof question !== 'string' || !question.trim() || question.length > 500) {
    throw httpError(400, 'INVALID_QUESTION', 'Enter a question of up to 500 characters.');
  }

  const match = findAnswer(question.trim());
  return sendSuccess(res, {
    matched: Boolean(match),
    answer: match?.answer || 'I could not find a direct answer in the published FAQs. Please contact MedOrbits for help.',
    faq: match ? { id: match.id, question: match.question, category: match.category } : null,
    contact: {
      email: 'support@medorbits.in',
      phone: ['+91 62058 89064', '+91 76449 87052'],
    },
  });
});

module.exports = controller;
