/* ====================================================
   S+ — 서강대 자취 플랫폼 앱 로직
   해시 기반 SPA 라우터 + 상태 관리 + 렌더링
==================================================== */

/* ===== 카카오맵 API 설정 =====
   https://developers.kakao.com 에서 앱 등록 후 키 입력
   입력 시 map-placeholder 대신 실제 지도가 표시됨       */
const KAKAO_MAP_KEY = '';

/* ====================================================
   앱 전역 상태
==================================================== */

// [추가 Block 1] 유클리드 거리 연산용 5차원 좌표 매핑 테이블
const COMPAT_SCORE_MAP = {
  sleep:   { early: 1, normal: 2, late: 3 },
  clean:   { very: 1,  normal: 2, free: 3 },
  noise:   { sensitive: 1, normal: 2, tolerant: 3 },
  guest:   { rare: 1, sometimes: 2, often: 3 },
  smoking: { yes: 1,   no: 3 }
};
const state = {
  user:       null,          // 로그인한 사용자 { email, nickname }
  mapMode:    'properties',  // 지도 모드: 'properties' | 'roomies'
  boardCat:   'all',         // 게시판 필터 카테고리
  verifyCode: null,          // 이메일 인증 코드 (서버 미연동 시 클라이언트 보관)
};

/* ====================================================
   샘플 데이터 — 인수인계 매물
==================================================== */
const TAKEON_DATA = [
  {
    id:1, category:'room', area:'신촌', type:'원룸',
    deposit:500, rent:45, fee:null, period:'',
    date:'2026-06-15',
    desc:'신촌역 도보 5분, 풀옵션, 남향, 조용한 골목. 가구 일부 인계 가능합니다.',
    emoji:'🏠',
    user:{ name:'익명의 고양이', icon:'🐱' },
    tags:['방 인수인계','풀옵션','남향','역세권'],
    pos:{ left:'28%', top:'38%' },
  },
  {
    id:2, category:'room', area:'이대', type:'투룸',
    deposit:1000, rent:75, fee:null, period:'',
    date:'2026-07-01',
    desc:'이대역 3분, 투룸 구조, 욕실 2개. 에어컨 포함 가전 전체 인계합니다.',
    emoji:'🏡',
    user:{ name:'익명의 토끼', icon:'🐰' },
    tags:['방 인수인계','투룸','욕실2개','가전포함'],
    pos:{ left:'54%', top:'32%' },
  },
  {
    id:3, category:'room', area:'대흥', type:'오피스텔',
    deposit:300, rent:60, fee:null, period:'',
    date:'2026-06-30',
    desc:'대흥역과 서강대가 가까운 신축 오피스텔. 관리비 5만원, 헬스장 포함.',
    emoji:'🏢',
    user:{ name:'익명의 여우', icon:'🦊' },
    tags:['방 인수인계','신축','헬스장','역세권'],
    pos:{ left:'22%', top:'58%' },
  },
  {
    id:4, category:'rental', area:'신촌', type:'가전제품',
    deposit:0, rent:0, fee:2, period:'3개월',
    date:'2026-07-10',
    desc:'교환학생 기간 동안 전자레인지와 에어프라이어를 대여합니다. 직접 픽업 가능하신 분 우대.',
    emoji:'📦',
    user:{ name:'익명의 다람쥐', icon:'🐿️' },
    tags:['물건 대여','전자레인지','에어프라이어','단기대여'],
    pos:{ left:'62%', top:'54%' },
  },
  {
    id:5, category:'rental', area:'대흥', type:'생활용품',
    deposit:0, rent:0, fee:1, period:'1개월',
    date:'2026-06-25',
    desc:'장기 여행으로 비우는 동안 청소기와 건조대를 대여합니다. 사용 후 깨끗하게 반납해주세요.',
    emoji:'🧺',
    user:{ name:'익명의 수달', icon:'🦦' },
    tags:['물건 대여','청소기','건조대','생활용품'],
    pos:{ left:'48%', top:'50%' },
  },
]

