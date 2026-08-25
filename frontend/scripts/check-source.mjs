import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

async function read(path) {
  return readFile(path, 'utf8');
}

function lines(source) {
  return source.split(/\r?\n/).length;
}

const frontendFiles = [
  'src/app/App.tsx',
  'src/app/routes.ts',
  'src/components/AppShell.tsx',
  'src/components/ProductHeader.tsx',
  'src/components/ProductNavigation.tsx',
  'src/hooks/useAsyncResource.ts',
  'src/utils/errors.ts',
  'src/utils/download.ts',
  'src/utils/luci.ts',
];

for (const relativePath of frontendFiles) {
  await read(`${frontendRoot}${relativePath}`);
}

const backendDirectory = `${projectRoot}root/usr/share/rpcd/ucode/`;
try {
  await access(`${backendDirectory}smartsafehub/entry.uc`);
  throw new Error('obsolete smartsafehub/entry.uc must be removed');
} catch (error) {
  if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) {
    throw error;
  }
}

const backendEntry = await read(`${backendDirectory}smartsafehub.uc`);
const backendModules = {
  core: await read(`${backendDirectory}smartsafehub/core.uc`),
  devices: await read(`${backendDirectory}smartsafehub/devices.uc`),
  system: await read(`${backendDirectory}smartsafehub/system.uc`),
  wifi: await read(`${backendDirectory}smartsafehub/wifi.uc`),
  wifiManagement: await read(
    `${backendDirectory}smartsafehub/wifi-management.uc`,
  ),
};

const rpcdSources = {
  entry: backendEntry,
  ...backendModules,
};

for (const [sourceName, source] of Object.entries(rpcdSources)) {
  if (/import\s*\{[\s\S]*?,\s*\}\s*from/.test(source)) {
    throw new Error(
      `${sourceName}.uc contains a trailing comma in a named import; ` +
        'the OpenWrt ucode parser rejects this syntax',
    );
  }

  let inExportFunction = false;
  let exportFunctionLine = 0;
  const sourceLines = source.split('\n');

  for (let index = 0; index < sourceLines.length; index += 1) {
    const line = sourceLines[index];

    if (/^export\s+function\s+/.test(line)) {
      inExportFunction = true;
      exportFunctionLine = index + 1;
      continue;
    }

    if (inExportFunction && /^}/.test(line)) {
      if (!/^};\s*$/.test(line)) {
        throw new Error(
          `${sourceName}.uc:${exportFunctionLine} exported function must end with };`,
        );
      }

      inExportFunction = false;
    }
  }
}

for (const moduleName of [
  'devices',
  'system',
  'wifi-management',
]) {
  if (!backendEntry.includes(`./smartsafehub/${moduleName}.uc`)) {
    throw new Error(`smartsafehub.uc does not import ${moduleName}.uc`);
  }
}

if (!backendModules.devices.includes("from './core.uc'")) {
  throw new Error('devices.uc does not import core.uc');
}
if (!backendModules.devices.includes("from './wifi.uc'")) {
  throw new Error('devices.uc does not import wifi.uc');
}
if (!backendModules.devices.includes('wifi_band')) {
  throw new Error('devices.uc does not import wifi_band');
}
if (!backendModules.wifi.includes('export function wifi_band')) {
  throw new Error('wifi.uc does not export wifi_band');
}
if (!backendModules.wifi.includes('export function wifi_is_managed_section')) {
  throw new Error('wifi.uc does not export wifi_is_managed_section');
}
if (!backendModules.wifiManagement.includes('wifi_is_managed_section')) {
  throw new Error('wifi-management.uc does not use wifi_is_managed_section');
}
if (!backendModules.wifiManagement.includes("from './wifi.uc'")) {
  throw new Error('wifi-management.uc does not import wifi.uc');
}

const backendMethods = [
  'status',
  'connected_devices',
  'wifi_summary',
  'wifi_update',
  'system_reboot',
];

for (const method of backendMethods) {
  if (!backendEntry.includes(`${method}:`)) {
    throw new Error(`smartsafehub.uc does not register ${method}`);
  }
}

try {
  await access(`${backendDirectory}smartsafehub/safeshield.uc`);
  throw new Error(
    'SmartSafeHub must not own SafeShield controller logic; remove smartsafehub/safeshield.uc',
  );
} catch (error) {
  if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) {
    throw error;
  }
}

if (backendEntry.includes('./smartsafehub/safeshield.uc')) {
  throw new Error('smartsafehub.uc must not import a SafeShield proxy module');
}

