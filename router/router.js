import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/components/HelloWorld.vue';
import Login from '@/components/login.vue';
import StorePage from '@/components/StorePage.vue';

const routes = [
  {
    path: '/dashboard',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/store',
    name: 'store',
    component: StorePage
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

export default router;