/* ====================================================
   샘플 데이터 — 룸메이트 구인
==================================================== */
// 📍 [변경 Block 2] 성향 확장 및 matchScore: null 플래그 장착
const ROOMIES_DATA = [
  {
    id:1, area:'마포', location:'마포구 노고산동 투룸',
    name:'고래 박하', budget:80, gender:'female', style:'quiet',
    tags:['비흡연','조용함','집순이'],
    desc:'서강대 22학번입니다. 조용하고 깔끔하게 지내실 분 구해요.',
    icon:'🐋', 
    sleep:'normal', clean:'very', noise:'sensitive', smoking:'no', guest:'rare', // 성향 5개
    mbti:'ISTJ', matchScore: null, // 초기 진입 시 숨김 처리용 플래그
    pos:{ left:'60%', top:'52%' },
  },
  {
    id:2, area:'신촌', location:'신촌 원룸 쉐어',
    name:'초록 사과', budget:50, gender:'male', style:'homebody',
    tags:['비흡연','홈바디','취준생'],
    desc:'취준 중이라 집에 자주 있어요. 서로 존중하며 지내요.',
    icon:'🍏', 
    sleep:'late', clean:'normal', noise:'normal', smoking:'no', guest:'sometimes',
    mbti:'INFP', matchScore: null,
    pos:{ left:'26%', top:'36%' },
  },
  {
    id:3, area:'이대', location:'이대역 투룸',
    name:'라벤더', budget:70, gender:'female', style:'active',
    tags:['여성전용','비흡연','대학원생'],
    desc:'대학원생이라 평일엔 늦게 들어와요. 주말엔 활발히 지내요.',
    icon:'💜', 
    sleep:'late', clean:'normal', noise:'normal', smoking:'no', guest:'often',
    mbti:'ENFJ', matchScore: null,
    pos:{ left:'52%', top:'30%' },
  },
  {
    id:4, area:'마포', location:'마포구 아현동 원룸 쉐어',
    name:'파란 하늘', budget:45, gender:'male', style:'quiet',
    tags:['비흡연','밤형','조용함'],
    desc:'밤에 주로 게임하지만 이어폰 씁니다. 낮에는 조용해요.',
    icon:'🌤️', 
    sleep:'late', clean:'normal', noise:'tolerant', smoking:'no', guest:'rare',
    mbti:'ESTP', matchScore: null,
    pos:{ left:'65%', top:'58%' },
  },
];
/* ====================================================
   샘플 데이터 — 익명 게시글
==================================================== */
const POSTS_DATA = [
  {
    id:1, cat:'review',
    title:'신촌 현대 오피스텔 6개월 살아본 후기',
    content:'관리비가 생각보다 많이 나왔어요. 여름엔 에어컨 때문에 20만원 가까이… 건물 자체는 깨끗하고 보안이 잘 되어있어요.',
    date:'2026-05-24', views:143, comments:5,
  },
  {
    id:2, cat:'question',
    title:'이대역 근처 원룸 추천해주세요 (여성)',
    content:'이대 근처에서 자취 시작하려는데 어떤 부분을 제일 신경써야 하나요? 보증금 500에 월세 50 정도 예산입니다.',
    date:'2026-05-23', views:87, comments:12,
  },
  {
    id:3, cat:'tip',
    title:'자취방 계약 전 반드시 확인할 체크리스트',
    content:'1) 수압 확인 2) 곰팡이 확인 (벽 모서리·화장실) 3) 인터넷 속도 4) 관리비 항목 5) 임대차 계약서 특약 사항',
    date:'2026-05-22', views:298, comments:8,
  },
  {
    id:4, cat:'review',
    title:'마포구 자취 1년 총평',
    content:'서강대 근처는 생각보다 조용하고 살기 좋아요. 홍대랑 가까워서 편의시설도 많고. 단점은 버스 노선이 좀 부족한 것?',
    date:'2026-05-21', views:211, comments:15,
  },
  {
    id:5, cat:'tip',
    title:'관리비 폭탄 주의! 계약 전 반드시 물어볼 것',
    content:'관리비에 포함되는 항목이 건물마다 다릅니다. 수도·전기·가스 별도인지, 인터넷 포함인지 꼭 확인하세요!',
    date:'2026-05-20', views:445, comments:23,
  },
];

