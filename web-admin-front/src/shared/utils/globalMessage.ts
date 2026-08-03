import type { App } from 'antd';

type AppContext = ReturnType<typeof App.useApp>;

let messageInstance: AppContext['message'] | null = null;

export function setGlobalMessage(message: AppContext['message']) {
  messageInstance = message;
}

export function getGlobalMessage() {
  return messageInstance;
}
