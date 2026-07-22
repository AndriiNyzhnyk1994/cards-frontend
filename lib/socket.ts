import { io } from 'socket.io-client';

// Вставляешь публичную ссылку бэкенда (которая ведет на порт 3001)
const BACKEND_URL = 'https://janitor-sublease-fable.ngrok-free.dev'; 

export const socket = io(BACKEND_URL, {
  extraHeaders: {
    "ngrok-skip-browser-warning": "true",
    "Bypass-Tunnel-Reminder": "true" 
  },
  transports: ['websocket', 'polling'],
});