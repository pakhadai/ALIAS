import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { AdminApp } from './screens/admin/AdminApp';
import { setupPwaRegister } from './pwa-client';

setupPwaRegister();

const root = document.getElementById('admin-root')!;
createRoot(root).render(<AdminApp />);
