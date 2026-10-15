'use strict';

function getRequestId(req) {
  return req?.id || null;
}

function success(
  res,
  {
    statusCode = 200,
    message = 'Request successful.',
    data = null,
    meta,
  } = {},
  req
) {
  const body = {
    success: true,
    message,
    data,
  };

  if (meta !== undefined) {
    body.meta = meta;
  }

  const requestId = getRequestId(req);

  if (requestId) {
    body.requestId = requestId;
  }

  return res.status(statusCode).json(body);
}

function created(
  res,
  data,
  message = 'Resource created successfully.',
  req
) {
  return success(
    res,
    {
      statusCode: 201,
      message,
      data,
    },
    req
  );
}

function noContent(res) {
  return res.status(204).end();
}

function paginated(
  res,
  {
    data = [],
    pagination = {},
    message = 'Records retrieved successfully.',
    statusCode = 200,
  } = {},
  req
) {
  return success(
    res,
    {
      statusCode,
      message,
      data,
      meta: {
        pagination,
      },
    },
    req
  );
}

function error(
  res,
  {
    statusCode = 500,
    code = 'INTERNAL_SERVER_ERROR',
    message = 'An unexpected error occurred.',
    details,
  } = {},
  req
) {
  const body = {
    success: false,
    error: {
      code,
      message,
    },
  };

  /*
   * Only pass safe, deliberately selected details to this function.
   * Never expose stack traces, database errors, secrets or tokens.
   */
  if (details !== undefined) {
    body.error.details = details;
  }

  const requestId = getRequestId(req);

  if (requestId) {
    body.requestId = requestId;
  }

  return res.status(statusCode).json(body);
}

module.exports = {
  success,
  created,
  noContent,
  paginated,
  error,
};