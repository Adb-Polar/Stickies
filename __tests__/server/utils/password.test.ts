import { describe, it, expect } from '@jest/globals';
import { hashPassword, comparePassword } from '../../../server/utils/password';

describe('Password utilities', () => {
  it('should hash a password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should compare password correctly', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    const isValid = await comparePassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await comparePassword('wrongPassword', hash);
    expect(isInvalid).toBe(false);
  });
});

