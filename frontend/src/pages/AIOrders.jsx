import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AIOrders() {
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = localStorage.getItem('userRole') === 'admin' || localStorage.getItem('role') === 'admin';

  useEffect(() => {
    fetchAIRecommendations();
  }, []);

  const fetchAIRecommendations = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      const response = await axios.get(`${API_BASE_URL}/api/ai/suggest-orders`);
      setSummary(response.data.summary);
      setRecommendations(response.data.suggestions);
    } catch (err) {
      console.error("AI 데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const adjustQty = (id, amount) => {
    const updated = recommendations.map(item =>
      item.id === id ? { ...item, suggested_qty: Math.max(0, item.suggested_qty + amount) } : item
    );
    setRecommendations(updated);
  };

  const handleRequestError = (err, actionName) => {
    const status = err.response?.status;
    const detail = err.response?.data?.detail || err.message;
    let message = `🚨 ${actionName} 실패\n\n`;
    if (status === 401) message += "🔑 로그인이 만료되었습니다. 다시 로그인해 주세요.";
    else if (status === 404) message += "❓ 서버 경로를 찾을 수 없습니다. (재빌드 확인 필요)";
    else message += `⚠️ [${status || 'Error'}] ${detail}`;
    alert(message);
  };

  const handleOrderSubmit = async () => {
    const orderItems = recommendations.filter(item => item.suggested_qty > 0);
    if (orderItems.length === 0) {
      alert("발주할 상품 수량이 없습니다.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      
      if (!isAdmin) {
        alert("🚨 발주 권한이 없습니다. 점장 계정으로 로그인해주세요.");
        return;
      }

      const payload = {
        items: orderItems.map(item => ({
          product_id: item.id,
          suggested_qty: item.suggested_qty,
          reason: item.reason
        }))
      };

      // Admin - 결제 및 발주
      const cardCheck = await axios.get(`${API_BASE_URL}/api/payments/check-card`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!cardCheck.data.hasCard) {
        alert("🚨 등록된 결제 카드가 없습니다.\n결제 수단 관리 페이지에서 카드를 먼저 등록해 주세요.");
        return;
      }

      const fullCardNum = cardCheck.data.card_number || "";
      const lastFour = fullCardNum.length >= 4 ? fullCardNum.slice(-4) : "****";

      if (!window.confirm(`💳 등록된 카드(끝자리: ${lastFour})로\n총 ${orderItems.length}건의 품목을 자동 결제 및 발주하시겠습니까?`)) {
        return;
      }

      await axios.post(`${API_BASE_URL}/api/orders/pay-and-submit`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const newOrderHistoryItem = {
        id: `ORD-${Date.now()}`,
        date: new Date().toLocaleString(),
        items: orderItems,
        totalItems: orderItems.length,
        status: 'COMPLETED'
      };

      const existingHistory = JSON.parse(localStorage.getItem('order_history') || '[]');
      localStorage.setItem('order_history', JSON.stringify([newOrderHistoryItem, ...existingHistory]));

      alert("✅ 자동 결제 및 발주가 성공적으로 완료되었습니다!");

      // 화면 초기화 및 임시 저장 데이터 삭제
      setRecommendations([]);
      setSummary('');
      localStorage.removeItem('ai_recommendations');
      localStorage.removeItem('ai_summary');

    } catch (err) {
      handleRequestError(err, "발주 처리");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-xl font-bold font-mono">AI ANALYZING PAST DATA...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden p-6 gap-6 text-white">
      <header>
        <h1 className="text-4xl font-black mb-2 tracking-tighter">AI 스마트 발주 시스템</h1>
        <p className="text-gray-400 text-sm">실시간 재고와 AI 예측 데이터를 기반으로 발주를 제안합니다.</p>
      </header>

      {summary && (
        <div className="bg-indigo-600/20 border border-indigo-500/30 p-5 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/50">
              <span className="material-symbols-outlined text-white block">psychology</span>
            </div>
            <span className="font-bold text-indigo-300 text-lg">AI 예측 리포트</span>
          </div>
          <p className="text-sm leading-relaxed text-indigo-100/80">{summary}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {recommendations.length === 0 ? (
          <div className="text-center py-40 border-2 border-dashed border-white/10 rounded-3xl opacity-30">
            <p>오늘의 발주 제안 데이터가 없습니다.</p>
          </div>
        ) : (
          recommendations.map((p) => (
            <div key={p.id} className={`p-6 rounded-3xl border transition-all flex items-center justify-between ${p.is_special ? 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-xl">{p.name}</h4>
                  {p.is_special && <span className="px-2 py-0.5 bg-pink-500 text-[10px] font-black rounded-md uppercase animate-pulse">Hot Trend</span>}
                </div>
                <p className="text-sm text-indigo-400 font-medium">현재고: {p.current_stock}개 | AI 예측판매: {p.predicted_sales}개</p>
                {p.reason && (
                  <p className="text-xs text-indigo-300/70 mt-1 bg-black/20 p-2 rounded-lg border border-white/5 leading-relaxed">{p.reason}</p>
                )}
              </div>
              <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/10 shrink-0">
                <button onClick={() => adjustQty(p.id, -1)} disabled={!isAdmin} className="w-10 h-10 rounded-xl text-2xl font-bold bg-white/5 hover:bg-white/20">-</button>
                <span className="text-3xl font-black w-12 text-center text-indigo-400">{p.suggested_qty}</span>
                <button onClick={() => adjustQty(p.id, 1)} disabled={!isAdmin} className="w-10 h-10 rounded-xl text-2xl font-bold bg-indigo-600 hover:bg-indigo-500">+</button>
              </div>
            </div>
          ))
        )}
      </div>

      <footer className="pt-2 shrink-0">
        <button
          onClick={handleOrderSubmit}
          disabled={!isAdmin}
          className={`w-full h-20 font-black text-xl rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] ${isAdmin ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-600/20' : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/20 shadow-none'}`}
        >
          <span className="material-symbols-outlined">{isAdmin ? 'credit_card' : 'lock'}</span>
          {isAdmin ? 'AI 제안 수량 결제 및 발주' : '발주 권한 없음 (점장 전용)'}
        </button>
      </footer>
    </div>
  );
}

export default AIOrders;