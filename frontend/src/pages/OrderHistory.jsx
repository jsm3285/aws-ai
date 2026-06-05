import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingOrders, createInboundDraft, approveInbound } from '../api/inventory';

function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiptItems, setReceiptItems] = useState({}); // { product_id: { received_qty, expiration_date } }
  const [bulkDate, setBulkDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 대기 중인 발주서 불러오기
  const fetchOrders = async () => {
    try {
      const data = await getPendingOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch pending orders:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 발주서 선택 시 검수용 데이터 초기화
  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    const initialItems = {};
    order.items.forEach(item => {
      initialItems[item.product_id] = {
        received_qty: item.received_qty !== undefined && item.received_qty !== null ? item.received_qty : item.order_qty,
        expiration_date: item.expiration_date || ''
      };
    });
    setReceiptItems(initialItems);
    setBulkDate('');
  };

  // 수량 및 날짜 변경 핸들러
  const handleItemChange = (productId, field, value) => {
    setReceiptItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  // 유통기한 일괄 적용
  const applyBulkDate = () => {
    if (!bulkDate) return;
    setReceiptItems(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(productId => {
        next[productId].expiration_date = bulkDate;
      });
      return next;
    });
  };

  // 입고 승인 처리
  const handleApprove = async () => {
    if (!selectedOrder) return;

    // 유효성 검사 (날짜가 다 채워졌는지)
    const missingDates = Object.values(receiptItems).some(item => !item.expiration_date);
    if (missingDates) {
      alert("모든 상품의 유통기한을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 가입고 전표 생성 (PO와 연결)
      const draftPayload = {
        po_id: selectedOrder.id,
        items: Object.entries(receiptItems).map(([product_id, data]) => ({
          product_id,
          received_qty: parseInt(data.received_qty, 10) || 0,
          expiration_date: data.expiration_date
        }))
      };
      const draft = await createInboundDraft(draftPayload);

      // 2. 가입고 전표 승인 (최종 재고 반영)
      await approveInbound(draft.id, { items: draftPayload.items });

      alert("입고 검수 및 재고 반영이 완료되었습니다.");
      setSelectedOrder(null);
      navigate('/pos');
    } catch (error) {
      console.error('Inbound approval failed:', error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 2xl:p-6 text-white overflow-hidden">
      <header className="mb-4 2xl:mb-8 shrink-0">
        <h1 className="text-3xl 2xl:text-4xl font-black tracking-tighter">Inbound Inspection</h1>
        <p className="text-gray-400">발주한 물품의 수량과 유통기한을 검수하고 재고에 반영합니다.</p>
      </header>

      <div className="flex-1 min-h-0 flex gap-6 overflow-hidden">
        {/* 왼쪽: 입고 대기열 (발주 목록) */}
        <div className="w-1/3 min-h-0 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          <h2 className="font-bold text-xl mb-4 text-gray-300">입고 대기열 (Pending)</h2>
          {orders.length === 0 ? (
            <div className="text-center py-20 opacity-30 border-2 border-dashed border-white/10 rounded-3xl">
              대기 중인 발주 내역이 없습니다.
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleSelectOrder(order)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${selectedOrder?.id === order.id
                    ? 'bg-indigo-600 border-indigo-400'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-indigo-300 font-mono mb-1">PO-{order.id}</p>
                    <p className="font-bold text-lg">{order.order_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-60">상태</p>
                    <p className={`font-black ${order.status === 'PENDING' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {order.status}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 오른쪽: 검수 및 유통기한 입력 */}
        <div className="w-2/3 bg-white/5 rounded-3xl border border-white/10 p-6 flex flex-col">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">fact_check</span>
            물품 검수 및 승인
          </h2>

          {selectedOrder ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-end pb-4 border-b border-white/10 mb-4">
                <div className="text-sm text-gray-400">
                  <p>발주번호: PO-{selectedOrder.id}</p>
                  <p>발주명세: 총 {selectedOrder.items.length}종</p>
                </div>

                {/* 유통기한 일괄 적용 UI */}
                {selectedOrder.status === 'PENDING' && (
                  <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/10">
                    <span className="text-sm text-gray-300">유통기한 일괄적용:</span>
                    <input
                      type="date"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      className="bg-black/40 text-white rounded px-2 py-1 border border-white/10 outline-none text-sm cursor-pointer"
                    />
                    <button
                      onClick={applyBulkDate}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1 rounded transition-colors"
                    >
                      모두 적용
                    </button>
                  </div>
                )}
              </div>

              {/* 검수 테이블 */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400 sticky top-0 bg-[#1e1e1e] z-10">
                    <tr>
                      <th className="py-2">상품코드</th>
                      <th className="py-2 text-right">발주수량</th>
                      <th className="py-2 text-right">실제입고수량</th>
                      <th className="py-2 text-right">유통기한</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.product_id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 font-medium text-gray-300">
                          {item.product_name} <span className="text-xs text-gray-500">({item.product_id})</span>
                        </td>
                        <td className="py-3 text-right text-gray-400">{item.order_qty}개</td>
                        <td className="py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={receiptItems[item.product_id]?.received_qty ?? item.order_qty}
                            onChange={(e) => handleItemChange(item.product_id, 'received_qty', e.target.value)}
                            disabled={selectedOrder.status !== 'PENDING'}
                            className={`w-16 bg-black/40 text-white text-right rounded px-2 py-1 border outline-none ${selectedOrder.status !== 'PENDING' ? 'border-transparent opacity-70' : 'border-white/10 focus:border-indigo-500'}`}
                          />
                        </td>
                        <td className="py-3 text-right">
                          <input
                            type="date"
                            value={receiptItems[item.product_id]?.expiration_date || ''}
                            onChange={(e) => handleItemChange(item.product_id, 'expiration_date', e.target.value)}
                            onClick={(e) => selectedOrder.status === 'PENDING' && e.target.showPicker && e.target.showPicker()}
                            disabled={selectedOrder.status !== 'PENDING'}
                            className={`w-36 bg-black/40 text-white text-right rounded px-2 py-1 border outline-none ${selectedOrder.status !== 'PENDING' ? 'border-transparent opacity-70 cursor-default' : 'cursor-pointer focus:border-indigo-500'} ${selectedOrder.status === 'PENDING' && !receiptItems[item.product_id]?.expiration_date ? 'border-red-500/50' : 'border-white/10'}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 하단 승인 버튼 */}
              {selectedOrder.status === 'PENDING' ? (
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                  <button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    {isSubmitting ? '처리 중...' : '최종 입고 승인'}
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                  <div className="bg-emerald-500/20 text-emerald-400 font-bold py-3 px-8 rounded-xl flex items-center gap-2 border border-emerald-500/30">
                    <span className="material-symbols-outlined">task_alt</span>
                    승인 및 입고 완료됨
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20">
              <span className="material-symbols-outlined text-6xl mb-2">fact_check</span>
              <p>검수할 발주 명세서를 왼쪽에서 선택해주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderHistory;