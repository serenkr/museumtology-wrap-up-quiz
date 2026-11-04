# GCT583 Museum Technology — Wrap-up Quiz

GCT583 *Museum Technology in Digital Era* 강의자료 12개로 만든 시험 연습 페이지입니다.

- **퀴즈** — 초급/중급/고급, 세트당 객관식 20 + 서술형 5. 무작위 출제, 이미 푼 문제는 다 풀 때까지 다시 나오지 않습니다. 답을 고르면 바로 채점·해설·강의자료 원문 인용이 나옵니다.
- **서술형 첨삭** — 한국어/영어 답안 모두 가능. 핵심 요소 체크, 내 답안과 모범 답안에서 쓴 개념·빠뜨린 개념 표시.
- **오답노트** — 틀린 개념이 먼저 보이고, 지울 수 있으며, 오답만 다시 푸는 오답 퀴즈가 있습니다.
- **강의자료** — 비밀번호로 암호화된 PDF(AES-256-GCM)를 브라우저에서 복호화해 내려받습니다.

기록(오답노트, 푼 문제)은 브라우저의 localStorage에 저장됩니다. 다른 기기·브라우저와는 공유되지 않습니다.

## 배포 (GitHub Pages)
Settings → Pages → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save.
몇 분 뒤 `https://<username>.github.io/<repo>/` 에서 열립니다.

## 구조
```
index.html   앱 전체 (문제은행 포함)
img/         문제·해설에 쓰는 슬라이드 이미지
enc/         암호화된 강의자료 PDF 조각 (비밀번호 없이는 열 수 없음)
```
