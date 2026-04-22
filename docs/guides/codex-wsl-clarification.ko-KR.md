# Codex + WSL 현황 정리

최종 확인 날짜: 2026-04-19

이 문서는 자주 뒤섞여서 전달되는 세 가지 질문을 분리해서 설명합니다.

1. OpenAI 공식 문서 기준으로 Codex가 WSL에서 동작하는가.
2. OpenAI 공식 문서 기준으로 Windows에서 Codex hooks를 지원하는가.
3. Clawd가 현재 WSL 안에서 실행 중인 Codex 세션을 자동으로 감지할 수 있는가.

이 세 질문의 답은 서로 다릅니다. 대부분의 혼선은 OpenAI의 공식 지원 범위와 Clawd의 현재 구현 범위를 같은 이야기로 받아들이면서 생깁니다.

## TL;DR

- OpenAI는 Codex의 WSL2 실행을 공식적으로 안내합니다.
- OpenAI의 현재 Hooks 문서는 Windows에서 Codex hooks가 임시로 비활성화되어 있다고 명시합니다.
- Clawd는 현재 Codex를 hooks가 아니라 `~/.codex/sessions` JSONL 로그 폴링으로 연동합니다.
- Clawd가 Windows에서 실행되고 Codex가 기본 Linux home을 쓰는 WSL 안에서 실행되면, Clawd는 `/home/<user>/.codex/sessions`를 자동으로 읽지 못합니다.
- 따라서 "Codex가 WSL을 지원하지 않는다"는 표현은 부정확합니다. 더 정확한 표현은 "Codex는 공식적으로 WSL2를 지원하지만, Clawd는 아직 WSL의 별도 Linux home 안에 있는 Codex 세션을 기본값으로 자동 감지하지 않으며, 문서도 그 경계를 충분히 설명하지 못했다"입니다.

## 1. OpenAI 공식 현황

### Codex는 공식적으로 WSL2를 지원합니다

OpenAI의 Codex Windows 문서에는 WSL 전용 섹션이 있으며, WSL2 안에서 Codex CLI를 설치하고 실행하는 절차가 직접 나와 있습니다.

- <https://developers.openai.com/codex/windows>

이 문서에는 다음이 포함됩니다.

- `Windows Subsystem for Linux` 섹션
- `Use Codex CLI with WSL` 섹션
- `wsl --install`, WSL 내부 Node.js 설치, `npm i -g @openai/codex`, `codex` 실행 절차

즉, 제품 차원에서 보면 "Codex는 WSL2를 지원한다"가 맞습니다.

### WSL1은 더 이상 지원되지 않습니다

OpenAI 문서는 다음도 함께 명시합니다.

- WSL1 지원은 Codex `0.114`까지
- Codex `0.115`부터 Linux sandbox가 `bubblewrap`로 바뀌면서 WSL1은 더 이상 지원되지 않음

참고:

- <https://developers.openai.com/codex/windows>
- <https://developers.openai.com/codex/app/windows>

따라서 지금의 정확한 표현은 "WSL2 지원"입니다.

### Windows에서는 Codex hooks가 아직 비활성화 상태입니다

OpenAI의 Hooks 문서는 현재 다음을 명시합니다.

- hooks는 experimental 상태
- Windows support temporarily disabled
- hooks are currently disabled on Windows

참고:

- <https://developers.openai.com/codex/hooks>

이 점이 중요한 이유는, Clawd가 Windows에서 Codex를 Claude Code처럼 hook 기반으로 통합하지 않는 핵심 배경이기 때문입니다.

### WSL과 Windows는 기본적으로 `.codex`를 공유하지 않습니다

OpenAI의 Windows app 문서는 다음도 설명합니다.

- Windows app은 `%USERPROFILE%\.codex`를 사용
- WSL 안의 Codex CLI는 기본적으로 Linux `~/.codex`를 사용
- 그래서 configuration, cached auth, session history가 자동으로 공유되지 않음

