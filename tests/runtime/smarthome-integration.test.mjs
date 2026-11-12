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
  assert.ok(login.includes('data-asset-version="0.2.33-r10"'));
  assert.ok(login.includes('app.js?v=0.2.33-r10'));
});

test('Jarbis RPC는 기존 세션 ACL로 전원·등록·검색·설정을 분리한다', () => {
  const group = acl['luci-app-smartsafehub'];
  const read = group.read.ubus.jarbis;
  const write = group.write.ubus.jarbis;
  assert.deepEqual(read, ['status', 'devices_list', 'light_state', 'discovery_list']);
  for (const method of ['settings_update','device_add','device_update','device_remove','device_pair','light_set','discovery_scan','broker_credentials']) {
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
  assert.match(page, /전구의 상태 응답에서 변경된 값을 확인했습니다/);
  assert.match(page, /응답이 없으면 상태 확인 불가로 표시합니다/);
  assert.match(page, /credentials \? '인증 정보 숨기기'/);
  assert.doesNotMatch(page, /localStorage|sessionStorage/);
  assert.doesNotMatch(api, /console\.log/);
});

test('MQTT 비밀번호는 Preact에서 허용하는 고정 input type으로 표시·숨기기를 전환한다', () => {
  assert.doesNotMatch(page, /type=\{reveal\s*\?/);
  assert.match(page, /\{reveal\s*\?\s*<input[^>]*type="text"[^>]*readOnly[^>]*aria-label="MQTT 비밀번호"/);
  assert.match(page, /:\s*<input[^>]*type="password"[^>]*readOnly[^>]*aria-label="MQTT 비밀번호"/);
  assert.match(page, /onClick=\{\(\) => setReveal\(!reveal\)\}/);
  assert.doesNotMatch(page, /<label[^>]*>MQTT 비밀번호/);
});


test('스마트 전구는 사용자 승인 후 자동 연결하고 관리자 암호를 저장하지 않는다', () => {
  assert.match(api, /pairJarbisDevice = /);
  assert.match(api, /'device_pair'/);
  assert.match(api, /replace_existing/);
  assert.match(page, /추가 및 자동 연결/);
  assert.match(page, /전구 웹 관리자 비밀번호/);
  assert.match(page, /기존 연결을 변경하는 데 동의/);
  assert.match(page, /mqttConfirmed/);
  assert.match(page, /setAdminPassword\(''\)/);
  assert.doesNotMatch(page, /localStorage|sessionStorage/);
  assert.doesNotMatch(api, /console\.log|console\.error/);
});


test('스마트홈은 공통 화면 제목과 서비스 토글, 등록 기기 중심의 반응형 카드로 표시한다', () => {
  assert.match(page, /<SectionHeading eyebrow="Smart Home" title="스마트 전구"/);
  assert.match(page, /aria-label="스마트홈 서비스 현황"/);
  assert.match(page, /role="switch" aria-checked=\{Boolean\(status\?\.enabled\)\}/);
  assert.match(page, /aria-label="등록된 전구"/);
  assert.match(page, /lg:grid-cols-2/);
  assert.match(page, /type="range" min="0" max="100" step="5"/);
  assert.match(page, /aria-label="새 전구 찾기"/);
  assert.ok(page.indexOf('aria-label="등록된 전구"') < page.indexOf('aria-label="새 전구 찾기"'));
  assert.match(page, /availableCandidates = candidates.filter\(candidate => !candidate.registered\)/);
  assert.match(page, /aria-busy=\{busy === 'scan'\}/);
});

test('인증 비밀번호와 MQTT 비밀번호를 구분하고 실패할 때만 추가 옵션을 제안한다', () => {
  assert.match(page, /전구 웹 관리자 비밀번호 \(설정한 경우에만\)/);
  assert.match(page, /Configuration → Configure Other → Web Admin Password/);
  assert.match(page, /공유기 로그인 비밀번호나 MQTT 비밀번호가 아닙니다/);
  assert.match(page, /설정하지 않았다면 비워두세요/);
  assert.match(page, /pairOptionsVisible/);
  assert.match(page, /관리자 인증\|비밀번호\|기존 연결/);
  assert.match(page, /고급 설정 · 연결 진단/);
  assert.match(page, /이 비밀번호는 전구 웹 관리자 비밀번호와 다릅니다/);
  assert.match(page, /setAdminPassword\(''\)/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|console\.(log|error)/);
});

test('MQTT 메시지 전송을 실제 전구 점등이나 연결 확정으로 표시하지 않는다', () => {
  assert.match(page, /전구 제어 연결/);
  assert.match(page, /연결 준비됨/);
  assert.match(page, /상태 확인 불가/);
  assert.match(page, /전구에서 보내온 MQTT 상태 응답/);
  assert.match(page, /전구의 상태 응답에서 변경된 값을 확인했습니다/);
  assert.match(page, /mqttConfirmed/);
  assert.doesNotMatch(page, /'전구가 켜졌습니다'|'전구가 꺼졌습니다'/);
});

test('스마트홈 UI는 다른 화면과 동일한 다크 모드 토큰을 사용한다', () => {
  const css = source('frontend/src/styles/app.css');
  assert.match(page, /rounded-2xl border border-slate-200 bg-white/);
  assert.doesNotMatch(page, /bg-teal-50\/40|bg-slate-50\/60/);
  for (const token of ['bg-white','bg-slate-50','bg-teal-50','text-slate-900','border-slate-200']) {
    assert.ok(css.includes(`[class~='${token}']`), `${token}: 다크 모드 재정의가 필요합니다`);
  }
});


test('스마트홈 성공 알림은 5초 후 사라지고 직접 닫을 수 있으며 오류는 자동 삭제하지 않는다', () => {
  assert.match(page, /if \(!message\) return;/);
  assert.match(page, /window\.setTimeout\(\(\) => setMessage\(''\), 5000\)/);
  assert.match(page, /return \(\) => window\.clearTimeout\(timeout\)/);
  assert.match(page, /\}, \[message\]\)/);
  assert.match(page, /aria-label="성공 알림 닫기" onClick=\{\(\) => setMessage\(''\)\}/);
  assert.match(page, /role="status" aria-live="polite"/);
  assert.match(page, /sm:max-w-2xl/);
  assert.match(page, /role="alert" aria-live="assertive"/);
  assert.match(page, /onClick=\{\(\) => setError\(''\)\}/);
  assert.doesNotMatch(page, /setTimeout\(\(\) => setError/);
});

test('밝기 슬라이더가 실제 상태처럼 표시되지 않고 설정할 값이라고 안내한다', () => {
  assert.match(page, />밝기 조절<\/label>/);
  assert.match(page, /슬라이더에서 손을 떼면 밝기를 적용합니다/);
});


test('스마트홈은 전구 상태 확인과 RGB·색온도를 제공하되 응답 없는 기기를 온라인으로 오인하지 않는다', () => {
  assert.match(api, /getJarbisLightState = .*'light_state'/);
  assert.match(page, /state\.observed/);
  assert.match(page, /전구에서 확인한 현재 밝기/);
  assert.match(page, /상태 확인 불가/);
  assert.match(page, /type="color"/);
  assert.match(page, /min="2700" max="6500" step="100"/);
  assert.match(page, /onPointerUp=/);
  assert.match(page, /document\.visibilityState === 'hidden'/);
  assert.match(page, /window\.setInterval\(poll, 30000\)/);
  assert.match(page, /devices\.length > 1 \? 'lg:grid-cols-2' : 'lg:grid-cols-1'/);
});
