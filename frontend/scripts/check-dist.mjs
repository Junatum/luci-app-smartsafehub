import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const outputDirectory = new URL(
  '../../root/www/luci-static/smartsafehub/',
  import.meta.url,
);

const requiredFiles = ['app.js', 'app.css'];

for (const filename of requiredFiles) {
  const url = new URL(filename, outputDirectory);
  await access(url, constants.R_OK);
  const details = await stat(url);

  if (details.size === 0) {
    throw new Error(`${filename} is empty`);
  }
}

const javascript = await readFile(new URL('app.js', outputDirectory), 'utf8');
const stylesheet = await readFile(new URL('app.css', outputDirectory), 'utf8');

if (!javascript.includes('smartsafehub-entry-root')) {
  throw new Error('app.js does not contain the unified SmartSafeHub public host element');
}

if (!javascript.includes('attachShadow')) {
  throw new Error('app.js does not mount SmartSafeHub in a shadow root');
}

for (const obsoleteGlobal of [
  '__SMARTHUB_APP_MOUNT__',
  '__SMARTHUB_APP_UNMOUNT__',
  '__SMARTHUB_APP_ASSET_VERSION__',
]) {
  if (javascript.includes(obsoleteGlobal)) {
    throw new Error(`app.js still contains obsolete LuCI view lifecycle global: ${obsoleteGlobal}`);
  }
}

for (const loginContract of [
  'smartsafehub/session',
  'luci_username',
  'luci_password',
  'X-LuCI-Login-Required',
  '다시 오신 것을 환영합니다',
]) {
  if (!javascript.includes(loginContract)) {
    throw new Error(`app.js does not contain the Preact login contract: ${loginContract}`);
  }
}

for (const entryContract of [
  'admin/ubus',
  'smartsafehub',
  'sessionId',
  'smartsafehub-entry-root',
]) {
  if (!javascript.includes(entryContract)) {
    throw new Error(`app.js does not contain the unified entry contract: ${entryContract}`);
  }
}

if (javascript.includes('기존 로그인 세션을 확인하고 있습니다')) {
  throw new Error('app.js still contains the old admin-route session probe');
}

if (!javascript.includes('RPC_TIMEOUT') || !javascript.includes('AbortController')) {
  throw new Error('app.js does not contain RPC timeout handling');
}

if (!javascript.includes('admin/logout') || !javascript.includes('로그아웃')) {
  throw new Error('app.js does not contain the product logout action');
}

for (const mobileContract of ['모바일 메뉴 열기', 'smartsafehub-mobile-menu']) {
  if (!javascript.includes(mobileContract)) {
    throw new Error(`app.js does not contain the mobile navigation contract: ${mobileContract}`);
  }
}

if (!javascript.includes('ssh-product-hero') || !javascript.includes('고급 설정')) {
  throw new Error('app.js does not contain the full-width product navigation shell');
}

for (const method of [
  'connected_devices',
  'wifi_summary',
  'wifi_update',
  'system_reboot',
  'set_enabled',
  'refresh',
  'rules_list',
  'rule_add',
  'rule_delete',
]) {
  if (!javascript.includes(method)) {
    throw new Error(`app.js does not contain the ${method} API call`);
  }
}

for (const obsoleteMethod of [
  'safeshield_set_enabled',
  'safeshield_refresh',
  'safeshield_rules_list',
  'safeshield_rule_add',
  'safeshield_rule_delete',
]) {
  if (javascript.includes(obsoleteMethod)) {
    throw new Error(`app.js still contains obsolete SmartSafeHub proxy ${obsoleteMethod}`);
  }
}

if (javascript.includes('system_diagnostics')) {
  throw new Error('app.js still contains the removed system_diagnostics API call');
}

if (!javascript.includes('Promise.allSettled')) {
  throw new Error('app.js does not build diagnostics from parallel detail requests');
}

if (!javascript.includes('safeshield') || !javascript.includes('status')) {
  throw new Error('app.js does not contain the direct SafeShield status API call');
}

if (!javascript.includes('로컬 규칙을 DNS에 적용하고 있습니다')) {
  throw new Error('app.js does not contain the SafeShield local-rule fast apply integration');
}

if (javascript.includes('safeshield_status')) {
  throw new Error('app.js still contains the deadlocking SafeShield proxy method');
}

if (!stylesheet.includes(':host')) {
  throw new Error('app.css does not define the SmartSafeHub shadow host');
}
if (!stylesheet.includes('.smartsafehub-shadow-root')) {
  throw new Error('app.css does not define the Shadow DOM mount root');
}

for (const loginStyle of [
  '.smartsafehub-login-shadow-root',
  '.ssh-login-page',
  '.ssh-login-card',
]) {
  if (!stylesheet.includes(loginStyle)) {
    throw new Error(`app.css does not contain the Preact login style: ${loginStyle}`);
  }
}

console.log(`Verified frontend output: ${fileURLToPath(outputDirectory)}`);