OpenAI가 안내하는 공유 방법 중 하나는 다음과 같습니다.

```bash
export CODEX_HOME=/mnt/c/Users/<windows-user>/.codex
```

참고:

- <https://developers.openai.com/codex/app/windows>

즉, 별도 설정이 없다면 WSL 안의 Codex는 Linux home 아래에 로그와 세션 데이터를 쓴다는 뜻입니다.

## 2. Clawd의 현재 구현

### Clawd는 Codex를 hooks가 아니라 JSONL 폴링으로 연동합니다

이 저장소에서 Codex 연동 설정은 [`agents/codex.js`](../../agents/codex.js)에 있습니다.

- `eventSource: "log-poll"`
- `sessionDir: "~/.codex/sessions"`

실제 모니터 구현은 [`agents/codex-log-monitor.js`](../../agents/codex-log-monitor.js)에 있습니다.

여기서 `~`는 현재 실행 중인 프로세스의 `os.homedir()`로 확장됩니다. 즉:

- Clawd가 Windows에서 실행되면 `C:\Users\<user>\.codex\sessions`
- Clawd가 Linux에서 실행되면 `/home/<user>/.codex/sessions`

를 읽습니다.

그래서 Windows 호스트에서 실행 중인 Clawd는 WSL Linux home 안의 `/home/<user>/.codex/sessions`를 자동으로 읽지 못합니다.

### 현재 Clawd에는 "Codex on WSL" 전용 자동 감지 로직이 없습니다

현재 메인 프로세스는 [`src/main.js`](../../src/main.js)에서 위 기본 설정 그대로 Codex 모니터를 시작합니다. 사용자 설정 가능한 WSL sessionDir도 없고, 기본적으로 `\\wsl$\...`를 스캔하는 로직도 없습니다.

현재 상태를 정리하면:

- `Windows 네이티브 Codex + Windows Clawd`: 기본값으로 동작
- `WSL2 Codex + Windows Clawd + Linux 기본 home`: 기본값으로는 동작하지 않음
- `WSL2 Codex + Windows .codex 공유`: OpenAI의 `CODEX_HOME` 문서를 기준으로 보면 같은 session 디렉터리를 읽게 되어 가능성이 있음

마지막 항목은 OpenAI의 공유 방식과 Clawd의 현재 폴링 경로를 조합한 추론입니다.

### 원격/우회 패턴은 이미 있지만 WSL 기본 지원과는 다릅니다

이 저장소에는 [`hooks/codex-remote-monitor.js`](../../hooks/codex-remote-monitor.js)가 있으며, 반대편 환경에서 `~/.codex/sessions`를 폴링한 뒤 상태를 Windows의 Clawd로 POST할 수 있습니다.

현재 이 스크립트는 문서상 원격 SSH 시나리오에 맞춰 설명되어 있습니다. 즉, "로그는 다른 쪽에 있고 상태만 돌려보낸다"는 패턴은 이미 있지만, 이것이 곧 "Clawd가 WSL 안의 Codex를 기본값으로 자동 감지한다"는 뜻은 아닙니다.

## 3. 왜 현재 문서가 오해를 만들기 쉬운가

### README의 표현이 실제 경계보다 넓게 읽힐 수 있습니다

현재 README는 다음처럼 보일 수 있습니다.

- `Claude Code와 Codex CLI는 바로 사용할 수 있다`
- setup guide가 `원격 SSH, WSL, 플랫폼별 참고 사항`을 다룬다

참고:

- [`README.ko-KR.md`](../../README.ko-KR.md)

이 표현은 많은 조합에서는 맞지만, 아래 두 경우를 구분해 주지 않습니다.

- Windows 네이티브에서 실행되는 Codex
- 별도 Linux home을 유지하는 WSL2 안에서 실행되는 Codex

### setup guide의 WSL 본문은 주로 Claude Code를 설명합니다

현재 WSL 본문은 [`docs/guides/setup-guide.md`](./setup-guide.md)에 있고, 핵심 내용은 다음입니다.

