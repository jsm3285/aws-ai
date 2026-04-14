// src/components/Sidebar.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  // INVENTORY 메뉴를 리스트에서 제거했습니다.
  const menus = [
    { name: 'DASHBOARD', path: '/dashboard', icon: 'grid_view' },
    { name: 'SCAN/REGISTER', path: '/scan', icon: 'qr_code_scanner' },
    { name: 'AI ORDERS', path: '/ai-orders', icon: 'smart_toy' },
    { name: 'ORDER HISTORY', path: '/history', icon: 'history' },
  ];

  return (
    <div className="w-72 bg-[#05080d] border-r border-white/5 flex flex-col h-screen p-6">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-black font-bold">inventory_2</span>
        </div>
        <div>
          <h2 className="font-headline font-black text-xl leading-tight text-white">Inventory OS</h2>
          <p className="text-[10px] text-on-surface-variant font-bold tracking-tighter">V2.4 KINETIC</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {menus.map((menu) => (
          <button
            key={menu.path}
            onClick={() => navigate(menu.path)}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all font-bold text-xs tracking-widest ${
              location.pathname === menu.path 
              ? 'bg-primary/10 text-primary border border-primary/20' 
              : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xl">{menu.icon}</span>
            {menu.name}
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-white/5 space-y-2">
        <button className="w-full flex items-center gap-4 px-4 py-3 text-on-surface-variant text-xs font-bold hover:text-white transition-colors">
          <span className="material-symbols-outlined text-xl">help</span>
          SUPPORT
        </button>
        <button 
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-4 px-4 py-3 text-on-surface-variant text-xs font-bold hover:text-red-400 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          LOGOUT
        </button>
      </div>
    </div>
  );
}

export default Sidebar;