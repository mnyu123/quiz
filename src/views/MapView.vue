<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { puzzles } from '../data/puzzles'
import { useProgressStore } from '../stores/progress'

const router = useRouter()
const store = useProgressStore()

const mapContainer = ref(null)

// UI 및 상태 관리
const currentPuzzleId = ref(null)
const interactionMsg = ref('')
let gameState = 'OUTDOOR' // 'OUTDOOR' 또는 'INDOOR'

// Three.js 코어 변수
let scene, camera, renderer, animationId
let playerGroup, legL, legR
let houses = [], interiorScene, bookMesh
const keys = { w: false, a: false, s: false, d: false, e: false }
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

onMounted(() => {
  initThreeJS()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('click', onMouseClick)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('click', onMouseClick)
  if (renderer) renderer.dispose()
})

const initThreeJS = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)
  scene.fog = new THREE.Fog(0x87ceeb, 5, 25)

  // 💡 애니메이션 중이라 넓이가 0일 경우를 대비한 기본값(600) 세팅
  const initialWidth = mapContainer.value.clientWidth || 600

  camera = new THREE.PerspectiveCamera(60, initialWidth / 600, 0.1, 1000)
  
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(initialWidth, 600)
  renderer.shadowMap.enabled = true
  mapContainer.value.appendChild(renderer.domElement)

  // 조명 설정
  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  dirLight.position.set(10, 20, 10)
  dirLight.castShadow = true
  scene.add(dirLight)
  scene.add(new THREE.AmbientLight(0x606060))

  // 바닥 (양옆 잔디 필드)
  const floorGeo = new THREE.PlaneGeometry(60, 500)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.z = -200
  floor.receiveShadow = true
  scene.add(floor)

  // 가운데를 관통하는 메인 도로선
  const roadGeo = new THREE.PlaneGeometry(6, 500)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x555555 })
  const road = new THREE.Mesh(roadGeo, roadMat)
  road.rotation.x = -Math.PI / 2
  road.position.set(0, 0.01, -200)
  scene.add(road)

  // 집 생성 사양
  const houseGeo = new THREE.BoxGeometry(3, 3, 3)
  const roofGeo = new THREE.ConeGeometry(2.5, 2, 4)

  puzzles.forEach((puzzle, index) => {
    const isSolved = store.solvedPuzzles.includes(puzzle.id)
    const houseColor = isSolved ? 0x9e9e9e : 0xffa726
    
    const houseGroup = new THREE.Group()
    const base = new THREE.Mesh(houseGeo, new THREE.MeshStandardMaterial({ color: houseColor }))
    base.position.y = 1.5
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0xd35400 }))
    roof.position.y = 4
    roof.rotation.y = Math.PI / 4
    
    houseGroup.add(base, roof)

    const isLeft = index % 2 === 0
    const xPos = isLeft ? -6 : 6
    const zPos = -index * 14 - 8

    houseGroup.position.set(xPos, 0, zPos)
    houseGroup.lookAt(0, houseGroup.position.y, zPos)
    
    houseGroup.userData = { id: puzzle.id, title: puzzle.title }
    scene.add(houseGroup)
    houses.push(houseGroup)
  })

  // 플레이어 모델 조립
  playerGroup = new THREE.Group()
  const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6)
  const bodyGeo = new THREE.BoxGeometry(0.8, 1, 0.4)
  const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3)
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa })
  const clothesMat = new THREE.MeshStandardMaterial({ color: 0x3498db })

  const head = new THREE.Mesh(headGeo, skinMat)
  head.position.y = 1.8
  const body = new THREE.Mesh(bodyGeo, clothesMat)
  body.position.y = 1
  
  legL = new THREE.Mesh(legGeo, clothesMat)
  legL.position.set(-0.2, 0.4, 0)
  legR = new THREE.Mesh(legGeo, clothesMat)
  legR.position.set(0.2, 0.4, 0)

  playerGroup.add(head, body, legL, legR)
  playerGroup.position.set(0, 0, 4)
  scene.add(playerGroup)

  createInteriorScene()

  // 💡 [핵심 마법 코드] 화면 렌더링(애니메이션)이 끝나고 진짜 가로 넓이가 생기면 캔버스 사이즈를 다시 맞춰줍니다.
  const resizeObserver = new ResizeObserver(() => {
    if (!mapContainer.value) return;
    const width = mapContainer.value.clientWidth;
    if (width > 0) {
      camera.aspect = width / 600;
      camera.updateProjectionMatrix();
      renderer.setSize(width, 600);
    }
  });
  resizeObserver.observe(mapContainer.value);

  animate();
}

const createInteriorScene = () => {
  interiorScene = new THREE.Group()
  interiorScene.position.set(0, 100, 0)

  const roomGeo = new THREE.BoxGeometry(10, 10, 10)
  const roomMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, side: THREE.BackSide })
  const room = new THREE.Mesh(roomGeo, roomMat)
  
  const deskGeo = new THREE.BoxGeometry(4, 0.2, 2)
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 })
  const desk = new THREE.Mesh(deskGeo, deskMat)
  desk.position.set(0, -2, -2)

  const bookGeo = new THREE.BoxGeometry(1, 0.1, 1.5)
  const bookMat = new THREE.MeshStandardMaterial({ color: 0x8e44ad })
  bookMesh = new THREE.Mesh(bookGeo, bookMat)
  bookMesh.position.set(0, -1.8, -2)
  bookMesh.rotation.y = 0.2

  const light = new THREE.PointLight(0xfff5b6, 1.5, 20)
  light.position.set(0, 3, -1)

  interiorScene.add(room, desk, bookMesh, light)
  scene.add(interiorScene)
}

