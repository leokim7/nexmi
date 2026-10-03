# v1.5 전달 전 검증

- 기존 재직자12개·진로13개·v1.5추가6개 = 31개 테스트 통과.
- 진로4단계(middle/high/university/jobseeker)와재직자원본엔진의실제localhost API결과가고정예제/직접계산과동일.
- 정보부족jobseeker 정상상태, 잘못된재직자ID422 확인.
- DOM스텁으로진로25·재직자19·지속방문7개렌더분기와공통진입2링크 확인:52개화면대상.

실제브라우저시각검증·터치·키보드E2E는환경의브라우저실행파일부재로완료하지못했다. DOM스텁은레이아웃을확인하지않는다. 운영구현자는 ACCEPTANCE.md의 실제브라우저검증을완료해야한다. 계산일관성검증은미래예측/진로추천의실증타당도검증이아니다.

prototype/verification_v15.json 및 route_verification_v15.json이현재결과. v1.4 verification.json은과거기록이며v1.5검증으로해석하지않는다.
