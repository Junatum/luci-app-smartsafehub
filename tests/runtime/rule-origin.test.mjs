import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const page = readFileSync(resolve(root, 'frontend/src/pages/SafeShieldRulesPage.tsx'), 'utf8');
const rpc = readFileSync(resolve(root, 'root/usr/share/rpcd/ucode/smartsafehub/device-registration.uc'), 'utf8');
const helper = readFileSync(resolve(root, 'root/usr/libexec/smartsafehub-recommended-rules'), 'utf8');

test('추천 규칙 영역에서 웹사이트의 추천 목록으로 이동할 수 있다', () => {
  assert.match(page, /aria-label="추천 사용자 규칙"/);
  assert.match(page, /추천 규칙 보기/);
  assert.match(page, /https:\/\/www\.smartsafehub\.com\/dashboard\/recommended-rules\//);
});

test('허용 목록의 수동 규칙과 추천 규칙을 로컬 소유 정보로 구분한다', () => {
  assert.match(rpc, /recommended-rules\.state/);
  assert.match(rpc, /domains: domains/);
  assert.match(helper, /grep -Fxq "\$domain" "\$OWNED"/);
  assert.match(page, /const cloudManaged = isAllow && recommendedKnown && recommendedDomains\.includes\(domain\);/);
  assert.match(page, /cloudManaged \? '추천 규칙' : '직접 추가'/);
  assert.match(page, /disabled=\{busy \|\| cloudManaged\}/);
});

test('허용 규칙 출처를 조회하지 못하면 직접 추가로 단정하지 않는다', () => {
  assert.match(page, /const ruleOrigin = !isAllow \|\| recommendedKnown/);
  assert.match(page, /: null;/);
  assert.match(page, /recommendedKnown=\{recommendedKnown\}/g);
  assert.match(page, /!onLoadRecommendedRulesStatus\) return;/);
  assert.doesNotMatch(page, /from ['"]\.\.\/api\//);
});


test('추천 규칙 수동 동기화와 적용 확인 상태는 데모 API를 사용하지 않는다', () => {
  const app = readFileSync(resolve(root, 'frontend/src/app/App.tsx'), 'utf8');
  const api = readFileSync(resolve(root, 'frontend/src/api/smartsafehub.ts'), 'utf8');
  const main = readFileSync(resolve(root, 'root/usr/share/rpcd/ucode/smartsafehub.uc'), 'utf8');
  const acl = readFileSync(resolve(root, 'root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json'), 'utf8');
  const device = readFileSync(resolve(root, 'root/usr/libexec/smartsafehub-device'), 'utf8');
  assert.match(page, /onSyncRecommendedRules\?: \(\) => Promise<RecommendedRulesStatus>/);
  assert.match(page, /지금 동기화/);
  assert.match(page, /SafeShield 차단 목록 갱신과 별개/);
  assert.match(page, /status\.syncStatus === 'confirmed'/);
  assert.match(page, /recommendedStatus\.confirmedDomains\.length/);
  assert.match(app, /onSyncRecommendedRules=\{refreshRecommendedRulesStatus\}/);
  assert.match(api, /callApi\(API_OBJECT, 'device_recommended_rules_refresh'/);
  assert.match(main, /device_recommended_rules_refresh/);
  assert.match(acl, /"device_recommended_rules_refresh"/);
  assert.match(device, /write_recommended_sync_status failed/);
  assert.match(device, /write_recommended_sync_status confirmed/);
  assert.match(rpc, /device\?\.lastResult == 'failed' \|\| sync\?\.status == 'failed'/);
  assert.match(rpc, /const confirmed = revision != null && receipt\?\.status == 'confirmed'/);
  assert.doesNotMatch(page, /from ['"]\.\.\/api\//);
});
