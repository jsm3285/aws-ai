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
    </div>
  );
}

export default OrderHistory;