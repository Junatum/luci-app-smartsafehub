import { readFile } from 'node:fs/promises';
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
const backendEntry = await read(`${backendDirectory}smartsafehub.uc`);
const backendModules = {
  core: await read(`${backendDirectory}smartsafehub/core.uc`),
  devices: await read(`${backendDirectory}smartsafehub/devices.uc`),
  safeshield: await read(`${backendDirectory}smartsafehub/safeshield.uc`),
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
  'safeshield',
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
  'safeshield_set_enabled',
  'safeshield_refresh',
  'safeshield_rules_list',
  'safeshield_rule_add',
  'safeshield_rule_delete',
];

for (const method of backendMethods) {
  if (!backendEntry.includes(`${method}:`)) {
    throw new Error(`smartsafehub.uc does not register ${method}`);
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

const api = await read(`${frontendRoot}src/api/smartsafehub.ts`);
if (api.includes("'system_diagnostics'")) {
  throw new Error('Product API still uses the removed system_diagnostics RPC method');
}
if (api.includes('callRpc<ApiResponse')) {
  throw new Error('Product API methods must use the shared callApi() wrapper');
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

const luciLoader = await read(
  `${projectRoot}htdocs/luci-static/resources/view/smartsafehub/app.js`,
);
if (
  !luciLoader.includes('smartsafehub-product-view') ||
  !luciLoader.includes('body > header')
) {
  throw new Error('SmartSafeHub LuCI loader does not hide the legacy top navigation');
}

console.log('Verified SmartSafeHub source architecture and rpcd module contract.');