/* ====================================================
   유틸 함수
==================================================== */

// 날짜 문자열 → M/D 포맷
function fmtDate(str) {
  const d = new Date(str);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

// 로그인 여부 확인
function isLoggedIn() { return state.user !== null; }

// 로그인이 필요한 액션: 미로그인 시 로그인 모달 오픈
function requireLogin(fn) {
  if (!isLoggedIn()) { openModal('login'); return; }
  fn();
}

// 태그 뱃지 HTML 생성
function renderTags(tags) {
  return tags.map(t => `<span class="tag">${t}</span>`).join('');
}

function getHandoverLabel(item) {
  return item.category === 'rental' ? '물건 대여' : '방 인수인계';
}

function getHandoverPrice(item) {
  if (item.category === 'rental') {
    const fee = item.fee || item.deposit || 0;
    return `대여비 ${fee}만 / ${item.period || '기간 협의'}`;
  }
  return `보증 ${item.deposit}만 / 월 ${item.rent}만`;
}

/* ====================================================
   해시 기반 페이지 라우터
   URL 해시(#map, #board 등)에 따라 페이지 전환
==================================================== */
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // 네비 링크 활성 표시
  document.querySelectorAll('.nav-link[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // 지도 페이지 진입 시 목록·마커 렌더
  if (page === 'map') { renderMapList(); renderMapMarkers(); }
}

function handleRoute() {
  let page = location.hash.replace('#', '') || 'home';
  if (page === 'takeon') page = 'handover';
  navigateTo(page);
}

/* ====================================================
   모달 / 사이드바 열고 닫기
==================================================== */
function openModal(name)  { document.getElementById(`modal-${name}`).classList.remove('hidden'); }
function closeModal(name) { document.getElementById(`modal-${name}`).classList.add('hidden'); }
function switchModal(from, to) { closeModal(from); openModal(to); }

function openSidebar()  { document.getElementById('sidebar-mypage').classList.remove('hidden'); }
function closeSidebar() { document.getElementById('sidebar-mypage').classList.add('hidden'); }

/* ====================================================
   인증 처리
==================================================== */

// 서강대 이메일 검증 (@sogang.ac.kr 만 허용)
function isSogangEmail(email) {
  return email.trim().endsWith('@sogang.ac.kr');
}

// 로그인 폼 제출 핸들러
function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');

  if (!isSogangEmail(email)) {
    showFormError(errEl, '서강대학교 이메일(@sogang.ac.kr)만 사용 가능합니다.');
    return;
  }
  if (password.length < 6) {
    showFormError(errEl, '비밀번호를 확인해주세요.');
    return;
  }

  errEl.classList.add('hidden');
  // 실제 서비스에서는 서버 인증 API 호출
  loginUser({ email, nickname: email.split('@')[0] });
  closeModal('login');
  document.getElementById('loginForm').reset();
}

// 이메일 인증 코드 발송 (서버 미연동: 콘솔 출력으로 시뮬레이션)
function sendVerification() {
  const email = document.getElementById('regEmail').value;
  if (!isSogangEmail(email)) {
    alert('서강대학교 이메일(@sogang.ac.kr)만 사용 가능합니다.');
    return;
  }
  // 6자리 랜덤 코드 생성
  state.verifyCode = String(Math.floor(100000 + Math.random() * 900000));
  document.getElementById('verifyCodeGroup').style.display = 'block';

  // 개발 환경: 코드를 콘솔에서 확인 (실 서버 구현 시 이메일로 발송)
  console.info('[인증코드 개발용]', state.verifyCode);
  alert(`${email} 으로 인증 코드를 발송했습니다.\n(개발 환경: 브라우저 콘솔에서 확인)`);
}

// 인증 코드 일치 여부 확인
function checkVerification() {
  const input = document.getElementById('verifyCode').value.trim();
  if (input === state.verifyCode) {
    alert('인증 완료!');
    document.getElementById('verifyCode').disabled = true;
  } else {
    alert('인증 코드가 올바르지 않습니다.');
  }
}

