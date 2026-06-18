<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'

const elapsedTime = ref(0)
let timerInterval = null

// 초 단위를 HH:MM:SS 포맷으로 변환하는 함수
const formatTime = (seconds) => {
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${hrs}:${mins}:${secs}`
}

onMounted(() => {
  // 1초마다 시간 증가
  timerInterval = setInterval(() => {
    elapsedTime.value++
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <div id="app">
    <div class="global-timer">
      ⏱️ {{ formatTime(elapsedTime) }}
    </div>

    <header>
      <h2>🧩 나의 수수께끼 노트</h2>
    </header>

    <main>
      <RouterView v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<style>
/* 타이머 스타일 (우측 상단 가시 영역 고정) */
.global-timer {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #42b883;
  padding: 10px 15px;
  border-radius: 20px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 16px;
  font-weight: bold;
  z-index: 9999; /* 어떤 컴포넌트보다 항상 위에 보이도록 설정 */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  letter-spacing: 1px;
}

/* 기존 스타일 유지 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease-out;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px); 
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px); 
}
#app {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: sans-serif;
}
header {
  margin-bottom: 30px;
}
</style>