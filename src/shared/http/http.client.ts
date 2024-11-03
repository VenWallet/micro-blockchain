import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable, firstValueFrom } from 'rxjs';

@Injectable()
export class HttpClient {
  private url: string;
  private readonly httpService: HttpService;

  constructor(_url: string) {
    this.url = _url;
    this.httpService = new HttpService();
  }

  async request(options: {
    method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    params?: Record<string, any>;
    body?: any;
    config?: AxiosRequestConfig;
  }): Promise<AxiosResponse> {
    const { method, path, params, body, config } = options;

    const request = this.httpService.request({
      method,
      url: this.url + path,
      params,
      data: body,
      ...config,
    });

    return await firstValueFrom(request);
  }
}