// 회원가입 폼 제출 핸들러
function handleRegister(e) {
  e.preventDefault();
  const email    = document.getElementById('regEmail').value;
  const nickname = document.getElementById('regNickname').value.trim();
  const errEl    = document.getElementById('registerError');

  if (!isSogangEmail(email)) {
    showFormError(errEl, '서강대학교 이메일(@sogang.ac.kr)만 사용 가능합니다.');
    return;
  }
  if (!nickname) {
    showFormError(errEl, '닉네임을 입력해주세요.');
    return;
  }

  errEl.classList.add('hidden');
  // 실제 서비스에서는 서버 회원가입 API 호출
  loginUser({ email, nickname });
  closeModal('register');
  document.getElementById('registerForm').reset();
  document.getElementById('verifyCodeGroup').style.display = 'none';
}

// 폼 에러 표시 헬퍼
function showFormError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

// 로그인 성공 후 UI 상태 전환
function loginUser(user) {
  state.user = user;

  // 네비: Sign in/Register → 아바타 버튼
  document.getElementById('authButtons').classList.add('hidden');
  document.getElementById('userButtons').classList.remove('hidden');
  document.getElementById('navUsername').textContent = user.nickname;

  // 히어로 섹션: 맞춤 인사로 교체
  document.getElementById('heroTitle').textContent = `안녕하세요, ${user.nickname}님!`;
  document.getElementById('heroSubtitle').textContent = '오늘도 좋은 자취 생활 되세요 🏠';
  document.getElementById('heroBtns').innerHTML = `
    <button class="btn-primary-lg" onclick="location.hash='handover'">Handover 보기</button>
    <button class="btn-outline-lg" onclick="location.hash='roomies'">룸메 찾기</button>
  `;

  // 마이페이지 프로필 채우기
  document.getElementById('mypageName').textContent  = user.nickname;
  document.getElementById('mypageEmail').textContent = user.email;
}

// 로그아웃: 상태 초기화 + UI 복원
function logout() {
  state.user = null;

  document.getElementById('authButtons').classList.remove('hidden');
  document.getElementById('userButtons').classList.add('hidden');

  document.getElementById('heroTitle').textContent = '로그인 후 이용해주세요.';
  document.getElementById('heroSubtitle').textContent = '서강대학교 학생 전용 자취 플랫폼';
  document.getElementById('heroBtns').innerHTML = `
    <button class="btn-outline-lg" onclick="openModal('login')">Sign in</button>
    <button class="btn-primary-lg" onclick="openModal('register')">Register</button>
  `;

  closeSidebar();
}

/* ====================================================
   HOME — 인수인계 미리보기 카드 렌더링
==================================================== */
function renderTakeonPreview() {
  document.getElementById('takeonPreview').innerHTML =
    TAKEON_DATA.slice(0, 4).map(item => `
      <div class="takeon-card" onclick="location.hash='handover'">
        <div class="takeon-card-img">${item.emoji}</div>
        <div class="takeon-card-body">
          <div class="takeon-card-title">${item.area} ${item.type}</div>
          <div class="takeon-card-price">${getHandoverPrice(item)}</div>
          <div class="roomie-tags" style="margin-top:6px">${renderTags([getHandoverLabel(item)])}</div>
          <div class="takeon-card-user">
            <div class="avatar">${item.user.icon}</div>
            <span style="font-size:11px;color:var(--muted)">${item.user.name}</span>
          </div>
        </div>
      </div>
    `).join('');
}

/* ====================================================
   HOME — 실거주 후기 Quote 카드 렌더링 (익명 게시글 기반)
==================================================== */
function renderReviewsPreview() {
  const reviews = POSTS_DATA.filter(p => p.cat === 'review').slice(0, 3);
  document.getElementById('reviewsPreview').innerHTML =
    reviews.map(p => `
      <div class="quote-card" onclick="location.hash='board'">
        <div class="quote-text">"${p.content.substring(0, 70)}…"</div>
        <div class="quote-user">
          <div class="avatar">😶</div>
          <div>
            <div class="quote-name">익명</div>
            <div class="quote-desc">${fmtDate(p.date)}</div>
          </div>
        </div>
      </div>
    `).join('');
}

