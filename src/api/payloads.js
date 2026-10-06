// Test-data builders for POST /posts. Keeping the data here keeps the feature files readable.
const VALID = { title: 'Streamhub QA assessment', body: 'Boundary & invalid data checks', userId: 1 };

const SPECIAL_TITLES = {
  'emoji': 'Release 🚀🔥 ✅ — done 👍🏽',
  'multi-language unicode': 'नमस्ते 你好 مرحبا שלום Привет',
  'SQL injection': "Robert'); DROP TABLE posts;--",
  'HTML/script injection': '<script>alert("xss")</script><img src=x onerror=alert(1)>',
  'quotes and backslashes': 'He said "hi" \\ and \'bye\' \\n not a newline',
  'control characters': 'tab\there\nnewline\rreturn\u0007bell',
  'null byte': 'before\u0000after',
  'zero-width and RTL marks': 'a​b‏c﻿',
  'JSON-breaking characters': '{"nested":"json"}]}',
};

function longTitle(length) {
  return 'A'.repeat(length);
}

function withTitle(title) {
  return { ...VALID, title };
}

const INVALID_PAYLOADS = {
  'missing userId': (() => { const { userId, ...rest } = VALID; return rest; })(),
  'missing title': (() => { const { title, ...rest } = VALID; return rest; })(),
  'missing body': (() => { const { body, ...rest } = VALID; return rest; })(),
  'empty object': {},
  'userId as a string': { ...VALID, userId: 'abc' },
  'negative userId': { ...VALID, userId: -1 },
  'null title': { ...VALID, title: null },
};

module.exports = { VALID, SPECIAL_TITLES, INVALID_PAYLOADS, longTitle, withTitle };
