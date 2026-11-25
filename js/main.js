import './components/index.js';
import { seed } from './services/seed.js';
import { startRouter } from './router.js';

document.getElementById('year').textContent = new Date().getFullYear();

await seed();
startRouter(document.getElementById('view'));