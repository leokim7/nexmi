# 개발 에이전트 전달 패키지 v1.5 — 두 그룹 통합

**확정 범위**
1. 재직자: ‘나의 직업 예상 종료일’ — 현재 업무 방식의 가정별 전환 시점, 업무 변화, 대응 시뮬레이션.
2. 진로·직업 고민자: 중·고등학생, 대학생, 취업 준비생 — 진로·직업 적합도 탐색, 체험, 준비 경로.

**채용공고·기업매칭·입사지원은 이번 버전에 포함하지 않는다.** 취업 준비생도 적합도 탐색의 대상이다.

## 구성

- 진로25개 + 재직자19개 + 지속방문7개 + 공통진입1개 = **52개 화면 명세**.
- prototype/entry.html: 두 그룹 선택, worker.html: 재직자, index.html: 진로4단계, hub.html: 지속방문 기능 시안.
- 기존50직군·700업무·100체험·엔진. 진로모델은 jobseeker 추가로 1.5.0-explorer-seed, 재직자모델은 원본1.2.0-seed 유지.
- 기본값·업무점수는 설계값이며 실증 검증된 예측·적성검사가 아니다. 정확한 미래 연도를 임의로 만들어내지 않는다.

## 개발 에이전트에게 전달

전체폴더와 AGENT_BRIEF.md 제공. 읽기순서: AGENT_BRIEF → RETENTION_STRATEGY → design/SCREEN_SPEC·WORKER_SCREEN_SPEC·RETENTION_SCREEN_SPEC → API_DATA_CONTRACT → ACCEPTANCE → PROTOTYPE_LIMITS.

model/의 과거 README는 모델 개발 기록이다. 제품 범위·화면·API는 이 루트의 v1.5 문서가 우선한다. 기존 두 모델 계산원칙은 원본 문서 참조.

## 시안

파일만 열기: prototype/entry.html → 각 모드 예시. 새 응답의 실제 계산은 로컬서버 필요.

```bash
python3 prototype/server.py
```

http://127.0.0.1:8765/entry.html 를 연다. 외부 라이브러리 없이 실행, localhost 전용. 계정·외부알림·콘텐츠자동수집은 운영용 설계만 제공된다. 기기저장은 명시적 선택 후만 수행.
