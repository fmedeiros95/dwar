import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Account } from '@dwar/api-client';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service.js';
import { cookieName } from './cookies.js';

export type SessionRequest = Request & { account: Account; sessionTokenHash: string };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const { account, tokenHash } = await this.auth.readSession(request.cookies?.[cookieName]);
    request.account = account;
    request.sessionTokenHash = tokenHash;
    return true;
  }
}
