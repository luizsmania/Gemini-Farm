import assert from 'node:assert/strict';
import test from 'node:test';

import { isAllowedOrigin } from './originConfig.ts';

test('allows Vercel domains even without a strict ALLOWED_ORIGINS list', () => {
  const previousAllowedOrigins = process.env.ALLOWED_ORIGINS;
  const previousClientUrl = process.env.CLIENT_URL;
  const previousNodeEnv = process.env.NODE_ENV;

  process.env.ALLOWED_ORIGINS = '';
  process.env.CLIENT_URL = '';
  process.env.NODE_ENV = 'production';

  try {
    assert.equal(isAllowedOrigin('https://gemini-farm.vercel.app'), true);
    assert.equal(isAllowedOrigin('https://gemini-farm-git-main.vercel.app'), true);
    assert.equal(isAllowedOrigin('https://evil.example.com'), false);
  } finally {
    if (previousAllowedOrigins === undefined) {
      delete process.env.ALLOWED_ORIGINS;
    } else {
      process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
    }

    if (previousClientUrl === undefined) {
      delete process.env.CLIENT_URL;
    } else {
      process.env.CLIENT_URL = previousClientUrl;
    }

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});
