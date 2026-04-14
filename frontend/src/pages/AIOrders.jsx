import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AIOrders() {
<<<<<<< HEAD
  // 1. 상태 관리: 실제 DB 데이터를 담을 배열과 로딩 상태
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const userRole = localStorage.getItem('userRole'); 
  const isAdmin = userRole === 'admin';

  // 2. 백엔드 API 호출 함수
  const fetchAIRecommendations = async () => {
    const token = localStorage.getItem('token');
    try {
      setIsLoading(true);
      // 백엔드에서 랜덤 포레스트 예측 결과가 포함된 리스트를 가져옵니다.
      const response = await axios.get('http://localhost:8000/api/ai/recommendations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecommendations(response.data);
    } catch (err) {
      console.error("AI 제안 로드 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
=======
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(''); // AI 요약 문구 상태
  const [loading, setLoading] = useState(true);

  // 1. 페이지 접속 시 자동으로 AI 예측 데이터 호출
>>>>>>> ca88073 (feat: AI 발주 제안 페이지 데이터 연동 및 현재고/분석사유 추가)
  useEffect(() => {
    fetchAIRecommendations();
  }, []);

<<<<<<< HEAD
  // 수량 직접 조절 핸들러 (점장 전용)
  const handleQtyChange = (id, delta) => {
    setRecommendations(prev => prev.map(item => 
      item.id === id ? { ...item, recommended_qty: Math.max(0, item.recommended_qty + delta) } : item
    ));
  };

  // 최종 발주 확정 버튼 핸들러
  const handleBulkOrder = async () => {
    if (!isAdmin) {
      alert("🚨 발주 권한이 없습니다. 점장 계정으로 로그인해주세요.");
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/orders/request', 
        { orders: recommendations },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ 제안된 수량으로 발주가 성공적으로 완료되었습니다!");
    } catch (err) {
=======
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
>>>>>>> ca88073 (feat: AI 발주 제안 페이지 데이터 연동 및 현재고/분석사유 추가)
      alert("발주 처리 중 오류가 발생했습니다.");
    }
  };

<<<<<<< HEAD
  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden p-6 gap-8 text-white">
      
      {/* 헤더 섹션 */}
      <header className="shrink-0">
        <h1 className="text-4xl font-black tracking-tighter mb-2">AI 발주 제안</h1>
        <p className="text-gray-400">랜덤 포레스트 모델이 분석한 최적의 발주 수량입니다.</p>
      </header>

      {/* 수요 분석 알림 패널 */}
      <div className="glass-panel p-8 rounded-3xl border-l-4 border-indigo-500 bg-white/5 shrink-0 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2 text-indigo-400 flex items-center gap-2">
            <span className="material-symbols-outlined">auto_graph</span>
            AI 수요 예측 인사이트
          </h3>
          <p className="text-gray-300 leading-relaxed">
            과거 판매 데이터와 요일별 특성을 분석한 결과입니다. <br />
            추천 수량은 <span className="text-white font-bold">재고 안전 계수가 포함된 값</span>입니다.
          </p>
        </div>
      </div>

      {/* 발주 아이템 리스트 (스크롤 영역) */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1 mb-4">Recommended Items</p>
        
        {isLoading ? (
          /* 로딩 스켈레톤 */
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 p-6 rounded-2xl border border-white/5 animate-pulse flex justify-between">
              <div className="h-12 w-48 bg-white/10 rounded-lg"></div>
              <div className="h-12 w-24 bg-white/10 rounded-lg"></div>
            </div>
          ))
        ) : recommendations.length > 0 ? (
          /* 실제 DB 데이터 렌더링 */
          recommendations.map((item) => (
            <div key={item.id} className="bg-white/5 p-6 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <span className="material-symbols-outlined">inventory_2</span>
                </div>
                <div>
                  <h4 className="font-bold text-lg group-hover:text-indigo-300 transition-colors">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-md font-bold">AI 분석 완료</span>
                    <span className="text-xs text-gray-400">추천 수량: <span className="text-white font-bold">{item.recommended_qty}개</span></span>
                  </div>
                </div>
              </div>

              {/* 수량 조절 인터페이스 */}
              <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5">
                <button 
                  onClick={() => handleQtyChange(item.id, -1)}
                  disabled={!isAdmin}
                  className={`w-10 h-10 rounded-xl text-xl transition-all active:scale-90 ${isAdmin ? 'bg-white/5 hover:bg-white/20' : 'opacity-20'}`}
                >-</button>
                <span className="font-mono font-black text-2xl w-12 text-center">{item.recommended_qty}</span>
                <button 
                  onClick={() => handleQtyChange(item.id, 1)}
                  disabled={!isAdmin}
                  className={`w-10 h-10 rounded-xl text-xl transition-all active:scale-90 ${isAdmin ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg' : 'opacity-20'}`}
                >+</button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-gray-500">분석 가능한 상품 데이터가 없습니다.</div>
        )}
      </div>

      {/* 하단 최종 액션 버튼 */}
      <footer className="shrink-0 pt-4">
        <button 
          onClick={handleBulkOrder}
          disabled={!isAdmin || isLoading}
          className={`w-full h-16 flex items-center justify-center gap-3 rounded-2xl font-black uppercase tracking-widest transition-all ${
            isAdmin 
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-700 shadow-xl hover:scale-[1.01] active:scale-[0.98]' 
              : 'bg-white/5 text-gray-600 border border-white/10'
          }`}
        >
          <span className="material-symbols-outlined">{isAdmin ? 'shopping_cart_checkout' : 'lock'}</span>
          {isAdmin ? '제안 수량으로 일괄 발주하기' : '발주 권한 없음 (점장 전용)'}
=======
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
>>>>>>> ca88073 (feat: AI 발주 제안 페이지 데이터 연동 및 현재고/분석사유 추가)
        </button>
      </footer>
    </div>
  );
}

export default AIOrders;