import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const page = readFileSync(resolve(root, 'frontend/src/pages/SafeShieldRulesPage.tsx'), 'utf8');
const rpc = readFileSync(resolve(root, 'root/usr/share/rpcd/ucode/smartsafehub/device-registration.uc'), 'utf8');
const helper = readFileSync(resolve(root, 'root/usr/libexec/smartsafehub-recommended-rules'), 'utf8');

test('추천 규칙 영역은 공식 추천과 커뮤니티를 구분하여 안내한다', () => {
  assert.match(page, /aria-label="추천 규칙 분류"/);
  assert.match(page, /공식 추천<\/span>/);
  assert.match(page, /커뮤니티<\/span>/);
  assert.match(page, /관리자가 검토한 커뮤니티 허용 규칙/);
  assert.doesNotMatch(page, /다른 사용자가 공유한 검증된 허용 규칙/);
});

test('허용 목록의 수동 규칙과 추천 규칙을 로컬 소유 정보로 구분한다', () => {
  assert.match(rpc, /recommended-rules\.state/);
  assert.match(rpc, /domains: domains/);
  assert.match(helper, /grep -Fxq "\$domain" "\$OWNED"/);
  assert.match(page, /const cloudManaged = isAllow && recommendedDomains\.includes\(domain\);/);
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