for (const obsoleteMethod of [
  'safeshield_set_enabled',
  'safeshield_refresh',
  'safeshield_rules_list',
  'safeshield_rule_add',
  'safeshield_rule_delete',
]) {
  if (backendEntry.includes(`${obsoleteMethod}:`)) {
    throw new Error(`smartsafehub.uc still exposes ${obsoleteMethod}`);
  }
}

if (!backendEntry.includes('return { smartsafehub: methods };')) {
  throw new Error('smartsafehub.uc does not return the rpcd signature');
}

if (lines(backendEntry) > 160) {
  throw new Error('smartsafehub.uc must remain a small rpcd composition root');
}

for (const [moduleName, source] of Object.entries(backendModules)) {
  if (!source.includes('export function')) {
    throw new Error(`${moduleName}.uc does not export a public service function`);
  }
}

const app = await read(`${frontendRoot}src/app/App.tsx`);
if (!app.includes('<AppShell') || lines(app) > 220) {
  throw new Error('App.tsx must remain a small composition root using AppShell');
}

const appShell = await read(`${frontendRoot}src/components/AppShell.tsx`);
if (
  !appShell.includes('<ProductHeader') ||
  !appShell.includes('<ProductNavigation') ||
  lines(appShell) > 100
) {
  throw new Error('AppShell.tsx must only compose shared product chrome');
}

const loginApp = await read(`${frontendRoot}src/login/LoginApp.tsx`);
const frontendMain = await read(`${frontendRoot}src/main.tsx`);
const loginTemplate = await read(
  `${projectRoot}root/usr/share/ucode/luci/template/smartsafehub/login.ut`,
);
const menu = JSON.parse(
  await read(`${projectRoot}root/usr/share/luci/menu.d/luci-app-smartsafehub.json`),
);
const loginRoute = menu.smartsafehub;

if (
  loginRoute?.action?.type !== 'template' ||
  loginRoute?.action?.path !== 'smartsafehub/login' ||
  JSON.stringify(loginRoute?.auth) !== '{}'
) {
  throw new Error(
    'SmartSafeHub public login route is not registered as an unauthenticated template',
  );
}

for (const contract of [
  "import { LoginApp } from './login/LoginApp'",
  "const LOGIN_HOST_ID = 'smartsafehub-login-root'",
  'render(<LoginApp />, mountPoint)',
]) {
  if (!frontendMain.includes(contract)) {
    throw new Error(`main.tsx does not contain Preact login contract: ${contract}`);
  }
}

for (const contract of [
  "body.set('luci_username'",
  "body.set('luci_password'",
  "credentials: 'same-origin'",
  'X-LuCI-Login-Required',
  'Welcome back',
  '<form',
]) {
  if (!loginApp.includes(contract)) {
    throw new Error(`LoginApp.tsx does not contain login contract: ${contract}`);
  }
}

for (const contract of [
  'smartsafehub-login-root',
  'data-asset-base',
  'data-asset-version',
  'app.js?v=0.2.0-r10',
]) {
  if (!loginTemplate.includes(contract)) {
    throw new Error(`SmartSafeHub login template does not contain: ${contract}`);
  }
}

for (const obsoleteAsset of ['login.js', 'login.css']) {
  try {
    await access(`${projectRoot}root/www/luci-static/smartsafehub/${obsoleteAsset}`);
    throw new Error(
      `SmartSafeHub login must be Preact-based; remove standalone ${obsoleteAsset}`,
    );
  } catch (error) {
    if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }
}

for (const obsoleteAsset of ['login.js', 'login.css']) {
  try {
    await access(`${projectRoot}root/www/luci-static/smartsafehub/${obsoleteAsset}`);
    throw new Error(
      `SmartSafeHub login must be Preact-based; remove standalone ${obsoleteAsset}`,
    );
  } catch (error) {
    if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }
}

const productNavigation = await read(
  `${frontendRoot}src/components/ProductNavigation.tsx`,
);
for (const navigationContract of [
  "luciAdminUrl('/admin/logout')",
  'smartsafehub-mobile-menu',
  'aria-expanded={mobileMenuOpen}',
  'md:hidden',
]) {
  if (!productNavigation.includes(navigationContract)) {
    throw new Error(
      `ProductNavigation.tsx does not contain contract: ${navigationContract}`,
    );
  }
}

const rpc = await read(`${frontendRoot}src/api/rpc.ts`);
for (const rpcContract of [
  'AbortController',
  'RPC_TIMEOUT',
  'parseJsonRpcResponse',
  'payload.id !== requestIdentifier',
]) {
  if (!rpc.includes(rpcContract)) {
    throw new Error(`rpc.ts does not contain contract: ${rpcContract}`);
  }
}

