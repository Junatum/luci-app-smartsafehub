import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { KeyIcon, ShieldIcon, UserIcon, WifiIcon } from '../components/Icons';

type LoginPhase = 'probing' | 'ready' | 'submitting';

interface LoginEndpoints {
  applicationUrl: string;
  logoutUrl: string;
  publicUrl: string;
}

function resolveLuciBase(): string {
  const pathname = window.location.pathname.replace(/\/+$/, '');
  const publicSuffix = '/smartsafehub';

  if (pathname.endsWith(publicSuffix)) {
    return pathname.slice(0, -publicSuffix.length) || '/cgi-bin/luci';
  }

  const marker = '/cgi-bin/luci';
  const markerIndex = pathname.indexOf(marker);

  if (markerIndex >= 0) {
    return pathname.slice(0, markerIndex + marker.length);
  }

  return '/cgi-bin/luci';
}

function resolveEndpoints(): LoginEndpoints {
  const base = resolveLuciBase();

  return {
    applicationUrl: `${base}/admin/smartsafehub`,
    logoutUrl: `${base}/admin/logout`,
    publicUrl: `${base}/smartsafehub`,
  };
}

async function fetchWithSession(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'follow',
    ...options,
  });
}

function loginRequired(response: Response): boolean {
  return response.headers.get('X-LuCI-Login-Required') === 'yes';
}

function LoginFeature({
  icon,
  title,
  description,
}: {
  icon: JSX.Element;
  title: string;
  description: string;
}) {
  return (
    <div class="ssh-login-feature">
      <span class="ssh-login-feature-icon" aria-hidden="true">
        {icon}
      </span>
      <span class="ssh-login-feature-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
    </div>
  );
}

