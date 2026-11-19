import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'pwa-e2e',workers:1,reporter:'list',use:{baseURL:'http://127.0.0.1:5173',headless:true,launchOptions:{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}},webServer:{command:'node scripts/pwa-test-server.mjs',url:'http://127.0.0.1:5173',reuseExistingServer:false,timeout:120000}});
