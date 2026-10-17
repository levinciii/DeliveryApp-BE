import { HttpError } from '../shared/errors.js';

function notFoundHandler(req, res) {
  res.status(404).json({ message: `Cannot ${req.method} ${req.path}`, statusCode: 404 });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, statusCode: err.status, ...err.extra });
  }
  // 4xx errors raised by libraries (e.g. malformed JSON from express.json)
  const status = err.status || err.statusCode;
  if (status && status >= 400 && status < 500) {
    const message = err.type === 'entity.parse.failed' ? 'Malformed JSON body' : err.message;
    return res.status(status).json({ message, statusCode: status });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error', statusCode: 500 });
}

export { notFoundHandler, errorHandler };