- WSL 안에서 Claude Code 실행
- WSL로 hooks 파일 복사
- WSL 안에서 Claude hooks 등록

반면 Codex는 주로 원격 SSH 섹션에서 `codex-remote-monitor.js` 형태로 등장합니다.

즉:

- WSL이 아예 문서에 없는 것은 아닙니다.
- 하지만 `Codex + WSL`의 지원 경계는 따로 분명하게 써 두지 않았습니다.

## 4. 현재 가장 정확한 결론

2026-04-19 기준으로 가장 정확한 결론은 다음과 같습니다.

1. OpenAI는 Codex의 WSL2 실행을 공식적으로 지원합니다.
2. OpenAI는 현재 Windows에서 Codex hooks가 비활성화되어 있다고 문서화하고 있습니다.
3. 그래서 Clawd는 Windows에서 Codex를 hooks 대신 JSONL 로그 폴링으로 연동합니다.
4. Clawd는 현재 호스트 머신의 `~/.codex/sessions`만 기본적으로 폴링합니다.
5. 따라서 Codex가 WSL2 안에서 Linux 기본 `~/.codex`를 사용하면 Clawd는 그 세션을 자동 감지하지 못합니다.
6. 현재 문서의 문제는 "WSL이 전혀 안 적혀 있다"가 아니라 "`Codex + WSL` 경계를 충분히 명시하지 않았다"에 가깝습니다.

## 5. 외부 설명용 권장 문구

이슈나 사용자 답변에 넣을 한 문단이 필요하다면 아래 표현이 가장 안전합니다.

> OpenAI 공식 문서 기준으로 Codex는 WSL2를 지원합니다. 다만 2026-04-19 기준 Hooks 문서는 Windows에서 Codex hooks가 임시 비활성화 상태라고 명시하고 있습니다. 그래서 Clawd는 Codex를 `~/.codex/sessions` 로그 폴링으로 연동합니다. Clawd가 Windows에서 실행되고 Codex가 Linux 기본 home을 쓰는 WSL 안에서 실행되면, Clawd는 그 session 로그를 기본값으로 자동 감지하지 못합니다. 현재 문제는 "Codex가 WSL을 지원하지 않는다"기보다 "Clawd의 연동 경계와 문서 설명이 충분히 명확하지 않았다"에 가깝습니다.

## 6. 현재 가능한 경로

지금 목표가 "Windows의 Clawd가 WSL 안의 Codex를 감지하게 만들기"라면 현실적인 경로는 세 가지입니다.

1. OpenAI 문서대로 WSL의 `CODEX_HOME`을 Windows `%USERPROFILE%\.codex`로 맞춘다.
2. 이 저장소의 [`hooks/codex-remote-monitor.js`](../../hooks/codex-remote-monitor.js) 패턴을 활용해 WSL 쪽에서 상태를 Windows로 밀어 넣는다.
3. Clawd 자체를 확장해서 `\\wsl$\...` sessionDir를 직접 지원하게 만든다.

이 셋은 의미가 다릅니다.

- 1번은 OpenAI가 공식 문서에서 제시한 공유 방식
- 2번은 이 저장소에 이미 존재하는 우회 패턴
- 3번은 Clawd의 새 기능 추가

## 참고 자료

OpenAI 공식 문서:

- Codex Windows: <https://developers.openai.com/codex/windows>
- Codex Hooks: <https://developers.openai.com/codex/hooks>
- Codex app on Windows: <https://developers.openai.com/codex/app/windows>

저장소 내부 관련 파일:

- [`README.ko-KR.md`](../../README.ko-KR.md)
- [`docs/guides/setup-guide.md`](./setup-guide.md)
- [`agents/codex.js`](../../agents/codex.js)
- [`agents/codex-log-monitor.js`](../../agents/codex-log-monitor.js)
- [`hooks/codex-remote-monitor.js`](../../hooks/codex-remote-monitor.js)