/* ====================================================
   HOME — 룸메이트 미리보기 카드 렌더링
==================================================== */
function renderRoomiesPreview() {
  document.getElementById('roomiesPreview').innerHTML =
    ROOMIES_DATA.map(r => `
      <div class="roomie-card" onclick="location.hash='roomies'">
        <div class="roomie-card-header">
          <div class="avatar-lg">${r.icon}</div>
          <div>
            <div class="roomie-name">${r.location}</div>
            <div class="roomie-sub">${r.name}</div>
          </div>
        </div>
        <div class="roomie-price">월 ${r.budget}만원</div>
        <div class="roomie-tags">${renderTags(r.tags)}</div>
        <div class="roomie-desc">${r.desc}</div>
      </div>
    `).join('');
}

/* ====================================================
   MAP — 지도 모드 토글 (매물 ↔ 룸메)
==================================================== */
function setMapMode(mode) {
  state.mapMode = mode;
  document.getElementById('toggleProperties').classList.toggle('active', mode === 'properties');
  document.getElementById('toggleRoomies').classList.toggle('active', mode === 'roomies');
  renderMapList();
  renderMapMarkers();
}

// 지도 오른쪽 목록 사이드바 렌더링
function renderMapList() {
  const data = state.mapMode === 'properties' ? TAKEON_DATA : ROOMIES_DATA;
  document.getElementById('mapList').innerHTML = data.map(item =>
    state.mapMode === 'properties'
      ? `<div class="sidebar-card" onclick="location.hash='handover'">
           <div class="sidebar-card-title">${item.area} ${item.type}</div>
           <div class="sidebar-card-price">${getHandoverPrice(item)}</div>
           <div class="sidebar-card-tags">${renderTags(item.tags)}</div>
         </div>`
      : `<div class="sidebar-card" onclick="location.hash='roomies'">
           <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
             <div class="avatar">${item.icon}</div>
             <div>
               <div class="sidebar-card-title" style="margin:0">${item.name}</div>
               <div class="sidebar-card-price">${item.location}</div>
             </div>
           </div>
           <div class="sidebar-card-price">월 ${item.budget}만원</div>
           <div class="sidebar-card-tags">${renderTags(item.tags.slice(0,2))}</div>
         </div>`
  ).join('');
}

// 지도 위에 가격 마커 배치 (퍼센트 좌표 — 실제 API 연동 시 위경도로 교체)
function renderMapMarkers() {
  const data = state.mapMode === 'properties' ? TAKEON_DATA : ROOMIES_DATA;
  document.getElementById('mapMarkers').innerHTML = data.map(item => {
    const label = state.mapMode === 'properties'
      ? (item.category === 'rental' ? `${item.area} 대여` : `${item.area} ${item.rent}만`)
      : item.name;
    return `<div class="map-marker" style="left:${item.pos.left};top:${item.pos.top}">${label}</div>`;
  }).join('');
}

/* ====================================================
   BOARD — 게시글 목록 렌더링
==================================================== */
function renderBoard(cat = 'all') {
  const catLabel = { review:'후기', question:'질문', tip:'꿀팁' };
  const list = cat === 'all' ? POSTS_DATA : POSTS_DATA.filter(p => p.cat === cat);

  document.getElementById('postList').innerHTML = list.map(p => `
    <div class="post-item" onclick="openPost(${p.id})">
      <span class="post-category-badge badge-${p.cat}">${catLabel[p.cat]}</span>
      <div class="post-title">${p.title}</div>
      <div class="post-preview">${p.content}</div>
      <div class="post-meta">
        <span>익명</span>
        <span>${fmtDate(p.date)}</span>
        <span>조회 ${p.views}</span>
        <span>댓글 ${p.comments}</span>
      </div>
    </div>
  `).join('');
}

// 카테고리 탭 클릭 — 버튼 활성화 + 목록 필터
function filterBoard(btn, cat) {
  state.boardCat = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderBoard(cat);
}

// 게시글 열기 (로그인 필요)
function openPost(id) {
  requireLogin(() => {
    const p = POSTS_DATA.find(x => x.id === id);
    if (!p) return;
    alert(`[${p.title}]\n\n${p.content}\n\n─\n작성일: ${p.date}  조회: ${p.views}`);
  });
}

