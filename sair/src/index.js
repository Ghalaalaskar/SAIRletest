import React from 'react';
import ReactDOM from 'react-dom/client'; 
import App from './App'; 
import { ConfigProvider } from 'antd';
import { BrowserRouter } from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
       <ConfigProvider
    theme={{
      token: {
        // Seed Token
        colorPrimary: '#3CC585',
        borderRadius: 5,
      },
     
     
    }}
   >
   <App />
   </ConfigProvider>
   </BrowserRouter>
  </React.StrictMode>
);
 