import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import thTH from 'antd/locale/th_TH';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ConfigProvider
        locale={thTH}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            colorInfo: '#1677ff',
            borderRadius: 8,
            borderRadiusLG: 10,
            fontSize: 14,
            controlHeight: 36,
            colorBgContainer: '#ffffff',
          }
        }}
      >
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
