import type { MessageInstance } from 'antd/es/message/interface';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface ToastPayload {
  kind: ToastKind;
  message: string;
}

const DURATION = 2.2;
const pendingQueue: ToastPayload[] = [];
let messageApi: MessageInstance | null = null;

function flushPendingQueue() {
  if (!messageApi || pendingQueue.length === 0) {
    return;
  }

  while (pendingQueue.length) {
    const payload = pendingQueue.shift();
    if (!payload) {
      continue;
    }

    messageApi.open({
      type: payload.kind,
      content: payload.message,
      duration: DURATION
    });
  }
}

export function registerMessageApi(api: MessageInstance): void {
  messageApi = api;
  flushPendingQueue();
}

export function notify(payload: ToastPayload): void {
  if (!messageApi) {
    pendingQueue.push(payload);
    return;
  }

  messageApi.open({
    type: payload.kind,
    content: payload.message,
    duration: DURATION
  });
}

export function notifySuccess(content: string): void {
  notify({ kind: 'success', message: content });
}

export function notifyError(content: string): void {
  notify({ kind: 'error', message: content });
}

export function notifyWarning(content: string): void {
  notify({ kind: 'warning', message: content });
}

export function notifyInfo(content: string): void {
  notify({ kind: 'info', message: content });
}

export function subscribeToast(_handler: (payload: ToastPayload) => void): () => void {
  return () => undefined;
}
