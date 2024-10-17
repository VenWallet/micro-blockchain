import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isEmail } from 'class-validator';

@Injectable()
export class ValidateEmailPipe implements PipeTransform<string, string> {
  constructor() {}

  transform(value: string): string {
    if (!isEmail(value)) {
      throw new BadRequestException('Invalid email');
    }
    return value;
  }
}
