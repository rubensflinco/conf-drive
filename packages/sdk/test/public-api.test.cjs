const { SDK_VERSION, validateConfig } = require('../dist');

describe('SDK public API', () => {
  test('exports its package version', () => {
    expect(SDK_VERSION).toBe('1.0.0');
  });

  test('accepts a valid API URL and secret', () => {
    expect(validateConfig({
      apiUrl: 'https://api.example.test',
      apiSecret: 'test-secret'
    })).toBe(true);
  });

  test('rejects invalid configuration', () => {
    expect(() => validateConfig({ apiUrl: '', apiSecret: 'test-secret' }))
      .toThrow('URL da API é obrigatória');
    expect(() => validateConfig({ apiUrl: 'not-a-url', apiSecret: 'test-secret' }))
      .toThrow('URL da API é inválida');
  });
});
