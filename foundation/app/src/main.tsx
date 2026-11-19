import { createRoot } from 'react-dom/client';
import { AccessRoot } from './auth/AccessRoot';
import { registerAppShell } from './pwa/app-shell';
const productionVariant=import.meta.env.VITE_PWA_TEST_VARIANT;
if(productionVariant) document.documentElement.dataset.pwaVariant=productionVariant;
createRoot(document.getElementById('root')!).render(<AccessRoot/>);
void registerAppShell();
