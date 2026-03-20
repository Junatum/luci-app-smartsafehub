import { render } from 'preact';

import { App } from './app/App';
import './styles/app.css';

const HOST_ID = 'smartsafehub-root';
const MOUNT_ATTRIBUTE = 'data-smartsafehub-mount';
const STYLESHEET_ATTRIBUTE = 'data-smartsafehub-shadow-style';

function assetUrl(name: string): string {
  const bootstrap = window.__SMARTHUB_BOOTSTRAP__;
  const base = bootstrap?.assetBase ?? '/luci-static/smartsafehub/';
  const version = bootstrap?.assetVersion;
  const separator = base.endsWith('/') ? '' : '/';
  const url = `${base}${separator}${name}`;

  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

function getMountPoint(host: HTMLElement): HTMLElement {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

  let stylesheet = shadow.querySelector<HTMLLinkElement>(
    `link[${STYLESHEET_ATTRIBUTE}]`,
  );

  const stylesheetUrl = assetUrl('app.css');

  if (!stylesheet) {
    stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = stylesheetUrl;
    stylesheet.setAttribute(STYLESHEET_ATTRIBUTE, '');
    shadow.appendChild(stylesheet);
  } else if (stylesheet.getAttribute('href') !== stylesheetUrl) {
    stylesheet.href = stylesheetUrl;
  }

  let mountPoint = shadow.querySelector<HTMLElement>(`[${MOUNT_ATTRIBUTE}]`);

  if (!mountPoint) {
    mountPoint = document.createElement('div');
    mountPoint.className = 'smartsafehub-shadow-root';
    mountPoint.setAttribute(MOUNT_ATTRIBUTE, '');
    shadow.appendChild(mountPoint);
  }

  return mountPoint;
}

function mount(): void {
  const host = document.getElementById(HOST_ID);

  if (!host) {
    return;
  }

  host.style.display = 'block';
  host.style.width = '100%';
  host.style.minWidth = '0';
  host.style.maxWidth = '100%';
  host.style.isolation = 'isolate';

  render(<App />, getMountPoint(host));
}

const assetVersion = window.__SMARTHUB_BOOTSTRAP__?.assetVersion;

if (assetVersion !== undefined) {
  window.__SMARTHUB_APP_ASSET_VERSION__ = assetVersion;
} else {
  delete window.__SMARTHUB_APP_ASSET_VERSION__;
}

window.__SMARTHUB_APP_MOUNT__ = mount;
mount();
