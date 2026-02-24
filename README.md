# ✦ Mystic Tarot ✦

인터랙티브 타로카드 리딩 웹 애플리케이션

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-GitHub%20Pages-brightgreen)
![Cards](https://img.shields.io/badge/deck-78%20cards-gold)

---

## 📋 프로젝트 개요

Canvas 기반의 인터랙티브 타로카드 점술 웹앱입니다.
Rider-Waite-Smith 덱 78장(메이저 아르카나 22장 + 마이너 아르카나 56장)을 사용하며,
Google Gemini AI를 통한 자동 해석 기능을 제공합니다.

GitHub Pages에 배포 가능한 **Static HTML** 프로젝트로,
별도의 서버나 빌드 과정 없이 바로 사용할 수 있습니다.

---

## 🗂️ 프로젝트 구조

```
mystic-tarot/
├── index.html              # 메인 HTML (페이지 구조)
├── css/
│   └── style.css           # 스타일시트 (반응형 포함)
├── js/
│   └── app.js              # 메인 애플리케이션 로직
├── data/
│   ├── deck.json           # 78장 타로카드 데이터
│   └── spreads.json        # 6종 스프레드 정의
└── README.md               # 프로젝트 문서
```

---

## 🃏 주요 기능

### 1. 타로 선택 페이지
- 질문 텍스트 입력 후 셔플 → 카드 선택
- **매시 셔플 애니메이션**: 흩뿌리기 → 3회 원형 워시 → 모으기 → 쌓기
- **호 모양 스프레드**: 좌 → 우 부채꼴로 카드 펼침
- **둥둥 떠있는 연출**: 각 카드가 고유 위상으로 상하좌우 부유 (사인파 기반)
  - 동적 그림자 깊이 변화
  - 골드 글로우 펄스 효과
  - 별빛 + 성운 배경 렌더링
- 정방향 / 역방향 랜덤 적용 (40% 역방향 확률)
- Gemini AI를 이용한 카드 해석 (API 키 미입력 시 기본 해석 표시)

### 2. 설정 페이지
- **Gemini AI API Key**: 입력 및 브라우저 저장 (localStorage)
- **스프레드 선택**: 6종 스프레드 중 택 1 (브라우저 저장)

### 3. 타로 내역 페이지
- 과거 리딩 기록 목록 (최대 50건)
- 날짜, 스프레드명, 질문, 선택 카드 표시
- 클릭 시 상세 내역 + AI 해석 재확인

---

## 🎴 타로 덱 구성

| 분류 | 장수 | 구성 |
|------|------|------|
| **메이저 아르카나** | 22장 | The Fool(0) ~ The World(21) |
| **마이너 - Wands** | 14장 | Ace ~ King of Wands |
| **마이너 - Cups** | 14장 | Ace ~ King of Cups |
| **마이너 - Swords** | 14장 | Ace ~ King of Swords |
| **마이너 - Pentacles** | 14장 | Ace ~ King of Pentacles |
| **합계** | **78장** | 메이저 + 마이너 전체 사용 |

- 이미지 출처: Wikimedia Commons (Public Domain, Pamela Colman Smith, 1909)
- 정방향 / 역방향 의미 한국어 제공

---

## 🔮 스프레드 종류

| 스프레드 | 카드 수 | 설명 |
|----------|---------|------|
| **원 카드** | 1장 | 현재 메시지 |
| **쓰리 카드** | 3장 | 과거 → 현재 → 미래 |
| **켈트 십자가** | 10장 | 상황, 도전, 과거, 미래, 자아, 환경, 희망, 결과 등 |
| **생명의 나무** | 10장 | 카발라 세피로트 기반 (케테르 ~ 말쿠트) |
| **말 발굽** | 7장 | 과거, 현재, 미래, 행동, 영향, 장애물, 결과 |
| **보름달** | 6장 | 에너지, 욕구, 외부, 무의식, 의식, 통합 |

---

## 🛠️ 기술 스택

| 항목 | 기술 |
|------|------|
| **마크업** | HTML5 (시맨틱 구조) |
| **스타일** | CSS3 (커스텀 프로퍼티, 반응형, Backdrop Filter) |
| **렌더링** | JavaScript Canvas 2D API |
| **애니메이션** | requestAnimationFrame (60fps 부유 효과) |
| **AI 해석** | Google Gemini API (gemini-2.0-flash) |
| **데이터** | JSON (fetch API로 비동기 로드) |
| **저장소** | localStorage (API 키, 스프레드 설정, 히스토리) |
| **배포** | GitHub Pages (Static) |

---

## 📱 반응형 지원

| 화면 | 카드 크기 | 네비게이션 |
|------|-----------|------------|
| **모바일** (≤480px) | 62×108px | 50px 높이 |
| **태블릿** (≥768px) | 110×191px | 56px 높이 |
| **데스크탑** (≥1200px) | 120×209px | 최대 900px 중앙 |

---

## 🚀 배포 방법

### GitHub Pages

1. 저장소에 전체 파일을 푸시합니다
2. Settings → Pages → Source를 `main` 브랜치로 설정합니다
3. `https://<username>.github.io/<repo>/` 에서 접속 가능합니다

### 로컬 실행

JSON 파일을 fetch로 불러오기 때문에 로컬 서버가 필요합니다:

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .

# VS Code의 Live Server 확장 사용
```

브라우저에서 `http://localhost:8000` 으로 접속합니다.

> ⚠️ `file://` 프로토콜로 직접 열면 CORS 정책으로 JSON 로딩이 차단됩니다.

---

## ⚙️ Gemini AI 설정

1. [Google AI Studio](https://aistudio.google.com/)에서 API 키를 발급받습니다
2. 앱의 **설정** 페이지에서 API 키를 입력 → 저장합니다
3. 키는 브라우저 localStorage에 저장되어 서버로 전송되지 않습니다

API 키가 없어도 기본 카드 의미 해석으로 사용 가능합니다.

---

## 📄 데이터 구조

### deck.json

```json
{
  "baseUrl": "https://upload.wikimedia.org/wikipedia/commons/",
  "cards": [
    {
      "id": "m0",
      "name": "The Fool",
      "img": "9/90/RWS_Tarot_00_Fool.jpg",
      "type": "major",
      "meaning": "새로운 시작, 모험, 자유",
      "reversed": "무모함, 방향 상실, 경솔"
    }
  ]
}
```

### spreads.json

```json
{
  "three": {
    "name": "쓰리 카드",
    "nameEn": "Three Card",
    "count": 3,
    "positions": ["과거", "현재", "미래"]
  }
}
```

---

## 📌 개발 히스토리

1. **v1** — 78장 RWS 덱 + 쓰리 카드 스프레드 기본 구현
2. **v2** — Wikimedia Commons 이미지 URL 검증 및 수정 (Nine of Wands 파일명 예외 처리)
3. **v3** — 매시 셔플 애니메이션 + 호 모양 스프레드 연출
4. **v4** — 6종 스프레드 확장, Gemini AI 해석, 히스토리, 설정 페이지
5. **v5** — 카드 부유(floating) 연출: 사인파 기반 움직임, 동적 그림자, 별빛 배경
6. **v6** — 파일 분리 (HTML / CSS / JS / JSON)

---

## 📜 라이선스

- **코드**: MIT License
- **카드 이미지**: Public Domain (Pamela Colman Smith, 1909, Wikimedia Commons)
