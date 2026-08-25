import { t } from '../utils/gettext';
import type { SmartSafeHubBootstrap } from '../types/bootstrap';
import type { ApiResponse } from '../types/status';

function getUbusStatusText(status: number): string {
  switch (status) {
    case 1:
      return t('Invalid command.');
    case 2:
      return t('The request argument is invalid.');
    case 3:
      return t('The requested method was not found.');
    case 4:
      return t('The requested resource could not be found.');
    case 5:
      return t('No response data found.');
    case 6:
      return t('Permissioned Denied!');
    case 7:
      return t('Screenshot request timed out.');
    case 8:
      return t('This feature is not supported.');
    case 9:
      return t('An undefined error has ocurred');
    case 10:
      return t('Device disconnected.');
    default:
      return t('ubus error code %s returned.', status);
  }
}

const DEFAULT_TIMEOUT_MS = 20_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 60_000;

let requestId = 1;

export interface RpcCallOptions {
  timeoutMs?: number;
}

export class RpcError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RpcError';
    this.code = code;
  }
}

function getBootstrap(): SmartSafeHubBootstrap {
  const bootstrap = window.__SMARTHUB_BOOTSTRAP__;

  if (!bootstrap?.sessionId || !bootstrap.rpcUrl) {
    throw new RpcError(
      'BOOTSTRAP_MISSING',
      t('LuCI session information not found. Please refresh the page.'),
    );
  }

  return bootstrap;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalidResponse(): RpcError {
  return new RpcError(
    'INVALID_RESPONSE',
    t('The device API returned an invalid response.'),
  );
}

function normalizedTimeout(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(
    MAX_TIMEOUT_MS,
    Math.max(MIN_TIMEOUT_MS, Math.trunc(value)),
  );
}

function parseJsonRpcResponse<T>(payload: unknown, requestIdentifier: number): T {
  if (
    !isObject(payload) ||
    payload.jsonrpc !== '2.0' ||
    payload.id !== requestIdentifier
  ) {
    throw invalidResponse();
  }

  if ('error' in payload) {
    const error = payload.error;

    if (!isObject(error) || typeof error.code !== 'number') {
      throw invalidResponse();
    }

    throw new RpcError(
      `JSON_RPC_${error.code}`,
      typeof error.message === 'string' && error.message.length > 0
        ? error.message
        : t('JSON-RPC request failed.'),
    );
  }

  const result = payload.result;

  if (!Array.isArray(result) || result.length < 1 || result.length > 2) {
    throw invalidResponse();
  }

  const status = result[0];

  if (typeof status !== 'number' || !Number.isInteger(status)) {
    throw invalidResponse();
  }

  if (status !== 0) {
    throw new RpcError(
      `UBUS_${status}`,
      getUbusStatusText(status),
    );
  }

  if (result.length < 2 || result[1] === undefined) {
    throw new RpcError('EMPTY_RESPONSE', t('Device API response is empty.'));
  }

  return result[1] as T;
}

export async function callRpc<T>(
  object: string,
  method: string,
  params: Record<string, unknown> = {},
  options: RpcCallOptions = {},
): Promise<T> {
  const bootstrap = getBootstrap();
  const id = requestId++;
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    normalizedTimeout(options.timeoutMs),
  );

  try {
    const response = await fetch(bootstrap.rpcUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'call',
        params: [bootstrap.sessionId, object, method, params],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new RpcError(
        'HTTP_ERROR',
        t('Device API returned HTTP %s error.', response.status),
      );
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw invalidResponse();
    }

    return parseJsonRpcResponse<T>(payload, id);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new RpcError(
        'RPC_TIMEOUT',
        t('Device response timed out. Please try again in a moment.'),
      );
    }

    if (error instanceof RpcError) {
      throw error;
    }

    throw new RpcError(
      'NETWORK_ERROR',
      t('Unable to communicate with router. Please check your network connection.'),
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function callApi<T>(
  object: string,
  method: string,
  params: Record<string, unknown> = {},
  options: RpcCallOptions = {},
): Promise<T> {
  const response = await callRpc<ApiResponse<T>>(object, method, params, options);

  if (!response.ok) {
    throw new RpcError(response.error.code, response.error.message);
  }

  return response.data;
}
