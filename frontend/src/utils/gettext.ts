declare global {
  interface Window {
    _: (message: string) => string;
  }
}

let templateMessages: Map<string, string> | null = null;

function templateTranslate(message: string): string | null {
  if (!templateMessages) {
    templateMessages = new Map(
      Array.from(document.querySelectorAll<HTMLElement>('[data-smartsafehub-msgid]')).map(
        (node) => [node.dataset.smartsafehubMsgid ?? '', node.textContent ?? ''],
      ),
    );
  }

  return templateMessages.get(message) ?? null;
}

export function t(message: string, ...values: unknown[]): string {
  const translate = window.__SMARTHUB_BOOTSTRAP__?.translate ?? window._;
  const translated =
    (typeof translate === 'function' ? translate(message) : null) ??
    templateTranslate(message) ??
    message;
  let index = 0;

  return translated.replace(/%s/g, () => String(values[index++] ?? ''));
}
