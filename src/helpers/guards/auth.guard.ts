import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token not found');
    }

    const token = authHeader.split(' ')[1];

    try {
      // const user = this.jwtService.verify(token);
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('NODE_ENV', { infer: true }),
      });

      request['user'] = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

// const request = context.switchToHttp().getRequest();
// const token = this.extractTokenFromHeader(request);
// if (!token) {
//   console.log('token not found');
//   throw new UnauthorizedException();
// }
// try {
//   const payload = await this.jwtService.verifyAsync(token, {
//     secret: process.env.JWT_SECRET,
//   });

//   request['client'] = payload;
// } catch (e: any) {
//   console.log('error');
//   console.log(e);
//   throw new UnauthorizedException();
// }
// return true;
// }

// private extractTokenFromHeader(request: Request): string | undefined {
// const [type, token] = request.headers.authorization?.split(' ') ?? [];
// return type === 'Bearer' ? token : undefined;
// }
