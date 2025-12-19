# Random-Menu-Recipe-Generator

-오늘의 메뉴 레시피 추천 서비스-
식품의약품안전처의 조리 식품 레시피 DB를 활용하여 사용자에게 랜덤으로 요리 레시피를 추천하고, 상세 조리 과정과 영양성분 정보를 제공하는 웹 서비스입니다.



1. 실행 방법 및 환경 정보
실행 방법:
프로젝트 폴더 내의 index.html 파일을 크롬(Chrome) 등 웹 브라우저로 엽니다.
별도의 서버 설정 없이 로컬 환경에서 즉시 실행 가능합니다.
권장 환경:
Chrome, Edge, Safari 최신 버전 (최신 JavaScript ES6+ 및 Flexbox/Grid 지원 브라우저)
인터넷 연결 필요 (Open API 통신을 위함)



2. 전체 구조도
본 프로젝트는 Vanilla JS 기반의 단일 페이지 애플리케이션(SPA) 스타일로 설계되었습니다.
Project-Root/
index.html       # 앱의 뼈대 (UI 구조, 탭 메뉴, 캐러셀 컨테이너)
style.css        # 디자인 (반응형 레이아웃, 애니메이션, 탭 스타일)
script.js        # 비즈니스 로직 (API 통신, 데이터 가공, UI 동적 업데이트)

(파일별 상세 구조도)
-index.html
Header (.recipe-header):
레시피 제목 (h1)
탭 네비게이션 (정보 / 영양성분 버튼)
Main Content (.recipe-main):
Tab 1 (정보): 요약 정보(조리법, 중량, 재료) 및 메인 이미지
Tab 2 (영양성분): 1일 영양성분 기준치 대비 비율 리스트 및 이미지
조리 과정 (.instructions-section): 단계별 이미지 캐러셀(슬라이더)과 설명 텍스트
Footer Section (.other-menu-section):
새로고침 버튼 및 추천 메뉴 리스트
데이터 로딩 시 표시되는 Loading Overlay

-style.css
Layout 시스템:
Flexbox: 상단 요약 정보 및 하단 메뉴 리스트 정렬에 사용.
Grid: 영양성분 리스트의 레이블과 값을 정교하게 정렬(grid-template-columns).
Component 스타일:
Tabs: active 클래스를 통한 시각적 피드백 (주황색 언더라인).
Carousel: opacity 전환 애니메이션을 이용한 부드러운 이미지 슬라이딩.
Overlay: z-index를 활용하여 로딩 중 사용자 조작 방지 및 애니메이션(pulse) 처리.
반응형 전략: max-width: 800px 설정을 통해 데스크탑과 태블릿 환경에 최적화.

-script.js
Data Management:
State: allRecipesData, currentStep, cookProcessData 변수를 통해 현재 상태 관리.
Constants: API URL, 1일 권장 영양 성분 기준치 고정값 관리.
Key Functions:
fetchDataFromAPI(): 비동기(Async/Await) 방식을 통한 공공데이터 수집.
loadRecipeData(): 선택된 레시피 정보를 기반으로 전체 UI(제목, 이미지, 재료 등) 동적 업데이트.
renderCarousel() / updateCarousel(): 조리 단계별 이미지 및 텍스트 전환 로직.
calculateDailyPercent(): 수치 데이터를 백분율(%)로 가공하는 비즈니스 로직.
Event Listeners: 탭 클릭, 새로고침 버튼 클릭, 캐러셀 이전/다음 버튼, 하단 메뉴 카드 클릭 이벤트 처리.

-파일 간 상호작용 (Interaction Flow)
사용자가 페이지 접속 시 DOMContentLoaded 발생.
JS가 API 서버에 데이터를 요청하고 HTML의 오버레이를 활성화.
데이터 도착 후 JS가 HTML 요소들을 생성(Rendering).
CSS가 새로 생성된 요소들에 디자인을 적용.
사용자가 탭을 전환하거나 메뉴를 클릭하면 JS가 HTML의 특정 클래스(active)를 제어하여 화면을 갱신.



3. 페이지별 스크린샷
정보 페이지 <img width="1430" height="1952" alt="image" src="https://github.com/user-attachments/assets/fad8e93d-2246-4f76-b951-156967ab1cbc" />
영양성분 페이지 <img width="1430" height="1952" alt="image" src="https://github.com/user-attachments/assets/1bb232c1-5981-4c72-9dd8-24994454851b" />
로딩중 페이지 <img width="1430" height="564" alt="image" src="https://github.com/user-attachments/assets/fecf8d61-ac44-44ea-aec0-14bb2540d223" />



4. API 연동 설명
데이터 출처: 식품의약품안전처(공공데이터포털) - 조리 식품 레시피 DB
Endpoint: https://openapi.foodsafetykorea.go.kr/api/.../COOKRCP01/json
연동 방식:
fetch API를 사용한 비동기 데이터 로딩.
TOTAL_DATA_COUNT(1968개) 범위 내에서 랜덤 인덱스를 생성하여 호출 시마다 새로운 메뉴 추천.
INFO_ENG(열량), INFO_CAR(탄수화물) 등 영양소 필드를 1일 기준치(2020년 식약처 고시)와 비교 연산.
