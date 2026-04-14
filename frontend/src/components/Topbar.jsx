import React from 'react';

function Topbar() {
  return (
    <header className="h-20 border-b border-white/5 bg-[#0a0e14]/50 backdrop-blur-md px-10 flex items-center justify-between sticky top-0 z-50">
      {/* 왼쪽: 현재 위치 및 상태 */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-primary tracking-widest uppercase">Warehouse A</span>
          <div className="w-[1px] h-3 bg-white/10"></div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Status: Online</span>
          </div>
        </div>
      </div>

      {/* 오른쪽: 액션 아이콘 및 프로필 */}
      <div className="flex items-center gap-6">
        {/* 알림 버튼 */}
        <button className="relative group">
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">notifications</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0e14]"></span>
        </button>

        {/* 설정 버튼 */}
        <button className="group">
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">settings</span>
        </button>

        {/* 사용자 프로필 */}
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="text-right">
            <p className="text-xs font-bold text-on-surface">조승민 매니저</p>
            <p className="text-[10px] text-on-surface-variant">System Admin</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-dim to-primary p-[1px]">
            <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border-2 border-[#0a0e14]">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;