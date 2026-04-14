import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AIOrders() {
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(''); // AI 요약 문구 상태
  const [loading, setLoading] = useState(true);

  // 1. 페이지 접속 시 자동으로 AI 예측 데이터 호출
  useEffect(() => {
    fetchAIRecommendations();
  }, []);

  const fetchAIRecommendations = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/ai/suggest-orders');
      
      // 백엔드 구조 변경에 맞춰 데이터 분리 저장
      setSummary(response.data.summary);
      setRecommendations(response.data.suggestions);
      
      // 백업용으로 로컬 스토리지 저장
      localStorage.setItem('ai_recommendations', JSON.stringify(response.data.suggestions));
      localStorage.setItem('ai_summary', response.data.summary);
    } catch (err) {
      console.error("AI 데이터 로드 실패:", err);
      const savedData = localStorage.getItem('ai_recommendations');
      const savedSummary = localStorage.getItem('ai_summary');
      if (savedData) setRecommendations(JSON.parse(savedData));
      if (savedSummary) setSummary(savedSummary);
    } finally {
      setLoading(false);
    }
  };

  // 2. 수량 조절 함수 (+/-)
  const adjustQty = (id, amount) => {
    const updated = recommendations.map(item => 
      item.id === id ? { ...item, suggested_qty: Math.max(0, item.suggested_qty + amount) } : item
    );
    setRecommendations(updated);
    localStorage.setItem('ai_recommendations', JSON.stringify(updated));
  };

  // 3. 발주 실행 및 DB 저장
  const handleOrderSubmit = async () => {
    if (recommendations.length === 0) return;

    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        items: recommendations
          .filter(item => item.suggested_qty > 0)
          .map(item => ({
            product_id: item.id,
            suggested_qty: item.suggested_qty
          }))
      };

      // 백엔드 DB 저장 API 호출
      await axios.post('http://localhost:8000/api/orders/submit', payload, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // 로컬 히스토리 기록 (Order History용)
      const newOrder = {
        id: `ORD-${Date.now()}`,
        date: new Date().toLocaleString(),
        items: recommendations.filter(item => item.suggested_qty > 0),
        totalItems: payload.items.length
      };
      const existingHistory = JSON.parse(localStorage.getItem('order_history') || '[]');
      localStorage.setItem('order_history', JSON.stringify([newOrder, ...existingHistory]));

      alert("금일 발주 내역이 성공적으로 저장되었습니다!");
      
      // 초기화
      setRecommendations([]);
      setSummary('');
      localStorage.removeItem('ai_recommendations');
      localStorage.removeItem('ai_summary');
      
    } catch (err) {
      console.error(err);
      alert("발주 처리 중 오류가 발생했습니다.");
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
        <p className="text-gray-400 text-sm">지난해 판매 트렌드와 현재 재고를 실시간으로 비교 분석합니다.</p>
      </header>

      {/* --- AI 분석 요약 섹션 --- */}
      {summary && (
        <div className="bg-indigo-600/20 border border-indigo-500/30 p-5 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/50">
              <span className="material-symbols-outlined text-white block">psychology</span>
            </div>
            <span className="font-bold text-indigo-300 text-lg">AI 예측 리포트</span>
          </div>
          <p className="text-sm leading-relaxed text-indigo-100/80">
            {summary}
          </p>
        </div>
      )}

      {/* --- 상품 리스트 섹션 --- */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {recommendations.length === 0 ? (
          <div className="text-center py-40 border-2 border-dashed border-white/10 rounded-3xl opacity-30">
            <p>오늘의 발주 제안 데이터가 없습니다.</p>
          </div>
        ) : (
          recommendations.map((p) => (
            <div 
              key={p.id} 
              className={`p-6 rounded-3xl border transition-all flex items-center justify-between ${
                p.is_special 
                ? 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-xl">{p.name}</h4>
                  {p.is_special && (
                    <span className="px-2 py-0.5 bg-pink-500 text-[10px] font-black rounded-md uppercase tracking-wider animate-pulse">
                      Hot Trend
                    </span>
                  )}
                </div>
                <p className="text-sm text-indigo-400 font-medium">
                  현재고: {p.current_stock}개 | AI 예측판매: {p.predicted_sales}개
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  발주 후 예상 재고: {p.current_stock + p.suggested_qty}개
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/10">
                  <button 
                    onClick={() => adjustQty(p.id, -1)} 
                    className="w-10 h-10 bg-white/5 rounded-xl hover:bg-white/20 text-2xl font-bold transition-colors"
                  >
                    -
                  </button>
                  <span className="text-3xl font-black w-12 text-center text-indigo-400">
                    {p.suggested_qty}
                  </span>
                  <button 
                    onClick={() => adjustQty(p.id, 1)} 
                    className="w-10 h-10 bg-indigo-600 rounded-xl hover:bg-indigo-500 text-2xl font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <footer className="pt-2">
        <button 
          onClick={handleOrderSubmit}
          className="w-full h-20 bg-gradient-to-r from-indigo-600 to-purple-600 font-black text-xl rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined">shopping_cart_checkout</span>
          전체 제안 수량으로 발주 확정
        </button>
      </footer>
    </div>
  );
}

export default AIOrders;