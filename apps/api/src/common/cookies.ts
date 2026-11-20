export const cookieName = 'dwar_session';
export const registrationCookieName = 'dwar_registration';
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
};
