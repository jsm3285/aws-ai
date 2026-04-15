// src/components/Layout.jsx
import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0a0e14] text-[#eef0f9] font-body">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;