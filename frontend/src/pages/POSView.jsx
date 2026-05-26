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
      // 입력 폼 등에서 포커스 중일 때는 무시 (단, 바코드 전용 input은 예외)
      if (e.target.tagName === 'INPUT' && e.target.id !== 'barcode-input') {
        return;
      }
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      const currentTime = Date.now();
      // 일반 타이핑보다 훨씬 빠른 50ms 이내의 입력을 바코드로 간주
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
        (error) => {}
      ).catch((err) => {
        console.error(err);
        alert("카메라 권한을 허용해 주시거나 카메라가 정상 연결되어 있는지 확인해주세요.");
        setShowCamera(false);
      });
    }
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [showCamera]);

  return (
    <div className="flex flex-col h-full p-8 text-white overflow-hidden">
      <header className="mb-8 shrink-0">
        <h1 className="text-4xl font-black tracking-tighter">Nexus POS</h1>
        <p className="text-gray-400">선입선출(FIFO) 기반 다중 상품 결제 및 재고 스펙트럼</p>
      </header>

      <div className="flex-1 min-h-0 flex gap-8">

        {/* 🌟 수정 포인트 1: 왼쪽 패널을 w-1/3에서 넓이가 고정된 w-[400px]로 변경하여 찌그러짐 방지 */}
        <section className="w-[400px] shrink-0 flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 bg-black/40 border border-white/10 flex-1 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-500/10 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">

              {/* 상단: 바코드 퀵 스캔 */}
              <div className="mb-6 shrink-0 flex gap-2">
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

              {/* 🌟 수정 포인트 2: 수동 담기 폼을 가로(flex-row)에서 세로(flex-col) 2줄 배치로 변경 */}
              <div className="mb-6 shrink-0">
                <form onSubmit={handleManualAdd} className="flex flex-col gap-3">
                  {/* 1줄: 상품 선택 창 */}
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full bg-[#1a1b21] border border-white/10 rounded-xl h-12 px-3 text-white outline-none focus:border-indigo-400 transition-all cursor-pointer text-sm"
                  >
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (잔여: {item.total})
                      </option>
                    ))}
                  </select>

                  {/* 2줄: 수량 조절 버튼 + 담기 버튼 */}
                  <div className="flex gap-2">
                    <div className="w-1/2 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl h-12 px-2">
                      <button type="button" onClick={() => adjustQuantity(-1)} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg font-bold text-lg">-</button>
                      <span className="font-mono font-bold text-base">{quantity}</span>
                      <button type="button" onClick={() => adjustQuantity(1)} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg font-bold text-lg">+</button>
                    </div>
                    <button type="submit" className="w-1/2 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all text-sm">
                      장바구니 담기
                    </button>
                  </div>
                </form>
              </div>

              <div className="h-px bg-white/10 w-full mb-4 shrink-0"></div>

              {/* 하단: 장바구니(Cart) 목록 영역 */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar mb-4 pr-2 space-y-2">
                <h2 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">shopping_cart</span>
                  장바구니 목록 ({cart.length}종)
                </h2>

                {cart.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-gray-500 text-sm">
                    상품을 스캔하거나 담아주세요.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-xl animate-in fade-in">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{item.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{item.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-indigo-400 font-bold">{item.qty}개</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 transition-colors">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 장바구니 전체 결제 버튼 */}
              <button
                onClick={handleCheckout}
                disabled={isProcessing || cart.length === 0}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:opacity-50 text-white font-black rounded-xl transition-all uppercase text-sm tracking-widest flex items-center justify-center gap-2 shrink-0 shadow-[0_0_15px_rgba(5,150,105,0.4)]"
              >
                <span className="material-symbols-outlined">payments</span>
                {isProcessing ? '승인 중...' : '일괄 결제 승인'}
              </button>

              {/* 마지막 판매 알림 */}
              {lastSold && (
                <div className="mt-4 text-emerald-400 font-bold bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20 animate-in fade-in flex items-center justify-center gap-2 text-xs shrink-0">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  {lastSold} 완료!
                </div>
              )}

            </div>
          </div>
        </section>

        {/* 오른쪽: 재고 에너지 바(Health Spectrum) 리스트 (남은 영역 꽉 채우기) */}
        <section className="flex-1 min-h-0 glass-panel rounded-3xl p-8 bg-white/5 border border-white/10 overflow-y-auto custom-scrollbar">
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