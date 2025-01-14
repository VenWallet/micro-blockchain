import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class BooleanValidationPipe implements PipeTransform {
  transform(value: any) {
    // Permitir que sea opcional (undefined o null)
    if (value === undefined || value === null) {
      return false; // Valor predeterminado
    }

    // Si está presente, validar que sea 'true' o 'false'
    if (value === 'true' || value === 'false' || value === true || value === false) {
      return value === 'true';
    }
    throw new BadRequestException(`Invalid boolean value: ${value}`);
  }
}
