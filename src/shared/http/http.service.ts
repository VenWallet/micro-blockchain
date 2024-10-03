import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable, firstValueFrom } from 'rxjs';

@Injectable()
export class HttpCustomService {
  constructor(private readonly httpService: HttpService) {}

  async request<T>(options: {
    method: string;
    url: string;
    params?: Record<string, any>;
    body?: any;
    config?: AxiosRequestConfig;
  }): Promise<AxiosResponse<T>> {
    const { method, url, params, body, config } = options;

    const requestData = this.httpService.request<T>({
      method,
      url,
      params,
      data: body,
      ...config,
    });

    return await firstValueFrom(requestData);
  }
}
