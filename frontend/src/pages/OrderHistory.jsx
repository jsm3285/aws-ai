<<<<<<< HEAD
import React, { useState } from 'react';

const statusStyles = {
  Completed: "bg-green-500/10 text-green-400 border-green-500/20",
  Pending: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

function OrderHistory() {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const orders = [
    { id: 'PO-2024-8841', date: '2024-03-15', items: 24, amount: 452000, status: 'Completed', supplier: 'Global Logistics Co.', manager: '김철수 매니저' },
    { id: 'PO-2024-8839', date: '2024-03-14', items: 108, amount: 2180000, status: 'Pending', supplier: 'Next Gen Tech', manager: '이영희 매니저' },
    { id: 'PO-2024-8830', date: '2024-03-12', items: 5, amount: 120000, status: 'Cancelled', supplier: 'Core Materials', manager: '박지성 팀장' },
    { id: 'PO-2024-8821', date: '2024-03-10', items: 32, amount: 890500, status: 'Completed', supplier: 'Fast Supply', manager: '조승민 매니저' },
    { id: 'PO-2024-8845', date: '2024-03-09', items: 15, amount: 300000, status: 'Completed', supplier: 'Convenience Best', manager: '최유리 대리' },
    { id: 'PO-2024-8846', date: '2024-03-08', items: 50, amount: 750000, status: 'Pending', supplier: 'Fresh Food Inc.', manager: '정민수 과장' },
  ];

  return (
    /* ⭐️ 페이지 전체 높이 고정 및 세로 배치 */
    <div className="flex flex-col h-full max-h-screen p-4 space-y-6 overflow-hidden">
      
      {/* 1. 상단 타이틀 및 필터 (고정) */}
      <header className="shrink-0 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-headline font-black tracking-tight text-white">발주 이력 페이지</h1>
            <p className="text-gray-400 text-sm mt-1">시스템의 모든 과거 발주 내역을 조회하고 상태를 모니터링합니다.</p>
          </div>
          <div className="flex gap-3">
            <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 bg-white/5 border border-white/10">
               <span className="material-symbols-outlined text-sm opacity-50">calendar_month</span>
               <span className="text-[11px] font-bold">2024.01.01 - 2024.03.31</span>
            </div>
            <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 bg-white/5 border border-white/10">
               <span className="material-symbols-outlined text-sm text-yellow-400">payments</span>
               <span className="text-[11px] font-bold">₩12,450,000</span>
            </div>
          </div>
        </div>

        {/* 검색 바 */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</span>
            <input className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500/50" placeholder="발주 번호 또는 품목명으로 검색..." />
          </div>
          <select className="bg-[#1a1b21] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
            <option>모든 상태</option>
            <option>Completed</option>
            <option>Pending</option>
          </select>
          <button className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-indigo-500 transition-all">검색 실행</button>
        </div>
      </header>

      {/* 2. 발주 이력 테이블 (여기가 핵심 스크롤 영역) */}
      <div className="flex-1 glass-panel rounded-2xl border border-white/10 overflow-hidden flex flex-col min-h-0 bg-white/5">
        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#121212] z-10 shadow-sm">
              <tr className="text-[10px] uppercase font-black text-gray-400 tracking-widest">
                <th className="px-8 py-5">ORDER DATE</th>
                <th className="px-8 py-5">ORDER ID</th>
                <th className="px-8 py-5">TOTAL ITEMS</th>
                <th className="px-8 py-5 text-right">TOTAL AMOUNT</th>
                <th className="px-8 py-5 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((order) => (
                <tr 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className={`hover:bg-white/5 transition-colors cursor-pointer group ${selectedOrder?.id === order.id ? 'bg-indigo-500/10' : ''}`}
                >
                  <td className="px-8 py-5 text-sm text-gray-400">{order.date}</td>
                  <td className="px-8 py-5 text-sm font-bold text-indigo-400 group-hover:underline">#{order.id}</td>
                  <td className="px-8 py-5 text-sm text-white">{order.items} units</td>
                  <td className="px-8 py-5 text-right font-headline font-bold text-white">₩{order.amount.toLocaleString()}</td>
                  <td className="px-8 py-5 text-center">
                    <div className={`mx-auto w-fit px-3 py-1 rounded-full border text-[9px] font-black ${statusStyles[order.status]}`}>
                      {order.status}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 상세 정보 패널 (고정, 선택 시 노출) */}
      {selectedOrder && (
        <footer className="shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-indigo-400">info</span>
              #{selectedOrder.id} 상세 내역
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">공급업체</p>
                <p className="text-sm font-bold text-white">{selectedOrder.supplier}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">담당자</p>
                <p className="text-sm font-bold text-white">{selectedOrder.manager}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">결제수단</p>
                <p className="text-sm font-bold text-white">법인카드 (4412)</p>
              </div>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col justify-center">
            <h3 className="text-xs font-bold mb-1 text-gray-400">주요 통계</h3>
            <p className="text-3xl font-black text-indigo-400">92%</p>
            <p className="text-[10px] text-gray-500 mt-1">정시 완료율 (지난 30일)</p>
          </div>
        </footer>
      )}
=======
import React, { useState, useEffect } from 'react';

function OrderHistory() {
  const [history, setHistory] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null); // 선택된 발주 상세 정보

  // 히스토리 불러오기
  useEffect(() => {
    const savedHistory = localStorage.getItem('order_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  return (
    <div className="flex flex-col h-full p-6 text-white overflow-hidden">
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tighter">Order History</h1>
        <p className="text-gray-400">과거 AI 스마트 발주 내역을 확인합니다.</p>
      </header>

      <div className="flex gap-6 h-full overflow-hidden">
        {/* 왼쪽: 발주 목록 */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-center py-20 opacity-30 border-2 border-dashed border-white/10 rounded-3xl">
              발주 내역이 없습니다.
            </div>
          ) : (
            history.map((order) => (
              <div 
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedOrder?.id === order.id 
                  ? 'bg-indigo-600 border-indigo-400' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-indigo-300 font-mono mb-1">{order.id}</p>
                    <p className="font-bold text-lg">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-60">발주 품목</p>
                    <p className="font-black text-xl">{order.totalItems}종</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 오른쪽: 발주 상세 내용 */}
        <div className="w-1/2 bg-white/5 rounded-3xl border border-white/10 p-6 flex flex-col">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">receipt_long</span>
            발주 상세 내역
          </h2>
          
          {selectedOrder ? (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="pb-4 border-b border-white/10 text-sm text-gray-400">
                <p>주문번호: {selectedOrder.id}</p>
                <p>발주시간: {selectedOrder.date}</p>
              </div>
              <table className="w-full text-left">
                <thead className="text-gray-400 text-sm">
                  <tr>
                    <th className="py-2">상품명</th>
                    <th className="py-2 text-right">발주수량</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-white/5">
                      <td className="py-3 font-medium">{item.name}</td>
                      <td className="py-3 text-right font-black text-indigo-400">{item.suggested_qty}개</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20">
              <span className="material-symbols-outlined text-6xl mb-2">info</span>
              <p>목록에서 내역을 선택해주세요.</p>
            </div>
          )}
        </div>
      </div>
>>>>>>> ca88073 (feat: AI 발주 제안 페이지 데이터 연동 및 현재고/분석사유 추가)
    </div>
  );
}

export default OrderHistory;