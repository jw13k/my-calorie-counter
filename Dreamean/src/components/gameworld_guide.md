# GameWorld.js 조작 및 커스터마이징 개발자 가이드

이 문서에서는 [GameWorld.js](file:///c:/Users/k1e7l/Desktop/my-calorie-counter/Dreamean/src/components/GameWorld.js)의 물리 지형(충돌 영역), 시각적 렌더링, 상호작용 오브젝트의 배치 좌표를 직접 수정하고 확장할 수 있는 가이드라인과 핵심 변수/함수를 설명합니다.

---

## 1. 물리 지형 설계 (`this.platforms`)
생성자(`constructor`)의 `this.platforms` 배열에서 플레이어가 밟을 수 있는 물리적인 고정 발판들을 정의합니다.

```javascript
this.platforms = [
    // format: { x: 시작X, y: 세로높이Y, width: 가로길이, height: 물리적두께, rx: 둥글기반경, isGround: 바닥고정여부 }
    { x: -100, y: 320, width: 280, height: 80, rx: 8, isGround: true },   // 좌측 바닥 선반 (낙하불가)
    { x: 180,  y: 360, width: 470, height: 40, rx: 8, isGround: true },   // 중앙 바닥 계곡 (낙하불가)
    { x: 650,  y: 320, width: 350, height: 80, rx: 8, isGround: true },   // 우측 바닥 선반 (낙하불가)
    { x: 175,  y: 240, width: 675, height: 16, rx: 8, isGround: false },  // 중간 다리 발판 (S키 탈출가능)
    { x: 300,  y: 160, width: 250, height: 16, rx: 8, isGround: false }   // 최상단 봉우리 발판 (S키 탈출가능)
];
```

* **Y 좌표 조절**: `y` 값이 **낮을수록 화면 위쪽**에 배치되고, **높을수록 화면 아래쪽**에 배치됩니다. (예: `160`은 하늘 쪽, `360`은 바닥 쪽)
* **드롭다운 플랫폼**: `isGround: false`로 설정하면 점프로 뚫고 올라갈 수 있고, 서 있는 상태에서 아래방향키(`ArrowDown` 또는 `S`)를 누르면 통과하여 아래로 뚝 떨어집니다.

---

## 2. 시각적 암석 지층 렌더링 (`draw()`)
물리 지형에 맞춰 화면에 거칠고 아름다운 바위를 그리는 코드입니다. `draw()` 함수 내부를 수정합니다.

### ① 굴곡진 표면 생성 (`getJaggedPoints`)
반듯한 직선이 아닌 자연스러운 암석 실루엣을 만들기 위해 사용됩니다.
```javascript
// getJaggedPoints(시작X, 시작Y, 끝X, 끝Y, 조각수, 거칠기농도)
let L2_top = getJaggedPoints(175, 240, mWidth, 240, 45, 3.5);
```
* **조각수(Segments)**: 점과 점 사이를 몇 개로 쪼갤지 설정합니다. 값이 클수록 정밀하게 구불구불해집니다.
* **거칠기(Roughness)**: 삐죽삐죽 튀어나오는 크기입니다. 값이 클수록 거칠고 가파른 바위 느낌이 납니다.

### ② 다각형 칠하기 (`drawStrataSlab`)
점들의 세트를 모아 닫힌 다각형을 만들고 내부를 그라데이션으로 칠합니다.
```javascript
// drawStrataSlab(점배열, 그라데이션색상, 테두리선색상, 네온빛색상, 네온빛반경)
drawStrataSlab(L2_full, L2_grad, fgStroke, glowColor, 4);
```
* **지층 겹쳐 그리기 (Top-to-Bottom)**: 
  - 3번 층(Top)을 그릴 때 `{ x: 550, y: 400 }, { x: 300, y: 400 }`을 하단 점으로 지정해 캔버스 바닥까지 꽉 채웁니다.
  - 그 아래 층(2번, 1번 순)이 순차적으로 밑바닥까지 채워지면서 덮어 씌워지기 때문에(Overlapping), 얇은 판자가 아닌 하나의 웅장한 바위산 단면이 완성됩니다.

---

## 3. 상호작용 오브젝트 좌표 (`this.objects`)
비석과 수정구슬의 상호작용 판정 영역과 시각적 위치를 지정합니다.

```javascript
this.objects = {
    tablet: {
        x: 140,                 // 가로 위치
        y: 288,                 // 세로 위치 (좌측 선반 y:320 바닥에 안착시키기 위한 스케일 정렬 값)
        width: 30,              // 상호작용 충돌 박스 가로 너비
        height: 40,             // 상호작용 충돌 박스 세로 높이
        label: '고대의 비석',
        action: 'tablet'        // 클릭/E 상호작용 시 main.js에 보낼 액션명
    },
    oracle: {
        x: 425,
        y: 160 - 30,            // 3번 층 y:160 위에 얹기 위한 높이
        radius: 20,             // 구슬의 반지름 크기
        label: '해몽 수정구',
        action: 'oracle'
    }
};
```

---

## 4. 물리 상수 및 줌(Zoom) 설정
* **화면 줌 아웃 (`this.zoom`)**: 생성자의 `this.zoom = 0.5;` 값을 통해 화면 배율을 실시간으로 조작합니다. (`0.5`는 50% 줌아웃 상태, `1.0`은 원래 크기)
* **중력 조절 (`this.gravity`)**: 플레이어의 무게감(낙하 속도)을 바꿉니다. 기본값 `0.45`에서 낮추면 달 위를 걷는 듯한 가벼운 점프가 됩니다.
* **마찰력 조절 (`this.friction`)**: 바닥에서 미끄러지는 농도입니다. `0.82`에서 수치를 높이면 빙판길처럼 미끄러지며 조작이 재밌어집니다.
