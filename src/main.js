import { createApp } from 'vue';
import App from './App.vue';
import router from '../router/router'; // Import your router configuration

createApp(App)
  .use(router) // Use the router
  .mount('#app');