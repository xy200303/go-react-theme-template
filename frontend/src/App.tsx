import { App as AntdApp } from 'antd';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from '@/router';
import { registerMessageApi } from '@/lib/notify';
import './App.css';

function AntdMessageRegistrar() {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    registerMessageApi(message);
  }, [message]);

  return null;
}

export default function App() {
  return (
    <AntdApp>
      <AntdMessageRegistrar />
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AntdApp>
  );
}
