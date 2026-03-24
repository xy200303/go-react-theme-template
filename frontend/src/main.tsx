import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import { I18nProvider } from '@/i18n';
import 'antd/dist/reset.css';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1d6df5',
          colorInfo: '#1d6df5',
          borderRadius: 12,
          colorText: '#14345f',
          colorTextSecondary: '#365a87',
          colorBgLayout: '#f3f8ff',
          colorBgContainer: '#ffffff'
        }
      }}
    >
      <I18nProvider>
        <App />
      </I18nProvider>
    </ConfigProvider>
  </StrictMode>
);
