// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { ROUTE_BY_NAME, DEMO_ROUTES } from '../../frontend/src/app/routes.ts';

const root = new URL('../../', import.meta.url);
const source = (p) => readFileSync(new URL(p, root), 'utf8');
const acl = JSON.parse(source('root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json'));
const app = source('frontend/src/app/App.tsx');
const login = source('root/usr/share/ucode/luci/template/smartsafehub/login.ut');
const nav = source('frontend/src/components/ProductNavigation.tsx');
const page = source('frontend/src/pages/SmartHomePage.tsx');
const api = source('frontend/src/api/jarbis.ts');

test('스마트홈 메뉴는 실기기 화면에만 노출하고 Jarbis 없을 때도 다른 메뉴는 유지한다', () => {
  assert.equal(ROUTE_BY_NAME.smarthome.hash, '#smarthome');
  assert.ok(!DEMO_ROUTES.includes('smarthome'));
  assert.match(nav, /\{ label: 'Smart Home', routes: \['smarthome'\] \}/);
  assert.match(nav, /\{ label: 'Explore', routes: \['apps'\] \}/);
  assert.ok(nav.indexOf("{ label: 'Smart Home'") < nav.indexOf("{ label: 'Explore'"), '스마트홈은 Apps 앞에 독립 그룹으로 표시해야 합니다');
  assert.doesNotMatch(nav, /routes: \['smarthome', 'apps'\]/);
  assert.match(app, /case 'smarthome':[\s\S]*<SmartHomePage/);
  assert.match(page, /Jarbis를 설치해야 합니다/);
  assert.ok(login.includes('data-asset-version="0.2.33-r6"'));
  assert.ok(login.includes('app.js?v=0.2.33-r6'));
});

test('Jarbis RPC는 기존 세션 ACL로 전원·등록·검색·설정을 분리한다', () => {
  const group = acl['luci-app-smartsafehub'];
  const read = group.read.ubus.jarbis;
  const write = group.write.ubus.jarbis;
  assert.deepEqual(read, ['status', 'devices_list', 'discovery_list']);
  for (const method of ['settings_update','device_add','device_update','device_remove','light_set','discovery_scan','broker_credentials']) {
    assert.ok(write.includes(method), `Jarbis write ACL missing: ${method}`);
    assert.ok(!read.includes(method), `Jarbis write leaked into read: ${method}`);
    assert.match(api, new RegExp(`'${method}'`));
  }
  assert.match(api, /scanJarbis = .*35000/);
});

test('명시적으로 승인한 기기만 등록하고 전원 명령을 실제 상태로 오인하지 않는다', () => {
  assert.match(page, /window\.confirm/);
  assert.match(page, /candidate\.registered/);
  assert.match(page, /candidate\.topic/);
  assert.match(page, /실제 전구 점등을 확인하세요/);
  assert.match(page, /실제 전구 상태 수신을 의미하지 않습니다/);
  assert.match(page, /credentials \? '인증 정보 숨기기'/);
  assert.doesNotMatch(page, /localStorage|sessionStorage/);
  assert.doesNotMatch(api, /console\.log/);
});

test('MQTT 비밀번호는 Preact에서 허용하는 고정 input type으로 표시·숨기기를 전환한다', () => {
  assert.doesNotMatch(page, /type=\{reveal\s*\?/);
  assert.match(page, /\{reveal\s*\?\s*<input[^>]*type="text"[^>]*readOnly[^>]*aria-label="MQTT 비밀번호"/);
  assert.match(page, /:\s*<input[^>]*type="password"[^>]*readOnly[^>]*aria-label="MQTT 비밀번호"/);
  assert.match(page, /onClick=\{\(\) => setReveal\(!reveal\)\}/);
  assert.doesNotMatch(page, /<label[^>]*>[\s\S]*?aria-label="MQTT 비밀번호"/);
});