// 글쓰기 버튼 — 로그인 필요
function openWritePost() {
  requireLogin(() => openModal('writepost'));
}

// 게시글 제출 — 목록 맨 앞에 추가
function submitPost(e) {
  e.preventDefault();
  const newPost = {
    id:      POSTS_DATA.length + 1,
    cat:     document.getElementById('postCategory').value,
    title:   document.getElementById('postTitle').value,
    content: document.getElementById('postContent').value,
    date:    new Date().toISOString().split('T')[0],
    views:   0, comments: 0,
  };
  POSTS_DATA.unshift(newPost);
  renderBoard(state.boardCat);
  closeModal('writepost');
  e.target.reset();
}

/* ====================================================
   ROOMIES — 룸메이트 카드 그리드 렌더링
==================================================== */
function renderRoomiesGrid(data = ROOMIES_DATA) {
  document.getElementById('roomiesGrid').innerHTML = data.length
    ? data.map(r => { // 📍 중괄호 { 시작
        // 1. 점수가 null이 아닐 때만 출력할 텍스트 포맷 세팅 (desc 아래 들어갈 삼항 연산자)
        const scoreLine = (r.matchScore !== null)
          ? `<div style="margin-top: 10px; font-size: 13px; font-weight: 700; color: #22c55e;">
               궁합 점수 : ${r.matchScore}점
             </div>`
          : '';

        // 2. HTML 반환 (return과 백틱 `` 장착)
        return `
          <div class="roomie-card-full" onclick="openRoomieDetail(${r.id})">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <div class="avatar-lg">${r.icon}</div>
              <div>
                <div style="font-weight:600;font-size:14px">${r.name}</div>
                <div style="font-size:12px;color:var(--secondary)">${r.location}</div>
              </div>
            </div>
            <div style="font-size:15px;font-weight:700;margin-bottom:8px">월 ${r.budget}만원</div>
            <div class="roomie-tags">${renderTags(r.tags)}</div>
            <p style="font-size:12px;color:var(--secondary);margin-top:10px;
                      overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
              ${r.desc}
            </p>
            
            ${scoreLine}
          </div>
        `;
      }).join('') // 📍 중괄호 } 끝
    : `<p class="text-muted" style="grid-column:1/-1;padding:40px 0;text-align:center">
         조건에 맞는 룸메이트가 없습니다
       </p>`;
}

// 필터 적용
function applyRoomiesFilter() {
  const area   = document.getElementById('filterArea').value;
  const gender = document.getElementById('filterGender').value;
  const price  = document.getElementById('filterPrice').value;
  const style  = document.getElementById('filterStyle').value;

  let result = [...ROOMIES_DATA];
  if (area)   result = result.filter(r => r.area === area);
  if (gender) result = result.filter(r => r.gender === gender);
  if (price)  result = result.filter(r => r.budget <= parseInt(price));
  if (style)  result = result.filter(r => r.style === style);
  result.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  renderRoomiesGrid(result);
}

// 룸메이트 상세 (로그인 필요)
function openRoomieDetail(id) {
  requireLogin(() => {
    const r = ROOMIES_DATA.find(x => x.id === id);
    if (!r) return;
    alert(`[${r.name}]\n위치: ${r.location}\n예산: 월 ${r.budget}만원\n\n${r.desc}`);
  });
}

// 룸메궁합 버튼 → 마이페이지 사이드바 오픈 (로그인 필요)
function showCompatibility() {
  requireLogin(() => openSidebar());
}

