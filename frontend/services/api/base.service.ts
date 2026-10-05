import type { AxiosResponse } from 'axios';
import apiClient from '@/lib/axios/client';

export abstract class BaseService {
  protected baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  protected async get<T>(endpoint: string): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.get(
      `${this.baseUrl}${endpoint}`,
    );

    return response.data;
  }

  protected async post<T, D>(
    endpoint: string,
    data: D,
  ): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.post(
      `${this.baseUrl}${endpoint}`,
      data,
    );

    return response.data;
  }

  protected async put<T, D>(
    endpoint: string,
    data: D,
  ): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.put(
      `${this.baseUrl}${endpoint}`,
      data,
    );

    return response.data;
  }

  protected async delete<T>(endpoint: string): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.delete(
      `${this.baseUrl}${endpoint}`,
    );

    return response.data;
  }
}