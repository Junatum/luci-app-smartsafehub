import { render } from 'preact';

import { App } from './app/App';
import { LoginApp } from './login/LoginApp';
import './styles/app.css';

const APP_HOST_ID = 'smartsafehub-root';
const LOGIN_HOST_ID = 'smartsafehub-login-root';
const MOUNT_ATTRIBUTE = 'data-smartsafehub-mount';
const STYLESHEET_ATTRIBUTE = 'data-smartsafehub-shadow-style';

let activeMountPoint: HTMLElement | null = null;
let loginMountPoint: HTMLElement | null = null;

function assetUrl(name: string, host?: HTMLElement | null): string {
  const bootstrap = window.__SMARTHUB_BOOTSTRAP__;
  const base =
    bootstrap?.assetBase ?? host?.dataset.assetBase ?? '/luci-static/smartsafehub/';
  const version = bootstrap?.assetVersion ?? host?.dataset.assetVersion;
  const separator = base.endsWith('/') ? '' : '/';
  const url = `${base}${separator}${name}`;

  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

function getMountPoint(host: HTMLElement, className: string): HTMLElement {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

  let stylesheet = shadow.querySelector<HTMLLinkElement>(
    `link[${STYLESHEET_ATTRIBUTE}]`,
  );

  const stylesheetUrl = assetUrl('app.css', host);

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
    mountPoint.className = className;
    mountPoint.setAttribute(MOUNT_ATTRIBUTE, '');
    shadow.appendChild(mountPoint);
  } else if (mountPoint.className !== className) {
    mountPoint.className = className;
  }

  return mountPoint;
}

function unmount(): void {
  if (!activeMountPoint) {
    return;
  }

  render(null, activeMountPoint);
  activeMountPoint = null;
}

function mount(): void {
  const host = document.getElementById(APP_HOST_ID);

  if (!host) {
    return;
  }

  host.style.display = 'block';
  host.style.width = '100%';
  host.style.minWidth = '0';
  host.style.maxWidth = '100%';
  host.style.isolation = 'isolate';

  const mountPoint = getMountPoint(host, 'smartsafehub-shadow-root');

  if (activeMountPoint && activeMountPoint !== mountPoint) {
    render(null, activeMountPoint);
  }

  activeMountPoint = mountPoint;
  render(<App />, mountPoint);
}

function mountLogin(): boolean {
  const host = document.getElementById(LOGIN_HOST_ID);

  if (!host) {
    return false;
  }

  host.style.display = 'block';
  host.style.width = '100%';
  host.style.minHeight = '100dvh';
  host.style.isolation = 'isolate';

  const mountPoint = getMountPoint(host, 'smartsafehub-login-shadow-root');

  if (loginMountPoint && loginMountPoint !== mountPoint) {
    render(null, loginMountPoint);
  }

  loginMountPoint = mountPoint;
  render(<LoginApp />, mountPoint);
  return true;
}

if (!mountLogin()) {
  const assetVersion = window.__SMARTHUB_BOOTSTRAP__?.assetVersion;

  if (assetVersion !== undefined) {
    window.__SMARTHUB_APP_ASSET_VERSION__ = assetVersion;
  } else {
    delete window.__SMARTHUB_APP_ASSET_VERSION__;
  }

  window.__SMARTHUB_APP_MOUNT__ = mount;
  window.__SMARTHUB_APP_UNMOUNT__ = unmount;
  mount();
}
