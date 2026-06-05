import React, { useState, useEffect, useRef } from 'react';
import { getPOSInventory, sellItem } from '../api/inventory';
import { Html5Qrcode } from 'html5-qrcode';

function POSView() {
  const [inventory, setInventory] = useState([]);

  // 장바구니(Cart) 상태
  const [cart, setCart] = useState([]);

  // 입력용 상태
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

  // 글로벌 바코드 스캐너 연동 (키보드 이벤트 감지)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.id !== 'barcode-input') {
        return;
      }
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = '';
      }
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

  // 장바구니에 상품 담기 로직
  const addToCart = (productId, addQty) => {
    const product = inventoryRef.current.find(item => item.id === productId);

    if (!product) {
      alert("존재하지 않는 상품 바코드입니다.");
      return;
    }
    if (product.total === 0) {
      alert("현재 재고가 없는 상품입니다.");
      return;
    }

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
        return [...prevCart, { id: product.id, name: product.name, qty: addQty, max: product.total }];
      }
    });
  };

  // 장바구니에서 상품 제거
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // 1. 바코드 스캔 (장바구니에 1개씩 추가)
  const handleScan = (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    addToCart(barcode.trim(), 1);
    setBarcode('');
    if (inputRef.current) inputRef.current.focus();
  };

  // 2. 수동 선택 (장바구니에 원하는 개수 추가)
  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    addToCart(selectedProduct, quantity);
    setQuantity(1); // 담은 후 수량 초기화
  };

  // 3. 장바구니 전체 결제
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      await Promise.all(cart.map(item =>
        sellItem({ product_id: item.id, quantity: item.qty })
      ));

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
      }).catch(e => {
        console.error(e);
        setShowCamera(false);
      });
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
        (decodedText) => {
          addToCart(decodedText, 1);
          handleCloseCamera();
        },
        (error) => { }
      ).catch((err) => {
        console.error(err);
        alert("카메라 권한을 허용해 주시거나 카메라가 정상 연결되어 있는지 확인해주세요.");
        setShowCamera(false);
      });
    }
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => { });
      }
    };
  }, [showCamera]);

  return (
    <div className="flex flex-col h-full p-4 2xl:p-8 text-white overflow-hidden bg-[#0d0e12]">
      <header className="mb-4 2xl:mb-6 shrink-0">
        <h1 className="text-4xl font-black tracking-tighter">Nexus POS</h1>
        <p className="text-gray-400 text-xs mt-0.5">선입선출(FIFO) 기반 다중 상품 결제 및 실시간 주문 관리</p>
      </header>

      <div className="flex-1 min-h-0 flex gap-6">

        {/* 왼쪽 섹션: 입력 및 스캔 전용 컨트롤 패널 */}
        <section className="w-[400px] shrink-0 flex flex-col">
          <div className="glass-panel rounded-3xl p-6 bg-black/40 border border-white/10 flex-1 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-500/10 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                  상품 식별 및 수동 입력
                </h2>

                {/* 상단: 바코드 퀵 스캔 */}
                <div className="flex gap-2">
                  <form onSubmit={handleScan} className="flex-1">
                    <input
                      id="barcode-input"
                      ref={inputRef}
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full bg-white/5 border border-indigo-500/30 rounded-xl h-12 px-4 text-center text-xl font-mono text-white outline-none focus:border-indigo-400 focus:bg-white/10 transition-all"
                      placeholder="바코드 스캔 (자동 담기)"
                      autoFocus
                    />
                  </form>
                  <button
                    onClick={() => setShowCamera(true)}
                    className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-colors shrink-0"
                    title="카메라로 스캔하기"
                  >
                    <span className="material-symbols-outlined">photo_camera</span>
                  </button>
                </div>

                {/* 수동 담기 폼 (Select 색상 시인성 패치 완료) */}
                <div>
                  <form onSubmit={handleManualAdd} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-gray-400 font-medium pl-1">등록 상품 선택</label>
                      <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="w-full bg-[#181920] text-white border border-white/10 rounded-xl h-12 px-3 outline-none focus:border-indigo-400 transition-all cursor-pointer text-sm font-semibold appearance-none"
                        style={{ backgroundColor: '#181920', color: '#ffffff' }}
                      >
                        {inventory.length === 0 ? (
                          <option value="" className="text-gray-500">조회된 상품 데이터가 없습니다.</option>
                        ) : (
                          inventory.map((item) => (
                            <option key={item.id} value={item.id} className="bg-[#181920] text-white py-2">
                              {item.name} (잔여: {item.total}개)
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="flex gap-3 items-end">
                      <div className="w-1/2 flex flex-col gap-1">
                        <label className="text-[11px] text-gray-400 font-medium pl-1">수량 설정</label>
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl h-12 px-2">
                          <button type="button" onClick={() => adjustQuantity(-1)} className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg font-bold text-lg text-gray-300">-</button>
                          <span className="font-mono font-bold text-base text-white">{quantity}</span>
                          <button type="button" onClick={() => adjustQuantity(1)} className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg font-bold text-lg text-white">+</button>
                        </div>
                      </div>

                      <button type="submit" className="w-1/2 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all text-sm shadow-md active:scale-[0.98]">
                        장바구니 담기
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* 하단 영역 고정 */}
              <div className="space-y-4 mt-6">
                <div className="h-px bg-white/10 w-full"></div>

                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || cart.length === 0}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:opacity-40 text-white font-black rounded-xl transition-all uppercase text-sm tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(5,150,105,0.3)] active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined">payments</span>
                  {isProcessing ? '승인 중...' : '일괄 결제 승인'}
                </button>

                {lastSold && (
                  <div className="text-emerald-400 font-bold bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20 animate-in fade-in flex items-center justify-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    {lastSold} 완료!
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>

        {/* 오른쪽 섹션: 와이드형 장바구니 관리 리스트 */}
        <section className="flex-1 min-h-0 glass-panel rounded-3xl p-6 bg-white/5 border border-white/10 flex flex-col">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400">shopping_cart</span>
              실시간 결제 대기 목록
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-md ml-1 border border-indigo-500/30">
                {cart.length}종
              </span>
            </h2>
            <p className="text-xs text-gray-500">바코드가 태깅되거나 등록된 대기 아이템 전량입니다.</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
            {cart.length === 0 ? (
              <div className="h-full border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-500 text-sm gap-3">
                <span className="material-symbols-outlined text-5xl opacity-20 animate-pulse text-indigo-400">add_shopping_cart</span>
                좌측 바코드를 스캔하거나 수동으로 품목을 장바구니에 담아주세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 p-4 rounded-2xl transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">{item.name}</span>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                        <span>CODE: {item.id}</span>
                        <span>•</span>
                        <span>잔여 한도: {item.max}개</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl">
                        <span className="font-mono text-indigo-400 font-black text-sm">{item.qty} 개</span>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-9 p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-150 flex items-center justify-center"
                        title="주문 제외"
                      >
                        <span className="material-symbols-outlined text-base block text-center">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>

      {/* 카메라 모달 */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1b21] border border-indigo-500/30 rounded-3xl p-6 max-w-md w-full flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400">qr_code_scanner</span>
              카메라 바코드 스캔
            </h2>
            <div className="w-full bg-black rounded-xl overflow-hidden mb-4 border border-white/10">
              <div id="reader" className="w-full"></div>
            </div>
            <button
              onClick={handleCloseCamera}
              className="w-full h-12 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">close</span>
              스캔 취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default POSView;