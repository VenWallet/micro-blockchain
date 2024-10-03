import { HttpException, HttpStatus } from '@nestjs/common';

export class ExceptionHandler extends HttpException {
  constructor(error: any) {
    console.log(error);
    super(
      error.response?.data?.message ||
        error.response?.data ||
        error.response?.statusText ||
        error.message ||
        'Internal Server Error',
      error.response?.status || error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
