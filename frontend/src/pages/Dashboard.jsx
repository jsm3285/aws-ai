import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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

  // ⭐️ 데이터 불러오기 (토큰 인증 포함)
  const fetchData = async () => {
    const token = localStorage.getItem('token');
    
    // 토큰 없으면 로그인창으로 강제 이동
    if (!token) {
      navigate('/');
      return;
    }

    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [invRes, statsRes] = await Promise.all([
        axios.get('http://localhost:8000/api/dashboard/inventory', config),
        axios.get('http://localhost:8000/api/dashboard/stats', config)
      ]);
      
      setInventoryData(invRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      // 토큰이 만료되었거나 잘못된 경우 (401 에러)
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/');
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30초 자동 갱신
    return () => clearInterval(interval);
  }, []);

  // ⭐️ 판매 처리 (토큰 인증 포함)
  const handleSell = async (id, name) => {
    const qty = prompt(`[${name}] 몇 개를 판매 처리할까요?`, "1");
    if (!qty || isNaN(qty) || parseInt(qty) <= 0) return;

    const token = localStorage.getItem('token');

    try {
      await axios.post('http://localhost:8000/api/dashboard/sell', 
        { product_id: id, quantity: parseInt(qty) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchData(); // 판매 후 목록 갱신
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
    <div className="space-y-8 p-4 max-h-screen overflow-y-auto">
      {/* 요약 카드 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-8 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-white">payments</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase mb-2 tracking-widest">오늘의 실시간 매출액</p>
          <h2 className="text-4xl font-black text-white">₩{stats.expected_sales.toLocaleString()}</h2>
        </div>

        <div className="glass-panel p-8 rounded-3xl bg-white/5 border-l-4 border-red-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-white">priority_high</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase mb-2 text-red-400 tracking-widest">재고 부족 알림</p>
          <h2 className="text-4xl font-black text-white">{stats.warning_count}<span className="text-sm font-normal text-gray-500 ml-2">건</span></h2>
        </div>

        <div className="glass-panel p-8 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-white">inventory_2</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase mb-2 tracking-widest">전체 분석 상품</p>
          <h2 className="text-4xl font-black text-white">{stats.total_products}<span className="text-sm font-normal text-gray-500 ml-2">종</span></h2>
        </div>
      </div>

      {/* 메인 테이블 영역 */}
      <div className="glass-panel rounded-3xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl flex flex-col">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">재고 현황 및 관리</h3>
            <p className="text-xs text-gray-500 font-medium">실시간 데이터가 30초마다 자동 동기화됩니다.</p>
          </div>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors">search</span>
            <input 
              type="text" 
              placeholder="품목명, 코드, 카테고리 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-sm text-white outline-none w-80 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin">
          <table className="w-full text-left text-white border-collapse">
            <thead className="sticky top-0 z-20 bg-[#121212] shadow-md text-[10px] uppercase text-gray-400 font-black tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">품목 정보</th>
                <th className="px-8 py-5">카테고리</th>
                <th className="px-8 py-5 text-right">현재 재고</th>
                <th className="px-8 py-5 text-center">상태</th>
                <th className="px-8 py-5 text-center">관리 액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-all group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-sm group-hover:text-indigo-300 transition-colors">{item.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {item.id}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-md border border-white/5">{item.category}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className={`font-mono font-bold text-lg ${item.stock === 0 ? 'text-red-500' : 'text-white'}`}>
                        {item.stock.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-1">개</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`mx-auto w-fit px-3 py-1 rounded-full text-[9px] font-black tracking-tighter border ${statusStyles[item.status]}`}>
                        {item.status.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button 
                        onClick={() => handleSell(item.id, item.name)} 
                        className="group/btn relative px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center gap-2 mx-auto"
                      >
                        <span className="material-symbols-outlined text-sm">remove_shopping_cart</span>
                        임의 판매
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-gray-500 font-medium">
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
  );
}

export default Dashboard;