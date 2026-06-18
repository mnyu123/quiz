import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router' // router/index.ts 파일이 있다면 자동으로 인식합니다.

const app = createApp(App)

// Pinia와 라우터 등록
app.use(createPinia())
app.use(router)

app.mount('#app')