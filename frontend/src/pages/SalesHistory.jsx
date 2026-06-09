import React, { useState, useEffect } from 'react';
import { getSalesHistory } from '../api/inventory';

function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getSalesHistory();
        setSales(data);
      } catch (error) {
        console.error('Failed to fetch sales history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="flex flex-col h-full p-3 2xl:p-6 text-white overflow-hidden">
      <header className="mb-4 2xl:mb-8 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl 2xl:text-4xl font-black tracking-tighter">Sales History</h1>
          <p className="text-gray-400">매장에서 판매된 상품의 일일 내역을 확인합니다. (최근 100건)</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">총 조회 건수</p>
          <p className="text-2xl font-bold text-indigo-400">{sales.length}건</p>
        </div>
      </header>

      <div className="flex-1 bg-white/5 rounded-3xl border border-white/10 p-6 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30">
            <span className="material-symbols-outlined text-6xl mb-4">receipt_long</span>
            <p className="text-lg">판매 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-gray-400 sticky top-0 bg-[#1e1e1e] z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 rounded-tl-xl">판매 일자</th>
                  <th className="py-3 px-4">카테고리</th>
                  <th className="py-3 px-4">상품명</th>
                  <th className="py-3 px-4 text-right">단가</th>
                  <th className="py-3 px-4 text-right">판매 수량</th>
                  <th className="py-3 px-4 text-right rounded-tr-xl">총액 (원)</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-mono text-gray-300">{item.date}</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-white/10 rounded-md text-xs text-gray-300">{item.category}</span>
                    </td>
                    <td className="py-4 px-4 font-bold text-white">
                      {item.product_name} <span className="text-xs font-normal text-gray-500 ml-1">({item.product_id})</span>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-400">{item.unit_price.toLocaleString()}원</td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-400">{item.sales_qty}개</td>
                    <td className="py-4 px-4 text-right font-black text-indigo-300">
                      {item.total_price.toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SalesHistory;
