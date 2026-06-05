import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AILoadingScreen = () => {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = [
    "INITIALIZING NEURAL CORES...",
    "ANALYZING PAST SALES DATA...",
    "PROCESSING WEATHER CORRELATIONS...",
    "EVALUATING PROMOTION IMPACTS...",
    "GENERATING PREDICTIVE MODELS...",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % messages.length);
    }, 800);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-white gap-10 rounded-2xl relative overflow-hidden flex-1 min-h-0 bg-black/20 border border-white/5">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      <div className="relative flex items-center justify-center z-10 scale-125 mt-8">
        <div className="absolute w-32 h-32 rounded-full border-y-2 border-indigo-500/30 border-l-2 border-l-indigo-500 animate-[spin_3s_linear_infinite] shadow-[0_0_20px_rgba(99,102,241,0.2)]"></div>
        <div className="absolute w-24 h-24 rounded-full border-x-2 border-purple-500/30 border-t-2 border-t-purple-500 animate-[spin_2s_linear_infinite_reverse]"></div>
        <div className="absolute w-16 h-16 rounded-full border-y-2 border-cyan-500/30 border-b-2 border-b-cyan-500 animate-[spin_1s_linear_infinite]"></div>
        <div className="w-10 h-10 flex items-center justify-center bg-indigo-500/20 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          <span className="material-symbols-outlined text-2xl text-indigo-300">psychology</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 z-10 mb-8">
        <div className="flex items-center gap-3 bg-indigo-950/50 px-5 py-2.5 rounded-full border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
          <span className="material-symbols-outlined text-indigo-400 text-sm animate-spin" style={{ animationDuration: '3s' }}>memory</span>
          <p className="text-sm font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300">
            {messages[msgIdx]}
          </p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500/80 animate-bounce" style={{ animationDelay: `${i * 150}ms` }}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

function AIOrders() {
  const navigate = useNavigate();
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
      const firstFour = fullCardNum.length >= 4 ? fullCardNum.slice(0, 4) : "****";

      if (!window.confirm(`💳 등록된 카드(첫자리: ${firstFour})로\n총 ${orderItems.length}건의 품목을 자동 결제 및 발주하시겠습니까?`)) {
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

      // 입고대기열 페이지로 리다이렉트
      navigate('/history');

    } catch (err) {
      handleRequestError(err, "발주 처리");
    }
  };

  if (loading) {
    return <AILoadingScreen />;
  }

  return (
    <div className="w-full h-full flex justify-center bg-transparent">
      <div className="flex flex-col h-full w-full max-w-screen-2xl overflow-hidden p-3 2xl:p-5 gap-3 2xl:gap-4 text-white">
        <header className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-3xl lg:text-4xl">smart_toy</span>
              AI 스마트 발주 제안
            </h1>
            <p className="text-gray-400 text-xs lg:text-sm mt-1">
              지난 4년간의 기상청 날씨 데이터, 지역 행사, 요일별 판매 패턴을 딥러닝(XGBoost)으로 분석하여 오늘 가장 필요한 발주량을 핀포인트로 예측합니다.
            </p>
          </div>
        </header>

        {summary && (
          <div className="shrink-0 glass-panel p-3 lg:p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1.5 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/50">
                <span className="material-symbols-outlined text-white block text-sm">psychology</span>
              </div>
              <span className="font-bold text-indigo-300 text-base">AI 예측 리포트</span>
            </div>
            <p className="text-sm leading-relaxed text-indigo-100/80 flex-1 min-w-0 break-keep">{summary}</p>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {recommendations.length === 0 ? (
            <div className="text-center py-40 border-2 border-dashed border-white/10 rounded-3xl opacity-30">
              <p>오늘의 발주 제안 데이터가 없습니다.</p>
            </div>
          ) : (
            recommendations.map((p) => (
              <div key={p.id} className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${p.is_special ? 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-lg truncate">{p.name}</h4>
                    {p.is_special && <span className="px-2 py-0.5 bg-pink-500 text-[9px] font-black rounded-md uppercase animate-pulse shrink-0">Hot Trend</span>}
                  </div>
                  <p className="text-xs text-indigo-400 font-medium truncate">현재고: {p.current_stock}개 | AI 예측판매: {p.predicted_sales}개</p>
                  {p.reason && (
                    <div className="mt-3 bg-[#11131a] p-3 rounded-xl border border-indigo-500/20 flex gap-3 items-start animate-in fade-in">
                      <div className="p-1.5 bg-indigo-500/20 rounded-lg shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-indigo-400 text-sm">{p.insight_icon || 'insights'}</span>
                      </div>
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider shrink-0">
                          {p.insight_type === 'special' ? 'TREND ANALYSIS' :
                            p.insight_type === 'promotion' ? 'PROMOTION DETECTED' :
                              p.insight_type === 'weekend' ? 'WEEKEND PATTERN' : 'STANDARD PREDICTION'}
                        </span>
                        <p className="text-xs text-gray-300 leading-relaxed font-medium break-keep">{p.reason}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-xl border border-white/10 shrink-0 md:self-center self-end">
                  <button onClick={() => adjustQty(p.id, -1)} disabled={!isAdmin} className="w-8 h-8 rounded-lg text-xl font-bold bg-white/5 hover:bg-white/20">-</button>
                  <span className="text-2xl font-black w-10 text-center text-indigo-400">{p.suggested_qty}</span>
                  <button onClick={() => adjustQty(p.id, 1)} disabled={!isAdmin} className="w-8 h-8 rounded-lg text-xl font-bold bg-indigo-600 hover:bg-indigo-500">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="pt-2 shrink-0">
          <button
            onClick={handleOrderSubmit}
            disabled={!isAdmin}
            className={`w-full h-14 font-black text-lg rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${isAdmin ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-600/20' : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/20 shadow-none'}`}
          >
            <span className="material-symbols-outlined">{isAdmin ? 'credit_card' : 'lock'}</span>
            {isAdmin ? 'AI 제안 수량 결제 및 발주' : '발주 권한 없음 (점장 전용)'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default AIOrders;