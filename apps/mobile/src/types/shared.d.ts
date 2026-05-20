declare module '@kuli/shared/api-client' {
  export class KuliApiError extends Error {
    status: number;
    code: string;
    fieldErrors: Record<string, string[]>;
    details: Record<string, unknown>;
    meta: Record<string, unknown>;
  }

  export function normalizeApiBaseUrl(baseUrl?: string): string;

  export function createKuliApiClient(options?: {
    baseUrl?: string;
    getAccessToken?: () => Promise<string | undefined>;
    fetchImpl?: typeof fetch;
  }): {
    baseUrl: string;
    request: (path: string, options?: Record<string, unknown>) => Promise<unknown>;
    health: () => Promise<unknown>;
    publicConfig: () => Promise<unknown>;
    vehicleClasses: () => Promise<unknown>;
    me: () => Promise<unknown>;
    syncProfile: (profile: Record<string, unknown>) => Promise<unknown>;
  };
}