const handleKeyDown = (e) => {
  const key = e.key.toLowerCase()
  if (keys.hasOwnProperty(key)) keys[key] = true

  if (key === 'e' && gameState === 'OUTDOOR' && currentPuzzleId.value) {
    enterHouse()
  }
}

const handleKeyUp = (e) => {
  const key = e.key.toLowerCase()
  if (keys.hasOwnProperty(key)) keys[key] = false
}

const onMouseClick = (event) => {
  if (gameState !== 'INDOOR') return

  const rect = mapContainer.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(bookMesh)

  if (intersects.length > 0) {
    // 💡 3D 모드 상태 정보를 주소창 파라미터(?from=map)에 들고 상세 화면으로 진입합니다.
    router.push(`/puzzle/${currentPuzzleId.value}?from=map`)
  }
}

const enterHouse = () => {
  gameState = 'INDOOR'
  interactionMsg.value = '마우스로 책상 위의 보라색 책을 클릭하세요.'
  camera.position.set(0, 100, 3)
  camera.lookAt(0, 98, -2)
}

const exitHouse = () => {
  gameState = 'OUTDOOR'
  interactionMsg.value = ''
}

let clock = new THREE.Clock()

const animate = () => {
  animationId = requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const time = clock.getElapsedTime()

  if (gameState === 'OUTDOOR') {
    const speed = 6 * delta
    let isMoving = false

    // 정면 방향 지향성 이동 처리
    if (keys.w) { playerGroup.position.z -= speed; isMoving = true }
    if (keys.s) { playerGroup.position.z += speed; isMoving = true }
    if (keys.a) { playerGroup.position.x -= speed; isMoving = true }
    if (keys.d) { playerGroup.position.x += speed; isMoving = true }

    if (isMoving) {
      legL.rotation.x = Math.sin(time * 12) * 0.6
      legR.rotation.x = Math.cos(time * 12) * 0.6
    } else {
      legL.rotation.x = 0
      legR.rotation.x = 0
    }

    // 플레이어를 뒤에서 추적 관찰하는 백뷰 카메라 카메라 포지션 시점 리프레시
    const targetCamPos = playerGroup.position.clone().add(new THREE.Vector3(0, 3.5, 6))
    camera.position.lerp(targetCamPos, 0.1)
    camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z)

    let foundNear = null
    houses.forEach(house => {
      const distance = playerGroup.position.distanceTo(house.position)
      if (distance < 3.5) {
        foundNear = house.userData.id
        house.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.1)
      } else {
        house.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
      }
    })

    if (foundNear) {
      currentPuzzleId.value = foundNear
      interactionMsg.value = `No.${foundNear} 수수께끼 집 발견! [E] 키를 누르면 입장합니다.`
    } else {
      currentPuzzleId.value = null
      interactionMsg.value = ''
    }
  } else if (gameState === 'INDOOR') {
    bookMesh.position.y = -1.8 + Math.sin(time * 2.5) * 0.04
  }

  renderer.render(scene, camera)
}
</script>

<template>
  <div class="map-view-wrapper">
    <div class="ui-overlay" v-if="interactionMsg">
      <div class="prompt-box" :class="{ indoor: gameState === 'INDOOR' }">
        <p>{{ interactionMsg }}</p>
      </div>
    </div>
    
    <div ref="mapContainer" class="threejs-container" :class="{ pointer: gameState === 'INDOOR' }"></div>
    
    <p v-if="gameState === 'OUTDOOR'" class="controls-guide">이동 조작: [W][A][S][D] / 문 열기: [E]</p>
    <button v-if="gameState === 'INDOOR'" class="exit-btn" @click="exitHouse">마을광장으로 나가기</button>
  </div>
</template>

<style scoped>
.map-view-wrapper { position: relative; width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
.threejs-container { width: 100%; height: 600px; background-color: #000; }
.threejs-container.pointer { cursor: pointer; }
.ui-overlay { position: absolute; top: 40px; left: 50%; transform: translateX(-50%); z-index: 10; pointer-events: none; }
.prompt-box { background: rgba(0, 0, 0, 0.8); color: #fff; padding: 12px 24px; border-radius: 30px; font-weight: bold; border: 2px solid #42b883; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
.prompt-box.indoor { border-color: #9b59b6; color: #f1c40f; }
.controls-guide { position: absolute; bottom: 10px; left: 15px; color: white; background: rgba(0,0,0,0.6); padding: 5px 10px; border-radius: 4px; font-size: 12px; margin: 0; }
.exit-btn { position: absolute; bottom: 15px; right: 15px; background-color: #e74c3c; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 3px 6px rgba(0,0,0,0.2); }
</style>