import React, { useState, useEffect, useRef } from 'react';
import { getPOSInventory, sellItem } from '../api/inventory';
import { Html5Qrcode } from 'html5-qrcode';

function POSView() {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [lastSold, setLastSold] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const inventoryRef = useRef([]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

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

  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.id !== 'barcode-input') return;
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) barcodeBuffer = '';
      lastKeyTime = currentTime;

      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        e.preventDefault();
        addToCart(barcodeBuffer.trim(), 1);
        barcodeBuffer = '';
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inventory]);

  const addToCart = (productId, addQty) => {
    const product = inventoryRef.current.find(item => item.id === productId);
    if (!product) { alert("존재하지 않는 상품 바코드입니다."); return; }
    if (product.total === 0) { alert("현재 재고가 없는 상품입니다."); return; }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      const currentQty = existingItem ? existingItem.qty : 0;

      if (currentQty + addQty > product.total) {
        alert(`[${product.name}] 재고(${product.total}개)를 초과하여 담을 수 없습니다.`);
        return prevCart;
      }

      if (existingItem) {
        return prevCart.map(item =>
          item.id === productId ? { ...item, qty: item.qty + addQty } : item
        );
      } else {
        const itemPrice = product.price !== undefined ? product.price : 1000;
        return [...prevCart, { id: product.id, name: product.name, qty: addQty, max: product.total, price: itemPrice }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const handleScan = (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    addToCart(barcode.trim(), 1);
    setBarcode('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    addToCart(selectedProduct, quantity);
    setQuantity(1);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      await Promise.all(cart.map(item => sellItem({ product_id: item.id, quantity: item.qty })));
      const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
      setLastSold(`총 ${cart.length}종 (${totalItems}개) 상품`);
      setCart([]);
      await fetchInventory();
    } catch (error) {
      alert(error.response?.data?.detail || '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const adjustQuantity = (amount) => {
    setQuantity((prev) => Math.min(Math.max(1, prev + amount), 10));
  };

  const handleCloseCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
        setShowCamera(false);
      }).catch(e => { console.error(e); setShowCamera(false); });
    } else {
      setShowCamera(false);
    }
  };

  useEffect(() => {
    if (showCamera) {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { addToCart(decodedText, 1); handleCloseCamera(); },
        (error) => { }
      ).catch((err) => {
        console.error(err);
        alert("카메라 권한을 허용해 주시거나 연결 상태를 확인해주세요.");
        setShowCamera(false);
      });
    }
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => { });
      }
    };
  }, [showCamera]);

  const totalOrderQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalOrderPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <div className="flex flex-col h-full p-4 xl:p-5 2xl:p-8 text-white overflow-hidden bg-[#0d0e12]">
      <header className="mb-4 xl:mb-5 2xl:mb-6 shrink-0">
        <h1 className="text-3xl xl:text-4xl font-black tracking-tighter">Nexus POS</h1>
        <p className="text-gray-400 text-xs mt-0.5">선입선출(FIFO) 기반 다중 상품 결제 및 실시간 주문 관리</p>
      </header>

      {/* 🌟 메인 컨테이너 갭 조절 */}
      <div className="flex-1 min-h-0 flex gap-4 xl:gap-6">

        {/* 왼쪽 섹션: 입력창 폭 최적화 (노트북 배려 w-[360px] ~ 와이드 w-[400px] 가변형 고정) */}
        <section className="w-[350px] xl:w-[380px] 2xl:w-[400px] shrink-0 flex flex-col">
          <div className="glass-panel rounded-3xl p-5 xl:p-6 bg-black/40 border border-white/10 flex-1 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-500/10 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex flex-col gap-4">
                <h2 className="text-xs xl:text-sm font-bold text-gray-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                  상품 식별 및 수동 입력
                </h2>

                <div className="flex gap-2">
                  <form onSubmit={handleScan} className="flex-1">
                    <input
                      id="barcode-input"
                      ref={inputRef}
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full bg-white/5 border border-indigo-500/30 rounded-xl h-11 xl:h-12 px-4 text-center text-lg xl:text-xl font-mono text-white outline-none focus:border-indigo-400 focus:bg-white/10 transition-all"
                      placeholder="바코드 스캔 (자동 담기)"
                      autoFocus
                    />
                  </form>
                  <button onClick={() => setShowCamera(true)} className="w-11 h-11 xl:w-12 xl:h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-colors shrink-0">
                    <span className="material-symbols-outlined">photo_camera</span>
                  </button>
                </div>

                <div>
                  <form onSubmit={handleManualAdd} className="flex flex-col gap-3 xl:gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] xl:text-[11px] text-gray-400 font-medium pl-1">등록 상품 선택</label>
                      <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="w-full bg-[#181920] text-white border border-white/10 rounded-xl h-11 xl:h-12 px-3 outline-none focus:border-indigo-400 transition-all cursor-pointer text-xs xl:text-sm font-semibold"
                      >
                        {inventory.length === 0 ? (
                          <option value="">조회된 상품 데이터가 없습니다.</option>
                        ) : (
                          inventory.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} (잔여: {item.total}개)
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="flex gap-3 items-end">
                      <div className="w-1/2 flex flex-col gap-1">
                        <label className="text-[10px] xl:text-[11px] text-gray-400 font-medium pl-1">수량 설정</label>
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl h-11 xl:h-12 px-2">
                          <button type="button" onClick={() => adjustQuantity(-1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg font-bold text-base text-gray-300">-</button>
                          <span className="font-mono font-bold text-sm xl:text-base text-white">{quantity}</span>
                          <button type="button" onClick={() => adjustQuantity(1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg font-bold text-base text-white">+</button>
                        </div>
                      </div>
                      <button type="submit" className="w-1/2 h-11 xl:h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all text-xs xl:text-sm shadow-md">
                        장바구니 담기
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="space-y-3 xl:space-y-4 mt-4">
                <div className="h-px bg-white/10 w-full"></div>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || cart.length === 0}
                  className="w-full h-12 xl:h-14 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:opacity-40 text-white font-black rounded-xl transition-all uppercase text-xs xl:text-sm tracking-widest flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg xl:text-xl">payments</span>
                  {isProcessing ? '승인 중...' : '일괄 결제 승인'}
                </button>
                {lastSold && (
                  <div className="text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2.5 xl:py-3 rounded-xl border border-emerald-500/20 animate-in fade-in flex items-center justify-center gap-2 text-[11px] xl:text-xs">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    {lastSold} 완료!
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 오른쪽 섹션: 노트북 화면에서도 슬림하고 예쁘게 떨어지도록 패딩 및 폰트 축소 패치 */}
        <section className="flex-1 min-h-0 glass-panel rounded-3xl p-5 xl:p-6 bg-white/5 border border-white/10 flex flex-col justify-between">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex justify-between items-center mb-4 xl:mb-6 shrink-0">
              <h2 className="text-lg xl:text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400">shopping_cart</span>
                실시간 결제 대기 목록
                <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-md ml-1 border border-indigo-500/30">
                  {cart.length}종
                </span>
              </h2>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
              {cart.length === 0 ? (
                <div className="h-full border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-500 text-sm gap-3">
                  <span className="material-symbols-outlined text-5xl opacity-20 animate-pulse text-indigo-400">add_shopping_cart</span>
                  좌측 바코드를 스캔하거나 수동으로 품목을 장바구니에 담아주세요.
                </div>
              ) : (
                /* 🌟 [핵심 변경] 일반 노트북 해상도까지는 한 줄로 넓고 콤팩트하게 출력, 아주 넓은 모니터(3xl)에서만 2줄 정렬 */
                <div className="grid grid-cols-1 3xl:grid-cols-2 gap-2.5 pb-4">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 p-3 xl:p-4 rounded-2xl transition-all duration-200 group gap-4 animate-in fade-in"
                    >
                      {/* 텍스트가 작은 화면에서도 깔끔하게 한 라인에 떨어지도록 축소 피팅 */}
                      <div className="flex flex-col gap-0.5 xl:gap-1 min-w-0 flex-1">
                        <span className="font-bold text-sm xl:text-base text-white group-hover:text-indigo-300 transition-colors truncate block">
                          {item.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] xl:text-[11px] text-gray-400 font-mono">
                          <span className="shrink-0">CODE: {item.id}</span>
                          <span className="text-gray-600 font-sans">•</span>
                          <span className="text-emerald-400 font-bold shrink-0">단가: ₩{item.price.toLocaleString()}</span>
                          <span className="text-gray-600 font-sans">•</span>
                          <span className="text-gray-500 shrink-0">한도: {item.max}개</span>
                        </div>
                      </div>

                      {/* 우측 핸들러 버튼 크기를 컴팩트하게 맞춰 뭉툭함 해결 */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 xl:py-1 rounded-xl">
                          <span className="font-mono text-indigo-400 font-black text-xs xl:text-sm">{item.qty} 개</span>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 xl:w-9 xl:h-9 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-150 flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-sm xl:text-base block text-center">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 하단 총합 금액 컴포넌트 여백 밸런스 패치 */}
          {cart.length > 0 && (
            <div className="mt-3 pt-3 xl:mt-4 xl:pt-4 border-t border-white/10 shrink-0 bg-black/20 p-3 xl:p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-2 xl:gap-3 animate-in fade-in">
              <div className="flex items-center gap-3 xl:gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] xl:text-xs text-gray-400 font-bold uppercase tracking-wider">주문 정보 요약</span>
                  <span className="text-xs xl:text-sm font-medium text-indigo-300 font-mono">총 {cart.length}종</span>
                </div>
                <div className="h-6 xl:h-8 w-px bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] xl:text-xs text-gray-400 font-bold uppercase tracking-wider">총 수량</span>
                  <span className="text-xs xl:text-sm font-black text-white font-mono">{totalOrderQty}개</span>
                </div>
              </div>
              <div className="text-left sm:text-right border-t border-white/5 sm:border-none pt-1.5 sm:pt-0">
                <span className="text-[10px] xl:text-xs text-gray-400 font-bold uppercase tracking-wider block">최종 결제 예정 금액</span>
                <span className="text-xl xl:text-2xl 2xl:text-3xl font-black text-emerald-400 font-mono">
                  ₩{totalOrderPrice.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 카메라 모달 */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1b21] border border-indigo-500/30 rounded-3xl p-6 max-w-md w-full flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-400">qr_code_scanner</span>카메라 바코드 스캔</h2>
            <div className="w-full bg-black rounded-xl overflow-hidden mb-4 border border-white/10"><div id="reader" className="w-full"></div></div>
            <button onClick={handleCloseCamera} className="w-full h-12 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">close</span>스캔 취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default POSView;