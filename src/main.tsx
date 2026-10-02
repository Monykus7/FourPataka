import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-600.css';
import './styles.css';
import './paper.css';
import './pedalboard.css';
import './physical-board.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
