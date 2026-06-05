import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// 시각화 라이브러리 컴포넌트 임포트
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const statusStyles = {
  NORMAL: "bg-green-500/10 text-green-400 border-green-500/20",
  WARNING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  OUT_OF_STOCK: "bg-red-500/10 text-red-400 border-red-500/20",
};

function Dashboard() {
  const navigate = useNavigate();
  const [inventoryData, setInventoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ expected_sales: 0, warning_count: 0, total_products: 0, categories_count: 0 });
  const [chartData, setChartData] = useState([]);

  // 데이터 통합 로드 (백엔드 세션 토큰 포함)
  const fetchData = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/');
      return;
    }

    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

      const [invRes, statsRes, trendRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/dashboard/inventory`, config),
        axios.get(`${API_BASE_URL}/api/dashboard/stats`, config),
        axios.get(`${API_BASE_URL}/api/dashboard/sales-trend`, config).catch(err => {
          console.warn("sales-trend API가 아직 연결 중이거나 주소가 유효하지 않습니다.");
          return { data: { trend: [] } };
        })
      ]);

      setInventoryData(invRes.data);
      setStats(statsRes.data);

      if (trendRes.data && Array.isArray(trendRes.data.trend)) {
        setChartData(trendRes.data.trend);
      } else if (Array.isArray(trendRes.data)) {
        setChartData(trendRes.data);
      } else {
        setChartData([]);
      }

    } catch (err) {
      console.error("데이터 로드 실패:", err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/');
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSell = async (id, name) => {
    const qty = prompt(`[${name}] 몇 개를 판매 처리할까요?`, "1");
    if (!qty || isNaN(qty) || parseInt(qty) <= 0) return;

    const token = localStorage.getItem('token');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      await axios.post(`${API_BASE_URL}/api/dashboard/sell`,
        { product_id: id, quantity: parseInt(qty) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchData();
    } catch (err) {
      alert("판매 처리 실패: 권한이 없거나 세션이 만료되었습니다.");
    }
  };

  const filteredData = inventoryData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    /* 🌟 패치포인트 1: 본문 컨테이너 자체에만 부드러운 스크롤을 주고, 강제 너비 고정을 제거하여 유연하게 반응하도록 수정 */
    <div className="w-full h-full overflow-y-auto overflow-x-hidden p-3 xl:p-5 2xl:p-8 custom-scrollbar">

      <div className="w-full flex flex-col gap-6 pb-12">

        {/* 1. 상단 요약 대시보드 메트릭 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="glass-panel p-4 2xl:p-6 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-white">payments</span>
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase mb-2 tracking-widest">오늘의 실시간 매출액</p>
            <h2 className="text-3xl lg:text-4xl font-black text-white">₩{stats.expected_sales.toLocaleString()}</h2>
          </div>

          <div className="glass-panel p-4 2xl:p-6 rounded-3xl bg-white/5 border-l-4 border-red-500 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-white">priority_high</span>
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase mb-2 text-red-400 tracking-widest">재고 부족 알림</p>
            <h2 className="text-3xl lg:text-4xl font-black text-white">{stats.warning_count}<span className="text-sm font-normal text-gray-500 ml-2">건</span></h2>
          </div>

          <div className="glass-panel p-4 2xl:p-6 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-white">inventory_2</span>
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase mb-2 tracking-widest">전체 분석 상품</p>
            <h2 className="text-3xl lg:text-4xl font-black text-white">{stats.total_products}<span className="text-sm font-normal text-gray-500 ml-2">종</span></h2>
          </div>
        </div>

        {/* 2. 중앙 실시간 매출액 트렌드 차트 */}
        <div className="glass-panel p-4 2xl:p-6 rounded-3xl bg-white/5 border border-white/10 shrink-0 shadow-xl flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white mb-0.5">실시간 일별 매출 데이터 트렌드</h3>
            <p className="text-xs text-gray-500 font-medium">최근 7영업일 간의 매출 추이와 실시간 재고 변화를 추적합니다.</p>
          </div>
          <div className="w-full h-48 md:h-60">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl opacity-40 text-sm text-gray-400">
                <span className="material-symbols-outlined text-3xl mb-2 animate-pulse text-indigo-400">insights</span>
                최근 7영업일 간의 판매 실적이 데이터베이스에 축적되지 않았거나 로딩 중입니다.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} tickFormatter={(v) => `₩${v.toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161925', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }}
                    itemStyle={{ color: '#818cf8' }}
                    formatter={(value) => [`₩${value.toLocaleString()}`, '일별 매출액']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, stroke: '#818cf8', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 3. 하단 메인 재고 관리 테이블 영역 */}
        <div className="glass-panel rounded-3xl bg-white/5 border border-white/10 shadow-2xl block overflow-hidden">
          <div className="p-4 border-b border-white/5 flex flex-col lg:flex-row justify-between items-center gap-4 shrink-0">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">재고 현황 및 관리 스펙트럼</h3>
              <p className="text-xs text-gray-500 font-medium">선입선출(FIFO) 기반 데이터 로트 상태를 실시간 시각화합니다. (30초 자동 동기화)</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              {/* 상태별 색상 범례 가이드 */}
              <div className="flex gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-black/30 px-3 py-2 rounded-xl border border-white/5 shrink-0">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>위험 (5개 이하)</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.8)]"></div>경고 (6~9개)</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>안전 (10개 이상)</div>
              </div>

              {/* 검색 바 */}
              <div className="relative group w-full sm:w-auto">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors">search</span>
                <input
                  type="text"
                  placeholder="품목명, 코드, 카테고리 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-2.5 text-sm text-white outline-none w-full sm:w-64 md:w-80 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 🌟 패치포인트 2: 테이블 부모 레이아웃에 overflow-x-auto를 주어 화면 너비가 좁아지면 가로 스크롤바가 유연하게 생기도록 설계 */}
          <div className="w-full overflow-x-auto scrollbar-thin">
            {/* 테이블 자체의 최소 너비를 설정하여, 작은 화면에서도 내부 열들이 뭉개지지 않고 가로 스크롤되도록 고정 */}
            <table className="w-full text-left text-white border-collapse min-w-[950px]">
              <thead className="bg-[#121212] shadow-md text-[10px] uppercase text-gray-400 font-black tracking-[0.2em]">
                <tr>
                  <th className="px-6 py-5">품목 정보</th>
                  <th className="px-6 py-5">카테고리</th>
                  <th className="px-6 py-5 text-left w-[340px]">현재 재고 스펙트럼 (50칸 고정)</th>
                  <th className="px-6 py-5 text-center">상태</th>
                  <th className="px-6 py-5 text-center">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredData.length > 0 ? (
                  filteredData.map((item) => {
                    const totalQty = item.stock !== undefined ? item.stock : (item.total || 0);
                    const redQty = item.lots?.red || 0;
                    const yellowQty = item.lots?.yellow || 0;
                    const greenQty = item.lots?.green || 0;

                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition-all group">
                        <td className="px-6 py-6">
                          <p className="font-bold text-sm group-hover:text-indigo-300 transition-colors">{item.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {item.id}</p>
                        </td>
                        <td className="px-6 py-6">
                          <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-md border border-white/5">{item.category}</span>
                        </td>

                        <td className="px-6 py-6">
                          <div className="flex flex-col gap-1.5 w-full max-w-[280px]">
                            <div className="flex justify-between items-baseline">
                              <div className="flex gap-2 text-[10px] font-mono opacity-80">
                                {redQty > 0 && <span className="text-red-400">🔴 {redQty}</span>}
                                {yellowQty > 0 && <span className="text-yellow-400">🟡 {yellowQty}</span>}
                                {greenQty > 0 && <span className="text-emerald-400">🟢 {greenQty}</span>}
                              </div>
                              <div>
                                <span className={`font-mono font-bold text-base ${totalQty === 0 ? 'text-red-500' :
                                  totalQty <= 5 ? 'text-red-400' :
                                    (item.status === 'WARNING' || totalQty < 10) ? 'text-yellow-400' : 'text-emerald-400'
                                  }`}>
                                  {totalQty.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-gray-500 ml-0.5">개</span>
                              </div>
                            </div>

                            <div className="flex gap-0.5 h-3 bg-black/50 p-0.5 rounded-md border border-white/5 overflow-hidden w-full relative items-center">
                              {item.status === 'OUT_OF_STOCK' || totalQty === 0 ? (
                                <div className="w-full text-center text-[9px] text-red-500/60 font-black tracking-widest uppercase">
                                  OUT OF STOCK
                                </div>
                              ) : (
                                Array.from({ length: 50 }).map((_, index) => {
                                  const isFilled = index < totalQty;
                                  let slotColor = "bg-white/5 border border-white/10";

                                  if (isFilled) {
                                    if (totalQty <= 5) {
                                      slotColor = "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]";
                                    } else if (item.status === 'WARNING' || totalQty < 10) {
                                      slotColor = "bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]";
                                    } else {
                                      slotColor = "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]";
                                    }
                                  }

                                  return (
                                    <div
                                      key={index}
                                      className={`flex-1 h-full rounded-sm transition-all duration-300 ${slotColor}`}
                                    />
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-6">
                          <div className={`mx-auto w-fit px-3 py-1 rounded-full text-[9px] font-black tracking-tighter border ${totalQty === 0 ? statusStyles.OUT_OF_STOCK :
                            totalQty <= 5 ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              statusStyles[item.status]
                            }`}>
                            {totalQty === 0 ? 'OUT OF STOCK' : totalQty <= 5 ? 'CRITICAL WARNING' : item.status.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <button
                            onClick={() => handleSell(item.id, item.name)}
                            className="group/btn relative px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center gap-2 mx-auto"
                          >
                            <span className="material-symbols-outlined text-sm">remove_shopping_cart</span>
                            임의 판매
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center text-gray-500 font-medium">
                      <span className="material-symbols-outlined text-4xl mb-4 block opacity-20">inventory</span>
                      검색 결과와 일치하는 상품이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;