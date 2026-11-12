import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const page = readFileSync(resolve(root, 'frontend/src/pages/NetworkWatchPage.tsx'), 'utf8');
const main = readFileSync(resolve(root, 'frontend/src/main.tsx'), 'utf8');
const makefile = readFileSync(resolve(root, 'Makefile'), 'utf8');
const css = readFileSync(resolve(root, 'frontend/src/styles/app.css'), 'utf8');
const begin = page.indexOf('<section aria-label="Network Watch 관찰 요약과 학습"');
const end = page.indexOf('기기별 외부 연결 현황', begin);
const overview = page.slice(begin, end);

test('Network Watch 상단은 한 개의 반응형 카드에 4가지 정보를 함께 배치한다', () => {
  assert.ok(begin > 0 && end > begin, 'single overview section must precede the device table');
  assert.match(overview, /grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5/);
  assert.match(overview, /sm:col-span-3 xl:col-span-2/);
  for (const label of ['현재 연결 수', '관찰된 기기 수', '마지막 갱신', '정상 통신 패턴 학습']) {
    assert.equal(overview.split(label).length - 1, 1, `${label} must appear once in the summary`);
  }
  assert.doesNotMatch(overview, /max-w-xs|grid gap-3 sm:grid-cols-3|기기별 정상 패턴 학습/);
  assert.match(overview, /\{formatNumber\(data\.totalConnections\)\}/);
  assert.match(overview, /\{formatNumber\(data\.totalDevices\)\}/);
  assert.match(overview, /formatRelativeTime\(data\.sampledAt\)/);
  assert.match(overview, /formatTimestamp\(data\.sampledAt\)/);
  assert.match(page, /\{ready && data \? <>/);
});

test('학습 진행률은 0~100%로 제한하고 7일과 14일 기준을 명확히 보여준다', () => {
  assert.match(page, /Number\.isFinite\(data\.trainingTargetDays\) && data\.trainingTargetDays > 0/);
  assert.match(page, /Number\.isFinite\(data\.trainingDays\)/);
  assert.match(page, /Math\.min\(trainingTarget, Math\.max\(0, data\.trainingDays\)\)/);
  assert.match(page, /Math\.min\(100, 100 \* trainingDays \/ trainingTarget\)/);
  assert.match(overview, /role="progressbar"/);
  assert.match(overview, /aria-valuemin=\{0\} aria-valuemax=\{trainingTarget\} aria-valuenow=\{trainingDays\}/);
  assert.match(overview, /style=\{\{ width: `\$\{trainingPercent\}%` \}\}/);
  assert.match(overview, /7일 · 기준 형성/);
  assert.match(overview, /\{trainingTarget\}일 · 안정화/);
  assert.match(overview, /최장 학습 기기 기준/, 'never imply all devices are trained');
  for (const stage of ['학습 중', '기준 형성', '기준 안정화']) {
    assert.ok(page.includes(stage));
  }
});

test('통합 UI는 기존 다크 모드 토큰을 재사용하며 패키지 revision과 자산 버전을 함께 갱신한다', () => {
  assert.match(overview, /border-slate-200 bg-white/);
  assert.match(overview, /bg-slate-100/);
  assert.match(css, /\.ssh-app\[data-theme='dark'\] \[class~='border-slate-200'\]/);
  assert.match(css, /\.ssh-app\[data-theme='dark'\] \[class~='bg-slate-100'\]/);
  assert.match(makefile, /PKG_RELEASE:=4/);
  assert.match(main, /assetVersion: host\.dataset\.assetVersion \?\? '0\.2\.33-r4'/);
});
