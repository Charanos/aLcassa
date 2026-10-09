import { expect, it } from 'vitest';
import { credentialDownload } from '@/lib/credentials/download';

it('keeps multiline metadata from injecting environment settings into the key download', () => {
  const file = credentialDownload(
    'Integration\r\nADMIN_TOKEN=unexpected\u0000',
    ['tenant:read\nOTHER=unexpected'],
    'owned-test-secret',
  );
  const settings = file.split('\n').filter((line) => line && !line.startsWith('#'));
  expect(settings).toEqual(['API_KEY=owned-test-secret']);
  expect(file).not.toContain('\u0000');
});
