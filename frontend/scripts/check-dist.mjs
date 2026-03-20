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

if (!javascript.includes('smartsafehub-root')) {
  throw new Error('app.js does not contain the SmartSafeHub host element');
}

if (!javascript.includes('attachShadow')) {
  throw new Error('app.js does not mount SmartSafeHub in a shadow root');
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
  'safeshield_set_enabled',
  'safeshield_refresh',
  'safeshield_rules_list',
  'safeshield_rule_add',
  'safeshield_rule_delete',
]) {
  if (!javascript.includes(method)) {
    throw new Error(`app.js does not contain the ${method} API call`);
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

if (javascript.includes('safeshield_status')) {
  throw new Error('app.js still contains the deadlocking SafeShield proxy method');
}

if (!stylesheet.includes(':host')) {
  throw new Error('app.css does not define the SmartSafeHub shadow host');
}
if (!stylesheet.includes('.smartsafehub-shadow-root')) {
  throw new Error('app.css does not define the Shadow DOM mount root');
}

console.log(`Verified frontend output: ${fileURLToPath(outputDirectory)}`);
