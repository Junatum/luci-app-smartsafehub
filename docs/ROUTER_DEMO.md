# 공유기 웹사이트 데모 번들 관리

웹사이트(`/router-demo/`)에 표시되는 공유기 대시보드 데모의 **원본 소스와 빌드 결과물**은 이 저장소에서 관리합니다. 실제 공유기 인증/RPC 코드는 데모에 포함되지 않습니다.

```bash
cd frontend
npm ci
npm run build:demo
cd ..
git add frontend/demo-dist
# 기존 코드 변경과 함께 커밋하고 push
```

- `frontend/demo-dist/`는 `.gitignore` 대상이 **아닙니다**. 데모 빌드 결과물(`demo.js`, `demo.css`, 동적으로 생성된 파일)을 **모두 커밋**합니다.
- `.github/workflows/ci.yml`에서 동일한 빌드를 다시 실행하여 커밋된 결과물과의 일치 여부를 검사합니다. 커밋을 누락하거나 파일이 달라지면 CI가 실패합니다.
- **hub** 저장소에서는 `router-demo.ref`에 위 커밋의 전체 40자리 Git SHA를 지정합니다. Hub CI 및 배포 스크립트가 해당 커밋을 가져와 정적 자산으로 설치하므로 Hub 서버에서 Node/Vite 빌드는 필요하지 않습니다.
- 공유기 관리 페이지의 일반 빌드(`npm run build`)와 데모 전용 빌드(`npm run build:demo`)는 서로 독립적입니다.
