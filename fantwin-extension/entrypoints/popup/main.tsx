// @implementation_plan.md Week-0: 基本UI作成
// @mvp_checklist.md D1 Activation: Install → 初回価値体験完了

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './popup.css';

// React 18 Root API
const container = document.getElementById('app');
const root = createRoot(container!);
root.render(<App />); 