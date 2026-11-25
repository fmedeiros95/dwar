import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { and, eq, gt, lte, sql } from 'drizzle-orm';
import { accounts, db, pool, registrationChallenges, sessions } from '@dwar/database';
import { GameError } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';

const scrypt = promisify(scryptCallback);
export const sessionLifetime = 30 * 24 * 60 * 60 * 1000;
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const publicAccount = (account: typeof accounts.$inferSelect): Account => ({
  id: account.id,
  username: account.username,
  email: account.email,
  graphicalOverview: account.graphicalOverview,
});

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const target = Buffer.from(expected, 'hex');
  return actual.length === target.length && timingSafeEqual(actual, target);
}

@Injectable()
export class AuthService {
  private readonly dummyPassword = hashPassword(randomBytes(32).toString('hex'));

  async onApplicationShutdown(): Promise<void> {
    await pool.end();
  }

  async register(username: string, email: string, password: string): Promise<Account> {
    const passwordHash = await hashPassword(password);
    try {
      const [account] = await db
        .insert(accounts)
        .values({ username, email, passwordHash })
        .returning();
      if (!account) throw new Error('Account insert returned no row');
      return publicAccount(account);
    } catch (error) {
      const cause = error as { code?: string; cause?: { code?: string } };
      if ((cause.code ?? cause.cause?.code) === '23505')
        throw new GameError('Nome de jogador ou e-mail já cadastrado.', 409);
      throw error;
    }
  }

  async registrationChallenge(priorBrowserKey: unknown) {
    const browserKey =
      typeof priorBrowserKey === 'string' && /^[\w-]{43}$/.test(priorBrowserKey)
        ? priorBrowserKey
        : randomBytes(32).toString('base64url');
    const token = randomBytes(32).toString('hex');
    const left = randomInt(1, 26);
    const right = randomInt(1, 26);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60_000);
    await db.transaction(async (tx) => {
      await tx.delete(registrationChallenges).where(lte(registrationChallenges.expiresAt, now));
      await tx
        .insert(registrationChallenges)
        .values({
          tokenHash: digest(token),
          browserKeyHash: digest(browserKey),
          answer: left + right,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: registrationChallenges.browserKeyHash,
          set: { tokenHash: digest(token), answer: left + right, expiresAt, createdAt: now },
        });
    });
    return { browserKey, token, expression: `${left} + ${right}`, expiresAt, serverTime: now };
  }

  async verifyRegistrationChallenge(token: string, answer: number, browserKey: unknown) {
    if (typeof browserKey !== 'string' || !/^[\w-]{43}$/.test(browserKey))
      throw new GameError('Recarregue a soma antispam e tente novamente.', 400);
    const [challenge] = await db
      .delete(registrationChallenges)
      .where(
        and(
          eq(registrationChallenges.tokenHash, digest(token)),
          eq(registrationChallenges.browserKeyHash, digest(browserKey)),
          eq(registrationChallenges.answer, answer),
          gt(registrationChallenges.expiresAt, new Date()),
        ),
      )
      .returning({ id: registrationChallenges.id });
    if (!challenge)
      throw new GameError('Soma antispam incorreta ou expirada. Tente novamente.', 400);
  }

  async login(username: string, password: string): Promise<Account> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(sql`lower(${accounts.username}) = lower(${username})`);
    const valid = await verifyPassword(
      password,
      account?.passwordHash ?? (await this.dummyPassword),
    );
    if (!account || !valid) throw new GameError('Nome de jogador ou senha inválidos.', 401);
    return publicAccount(account);
  }

  async createSession(accountId: number): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await db.insert(sessions).values({
      accountId,
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + sessionLifetime),
    });
    return token;
  }

  async changePassword(accountId: number, oldPassword: string, newPassword: string): Promise<void> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    if (!account) throw new GameError('Conta não encontrada.', 404);
    if (!(await verifyPassword(oldPassword, account.passwordHash)))
      throw new GameError('Senha atual incorreta.', 401);
    await db
      .update(accounts)
      .set({ passwordHash: await hashPassword(newPassword) })
      .where(eq(accounts.id, accountId));
  }

  async setOverview(accountId: number, graphicalOverview: boolean): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set({ graphicalOverview })
      .where(eq(accounts.id, accountId))
      .returning();
    if (!account) throw new GameError('Conta não encontrada.', 404);
    return publicAccount(account);
  }

  async readSession(token: unknown): Promise<{ account: Account; tokenHash: string }> {
    if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token))
      throw new GameError('Entre na sua conta para continuar.', 401);
    const tokenHash = digest(token);
    const [result] = await db
      .select({ account: accounts })
      .from(sessions)
      .innerJoin(accounts, eq(accounts.id, sessions.accountId))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())));
    if (!result) throw new GameError('Sua sessão expirou. Entre novamente.', 401);
    return { account: publicAccount(result.account), tokenHash };
  }

  async logout(token: unknown): Promise<void> {
    if (typeof token === 'string')
      await db.delete(sessions).where(eq(sessions.tokenHash, digest(token)));
  }
}
