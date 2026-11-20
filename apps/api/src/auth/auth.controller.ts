import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { bodySchema } from '../common/schemas.js';
import { cookieName, cookieOptions, registrationCookieName } from '../common/cookies.js';
import { SessionGuard } from '../common/session.guard.js';
import { AuthService, sessionLifetime } from './auth.service.js';

const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
});
const registration = credentials.extend({
  challengeToken: z.string().regex(/^[a-f0-9]{64}$/),
  captcha: z
    .string()
    .regex(/^\d{1,2}$/, 'Informe o resultado da soma antispam.')
    .transform(Number),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[\p{L}\p{N}_ -]+$/u, 'Use letras, números, espaços, _ ou - no nome.'),
});
const loginCredentials = z.object({
  username: z.string().trim().min(1).max(24),
  password: z.string().min(1).max(128),
});
// Usa o mesmo mínimo de 10 caracteres já exigido no cadastro.
const passwordChange = z
  .object({
    oldPassword: z.string().min(1).max(128),
    newPassword: z.string().min(10).max(128),
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'A confirmação não coincide com a nova senha.',
    path: ['confirmPassword'],
  });

@ApiTags('DWar')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('register/challenge')
  async registrationChallenge(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { browserKey, ...challenge } = await this.auth.registrationChallenge(
      request.cookies?.[registrationCookieName],
    );
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(registrationCookieName, browserKey, { ...cookieOptions, maxAge: 30 * 60_000 });
    return challenge;
  }

  @Post('register')
  @ApiBody({
    schema: {
      ...bodySchema,
      properties: {
        ...bodySchema.properties,
        username: { type: 'string', minLength: 3, maxLength: 24 },
        challengeToken: { type: 'string', pattern: '^[a-f0-9]{64}$' },
        captcha: { type: 'string', pattern: '^\\d{1,2}$' },
      },
      required: [...bodySchema.required, 'username', 'challengeToken', 'captcha'],
    },
  })
  async register(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = registration.parse(body);
    await this.auth.verifyRegistrationChallenge(
      data.challengeToken,
      data.captcha,
      request.cookies?.[registrationCookieName],
    );
    const account = await this.auth.register(data.username, data.email, data.password);
    response.cookie(cookieName, await this.auth.createSession(account.id), {
      ...cookieOptions,
      maxAge: sessionLifetime,
    });
    return account;
  }

  @Post('login')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', maxLength: 24 },
        password: { type: 'string', maxLength: 128 },
      },
      required: ['username', 'password'],
    },
  })
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const data = loginCredentials.parse(body);
    const account = await this.auth.login(data.username, data.password);
    response.cookie(cookieName, await this.auth.createSession(account.id), {
      ...cookieOptions,
      maxAge: sessionLifetime,
    });
    return account;
  }

  @Get('me')
  @ApiCookieAuth(cookieName)
  @UseGuards(SessionGuard)
  me(@CurrentAccount() account: Account) {
    return account;
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.[cookieName]);
    response.clearCookie(cookieName, cookieOptions);
    return { ok: true };
  }

  @Post('password')
  @ApiCookieAuth(cookieName)
  @UseGuards(SessionGuard)
  async password(@CurrentAccount() account: Account, @Body() body: unknown) {
    const data = passwordChange.parse(body);
    await this.auth.changePassword(account.id, data.oldPassword, data.newPassword);
    return { ok: true };
  }

  @Post('preferences/overview')
  @ApiCookieAuth(cookieName)
  @UseGuards(SessionGuard)
  async overviewPreference(@CurrentAccount() account: Account, @Body() body: unknown) {
    const data = z.object({ graphicalOverview: z.boolean() }).parse(body);
    return this.auth.setOverview(account.id, data.graphicalOverview);
  }
}
