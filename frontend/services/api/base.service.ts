
import type {
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

import apiClient from '@/lib/axios/client';

export abstract class BaseService {
  protected baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  protected async get<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response: AxiosResponse<T> =
      await apiClient.get(
        `${this.baseUrl}${endpoint}`,
        config,
      );

    return response.data;
  }

  protected async post<T, D>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response: AxiosResponse<T> =
      await apiClient.post(
        `${this.baseUrl}${endpoint}`,
        data,
        config,
      );

    return response.data;
  }

  protected async put<T, D>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response: AxiosResponse<T> =
      await apiClient.put(
        `${this.baseUrl}${endpoint}`,
        data,
        config,
      );

    return response.data;
  }

  protected async delete<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response: AxiosResponse<T> =
      await apiClient.delete(
        `${this.baseUrl}${endpoint}`,
        config,
      );

    return response.data;
  }
}