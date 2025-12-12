// ----------------------------------------------------------------
// [전역 실행] DOMContentLoaded 이벤트 리스너
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

    // ----------------------------------------------------------------
    // 0. 전역 상수/변수 설정
    // ----------------------------------------------------------------
    const API_KEY = 'sample'; // API 키 설정 (샘플 키)
    const BASE_API_URL = `https://openapi.foodsafetykorea.go.kr/api/f35e3beaa62249d0a4df/COOKRCP01/json`;
    const DATA_COUNT = 10; // 한 번에 가져올 레시피 개수
    const TOTAL_DATA_COUNT = 1968; // API의 총 데이터 수 (최대 요청 가능 범위)
    const MIN_LOADING_TIME_MS = 3000; // 최소 로딩 시간 (3초)

    // 2020년 식약처 고시 1일 영양성분 기준치 (g 또는 mg, Kcal)
    const DAILY_STANDARDS = {
        '열량': { value: 2000, unit: 'Kcal' },
        '탄수화물': { value: 324, unit: 'g' },
        '단백질': { value: 55, unit: 'g' },
        '지방': { value: 54, unit: 'g' },
        '나트륨': { value: 2000, unit: 'mg' }
    };
    
    // API에서 가져온 전체 레시피 목록 (다른 메뉴 렌더링에 사용)
    let allRecipesData = [];
    // 현재 슬라이더 단계 (조리 과정)를 추적하는 변수
    let currentStep = 1;
    // 전체 조리 과정 단계를 저장하는 변수
    let totalSteps = 0;
    // API에서 가져온 조리 과정 텍스트와 이미지 URL을 저장하는 배열
    let cookProcessData = []; 

    // DOM 요소 캐싱
    const refreshButton = document.getElementById('refresh-other-menus');
    const loadingOverlay = document.getElementById('other-menu-loading-overlay');
    
    // ----------------------------------------------------------------
    // 1. 공통 API 요청 함수
    // ----------------------------------------------------------------
    /**
     * 지정된 URL에서 데이터를 비동기적으로 가져오는 범용 함수.
     * @param {string} url - 요청할 API 엔드포인트 URL.
     * @returns {Promise<object>} - JSON 형식의 응답 데이터를 반환하는 Promise.
     */
    async function fetchDataFromAPI(url) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP 오류: ${response.status}`);
            }
            
            const data = await response.json();
            
            // API 응답 구조를 확인하고 에러 처리
            if (data.COOKRCP01 && data.COOKRCP01.RESULT && data.COOKRCP01.RESULT.CODE === 'INFO-000') {
                return data;
            } else if (data.COOKRCP01 && data.COOKRCP01.RESULT && data.COOKRCP01.RESULT.CODE !== 'INFO-000') {
                 throw new Error(`API 결과 오류: ${data.COOKRCP01.RESULT.MSG}`);
            }
            
            return data;
        } catch (error) {
            console.error('API 요청 중 오류 발생:', error);
            throw error;
        }
    }

    // ----------------------------------------------------------------
    // 2. 탭 전환 기능
    // ----------------------------------------------------------------
    const tabs = document.querySelectorAll('.tab-item button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetId = e.target.dataset.tab;

            // 탭 활성화/비활성화
            tabs.forEach(t => t.parentElement.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            e.target.parentElement.classList.add('active');
            document.getElementById(targetId).classList.add('active');
            
            // 영양성분 탭이 활성화될 때만 영양성분 데이터를 로드합니다.
            if (targetId === 'nutrition') {
                const currentRecipe = allRecipesData.find(r => r.RCP_NM === document.getElementById('recipe-title').textContent);
                if (currentRecipe) {
                    fetchNutritionData(currentRecipe);
                }
            }
        });
    });

    // ----------------------------------------------------------------
    // 3. 레시피 데이터 로드 및 화면 업데이트
    // ----------------------------------------------------------------
    
    /**
     * API에서 랜덤한 레시피 목록을 불러오고, 첫 번째 레시피를 기본으로 화면에 로드합니다.
     * @returns {Promise<void>} - 레시피 로드 및 화면 업데이트가 완료되는 Promise.
     */
    async function loadRecipesAndRender() {
        // API 총 데이터 수 범위 내에서 랜덤 시작 인덱스 계산
        const randomStart = Math.floor(Math.random() * (TOTAL_DATA_COUNT - DATA_COUNT)) + 1;
        const url = `${BASE_API_URL}/${randomStart}/${randomStart + DATA_COUNT - 1}`;

        try {
            const apiData = await fetchDataFromAPI(url);
            allRecipesData = apiData.COOKRCP01.row;
            
            if (allRecipesData.length === 0) {
                document.getElementById('carousel-container').innerHTML = '<p class="error-text">레시피 데이터를 찾을 수 없습니다.</p>';
                throw new Error('데이터 로드 실패: 레시피 목록이 비어있음');
            }

            // 첫 번째 레시피를 기본으로 로드
            loadRecipeData(allRecipesData[0]);

            // '다른 메뉴' 목록을 렌더링
            renderOtherMenus(allRecipesData);

        } catch (error) {
            const container = document.getElementById('carousel-container');
            console.error('앱 초기화/새로고침 중 오류 발생:', error);
            container.innerHTML = `<p class="error-text">데이터 로드 실패: ${error.message}</p>`;
            throw error; // 에러를 상위 호출자로 다시 던져서 최종 처리를 돕습니다.
        }
    }

    /**
     * 최소 로딩 시간을 보장하며 레시피 로드 함수를 실행합니다.
     */
    async function initializeApp() {
        refreshButton.disabled = true; // 버튼 비활성화
        loadingOverlay.classList.add('active'); // 로딩 오버레이 활성화

        const startTime = Date.now();
        
        try {
            // API에서 데이터 로드 시도
            await loadRecipesAndRender();
        } catch (error) {
            // 데이터 로드 실패 시 오버레이만 닫습니다. (에러는 loadRecipesAndRender에서 처리됨)
        }
        
        const elapsedTime = Date.now() - startTime;
        const remainingTime = MIN_LOADING_TIME_MS - elapsedTime;

        // API 요청 시간과 상관없이 최소 3초를 기다립니다.
        await new Promise(resolve => setTimeout(resolve, remainingTime > 0 ? remainingTime : 0));

        // 로딩 완료 후 버튼 활성화 및 오버레이 비활성화
        loadingOverlay.classList.remove('active');
        refreshButton.disabled = false;
    }


    /**
     * 특정 레시피 데이터를 기반으로 화면 전체를 업데이트합니다.
     * @param {object} recipeData - API에서 가져온 단일 레시피 데이터 객체.
     */
    function loadRecipeData(recipeData) {
        updateRecipeSummary(recipeData); // 제목, 조리법, 재료, 메인 이미지 업데이트
        updateCookProcess(recipeData);    // 조리 과정 슬라이더 업데이트
        
        // 영양성분 탭의 이전 데이터는 지워주고, 로드 완료 표시도 제거합니다.
        const nutritionDataList = document.getElementById('nutrition-data-list');
        nutritionDataList.innerHTML = '<p class="loading-text">영양성분 정보를 불러오는 중...</p>';
        nutritionDataList.removeAttribute('data-loaded-recipe');
        
        // 정보 탭이 활성화되도록 강제
        document.querySelector('.tab-item.active')?.classList.remove('active');
        document.querySelector('.tab-content.active')?.classList.remove('active');
        document.querySelector('.tab-item button[data-tab="info"]').parentElement.classList.add('active');
        document.getElementById('info').classList.add('active');
    }

    /**
     * 레시피 제목, 조리법, 재료, 메인 이미지를 업데이트합니다.
     * @param {object} recipeData - 단일 레시피 데이터 객체.
     */
    function updateRecipeSummary(recipeData) {
        document.getElementById('recipe-title').textContent = recipeData.RCP_NM || '제목 없음';
        
        // 요청된 API 필드 이름으로 정확히 매핑하여 값 업데이트
        document.getElementById('recipe-method').textContent = recipeData.RCP_WAY2 || '정보 없음'; // 조리방법 (RCP_WAY2)
        document.getElementById('recipe-weight').textContent = recipeData.INFO_WGT || '정보 없음';  // 중량 (INFO_WGT)
        document.getElementById('recipe-ingredients').textContent = recipeData.RCP_PARTS_DTLS || '정보 없음'; // 재료정보 (RCP_PARTS_DTLS)
        
        const mainImageSrc = recipeData.ATT_FILE_NO_MAIN || 'main_dish_placeholder.jpg';
        document.getElementById('main-dish-image').src = mainImageSrc;
        document.getElementById('main-dish-image').alt = `${recipeData.RCP_NM} 완성 사진`;

        // 영양성분 탭 이미지의 placeholder도 업데이트합니다.
        document.getElementById('nutrition-tab-image').src = mainImageSrc; 
        document.getElementById('nutrition-tab-image').alt = `${recipeData.RCP_NM} 영양성분 탭 이미지`;
    }

    // ----------------------------------------------------------------
    // 4. 조리 과정 슬라이더 기능
    // ----------------------------------------------------------------
    
    /**
     * 레시피 데이터에서 조리 과정 데이터를 추출하고 슬라이더를 구성합니다.
     * @param {object} recipeData - 단일 레시피 데이터 객체.
     */
    function updateCookProcess(recipeData) {
        const carouselContainer = document.getElementById('carousel-container');
        // 로딩 텍스트 초기화
        carouselContainer.innerHTML = '<p id="step-loading-text" class="loading-text">조리 과정을 불러오는 중...</p>';

        cookProcessData = [];
        for (let i = 1; i <= 20; i++) {
            const indexStr = i.toString().padStart(2, '0');
            const manualText = recipeData[`MANUAL${indexStr}`];
            const manualImg = recipeData[`MANUAL_IMG${indexStr}`];
            
            if (manualText && manualText.trim() !== '') {
                cookProcessData.push({
                    text: manualText.replace(/^\d+\.\s*/, ''), // 순번 제거
                    imgUrl: manualImg || 'placeholder.jpg'
                });
            }
        }
        
        if (cookProcessData.length === 0) {
             carouselContainer.innerHTML = '<p class="error-text">조리 과정 데이터를 찾을 수 없습니다.</p>';
             document.getElementById('step-description').textContent = '';
             return;
        }

        totalSteps = cookProcessData.length;
        currentStep = 1; 
        
        renderCarousel(cookProcessData);
        initSliderEvents();
    }
    
    /**
     * 조리 과정 데이터(cookProcessData)를 기반으로 슬라이더의 HTML 구조를 동적으로 생성합니다.
     */
    function renderCarousel(data) {
        const carouselContainer = document.getElementById('carousel-container');
        
        let imagesHTML = '<div class="step-image-wrapper">'; 
        let dotsHTML = '<div class="carousel-dots">'; 
        
        data.forEach((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === 1 ? 'active' : '';
            
            imagesHTML += `<img src="${step.imgUrl}" alt="조리 과정 이미지 ${stepNum}" class="step-image ${isActive}" data-step="${stepNum}">`;
            dotsHTML += `<span class="dot ${isActive}" data-step="${stepNum}"></span>`;
        });
        
        imagesHTML += '</div>';
        dotsHTML += '</div>';
        
        const buttonsHTML = '<button class="prev-btn">◀</button><button class="next-btn">▶</button>';
        
        carouselContainer.innerHTML = imagesHTML + buttonsHTML + dotsHTML;
        
        const stepTextElement = document.getElementById('step-description');
        // 초기 텍스트 설정 시 Markdown Bolding은 CSS가 아닌 JS에서 처리하지 않습니다.
        // CSS에서 **를 굵게 처리할 수 없으므로, HTML 태그로 변경합니다. (또는 그냥 일반 텍스트로 둡니다.)
        stepTextElement.textContent = `1. ${data[0].text}`; 
        // 텍스트를 굵게 표시하려면 아래와 같이 변경합니다.
        // stepTextElement.innerHTML = `<strong>1. ${data[0].text}</strong>`;
    }
    
    /**
     * 슬라이더의 이전/다음 버튼 및 점(Dot)에 이벤트 리스너를 연결합니다.
     */
    function initSliderEvents() {
        const stepTextElement = document.getElementById('step-description');
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        const dots = document.querySelectorAll('.dot');
        const images = document.querySelectorAll('.step-image');

        function updateCarousel() {
            images.forEach(img => img.classList.remove('active'));
            const activeImage = document.querySelector(`.step-image[data-step="${currentStep}"]`);
            if (activeImage) activeImage.classList.add('active');

            dots.forEach(dot => dot.classList.remove('active'));
            const activeDot = document.querySelector(`.dot[data-step="${currentStep}"]`);
            if (activeDot) activeDot.classList.add('active');
            
            const currentStepText = cookProcessData[currentStep - 1].text || "";
            // 텍스트를 굵게 표시하려면 아래와 같이 변경합니다.
            // stepTextElement.innerHTML = `<strong>${currentStep}. ${currentStepText}</strong>`;
            stepTextElement.textContent = `${currentStep}. ${currentStepText}`;
        }

        prevBtn.addEventListener('click', () => {
            currentStep = (currentStep - 1) < 1 ? totalSteps : currentStep - 1;
            updateCarousel();
        });

        nextBtn.addEventListener('click', () => {
            currentStep = (currentStep + 1) > totalSteps ? 1 : currentStep + 1;
            updateCarousel();
        });

        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                currentStep = parseInt(e.target.dataset.step);
                updateCarousel();
            });
        });
    }
    
    // ----------------------------------------------------------------
    // 5. '이런 메뉴는 어때요?' 기능
    // ----------------------------------------------------------------
    
    /**
     * API에서 가져온 레시피 목록 중 첫 번째를 제외한 나머지를 '다른 메뉴'로 표시하고 이벤트를 연결합니다.
     * @param {Array<object>} allRecipes - 전체 레시피 목록.
     */
    function renderOtherMenus(allRecipes) {
        const otherMenuList = document.getElementById('other-menu-list');
        let html = '';
        
        // 첫 번째 레시피(index 0)는 메인 레시피이므로, index 1부터 순회 시작
        for (let i = 1; i < allRecipes.length; i++) {
            const recipe = allRecipes[i];
            
            // data-recipe-index에 배열 인덱스를 저장하여 해당 레시피를 쉽게 찾을 수 있도록 합니다.
            html += `
                <article class="menu-card" data-recipe-index="${i}">
                    <img src="${recipe.ATT_FILE_NO_MAIN || 'placeholder.jpg'}" alt="${recipe.RCP_NM} 이미지">
                    <p>${recipe.RCP_NM}</p>
                </article>
            `;
        }
        
        if (html) {
            otherMenuList.innerHTML = html;
        } else {
            otherMenuList.innerHTML = '<p class="error-text">다른 메뉴 목록을 불러올 수 없습니다.</p>';
        }
        
        // 'menu-card' 클릭 이벤트 추가
        document.querySelectorAll('.menu-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // 클릭된 카드 또는 그 부모 요소에서 data-recipe-index를 찾습니다.
                const cardElement = e.currentTarget;
                const index = parseInt(cardElement.dataset.recipeIndex);
                
                // 해당 인덱스의 레시피 데이터를 가져와 화면을 로드합니다.
                if (!isNaN(index) && allRecipesData[index]) {
                    loadRecipeData(allRecipesData[index]);
                }
            });
        });
    }

    // '다른 메뉴 새로고침' 버튼 이벤트 연결
    document.getElementById('refresh-other-menus').addEventListener('click', initializeApp);


    // ----------------------------------------------------------------
    // 6. 영양성분 탭 기능
    // ----------------------------------------------------------------

    /**
     * 1일 영양성분 기준치에 대한 비율을 계산합니다.
     * @param {string} nutrient - 영양소 이름 ('열량', '탄수화물' 등).
     * @param {number} value - 레시피의 영양소 함량 값.
     * @returns {string} - 계산된 비율(%)을 소수점 첫째 자리까지 문자열로 반환.
     */
    function calculateDailyPercent(nutrient, value) {
        const standardInfo = DAILY_STANDARDS[nutrient];
        if (standardInfo && standardInfo.value > 0 && !isNaN(value)) {
            const percent = (value / standardInfo.value) * 100;
            return percent.toFixed(1);  
        }
        return 'N/A';
    }

    /**
     * 영양성분 항목 하나를 표시하는 HTML 문자열을 생성합니다.
     */
    function createNutritionItemHTML(label, value, unit, dailyPercent) {
        // 값이 숫자가 아니거나 비어있으면 '정보 없음'으로 표시
        const displayValue = (value !== null && value !== undefined && !isNaN(value)) ? `${value} ${unit}` : '정보 없음';
        
        return `
            <div class="nutrition-item">
                <span class="label">${label}</span>
                <span class="value-group">
                    <span class="value">${displayValue}</span>
                    <span class="percent">${dailyPercent} %</span>
                </span>
            </div>
        `;
    }

    /**
     * 영양성분 데이터를 불러와 화면에 표시합니다.
     * @param {object} recipeData - 단일 레시피 데이터 객체.
     */
    async function fetchNutritionData(recipeData) {
        const dataContainer = document.getElementById('nutrition-data-list');
        
        // 데이터가 이미 로드되어 있다면 중복 로드를 방지하고 함수 종료
        if (dataContainer.dataset.loadedRecipe === recipeData.RCP_NM) {
            return;
        }

        dataContainer.innerHTML = '<p class="loading-text">영양성분 데이터를 계산 중입니다...</p>';

        try {
            let html = '';
            
            // API 필드 이름과 표시할 레이블 매핑
            const nutritionFields = [
                { label: '열량', field: 'INFO_ENG', unit: 'Kcal' }, // 에너지 (칼로리)
                { label: '탄수화물', field: 'INFO_CAR', unit: 'g' },
                { label: '단백질', field: 'INFO_PRO', unit: 'g' },
                { label: '지방', field: 'INFO_FAT', unit: 'g' },
                { label: '나트륨', field: 'INFO_NA', unit: 'mg' }
            ];

            nutritionFields.forEach(item => {
                // API 필드에서 값(문자열)을 가져와 숫자로 변환합니다.
                const rawValue = recipeData[item.field];
                // 값이 빈 문자열이거나 null일 경우 0으로 처리하여 parseFloat이 NaN을 반환하지 않도록 합니다.
                const value = rawValue ? parseFloat(rawValue) : 0; 
                
                // 기준치 대비 비율 계산 (calculateDailyPercent 함수 사용)
                const dailyPercent = calculateDailyPercent(item.label, value);
                
                html += createNutritionItemHTML(item.label, value, item.unit, dailyPercent);
            });
            
            dataContainer.innerHTML = html; // 최종 HTML로 덮어쓰기
            dataContainer.dataset.loadedRecipe = recipeData.RCP_NM; // 로드 완료 표시

        } catch (error) {
            console.error('영양성분 데이터를 처리하는 중 오류 발생:', error);
            dataContainer.innerHTML = `<p class="error-text">데이터 처리 실패: ${error.message}</p>`;
        }
    }

    // DOM 로드 완료 후, 앱 초기화 함수를 최초로 호출하여 기능을 시작합니다.
    initializeApp();
});