/* ====================================================
   HANDOVER — 인수인계 카드 그리드 렌더링
==================================================== */
function renderTakeonGrid(data = TAKEON_DATA) {
  document.getElementById('takeonGrid').innerHTML = data.map(item => `
    <div class="takeon-full-card" onclick="openTakeonDetail(${item.id})">
      <div class="takeon-full-card-img">${item.emoji}</div>
      <div class="takeon-full-card-body">
        <div class="takeon-full-card-title">${item.area} ${item.type}</div>
        <div class="takeon-full-card-price">${getHandoverPrice(item)}</div>
        <div class="takeon-full-card-detail">${item.desc}</div>
        <div class="roomie-tags" style="margin-bottom:10px">${renderTags(item.tags)}</div>
        <div class="takeon-full-card-footer">
          <div class="takeon-full-card-user">
            <div class="avatar">${item.user.icon}</div>
            <span>${item.user.name}</span>
          </div>
          <div class="takeon-full-card-date">인계 ${fmtDate(item.date)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// 지역·방 종류 필터
function applyTakeonFilter() {
  const category = document.getElementById('takeonCategory').value;
  const area = document.getElementById('takeonArea').value;
  const type = document.getElementById('takeonType').value;
  let result = [...TAKEON_DATA];
  if (category) result = result.filter(i => i.category === category);
  if (area) result = result.filter(i => i.area === area);
  if (type) result = result.filter(i => i.type === type);
  renderTakeonGrid(result);
}

// 인수인계 상세 (로그인 필요)
function openTakeonDetail(id) {
  requireLogin(() => {
    const item = TAKEON_DATA.find(x => x.id === id);
    if (!item) return;
    alert(`[${getHandoverLabel(item)}] ${item.area} ${item.type}\n${getHandoverPrice(item)}\n희망일: ${item.date}\n\n${item.desc}`);
  });
}

// 인수인계 등록 버튼 (로그인 필요)
function openWriteTakeon() {
  requireLogin(() => openModal('writetakeon'));
}

// 인수인계 폼 제출 — 목록 맨 앞에 추가
function submitTakeon(e) {
  e.preventDefault();
  const newItem = {
    id:      TAKEON_DATA.length + 1,
    category: document.getElementById('newTakeonCategory').value,
    area:    document.getElementById('newTakeonArea').value,
    type:    document.getElementById('newTakeonType').value,
    deposit: parseInt(document.getElementById('newTakeonDeposit').value) || 0,
    rent:    parseInt(document.getElementById('newTakeonRent').value) || 0,
    fee:     parseInt(document.getElementById('newTakeonDeposit').value) || 0,
    period:  document.getElementById('newTakeonPeriod').value || '기간 협의',
    date:    document.getElementById('newTakeonDate').value,
    desc:    document.getElementById('newTakeonDesc').value || '상세 내용 없음',
    emoji:   document.getElementById('newTakeonCategory').value === 'rental' ? '📦' : '🏠',
    user:    { name: state.user.nickname, icon: '👤' },
    tags:    [document.getElementById('newTakeonCategory').value === 'rental' ? '물건 대여' : '방 인수인계', document.getElementById('newTakeonArea').value, document.getElementById('newTakeonType').value],
    pos:     { left: '45%', top: '45%' },
  };
  TAKEON_DATA.unshift(newItem);
  renderTakeonGrid();
  renderTakeonPreview();
  closeModal('writetakeon');
  e.target.reset();
}

/* ====================================================
   MY PAGE SIDEBAR — 탭 전환
==================================================== */
function switchTab(btn, tabId) {
  // 탭 버튼 활성화
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // 탭 콘텐츠 전환
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
}

/* ====================================================
   MY PAGE SIDEBAR — 룸메궁합 분석
   취침시간·청결도·소음민감도 조합으로 룸메 유형 분류
==================================================== */

function calcMbtiScore(myMbti, targetMbti) {
  if (!myMbti || !targetMbti || myMbti.length !== 4 || targetMbti.length !== 4) {
    return 0;
  }

  let matchCount = 0;

  for (let i = 0; i < 4; i++) {
    if (myMbti[i] === targetMbti[i]) {
      matchCount++;
    }
  }

  return (matchCount / 4) * 10;
}

function saveCompatProfile() {
  const sleep = document.getElementById('compatSleep').value;
  const clean = document.getElementById('compatClean').value;
  const noise = document.getElementById('compatNoise').value;
  const smoking = document.getElementById('compatSmoking').value;
  const guest = document.getElementById('compatGuest').value;

  const mbti =
    document.getElementById('compatEI').value +
    document.getElementById('compatNS').value +
    document.getElementById('compatTF').value +
    document.getElementById('compatPJ').value;

  let emoji, type, desc;

  if (clean === 'very' && noise === 'sensitive') {
    emoji = '✨';
    type = '청결 민감형';
    desc = '깨끗하고 조용한 환경을 중시해요. 비슷한 성향의 룸메와 최고의 궁합!';
  } else if (sleep === 'late' && noise === 'tolerant') {
    emoji = '🌙';
    type = '자유로운 밤형';
    desc = '늦게 자고 소음에 여유로워요. 활발한 룸메와도 잘 어울려요.';
  } else if (sleep === 'early' && clean === 'very') {
    emoji = '☀️';
    type = '규칙적 깔끔형';
    desc = '일찍 자고 깔끔함을 선호해요. 규칙적인 생활의 룸메와 잘 맞아요.';
  } else {
    emoji = '⚖️';
    type = '균형 조화형';
    desc = '다양한 성향과 두루 잘 어울리는 유연한 타입이에요.';
  }

  document.getElementById('compatBadge').textContent = emoji;
  document.getElementById('compatType').textContent = type;
  document.getElementById('compatDesc').textContent = desc;

  ROOMIES_DATA.forEach(roomie => {
    let distanceSquared = 0;

    distanceSquared += Math.pow(COMPAT_SCORE_MAP.sleep[sleep] - COMPAT_SCORE_MAP.sleep[roomie.sleep], 2);
    distanceSquared += Math.pow(COMPAT_SCORE_MAP.clean[clean] - COMPAT_SCORE_MAP.clean[roomie.clean], 2);
    distanceSquared += Math.pow(COMPAT_SCORE_MAP.noise[noise] - COMPAT_SCORE_MAP.noise[roomie.noise], 2);
    distanceSquared += Math.pow(COMPAT_SCORE_MAP.guest[guest] - COMPAT_SCORE_MAP.guest[roomie.guest], 2);
    distanceSquared += Math.pow(COMPAT_SCORE_MAP.smoking[smoking] - COMPAT_SCORE_MAP.smoking[roomie.smoking], 2);

    let lifestyleScore = (1 - (distanceSquared / 20)) * 10.0;
    let mbtiScore = calcMbtiScore(mbti, roomie.mbti);

    let finalScore = lifestyleScore * 0.7 + mbtiScore * 0.3;

    roomie.matchScore = Math.round(finalScore * 10) / 10;
  });

  ROOMIES_DATA.sort((a, b) => b.matchScore - a.matchScore);

  renderRoomiesGrid(ROOMIES_DATA);
  document.getElementById('compatResults').classList.remove('hidden');

  setTimeout(() => {
    closeSidebar();
    location.hash = 'roomies';
  }, 2000);
}

/* ====================================================
   초기화 — DOMContentLoaded
==================================================== */
function init() {
  // 홈 화면 콘텐츠 렌더
  renderTakeonPreview();
  renderReviewsPreview();
  renderRoomiesPreview();

  // 각 페이지 초기 렌더
  renderBoard();
  renderRoomiesGrid();
  renderTakeonGrid();
  renderMapList();
  renderMapMarkers();

  // 해시 라우팅 이벤트
  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // 네비 버튼 이벤트
  document.getElementById('signinBtn').addEventListener('click',   () => openModal('login'));
  document.getElementById('registerBtn').addEventListener('click', () => openModal('register'));
  document.getElementById('heroSignin').addEventListener('click',  () => openModal('login'));
  document.getElementById('heroRegister').addEventListener('click',() => openModal('register'));
  document.getElementById('mypageBtn').addEventListener('click',   openSidebar);

  // 검색바 Enter 키
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim();
    if (q) alert(`"${q}" 검색 기능은 서버 연동 후 사용 가능합니다.`);
  });

  // 카카오맵 API 키가 있으면 지도 초기화
  if (KAKAO_MAP_KEY) {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false`;
    script.onload = () => kakao.maps.load(() => {
      const container = document.getElementById('kakao-map');
      const options   = { center: new kakao.maps.LatLng(37.552, 126.938), level: 4 };
      new kakao.maps.Map(container, options);
      container.querySelector('.map-placeholder')?.remove();
    });
    document.head.appendChild(script);
  }
}

document.addEventListener('DOMContentLoaded', init);
