import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import PuzzleListView from '../views/PuzzleListView.vue'
import PuzzleDetailView from '../views/PuzzleDetailView.vue'

// RouteRecordRaw 타입을 지정하여 라우트 배열 정의
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'list',
    component: PuzzleListView
  },
  {
    path: '/puzzle/:id',
    name: 'puzzle',
    component: PuzzleDetailView,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router