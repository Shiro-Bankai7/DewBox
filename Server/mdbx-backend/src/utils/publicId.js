const crypto = require('crypto');

const HASH_SECRET =
  process.env.PUBLIC_ID_HASH_SECRET ||
  process.env.JWT_SECRET ||
  'mdbx-public-id-fallback-secret';

const PUBLIC_ID_PREFIX = process.env.PUBLIC_ID_PREFIX || 'MDBX';

function toPublicId(value) {
  if (value === undefined || value === null || value === '') return null;

  const digest = crypto
    .createHmac('sha256', HASH_SECRET)
    .update(String(value))
    .digest('hex')
    .toUpperCase();

  return `${PUBLIC_ID_PREFIX}-${digest.slice(0, 4)}-${digest.slice(4, 8)}-${digest.slice(8, 12)}`;
}

module.exports = {
  toPublicId,
};

