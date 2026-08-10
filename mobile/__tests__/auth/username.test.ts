import {
  normalizeUsername,
  usernameToInternalAuthEmail,
} from '@/features/auth/username';

const DOMAIN = 'auth.wonderland.invalid';

describe('normalizeUsername', () => {
  it('trims outer whitespace', () => {
    expect(normalizeUsername('  115.sampaguita  ')).toEqual({
      ok: true,
      value: '115.sampaguita',
    });
  });

  it('lowercases input', () => {
    expect(normalizeUsername('117A.Sampaguita')).toEqual({
      ok: true,
      value: '117a.sampaguita',
    });
  });

  it.each([
    ['115.sampaguita', '115.sampaguita'],
    ['117a.sampaguita', '117a.sampaguita'],
    ['111b.sunflower', '111b.sunflower'],
  ])('accepts the DEC-18 canonical handle %s', (input, expected) => {
    expect(normalizeUsername(input)).toEqual({ ok: true, value: expected });
  });

  it.each(['', '   ', '\t\n'])('rejects a blank value (%j)', (input) => {
    expect(normalizeUsername(input)).toEqual({ ok: false, reason: 'blank' });
  });

  it.each([
    ['115 sampaguita', 'a space'],
    ['117-a.sampaguita', 'a hyphen — DEC-18 strips it before the handle is issued'],
    ['115.sampaguita st.', 'a trailing street word'],
    ['.115.sampaguita', 'a leading dot'],
    ['115.sampaguita.', 'a trailing dot'],
    ['115..sampaguita', 'a doubled dot'],
    ['115_sampaguita', 'an underscore'],
    ['luz garcía', 'a non-ASCII letter'],
  ])('rejects %j (%s)', (input) => {
    expect(normalizeUsername(input)).toEqual({
      ok: false,
      reason: 'invalid_characters',
    });
  });

  it('rejects an input that already carries the internal auth domain', () => {
    // This is what makes double-appending the domain unreachable rather than
    // merely guarded against (Guide §10.5 item 5).
    expect(normalizeUsername(`115.sampaguita@${DOMAIN}`)).toEqual({
      ok: false,
      reason: 'invalid_characters',
    });
  });
});

describe('usernameToInternalAuthEmail', () => {
  it('generates the expected internal auth alias', () => {
    expect(usernameToInternalAuthEmail('115.sampaguita', DOMAIN)).toBe(
      '115.sampaguita@auth.wonderland.invalid',
    );
  });

  it.each([
    ['117a.sampaguita', '117a.sampaguita@auth.wonderland.invalid'],
    ['111b.sunflower', '111b.sunflower@auth.wonderland.invalid'],
  ])('maps %s to %s', (handle, expected) => {
    expect(usernameToInternalAuthEmail(handle, DOMAIN)).toBe(expected);
  });

  it('does not double-append the domain when handed an already-suffixed value', () => {
    expect(usernameToInternalAuthEmail(`115.sampaguita@${DOMAIN}`, DOMAIN)).toBe(
      '115.sampaguita@auth.wonderland.invalid',
    );
  });

  it('tolerates a domain written with a leading @', () => {
    expect(usernameToInternalAuthEmail('115.sampaguita', `@${DOMAIN}`)).toBe(
      '115.sampaguita@auth.wonderland.invalid',
    );
  });

  it('normalises case and whitespace before building the alias', () => {
    expect(usernameToInternalAuthEmail('  115.Sampaguita ', DOMAIN)).toBe(
      '115.sampaguita@auth.wonderland.invalid',
    );
  });

  it('throws rather than silently repairing an invalid handle', () => {
    expect(() => usernameToInternalAuthEmail('115 sampaguita', DOMAIN)).toThrow();
  });

  it('throws when the auth email domain is empty', () => {
    expect(() => usernameToInternalAuthEmail('115.sampaguita', '   ')).toThrow();
  });
});
