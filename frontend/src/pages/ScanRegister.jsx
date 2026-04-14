import React, { useState } from 'react';
import axios from 'axios';

const statusStyles = {
  NORMAL: "bg-green-500/10 text-green-400 border-green-500/20",
  WARNING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  OUT_OF_STOCK: "bg-red-500/10 text-red-400 border-red-500/20",
};

function ScanRegister() {
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    quantity: 0,
    category: '식품 (Food)',
    expiration_date: ''
  });

  const [logs, setLogs] = useState([
    { time: '14:22:01', msg: 'Scanner Initialized... Ready', type: 'success' },
    { time: '14:22:05', msg: 'Optical Recognition Engine at 98% Confidence', type: 'primary' },
    { time: '14:22:12', msg: 'No barcode detected in frame...', type: 'info' },
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 0 : value
    }));
  };

  const handleReset = () => {
    setFormData({
      barcode: '',
      name: '',
      quantity: 0,
      category: '식품 (Food)',
      expiration_date: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8000/api/inventory/register', formData);
      if (res.data.status === "success") {
        alert(res.data.message);
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
        const newLog = { 
          time: timeStr, 
          msg: `REGISTERED: ${formData.name} (${formData.quantity}개)`, 
          type: 'success' 
        };
        setLogs([newLog, ...logs]);
        handleReset();
      }
    } catch (err) {
      console.error("등록 실패:", err);
      alert("서버와 통신할 수 없습니다. 백엔드가 실행 중인지 확인하세요.");
    }
  };

  return (
    /* ⭐️ 최상단 div에 스크롤 허용 및 최대 높이 설정 */
    <div className="flex flex-col h-full max-h-screen overflow-y-auto gap-8 p-4 scrollbar-hide">
      
      {/* 페이지 헤더 */}
      <header className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-4xl font-headline font-extrabold tracking-tight text-white mb-2">입고 스캔 및 수동 등록</h1>
          <p className="text-gray-400 font-body text-lg">새로운 재고를 인식하고 데이터베이스에 등록합니다.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
          <span className="w-2 h-2 rounded-full bg-[#33f684] shadow-[0_0_8px_#33f684] animate-pulse"></span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Camera Active</span>
        </div>
      </header>

      {/* 메인 레이아웃: 화면이 작아지면 한 줄로 나열되도록 flex-col lg:flex-row 적용 */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* 왼쪽: 라이브 스캐너 및 로그 */}
        <section className="flex-1 flex flex-col gap-4 min-h-[400px]">
          <div className="flex-1 glass-panel rounded-2xl relative bg-[#000000] overflow-hidden border border-white/10 min-h-[300px]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 opacity-40"></div>
            <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none">
              <div className="flex justify-between">
                <div className="w-12 h-12 border-t-4 border-l-4 border-[#33f684] rounded-tl-lg"></div>
                <div className="w-12 h-12 border-t-4 border-r-4 border-[#33f684] rounded-tr-lg"></div>
              </div>
              <div className="absolute left-0 right-0 h-[2px] bg-[#33f684] shadow-[0_0_20px_#33f684] animate-scan top-0"></div>
              <div className="self-center bg-black/60 backdrop-blur-xl px-6 py-3 rounded-full border border-[#33f684]/30 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#33f684] text-sm">qr_code_scanner</span>
                <span className="text-white font-bold text-xs">바코드를 프레임 안에 맞춰주세요</span>
              </div>
              <div className="flex justify-between">
                <div className="w-12 h-12 border-b-4 border-l-4 border-[#33f684] rounded-bl-lg"></div>
                <div className="w-12 h-12 border-b-4 border-r-4 border-[#33f684] rounded-br-lg"></div>
              </div>
            </div>
          </div>

          {/* 시스템 로그 영역 (높이 고정) */}
          <div className="h-40 glass-panel rounded-2xl p-5 overflow-y-auto border border-white/5 bg-white/5 scrollbar-thin">
            <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">terminal</span> System Logs
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              {logs.map((log, i) => (
                <p key={i} className="text-gray-400 tracking-tighter">
                  <span className="opacity-40">[{log.time}]</span>{' '}
                  <span className={log.type === 'success' ? 'text-[#33f684]' : log.type === 'primary' ? 'text-indigo-400' : ''}>
                    {log.msg}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* 오른쪽: 수동 데이터 입력 폼 (내부 스크롤 가능하게 설정) */}
        <section className="w-full lg:w-[450px] shrink-0">
          <div className="glass-panel rounded-2xl p-8 flex flex-col gap-6 border border-white/5 bg-white/5 h-full max-h-[800px] overflow-y-auto scrollbar-hide">
            <div>
              <h2 className="text-2xl font-black text-white headline mb-1">수동 데이터 입력</h2>
              <p className="text-sm text-gray-400">정보를 입력하여 재고를 등록하십시오.</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">barcode</span> Barcode
                </label>
                <input 
                  name="barcode" value={formData.barcode} onChange={handleChange} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 text-white outline-none focus:ring-1 focus:ring-indigo-500/50" 
                  placeholder="바코드 번호" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">inventory_2</span> Product Name
                </label>
                <input 
                  name="name" value={formData.name} onChange={handleChange} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 text-white outline-none focus:ring-1 focus:ring-indigo-500/50" 
                  placeholder="상품명" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Quantity</label>
                  <input 
                    name="quantity" value={formData.quantity} onChange={handleChange} required
                    className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 text-white outline-none focus:ring-1 focus:ring-indigo-500/50" 
                    type="number" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Category</label>
                  <select 
                    name="category" value={formData.category} onChange={handleChange}
                    className="w-full bg-[#1a1b21] border border-white/10 rounded-xl h-12 px-4 text-white outline-none"
                  >
                    <option value="도시락">도시락</option>
                    <option value="삼각김밥">삼각김밥</option>
                    <option value="음료">음료</option>
                    <option value="식품 (Food)">식품 (Food)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">calendar_today</span> Expiration
                </label>
                <input 
                  name="expiration_date" value={formData.expiration_date} onChange={handleChange} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 text-white outline-none focus:ring-1 focus:ring-indigo-500/50" 
                  type="date" 
                />
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" className="h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all uppercase text-xs tracking-widest">
                  입고 등록 (Register)
                </button>
                <button type="button" onClick={handleReset} className="h-14 border border-white/10 text-gray-400 hover:bg-white/5 rounded-xl text-xs font-bold transition-all">
                  초기화 (Reset)
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ScanRegister;