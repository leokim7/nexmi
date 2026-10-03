# NEXMI — 나의 일, 다음

지금 하는 일의 미래(재직자)와 나에게 맞는 다음 일(중·고·대학생·취업 준비생)을 함께 살펴보는 탐색 도구.
기획 v1.5 패키지의 두 계산 엔진을 **원본 그대로** 사용하고, 화면은 wanjoo.kr 디자인 시스템으로 구현했습니다.

- 기획 분석 · 구조 개선 · 완료/미완료: [docs/ANALYSIS.md](docs/ANALYSIS.md)
- 원본 기획 문서: [docs/handoff/](docs/handoff/)

## 구조

```
backend/
  app/main.py          FastAPI: /api/catalog, /api/{worker|explorer}/diagnoses, SPA 서빙
  app/validation.py    필드별 한국어 오류(field_errors). 값은 바꾸지 않음
  app/engines.py       model/ 의 엔진을 그대로 로드
  model/               v1.5 기획 패키지의 엔진·데이터 (수정 금지 — 모델 버전 발행 대상)
  tests/test_api.py    API 계약 + 고정 예제 parity
frontend/              React 18 + TypeScript + Vite
  src/lib/store.tsx    현재 탭 메모리 기본, 동의 시에만 localStorage
  src/styles/global.css  wanjoo 디자인 토큰·컴포넌트
Dockerfile, railway.json
```

## 로컬 실행

```bash
python3 -m venv .venv && .venv/bin/pip install -r backend/requirements-dev.txt
```

```bash
cd frontend && npm ci && npm run build
```

```bash
.venv/bin/python -m uvicorn app.main:app --app-dir backend --port 8000
```

http://127.0.0.1:8000 을 엽니다. 프런트엔드를 고치면서 보려면 위 서버를 켠 채로 `cd frontend && npm run dev` (http://localhost:5173, `/api` 는 8000 으로 프록시).

## 테스트

```bash
cd backend && ../.venv/bin/python -m pytest -q
```

API 24개 + 원본 진로 엔진 13개. 원본 재직자 엔진 테스트는 `cd backend/model/student_career_v1_3/career_engine_v1_2 && python3 validate.py` (12개).

## Railway 배포

1. Railway 에서 **New Project → Deploy from GitHub repo → `leokim7/nexmi`** 선택.
2. 저장소 루트의 `railway.json` 이 Dockerfile 빌드와 헬스체크(`/api/health`)를 설정합니다. 환경변수는 필요 없습니다(`PORT` 는 Railway 가 주입).
3. Settings → Networking → **Generate Domain** 으로 공개 주소를 만듭니다.

P0 는 데이터베이스가 필요 없습니다. 계정·공유·관리자(P1)를 시작할 때 Railway PostgreSQL 을 추가하고 `docs/handoff/STORAGE.sql` 을 기반으로 마이그레이션을 작성합니다.

## 지키는 원칙

- 엔진 계수·기준연도는 UI 편의로 바꾸지 않는다. LLM 으로 점수·날짜를 만들지 않는다.
- 재직자 ‘예상 종료일’은 조건부 전환 연도이며 해고일이 아니다. null 은 ‘2040년까지 기준 미도달’.
- 진로 ‘탐색 적합지수’는 적성 확률이 아니다. 준비 수준은 순위에 반영하지 않는다.
- 서버는 입력을 저장하지 않는다. 기기 저장은 사용자가 켰을 때만.
- 채용공고·기업 추천·입사지원 기능은 없다.
