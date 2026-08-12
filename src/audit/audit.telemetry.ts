import { ArgumentsHost, CallHandler, Catch, ExceptionFilter, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AuditService } from "./audit.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private audit: AuditService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const { method } = req;

        if (!['POST','PUT','PATCH','DELETE'].includes(method)) {
            return next.handle();
        }

        return next.handle().pipe(
            tap(() => {
                this.audit.log({
                    level: 'INFO',
                    action: `http.${method.toLowerCase()}`,
                    actorId: req.user?.id ?? null,
                    method,
                    path: req.originalUrl,
                    ip: req.ip,
                });
            }),
        );
    }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private audit: AuditService) {}

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();

        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const message = exception instanceof HttpException ? exception.message : 'Error interno del servidor';

        if (status >= 500) {
            this.audit.log({
                level: 'ERROR',
                action: 'http.error',
                actorId: req.user?.id ?? null,
                method: req.method,
                path: req.originalUrl,
                statusCode: status,
                message: exception instanceof Error ? exception.message : String(exception),
                metadata:
                exception instanceof Error ? { stack: exception.stack } : undefined,
                ip: req.ip,
            });
        }

        res.status(status).json({
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
        });
    }
}