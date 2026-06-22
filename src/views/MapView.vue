<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { puzzles } from '../data/puzzles'
import { useProgressStore } from '../stores/progress'

const router = useRouter()
const store = useProgressStore()

// 3D 캔버스가 그려질 HTML 요소
const mapContainer = ref(null)

// UI 상호작용 상태
const nearPuzzleId = ref(null)

// Three.js 코어 변수들
let scene, camera, renderer, player, animationId;
const houses = [];
const keys = { w: false, a: false, s: false, d: false, e: false };

onMounted(() => {
  initThreeJS();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  // 컴포넌트를 벗어나면 애니메이션과 메모리를 정리합니다.
  cancelAnimationFrame(animationId);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  if (renderer) renderer.dispose();
});

const initThreeJS = () => {
  // 1. 씬, 카메라, 렌더러 설정
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // 맑은 하늘색

  camera = new THREE.PerspectiveCamera(75, mapContainer.value.clientWidth / 600, 0.1, 1000);
  camera.position.set(0, 5, 8); // 캐릭터 약간 뒤쪽 위에서 비스듬히 내려다봄 (백뷰)

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(mapContainer.value.clientWidth, 600);
  mapContainer.value.appendChild(renderer.domElement);

  // 2. 조명 추가 (햇빛)
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(10, 20, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x606060));

  // 3. 바닥(잔디밭) 만들기
  const floorGeo = new THREE.PlaneGeometry(50, 50);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2; // 평평하게 눕힘
  scene.add(floor);

  // 4. 수수께끼 집(큐브) 배치하기
  const boxGeo = new THREE.BoxGeometry(2, 2, 2);
  
  // 기본 수수께끼 10개를 둥글게 마을처럼 배치
  puzzles.forEach((puzzle, index) => {
    // 이미 푼 문제면 집이 회색으로 변함! 안 푼 문제는 나무색.
    const isSolved = store.solvedPuzzles.includes(puzzle.id);
    const boxMat = new THREE.MeshStandardMaterial({ 
      color: isSolved ? 0x9E9E9E : 0x8D6E63 
    });
    const house = new THREE.Mesh(boxGeo, boxMat);

    // 원형 배치 수학 공식
    const angle = (index / puzzles.length) * Math.PI * 2;
    const radius = 10;
    house.position.set(Math.cos(angle) * radius, 1, Math.sin(angle) * radius);
    
    house.userData = { id: puzzle.id, title: puzzle.title }; // 정보 저장
    scene.add(house);
    houses.push(house);
  });

  // 5. 플레이어(빨간 공) 만들기
  const playerGeo = new THREE.SphereGeometry(0.5, 32, 32);
  const playerMat = new THREE.MeshStandardMaterial({ color: 0xFF5252 });
  player = new THREE.Mesh(playerGeo, playerMat);
  player.position.y = 0.5;
  scene.add(player);

  // 6. 무한 렌더링 루프 시작
  animate();
};

// 키보드 조작 로직
const handleKeyDown = (e) => {
  const key = e.key.toLowerCase();
  if (keys.hasOwnProperty(key)) keys[key] = true;
  
  // E 키를 누르고 & 근처에 집이 있으면 해당 수수께끼로 이동!
  if (key === 'e' && nearPuzzleId.value) {
    router.push(`/puzzle/${nearPuzzleId.value}`);
  }
};

const handleKeyUp = (e) => {
  const key = e.key.toLowerCase();
  if (keys.hasOwnProperty(key)) keys[key] = false;
};

// 매 프레임(초당 60회)마다 실행되는 핵심 루프
const animate = () => {
  animationId = requestAnimationFrame(animate);

  // 이동 로직 (W,A,S,D)
  const speed = 0.15;
  if (keys.w) player.position.z -= speed;
  if (keys.s) player.position.z += speed;
  if (keys.a) player.position.x -= speed;
  if (keys.d) player.position.x += speed;

  // 카메라가 플레이어를 부드럽게 따라다니도록
  camera.position.x += (player.position.x - camera.position.x) * 0.1;
  camera.position.z += (player.position.z + 8 - camera.position.z) * 0.1;

  // 집과의 충돌/거리 체크
  let foundNear = null;
  for (let house of houses) {
    const distance = player.position.distanceTo(house.position);
    if (distance < 2.5) { // 집 2.5 반경 이내로 접근하면
      foundNear = house.userData.id;
      // 집에 가까워지면 집이 살짝 커지는 애니메이션 (선택적 시각 효과)
      house.scale.set(1.2, 1.2, 1.2); 
    } else {
      house.scale.set(1, 1, 1);
    }
  }
  nearPuzzleId.value = foundNear; // Vue 화면에 띄울 UI 데이터 갱신

  renderer.render(scene, camera);
};
</script>

<template>
  <div class="map-view-wrapper">
    <div class="ui-overlay" v-if="nearPuzzleId">
      <div class="prompt-box">
        <h3>🏠 No.{{ nearPuzzleId }} 수수께끼 집</h3>
        <p>입장하려면 <b>[ E ]</b> 키를 누르세요.</p>
      </div>
    </div>
    
    <div ref="mapContainer" class="threejs-container"></div>
    
    <p class="controls-guide">조작법: [W][A][S][D] 이동</p>
  </div>
</template>

<style scoped>
.map-view-wrapper {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  margin-bottom: 20px;
}
.threejs-container {
  width: 100%;
  height: 600px;
  background-color: #000;
  display: block;
}
.ui-overlay {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none; /* 클릭을 방해하지 않음 */
}
.prompt-box {
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 15px 30px;
  border-radius: 8px;
  text-align: center;
  border: 2px solid #42b883;
  animation: bounceIn 0.3s ease-out;
}
.prompt-box h3 { margin: 0 0 10px 0; color: #42b883; }
.prompt-box p { margin: 0; font-size: 14px; }
.controls-guide {
  position: absolute;
  bottom: 10px;
  right: 15px;
  color: white;
  background: rgba(0,0,0,0.5);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
}

@keyframes bounceIn {
  0% { transform: translateY(-20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
</style>