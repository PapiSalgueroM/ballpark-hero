import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import WorldXi from '@/pages/WorldXi';
import { recoveryObservations } from './worldXiRecoveryBoundary';

declare global { interface Window { __WORLD_XI_FICTIONAL_OBSERVATIONS__: typeof recoveryObservations } }
window.__WORLD_XI_FICTIONAL_OBSERVATIONS__ = recoveryObservations;
const root = document.getElementById('root');
if (!root) throw new Error('Missing fictional recovery mount');
createRoot(root).render(<MemoryRouter initialEntries={['/world-xi']}><WorldXi /></MemoryRouter>);