export function LoginApp() {
  const endpoints = useMemo(resolveEndpoints, []);
  const passwordInput = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [phase, setPhase] = useState<LoginPhase>('probing');
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const busy = phase === 'submitting';

  useEffect(() => {
    let cancelled = false;

    const showLogin = () => {
      if (cancelled) {
        return;
      }

      setPhase('ready');
      window.requestAnimationFrame(() => passwordInput.current?.focus());
    };

    const probe = async () => {
      if (new URLSearchParams(window.location.search).get('logout') === '1') {
        try {
          await fetchWithSession(endpoints.logoutUrl);
        } catch {
          // The previous session may already be gone. Keep the public page usable.
        }

        if (!cancelled) {
          window.history.replaceState(null, '', endpoints.publicUrl);
          showLogin();
        }
        return;
      }

      try {
        const response = await fetchWithSession(endpoints.applicationUrl);

        if (response.ok && !loginRequired(response)) {
          window.location.replace(endpoints.applicationUrl);
          return;
        }
      } catch {
        // A failed session probe must not prevent a manual login attempt.
      }

      showLogin();
    };

    void probe();

    return () => {
      cancelled = true;
    };
  }, [endpoints]);

  const updateCapsLock = (event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    setCapsLock(event.getModifierState?.('CapsLock') ?? false);
  };

  const submit = async (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const user = username.trim();
    const secret = password;

    setError(null);
    setShowFallback(false);

    if (!user || !secret) {
      setError('사용자 이름과 비밀번호를 입력해 주세요.');
      if (user) {
        passwordInput.current?.focus();
      }
      return;
    }

    setPhase('submitting');

    const body = new URLSearchParams();
    body.set('luci_username', user);
    body.set('luci_password', secret);

    try {
      const response = await fetchWithSession(endpoints.applicationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body,
      });

      if (response.ok && !loginRequired(response)) {
        setPassword('');
        window.location.replace(endpoints.applicationUrl);
        return;
      }

      setPassword('');
      setShowFallback(true);
      setError(
        '로그인하지 못했습니다. 계정 정보를 확인해 주세요. 추가 인증이 설정된 장치는 기본 LuCI 로그인에서 계속할 수 있습니다.',
      );
      window.requestAnimationFrame(() => passwordInput.current?.focus());
    } catch {
      setError(
        '공유기와 통신할 수 없습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
      );
    } finally {
      setPhase('ready');
    }
  };

  return (
    <main class="ssh-login-page">
      <section class="ssh-login-brand" aria-labelledby="ssh-login-brand-title">
        <div class="ssh-login-brand-orb ssh-login-brand-orb-one" aria-hidden="true" />
        <div class="ssh-login-brand-orb ssh-login-brand-orb-two" aria-hidden="true" />

        <div class="ssh-login-brand-content">
          <span class="ssh-login-brand-mark" aria-hidden="true">
            <ShieldIcon />
          </span>
          <p class="ssh-login-eyebrow">SMART NETWORK PROTECTION</p>
          <h1 id="ssh-login-brand-title">SmartSafeHub</h1>
          <p class="ssh-login-brand-description">
            가족의 인터넷을 더 안전하고 간편하게 관리하세요. 보호 상태부터 Wi-Fi와
            연결 기기까지 한 곳에서 확인할 수 있습니다.
          </p>

          <div class="ssh-login-features" aria-label="SmartSafeHub 주요 기능">
            <LoginFeature
              description="DNS 기반 보호와 로컬 차단 규칙을 빠르게 관리합니다."
              icon={<ShieldIcon />}
              title="SafeShield 보호"
            />
            <LoginFeature
              description="무선 네트워크와 연결된 기기의 상태를 쉽게 확인합니다."
              icon={<WifiIcon />}
              title="간편한 네트워크 관리"
            />
            <LoginFeature
              description="현재 공유기의 LuCI 인증과 세션 정책을 그대로 사용합니다."
              icon={<KeyIcon />}
              title="장치 내 인증"
            />
          </div>
        </div>
      </section>

      <section class="ssh-login-panel" aria-labelledby="ssh-login-title">
        <div class="ssh-login-panel-inner">
          {phase === 'probing' ? (
            <div class="ssh-login-probe" role="status" aria-live="polite">
              <span class="ssh-login-probe-spinner" aria-hidden="true" />
              <strong>SmartSafeHub 연결 확인 중</strong>
              <span>기존 로그인 세션을 확인하고 있습니다.</span>
            </div>
          ) : (
            <div class="ssh-login-card">
              <span class="ssh-login-mobile-mark" aria-hidden="true">
                <ShieldIcon />
              </span>
              <p class="ssh-login-kicker">SmartSafeHub 관리</p>
              <h2 id="ssh-login-title">다시 오신 것을 환영합니다</h2>
              <p class="ssh-login-subtitle">공유기 관리 계정으로 로그인해 주세요.</p>

              {error ? (
                <div class="ssh-login-alert" role="alert" aria-live="polite">
                  {error}
                </div>
              ) : null}

              <form class="ssh-login-form" onSubmit={submit} noValidate>
                <label class="ssh-login-field" for="smartsafehub-username">
                  <span class="ssh-login-label">사용자 이름</span>
                  <span class="ssh-login-input-wrap">
                    <UserIcon aria-hidden="true" />
                    <input
                      autoCapitalize="none"
                      autoComplete="username"
                      disabled={busy}
                      id="smartsafehub-username"
                      onInput={(event) => setUsername(event.currentTarget.value)}
                      required
                      spellcheck={false}
                      type="text"
                      value={username}
                    />
                  </span>
                </label>

                <label class="ssh-login-field" for="smartsafehub-password">
                  <span class="ssh-login-label">비밀번호</span>
                  <span class="ssh-login-input-wrap">
                    <KeyIcon aria-hidden="true" />
                    <input
                      autoComplete="current-password"
                      disabled={busy}
                      id="smartsafehub-password"
                      onBlur={() => setCapsLock(false)}
                      onInput={(event) => setPassword(event.currentTarget.value)}
                      onKeyDown={updateCapsLock}
                      onKeyUp={updateCapsLock}
                      ref={passwordInput}
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                      aria-pressed={showPassword}
                      class="ssh-login-password-toggle"
                      disabled={busy}
                      onClick={() => {
                        setShowPassword((visible) => !visible);
                        window.requestAnimationFrame(() => passwordInput.current?.focus());
                      }}
                      type="button"
                    >
                      {showPassword ? '숨김' : '보기'}
                    </button>
                  </span>
                </label>

                {capsLock ? (
                  <p class="ssh-login-caps" role="status">
                    Caps Lock이 켜져 있습니다.
                  </p>
                ) : null}

                <button class="ssh-login-submit" disabled={busy} type="submit">
                  {busy ? <span class="ssh-login-submit-spinner" aria-hidden="true" /> : null}
                  <span>{busy ? '로그인 중…' : '로그인'}</span>
                </button>
              </form>

              <div class="ssh-login-security-note">
                <ShieldIcon aria-hidden="true" />
                <span>인증 정보는 현재 공유기의 LuCI 로그인 경로로만 전송됩니다.</span>
              </div>

              {showFallback ? (
                <a class="ssh-login-fallback" href={endpoints.applicationUrl}>
                  기본 LuCI 로그인으로 계속
                </a>
              ) : null}
            </div>
          )}

          <footer class="ssh-login-footer">
            <span>SmartSafeHub</span>
            <span aria-hidden="true">·</span>
            <span>{window.location.host}</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