const api = await read(`${frontendRoot}src/api/smartsafehub.ts`);
if (api.includes("'system_diagnostics'")) {
  throw new Error('Product API still uses the removed system_diagnostics RPC method');
}
if (api.includes('callRpc<ApiResponse')) {
  throw new Error('Product API methods must use the shared callApi() wrapper');
}

const safeshieldApi = await read(`${frontendRoot}src/api/safeshield.ts`);
for (const method of [
  'status',
  'config',
  'config_update',
  'set_enabled',
  'refresh',
  'rules_list',
  'rule_add',
  'rule_delete',
  'license_update',
]) {
  if (!safeshieldApi.includes(`'${method}'`)) {
    throw new Error(`safeshield.ts does not consume official safeshield.${method}`);
  }
}
if (!safeshieldApi.includes("const API_OBJECT = 'safeshield'")) {
  throw new Error('safeshield.ts does not use the official safeshield ubus object');
}

const safeshieldRules = await read(`${frontendRoot}src/hooks/useSafeShieldRules.ts`);
for (const contract of [
  'LOCAL_APPLY_POLL_INTERVAL_MS',
  'lastLocalApply',
  'lastLocalApplyFailure',
  'addSafeShieldRule(action, domain, true)',
  'deleteSafeShieldRule(action, domain, true)',
]) {
  if (!safeshieldRules.includes(contract)) {
    throw new Error(`useSafeShieldRules.ts does not contain local-rule fast-apply contract: ${contract}`);
  }
}
if (safeshieldRules.includes('requestSafeShieldRefresh()')) {
  throw new Error('useSafeShieldRules.ts still starts a full Hub refresh for local rule mutations');
}
for (const obsoleteMethod of [
  'safeshield_set_enabled',
  'safeshield_refresh',
  'safeshield_rules_list',
  'safeshield_rule_add',
  'safeshield_rule_delete',
]) {
  if (api.includes(obsoleteMethod) || safeshieldApi.includes(obsoleteMethod)) {
    throw new Error(`frontend still uses obsolete SmartSafeHub proxy ${obsoleteMethod}`);
  }
}

const acl = JSON.parse(
  await read(`${projectRoot}root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json`),
);
const aclRoot = acl['luci-app-smartsafehub'];
const safeshieldReadAcl = aclRoot?.read?.ubus?.safeshield ?? [];
const safeshieldWriteAcl = aclRoot?.write?.ubus?.safeshield ?? [];
for (const method of ['status', 'config', 'rules_list']) {
  if (!safeshieldReadAcl.includes(method)) {
    throw new Error(`SmartSafeHub ACL does not grant safeshield.${method} read access`);
  }
}
for (const method of [
  'config_update',
  'set_enabled',
  'refresh',
  'rule_add',
  'rule_delete',
  'license_update',
]) {
  if (!safeshieldWriteAcl.includes(method)) {
    throw new Error(`SmartSafeHub ACL does not grant safeshield.${method} write access`);
  }
}

const systemActions = await read(`${frontendRoot}src/hooks/useSystemActions.ts`);
for (const contract of [
  'Promise.allSettled',
  'fetchWifiSummary()',
  'fetchSafeShieldStatus()',
]) {
  if (!systemActions.includes(contract)) {
    throw new Error(`useSystemActions.ts does not contain contract: ${contract}`);
  }
}
if (systemActions.includes('fetchSystemDiagnostics')) {
  throw new Error('useSystemActions.ts still calls the removed diagnostics RPC');
}

const asyncResource = await read(`${frontendRoot}src/hooks/useAsyncResource.ts`);
if (asyncResource.includes('setInterval(')) {
  throw new Error('useAsyncResource must not start overlapping interval requests');
}
if (!asyncResource.includes("visibilitychange")) {
  throw new Error('useAsyncResource does not pause polling in hidden tabs');
}

if (!asyncResource.includes('requested.current = false')) {
  throw new Error('useAsyncResource does not reload data after route reactivation');
}

