import type {
  AuthResponse,
  CallAnswerDto,
  CallCreateInput,
  CallDto,
  ConversationCreateInput,
  ConversationDto,
  ListingCreateInput,
  ListingDto,
  ListingQuery,
  LoginInput,
  MessageDto,
  Paginated,
  RegisterInput,
  UserDto,
} from '@landconnect/shared';

import { API_URL } from './config';
import { getAccessToken, getSession, refreshSession } from './session';

export { API_URL };

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  skipAuthRefresh?: boolean;
  /** Override for long operations (e.g. uploads). Defaults to 15s. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

async function request<T>(
  path: string,
  options: RequestOptions = {},
  allowRefresh = true,
): Promise<T> {
  const token = options.token === undefined ? getAccessToken() : options.token;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    // A hung request is worse than a clear failure — never leave the UI spinning.
    if (controller.signal.aborted) {
      throw new ApiError(
        `The API did not respond within ${timeoutMs / 1000}s. Check that ${API_URL} is reachable.`,
        408,
      );
    }
    throw new ApiError(
      `Cannot reach the API at ${API_URL}. Check your connection and EXPO_PUBLIC_API_URL.`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  // Access token expired → rotate the refresh token once and retry the request.
  if (
    response.status === 401 &&
    allowRefresh &&
    !options.skipAuthRefresh &&
    getSession()
  ) {
    try {
      await refreshSession();
      return request<T>(path, options, false);
    } catch (err) {
      throw new ApiError(
        err instanceof Error ? err.message : 'Session expired. Please sign in again.',
        401,
      );
    }
  }

  const text = await response.text();
  let data: { error?: string; details?: unknown } | null = null;
  let parseFailed = false;

  if (text) {
    try {
      data = JSON.parse(text) as { error?: string; details?: unknown };
    } catch {
      // Proxies and crash pages return HTML; surface a short message instead
      // of throwing a raw SyntaxError.
      parseFailed = true;
      data = { error: text.slice(0, 200) };
    }
  }

  if (!response.ok) {
    throw new ApiError(
      messageFromError(data, response.statusText),
      response.status,
      data?.details,
    );
  }

  if (parseFailed) {
    throw new ApiError('The API returned a non-JSON response.', response.status);
  }

  return data as T;
}

function messageFromError(
  data: { error?: string; details?: unknown } | null,
  statusText: string,
): string {
  const fallback = data?.error ?? statusText ?? 'Request failed';

  // Surface the first zod field error instead of a generic "Invalid request".
  if (data?.error === 'Invalid request' && data.details) {
    const details = data.details as {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
    };
    const field = Object.entries(details.fieldErrors ?? {}).find(
      ([, messages]) => messages && messages.length > 0,
    );
    if (field?.[1]?.[0]) return `Invalid request — ${field[0]}: ${field[1][0]}`;
    if (details.formErrors?.[0]) return `Invalid request — ${details.formErrors[0]}`;
  }

  return fallback;
}

export interface LocalImage {
  uri: string;
  name: string;
  type: string;
}

/**
 * Multipart upload. Uses XMLHttpRequest instead of fetch: Expo SDK 58 swaps in
 * the Winter fetch, which rejects React Native's `{ uri, name, type }` file
 * parts ("Unsupported FormDataPart implementation"). RN's XHR still supports
 * them.
 */
async function uploadImages(
  files: LocalImage[],
  allowRefresh = true,
): Promise<{ urls: string[] }> {
  const token = getAccessToken();

  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const file of files) form.append('files', file as unknown as Blob);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/uploads`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 60_000;

    xhr.onload = () => {
      void (async () => {
        if (xhr.status === 401 && allowRefresh && getSession()) {
          try {
            await refreshSession();
            resolve(await uploadImages(files, false));
          } catch (error) {
            reject(error);
          }
          return;
        }

        let data: { error?: string; details?: unknown; urls?: string[] } | null = null;
        if (xhr.responseText) {
          try {
            data = JSON.parse(xhr.responseText) as {
              error?: string;
              details?: unknown;
              urls?: string[];
            };
          } catch {
            data = { error: xhr.responseText.slice(0, 200) };
          }
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as { urls: string[] });
          return;
        }
        reject(
          new ApiError(messageFromError(data, xhr.statusText), xhr.status, data?.details),
        );
      })();
    };
    xhr.onerror = () =>
      reject(
        new ApiError(
          `Cannot reach the API at ${API_URL}. Check your connection and EXPO_PUBLIC_API_URL.`,
          0,
        ),
      );
    xhr.ontimeout = () =>
      reject(new ApiError('Photo upload timed out. Try fewer or smaller photos.', 408));

    xhr.send(form);
  });
}

function toQueryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  auth: {
    register: (input: RegisterInput) =>
      request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: input,
        token: null,
        skipAuthRefresh: true,
      }),
    login: (input: LoginInput) =>
      request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: input,
        token: null,
        skipAuthRefresh: true,
      }),
    logout: (refreshToken: string) =>
      request<{ ok: true }>('/api/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        token: null,
        skipAuthRefresh: true,
      }),
    me: () => request<UserDto>('/api/auth/me'),
  },
  listings: {
    list: (query: Partial<ListingQuery> = {}) =>
      request<Paginated<ListingDto>>(`/api/listings${toQueryString(query)}`),
    mine: () => request<Paginated<ListingDto>>('/api/listings/mine'),
    get: (id: string) => request<ListingDto>(`/api/listings/${id}`),
    create: (input: ListingCreateInput) =>
      request<ListingDto>('/api/listings', { method: 'POST', body: input }),
    update: (id: string, input: Partial<ListingCreateInput>) =>
      request<ListingDto>(`/api/listings/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) =>
      request<{ ok: true }>(`/api/listings/${id}`, { method: 'DELETE' }),
  },
  conversations: {
    list: () => request<ConversationDto[]>('/api/conversations'),
    get: (id: string) => request<ConversationDto>(`/api/conversations/${id}`),
    create: (input: ConversationCreateInput) =>
      request<ConversationDto>('/api/conversations', { method: 'POST', body: input }),
    messages: (id: string) =>
      request<MessageDto[]>(`/api/conversations/${id}/messages`),
    send: (id: string, body: string) =>
      request<MessageDto>(`/api/conversations/${id}/messages`, {
        method: 'POST',
        body: { body, type: 'TEXT' },
      }),
  },
  uploads: {
    images: (files: LocalImage[]) => uploadImages(files),
  },
  calls: {
    create: (input: CallCreateInput) =>
      request<CallDto>('/api/calls', { method: 'POST', body: input }),
    get: (id: string) => request<CallDto>(`/api/calls/${id}`),
    incoming: () => request<{ call: CallDto | null }>('/api/calls/incoming'),
    token: (id: string) =>
      request<{ url: string; room: string; token: string }>(`/api/calls/${id}/token`),
    answer: (id: string, accept: boolean) =>
      request<CallAnswerDto>(`/api/calls/${id}/answer`, {
        method: 'POST',
        body: { accept },
      }),
    end: (id: string) => request<CallDto>(`/api/calls/${id}/end`, { method: 'POST' }),
  },
};
