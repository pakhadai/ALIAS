import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdminPanel } from './screens/AdminPanel';

const root = document.getElementById('admin-root')!;
createRoot(root).render(<AdminPanel />);