function findUntranslatedStrings(source, relativePath) {
  const issues = [];
  const lines = source.split(/\r?\n/);

  const userFacingAttributes = [
    'aria-label',
    'title',
    'placeholder',
    'label',
    'description',
    'eyebrow',
    'fallbackError',
    'heading',
    'subtitle',
    'message',
  ].join('|');

  const attributePattern = new RegExp(
    `\\b(?:${userFacingAttributes})\\s*[:=]\\s*(["'])(?!\\{t\\()(?!\\{\\s*t\\()([^"\\1>]{2,})\\1`,
    'g',
  );

  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];

    if (/^\s*\/\//.test(line)) {
      continue;
    }

    const commentIndex = line.indexOf(' // ');
    if (commentIndex >= 0) {
      line = line.slice(0, commentIndex);
    }

    // JSX text nodes containing bare English text
    // Avoid matching arrow/type syntax like `=> Promise<`
    const textMatch = line.match(/(?<![=])>\s*([A-Za-z][^<{]*[A-Za-z])\s*</);
    if (textMatch && textMatch[1].trim().length > 1) {
      issues.push(`${relativePath}:${index + 1}: bare JSX text "${textMatch[1].trim()}"`);
    }

    let attributeMatch;
    while ((attributeMatch = attributePattern.exec(line)) !== null) {
      const value = attributeMatch[2];
      if (/[A-Za-z]/.test(value) && !/^\d+(\.\d+)?$/.test(value)) {
        issues.push(`${relativePath}:${index + 1}: untranslated ${attributeMatch[0].split(/[:=]/)[0]} "${value}"`);
      }
    }
  }

  return issues;
}

const uiSourceFiles = [
  'src/app/routes.ts',
  'src/components/ProductHeader.tsx',
  'src/components/ProductNavigation.tsx',
  'src/components/StatePanels.tsx',
  'src/pages/HomePage.tsx',
  'src/pages/ConnectedDevicesPage.tsx',
  'src/pages/SystemPage.tsx',
  'src/pages/WifiPage.tsx',
  'src/pages/SafeShieldPage.tsx',
  'src/pages/SafeShieldRulesPage.tsx',
  'src/login/LoginApp.tsx',
  'src/hooks/useSystemActions.ts',
  'src/hooks/useSafeShieldActions.ts',
  'src/hooks/useSafeShieldRules.ts',
  'src/hooks/useWifi.ts',
  'src/hooks/useStatus.ts',
  'src/hooks/useConnectedDevices.ts',
  'src/hooks/useSafeShieldStatus.ts',
  'src/api/rpc.ts',
  'src/api/safeshield.ts',
  'src/app/format.ts',
];

const untranslatedIssues = [];
for (const relativePath of uiSourceFiles) {
  const source = await read(`${frontendRoot}${relativePath}`);
  untranslatedIssues.push(...findUntranslatedStrings(source, relativePath));
}

if (untranslatedIssues.length > 0) {
  for (const issue of untranslatedIssues) {
    console.error(`Untranslated user-visible string: ${issue}`);
  }
  throw new Error(`Found ${untranslatedIssues.length} untranslated user-visible string(s)`);
}

for (const relativePath of uiSourceFiles) {
  const source = await read(`${frontendRoot}${relativePath}`);
  if (/Intl\.(?:Collator|DateTimeFormat|NumberFormat)\(['"]ko(?:-KR)?['"]/.test(source)) {
    throw new Error(`${relativePath} contains a hard-coded Korean Intl locale`);
  }
}

const main = await read(`${frontendRoot}src/main.tsx`);
if (!main.includes('__SMARTHUB_APP_UNMOUNT__') || !main.includes('render(null')) {
  throw new Error('main.tsx does not expose the Preact unmount lifecycle');
}

if (!backendModules.system.includes('SYSTEM_BOARD_REQUEST_FAILED')) {
  throw new Error('system.uc does not handle the initial deferred request failure');
}
if (!backendModules.wifiManagement.includes('WIFI_UPDATE_LOCK')) {
  throw new Error('wifi-management.uc does not serialize concurrent updates');
}
if (!backendModules.wifiManagement.includes('valid_wifi_password(current_key)')) {
  throw new Error('wifi-management.uc does not validate a reused Wi-Fi password');
}

const luciLoader = await read(
  `${projectRoot}htdocs/luci-static/resources/view/smartsafehub/app.js`,
);
if (
  !luciLoader.includes('smartsafehub-product-view') ||
  !luciLoader.includes('body > header')
) {
  throw new Error('SmartSafeHub LuCI loader does not hide the legacy top navigation');
}

for (const loaderContract of [
  '__SMARTHUB_APP_UNMOUNT__',
  'renderApplicationLoadError',
  'SCRIPT_LOADING_KEY',
]) {
  if (!luciLoader.includes(loaderContract)) {
    throw new Error(`SmartSafeHub LuCI loader does not contain: ${loaderContract}`);
  }
}

console.log('Verified SmartSafeHub source architecture and rpcd module contract.');
