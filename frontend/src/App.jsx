import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout'; // 레이아웃 불러오기
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScanRegister from './pages/ScanRegister';
import AIOrders from './pages/AIOrders';
import OrderHistory from './pages/OrderHistory'; // 이력 페이지 추가

function App() {
  return (
    <Router>
      <Routes>
        {/* 로그인 페이지 (레이아웃 제외) */}
        <Route path="/" element={<Login />} />
        
        {/* 아래 페이지들은 Layout으로 감싸서 사이드바가 나오게 설정 */}
        <Route 
          path="/dashboard" 
          element={<Layout><Dashboard /></Layout>} 
        />
        <Route 
          path="/scan" 
          element={<Layout><ScanRegister /></Layout>} 
        />
        <Route 
          path="/ai-orders" 
          element={<Layout><AIOrders /></Layout>} 
        />
        <Route 
          path="/history" 
          element={<Layout><OrderHistory /></Layout>} 
        />
      </Routes>
    </Router>
  );
}

export default App;