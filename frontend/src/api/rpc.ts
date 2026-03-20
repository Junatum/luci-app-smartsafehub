import type { SmartSafeHubBootstrap } from '../types/bootstrap';
import type { ApiResponse } from '../types/status';

interface JsonRpcSuccess<T> {
  jsonrpc: '2.0';
  id: number;
  result: [number, T?];
}

interface JsonRpcFailure {
  jsonrpc: '2.0';
  id: number | null;
  error: {
    code: number;
    message: string;
  };
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

const UBUS_STATUS_TEXT: Readonly<Record<number, string>> = {
  1: '잘못된 명령입니다.',
  2: '요청 인자가 올바르지 않습니다.',
  3: '요청한 메서드를 찾을 수 없습니다.',
  4: '요청한 리소스를 찾을 수 없습니다.',
  5: '응답 데이터가 없습니다.',
  6: '접근 권한이 없습니다.',
  7: '요청 시간이 초과되었습니다.',
  8: '지원하지 않는 기능입니다.',
  9: '장치에서 알 수 없는 오류가 발생했습니다.',
  10: '장치 연결이 끊어졌습니다.',
};

let requestId = 1;

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
      'LuCI 세션 정보를 찾을 수 없습니다. 페이지를 새로고침해 주세요.',
    );
  }

  return bootstrap;
}

export async function callRpc<T>(
  object: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const bootstrap = getBootstrap();
  const id = requestId++;

  let response: Response;

  try {
    response = await fetch(bootstrap.rpcUrl, {
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
    });
  } catch {
    throw new RpcError(
      'NETWORK_ERROR',
      '공유기와 통신할 수 없습니다. 네트워크 연결을 확인해 주세요.',
    );
  }

  if (!response.ok) {
    throw new RpcError(
      'HTTP_ERROR',
      `장치 API가 HTTP ${response.status} 오류를 반환했습니다.`,
    );
  }

  let payload: JsonRpcResponse<T>;

  try {
    payload = (await response.json()) as JsonRpcResponse<T>;
  } catch {
    throw new RpcError(
      'INVALID_RESPONSE',
      '장치 API가 올바르지 않은 응답을 반환했습니다.',
    );
  }

  if ('error' in payload) {
    throw new RpcError(
      `JSON_RPC_${payload.error.code}`,
      payload.error.message || 'JSON-RPC 요청에 실패했습니다.',
    );
  }

  const [status, result] = payload.result;

  if (status !== 0) {
    throw new RpcError(
      `UBUS_${status}`,
      UBUS_STATUS_TEXT[status] ?? `ubus 오류 코드 ${status}가 반환되었습니다.`,
    );
  }

  if (result === undefined) {
    throw new RpcError('EMPTY_RESPONSE', '장치 API 응답이 비어 있습니다.');
  }

  return result;
}

export async function callApi<T>(
  object: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const response = await callRpc<ApiResponse<T>>(object, method, params);

  if (!response.ok) {
    throw new RpcError(response.error.code, response.error.message);
  }

  return response.data;
}
