import React, { useState, useEffect, useRef } from 'react';
import { getPOSInventory, sellItem } from '../api/inventory';

function POSView() {
  const [inventory, setInventory] = useState([]);
  
  // 바코드 스캔용 상태
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef(null);

  // 수동 결제용 상태
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  // 공통 상태
  const [lastSold, setLastSold] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 재고 현황 불러오기
  const fetchInventory = async () => {
    try {
      const data = await getPOSInventory();
      setInventory(data);
      if (!selectedProduct && data.length > 0) {
        setSelectedProduct(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch POS inventory:', error);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // 1. 바코드 스캔 (단건 결제) 핸들러
  const handleScan = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setIsProcessing(true);
    try {
      await sellItem({ product_id: barcode, quantity: 1 });
      
      const soldProductInfo = inventory.find(item => item.id === barcode);
      if (soldProductInfo) {
        setLastSold({ name: soldProductInfo.name, qty: 1 });
      }

      await fetchInventory();
      setBarcode('');
      // 스캔 후 다시 바코드 창에 포커스
      if (inputRef.current) inputRef.current.focus();
    } catch (error) {
      alert(error.response?.data?.detail || '재고가 부족하거나 오류가 발생했습니다.');
      setBarcode('');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. 수동 선택 (다건 결제) 핸들러
  const handleManualSell = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsProcessing(true);
    try {
      await sellItem({ product_id: selectedProduct, quantity: quantity });
      
      const soldProductInfo = inventory.find(item => item.id === selectedProduct);
      if (soldProductInfo) {
        setLastSold({ name: soldProductInfo.name, qty: quantity });
      }

      await fetchInventory();
      setQuantity(1);
    } catch (error) {
      alert(error.response?.data?.detail || '재고가 부족하거나 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const adjustQuantity = (amount) => {
    setQuantity((prev) => Math.min(Math.max(1, prev + amount), 10));
  };

  return (
    <div className="flex flex-col h-full p-8 text-white overflow-hidden">
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tighter">Nexus POS</h1>
        <p className="text-gray-400">선입선출(FIFO) 기반 실시간 결제 및 재고 스펙트럼</p>
      </header>

      <div className="flex gap-8 h-full min-h-0">
        
        {/* 왼쪽: 결제 컨트롤 패널 */}
        <section className="w-1/3 flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 bg-black/40 border border-white/10 flex-1 flex flex-col relative overflow-y-auto custom-scrollbar">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-500/10 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col gap-8">
              
              {/* 섹션 1: 바코드 퀵 스캔 */}
              <div>
                <h2 className="text-lg font-bold mb-4 text-indigo-400 flex items-center gap-2">
                  <span className="material-symbols-outlined">barcode_scanner</span>
                  바코드 퀵 스캔 (단건)
                </h2>
                <form onSubmit={handleScan}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full bg-white/5 border border-indigo-500/30 rounded-xl h-12 px-4 text-center text-xl font-mono text-white outline-none focus:border-indigo-400 focus:bg-white/10 transition-all"
                    placeholder="바코드 입력 후 Enter"
                    autoFocus
                  />
                </form>
              </div>

              <div className="h-px bg-white/10 w-full"></div>

              {/* 섹션 2: 수동 대량 결제 */}
              <div>
                <h2 className="text-lg font-bold mb-4 text-gray-300 flex items-center gap-2">
                  <span className="material-symbols-outlined">touch_app</span>
                  수동 상품 결제 (최대 10개)
                </h2>
                <form onSubmit={handleManualSell} className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Select Product</label>
                    <select
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      className="w-full bg-[#1a1b21] border border-white/10 rounded-xl h-12 px-4 text-white outline-none focus:border-indigo-400 transition-all cursor-pointer text-sm"
                    >
                      {inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} (잔여: {item.total}개)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Quantity</label>
                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl h-12 px-2">
                      <button 
                        type="button" 
                        onClick={() => adjustQuantity(-1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg text-lg font-bold transition-all"
                      >
                        -
                      </button>
                      <span className="text-xl font-mono font-bold">{quantity}</span>
                      <button 
                        type="button" 
                        onClick={() => adjustQuantity(1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg text-lg font-bold transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isProcessing}
                    className="w-full h-12 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl transition-all uppercase text-sm tracking-widest flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">shopping_cart_checkout</span>
                    {isProcessing ? '처리 중...' : '결제 승인'}
                  </button>
                </form>
              </div>

              {/* 마지막 판매 알림 */}
              {lastSold && (
                <div className="mt-2 text-emerald-400 font-bold bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20 animate-in fade-in flex items-center justify-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  {lastSold.name} ({lastSold.qty}개) 출고 완료
                </div>
              )}

            </div>
          </div>
        </section>

        {/* 오른쪽: 재고 에너지 바(Health Spectrum) 리스트 */}
        <section className="w-2/3 glass-panel rounded-3xl p-8 bg-white/5 border border-white/10 overflow-y-auto custom-scrollbar">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-400">stacked_bar_chart</span>
            실시간 재고 스펙트럼
          </h2>

          <div className="space-y-6">
            {inventory.map((item) => (
              <div key={item.id} className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="font-bold text-lg">{item.name}</span>
                  <span className="text-sm font-mono text-gray-400">총 {item.total}개</span>
                </div>
                
                <div className="flex gap-1 h-8 bg-black/50 p-1 rounded-md border border-white/5 overflow-hidden">
                  {Array.from({ length: item.lots.red }).map((_, i) => (
                    <div key={`r-${i}`} className="w-4 h-full bg-red-500 rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.6)] shrink-0"></div>
                  ))}
                  {Array.from({ length: item.lots.yellow }).map((_, i) => (
                    <div key={`y-${i}`} className="w-4 h-full bg-yellow-500 rounded-sm shrink-0"></div>
                  ))}
                  {Array.from({ length: item.lots.green }).map((_, i) => (
                    <div key={`g-${i}`} className="w-4 h-full bg-emerald-500 rounded-sm shrink-0"></div>
                  ))}
                  
                  {item.total === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-xs text-red-500/50 font-bold tracking-widest uppercase">
                      Out of Stock
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

export default POSView;