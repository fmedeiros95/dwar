import { Catch, HttpException, type ExceptionFilter, type ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { GameError } from '@dwar/game-server';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof GameError
        ? error.status
        : error instanceof ZodError
          ? 400
          : error instanceof HttpException
            ? error.getStatus()
            : 500;
    const message =
      error instanceof GameError
        ? error.message
        : error instanceof ZodError
          ? error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
          : status < 500 && error instanceof Error
            ? error.message
            : 'Não foi possível concluir a ação. Tente novamente.';
    if (status >= 500) console.error(error);
    response.status(status).json({ message });
  }
}
