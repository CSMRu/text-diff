# Text Diff (한국어)
[![Version](https://img.shields.io/badge/Version-26.0126a-ffc8c8)](https://github.com/csmru/text-diff/commits) [![Hosted on GitHub Pages](https://img.shields.io/badge/GitHub-Pages-2b7346?logo=github)](https://csmru.github.io/text-diff/) [![English](https://img.shields.io/badge/Guide-English-white?style=flat-square&logo=google-translate&logoColor=white)](README.md) [![한국어](https://img.shields.io/badge/Guide-한국어-blue?style=flat-square&logo=google-translate&logoColor=blue)](README.ko.md)

> Vanilla JavaScript로 제작된 현대적이고 빠르며 안전한 클라이언트 사이드 텍스트 비교 도구입니다.</br>깔끔하고 반응형 UI를 통해 두 텍스트 입력 간의 차이점을 효율적으로 계산하고 표시합니다.

## 주요 기능

-   **🔒 개인정보 보호 및 속도**: Web Worker를 이용한 100% 로컬 처리. 데이터가 브라우저를 벗어나지 않습니다.
-   **📂 드래그 앤 드롭**: 텍스트 파일 업로드 및 직관적인 드래그 앤 드롭 지원.
-   **🛡️ 안전성**: 엄격한 **화이트리스트 검증**을 통해 안전한 텍스트 파일 형식만 처리합니다.
-   **🌗 라이트 및 다크 모드**: 자동 테마 감지 및 수동 전환 기능.
-   **🔍 스마트 내비게이션**: D-패드나 방향키를 사용하여 변경 사항 간을 쉽게 이동합니다.
-   **↩️ 줄바꿈 무시 (선택 사항)**: 옵션을 통해 줄바꿈 차이를 무시하고 내용 변화에만 집중할 수 있습니다.
-   **🧹 변경 사항만 보기 (선택 사항)**: 변경되지 않은 텍스트를 숨기고 수정된 부분에만 집중할 수 있습니다.

## 단축키

| 키 | 동작 |
|---|---|
| `➡️` / `D` | **다음** 변경 사항으로 이동 |
| `⬅️` / `A` | **이전** 변경 사항으로 이동 |
| `⬆️` / `W` | 맨 위로 스크롤 |
| `⬇️` / `S` | 맨 아래로 스크롤 |

> **참고**: 입력 영역에서 입력 중일 때는 단축키가 비활성화됩니다.

## 라이선스

이 프로젝트는 오픈 소스이며 [MIT 라이선스](LICENSE)에 따라 사용할 수 있습니다.
