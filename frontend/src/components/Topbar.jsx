import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

function Topbar() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  // 1. 초기 상태값 설정 (userRole과 role 모두 고려)
  const [userRole, setUserRole] = useState(
    localStorage.getItem('userRole') || localStorage.getItem('role') || 'staff'
  );

  const [accountForm, setAccountForm] = useState({
    name: localStorage.getItem('userName') || '사용자',
    role: userRole,
    storeName: 'Warehouse A',
    storeAddress: '서울시 강남구 테헤란로 123',
    password: '',
    confirmPassword: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    cardHolder: '',
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    pinPrefix: '',
    billingAddress: '',
    postalCode: '',
    phoneNumber: '',
  });

  const [staffForm, setStaffForm] = useState({
    userId: '',
    fullName: '',
    password: '',
    role: 'staff',
  });

  const [isCardLoading, setIsCardLoading] = useState(false);
  const profileMenuRef = useRef(null);

  // ⭐️ 2. isAdmin 판별 로직 강화 (다른 곳에서 쓰이는 방식 포함)
  // userRole 상태값 또는 로컬 스토리지의 두 가지 키값 중 하나라도 'admin'이면 점장으로 인식
  const isAdmin =
    userRole?.toLowerCase() === 'admin' ||
    localStorage.getItem('userRole')?.toLowerCase() === 'admin' ||
    localStorage.getItem('role')?.toLowerCase() === 'admin';

  const displayRole = isAdmin ? 'System Admin' : 'Staff';

  useEffect(() => {
    const syncUserFromServer = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
        const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profile = response.data;

        // 서버에서 받아온 실제 역할
        const realRole = profile.role || 'staff';

        setUsername(profile.username || '');
        setUserRole(realRole);

        setAccountForm((prev) => ({
          ...prev,
          name: profile.full_name || prev.name,
          role: realRole,
        }));

        // ⭐️ 3. 스태프일 경우 로컬 스토리지의 잘못된 권한 정보 강제 초기화
        localStorage.setItem('userName', profile.full_name || '');
        localStorage.setItem('username', profile.username || '');
        localStorage.setItem('userRole', realRole);
        localStorage.setItem('role', realRole); // role 키도 함께 업데이트

        if (realRole !== 'admin') {
          setIsProfileMenuOpen(false); // 스태프라면 열려있는 메뉴 닫기
        }
      } catch (error) {
        console.error('사용자 정보를 불러오지 못했습니다:', error);
      }
    };

    syncUserFromServer();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleAccountFieldChange = (event) => {
    const { name, value } = event.target;
    setAccountForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentFieldChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === 'cardNumber' || name === 'expiryDate' || name === 'cvc' || name === 'pinPrefix') {
      nextValue = value.replace(/\D/g, '');
    }
    setPaymentForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleStaffFieldChange = (event) => {
    const { name, value } = event.target;
    setStaffForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountSave = async (event) => {
    event.preventDefault();
    if (accountForm.password && accountForm.password !== accountForm.confirmPassword) {
      alert('비밀번호와 비밀번호 확인 값이 다릅니다.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/users/me`,
        {
          full_name: accountForm.name,
          password: accountForm.password || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('계정 관리 정보가 성공적으로 저장되었습니다.');
      localStorage.setItem('userName', accountForm.name);
      setActivePanel('');
      setIsProfileMenuOpen(false);
    } catch (error) {
      const detail = error.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : '계정 정보 저장 중 오류가 발생했습니다.');
    }
  };

  const handlePaymentSave = (event) => {
    event.preventDefault();
    saveCardToServer();
  };

  const handleStaffSave = async (event) => {
    event.preventDefault();
    if (!staffForm.userId || !staffForm.fullName || !staffForm.password) {
      alert("아이디, 이름, 비밀번호를 모두 입력해주세요.");
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/register`,
        {
          username: staffForm.userId,
          full_name: staffForm.fullName,
          password: staffForm.password,
          role: staffForm.role
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`${staffForm.fullName} 직원이 성공적으로 등록되었습니다.`);
      setStaffForm({ userId: '', fullName: '', password: '', role: 'staff' });
      setActivePanel('');
    } catch (error) {
      const detail = error.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : '직원 등록 중 오류가 발생했습니다.');
    }
  };

  const saveCardToServer = async () => {
    const cardNumber = paymentForm.cardNumber.replace(/\D/g, '');
    const expiryDate = paymentForm.expiryDate.replace(/\D/g, '');
    const cvc = paymentForm.cvc.replace(/\D/g, '');
    const pinPrefix = paymentForm.pinPrefix.replace(/\D/g, '');
    const cardHolder = paymentForm.cardHolder.trim();
    const billingAddress = paymentForm.billingAddress.trim();
    const postalCode = paymentForm.postalCode.trim();
    const phoneNumber = paymentForm.phoneNumber.trim();

    const isComplete =
      cardHolder &&
      cardNumber.length === 16 &&
      expiryDate.length === 4 &&
      cvc.length === 3 &&
      pinPrefix.length === 2 &&
      billingAddress &&
      postalCode &&
      phoneNumber;

    if (!isComplete) {
      const shouldContinue = window.confirm('모든 정보가 기입되지 않았습니다. 계속하시겠습니까?');
      if (!shouldContinue) return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/cards/me`,
        {
          card_holder_name: cardHolder || null,
          card_number: cardNumber.length === 16 ? cardNumber : null,
          expiry_4digits: expiryDate.length === 4 ? expiryDate : null,
          cvc_3digits: cvc.length === 3 ? cvc : null,
          pin_first_2digits: pinPrefix.length === 2 ? pinPrefix : null,
          billing_address: billingAddress || null,
          postal_code: postalCode || null,
          phone_number: phoneNumber || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('결제수단 정보가 저장되었습니다.');
      setActivePanel('');
      setIsProfileMenuOpen(false);
    } catch (error) {
      const detail = error.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : '결제수단 저장 중 오류가 발생했습니다.');
    }
  };

  const handleProfileButtonClick = () => {
    // ⭐️ 4. 클릭 핸들러에서 점장 여부를 한 번 더 확인
    if (isAdmin) {
      setIsProfileMenuOpen((prev) => !prev);
    }
  };

  const closePanels = () => {
    setActivePanel('');
    setIsProfileMenuOpen(false);
  };

  useEffect(() => {
    const fetchMyCard = async () => {
      if (activePanel !== 'payment') return;
      const token = localStorage.getItem('token');
      if (!token) return;

      setIsCardLoading(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
        const response = await axios.get(`${API_BASE_URL}/api/cards/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const card = response.data;
        setPaymentForm((prev) => ({
          ...prev,
          cardHolder: card.card_holder_name || prev.cardHolder,
          cardNumber: card.card_number || '',
          expiryDate: card.expiry_4digits || '',
          cvc: card.cvc_3digits || '',
          pinPrefix: card.pin_first_2digits || '',
          billingAddress: card.billing_address || '',
          postalCode: card.postal_code || '',
          phoneNumber: card.phone_number || '',
        }));
      } catch (error) {
        console.error('카드 정보를 불러오지 못했습니다:', error);
      } finally {
        setIsCardLoading(false);
      }
    };

    fetchMyCard();
  }, [activePanel]);

  return (
    <>
      <header className="h-20 border-b border-white/5 bg-[#0a0e14]/50 backdrop-blur-md px-10 flex items-center justify-between sticky top-0 z-50">
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

        <div className="flex items-center gap-6">
          <button className="relative group">
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0e14]"></span>
          </button>

          <button className="group">
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">settings</span>
          </button>

          <div ref={profileMenuRef} className="relative flex items-center gap-3 pl-4 border-l border-white/10">
            <button
              onClick={handleProfileButtonClick}
              // ⭐️ 5. 점장이 아닐 때 커서 및 호버 효과 제거
              className={`flex items-center gap-3 transition-opacity ${isAdmin ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
              title={isAdmin ? "프로필 메뉴 열기" : "내 정보"}
            >
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface">{accountForm.name}</p>
                <p className="text-[10px] text-on-surface-variant">{displayRole}{username ? ` · ${username}` : ''}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-dim to-primary p-[1px]">
                <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border-2 border-[#0a0e14]">
                  <span className="material-symbols-outlined text-primary">person</span>
                </div>
              </div>
            </button>

            {/* ⭐️ 6. 점장일 때만 드롭다운 메뉴 렌더링 (보안 강화) */}
            {isProfileMenuOpen && isAdmin && (
              <div className="absolute right-0 top-14 z-[70] w-72 rounded-2xl border border-white/10 bg-[#101621] shadow-2xl overflow-hidden">
                <button
                  onClick={() => {
                    setActivePanel('account');
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm flex items-center justify-between text-gray-200 hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">manage_accounts</span>
                    계정 관리
                  </span>
                  <span className="material-symbols-outlined text-base text-gray-500">chevron_right</span>
                </button>
                <button
                  onClick={() => {
                    setActivePanel('payment');
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm flex items-center justify-between text-gray-200 hover:bg-white/5 transition-colors border-t border-white/5"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">credit_card</span>
                    결제수단
                  </span>
                  <span className="material-symbols-outlined text-base text-gray-500">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ⭐️ 7. 패널 영역도 점장일 때만 활성화되도록 보호 */}
      {activePanel && isAdmin && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm px-4 py-8 sm:px-6">
          <div className="h-full w-full overflow-y-auto">
            <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
              <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0f1420] shadow-2xl">
                <div className="border-b border-white/10 px-6 py-5 sm:px-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">
                        {activePanel === 'account' ? 'Profile & Staff Settings' : 'Payment Settings'}
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-white">
                        {activePanel === 'account' ? '계정 및 직원 관리' : '결제수단 관리'}
                      </h2>
                    </div>
                    <button type="button" onClick={closePanels} className="rounded-xl border border-white/10 p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>

                {activePanel === 'account' && (
                  <>
                    <form onSubmit={handleAccountSave} className="px-6 py-6 sm:px-8">
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">이름</label>
                            <input name="name" value={accountForm.name} onChange={handleAccountFieldChange} className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">권한</label>
                            {/* ⭐️ 권한 필드는 읽기 전용으로 수정 */}
                            <input value={displayRole} readOnly className="h-12 w-full rounded-2xl bg-black/30 border border-white/10 px-4 text-sm text-gray-500 outline-none" />
                          </div>
                        </div>
                        {/* 이하 폼 내용 동일 */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">매장명</label>
                            <input name="storeName" value={accountForm.storeName} onChange={handleAccountFieldChange} className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">아이디</label>
                            <input value={username} disabled className="h-12 w-full rounded-2xl bg-black/30 border border-white/10 px-4 text-sm text-gray-400 outline-none" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">편의점 위치 정보</label>
                          <input name="storeAddress" value={accountForm.storeAddress} onChange={handleAccountFieldChange} className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                          <p className="text-sm font-bold text-white">비밀번호 변경</p>
                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <input name="password" type="password" value={accountForm.password} onChange={handleAccountFieldChange} placeholder="새 비밀번호" className="h-12 w-full rounded-2xl bg-black/20 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                            <input name="confirmPassword" type="password" value={accountForm.confirmPassword} onChange={handleAccountFieldChange} placeholder="비밀번호 확인" className="h-12 w-full rounded-2xl bg-black/20 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-8 flex justify-end gap-3">
                        <button type="button" onClick={closePanels} className="h-12 rounded-2xl border border-white/10 px-5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5">취소</button>
                        <button type="submit" className="h-12 rounded-2xl bg-primary px-5 text-sm font-semibold text-black">저장</button>
                      </div>
                    </form>
                    {/* 직원 관리 섹션 (isAdmin일 때만 보임) */}
                    <div className="border-t border-white/10 bg-[#0a0e14]/50 px-6 py-8 sm:px-8 mt-2 shadow-inner">
                      <div className="mb-6">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-500/80">Staff Management</p>
                        <h3 className="mt-1 text-xl font-bold text-white">직원 계정 임의 추가 (점장 전용)</h3>
                      </div>
                      <form onSubmit={handleStaffSave}>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">직원 이름</label>
                            <input name="fullName" value={staffForm.fullName} onChange={handleStaffFieldChange} placeholder="예: 김알바" className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">아이디</label>
                              <input name="userId" value={staffForm.userId} onChange={handleStaffFieldChange} placeholder="로그인 아이디" className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">초기 비밀번호</label>
                              <input name="password" type="password" value={staffForm.password} onChange={handleStaffFieldChange} placeholder="비밀번호" className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">직급 권한</label>
                            <select name="role" value={staffForm.role} onChange={handleStaffFieldChange} className="h-12 w-full rounded-2xl bg-[#101621] border border-white/10 px-4 text-sm text-white outline-none">
                              <option value="staff">일반 직원 (결제 불가)</option>
                              <option value="admin">점장 (모든 권한)</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                          <button type="submit" className="h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 font-bold px-6 text-sm text-white shadow-lg transition-transform hover:scale-105 active:scale-95">계정 만들기</button>
                        </div>
                      </form>
                    </div>
                  </>
                )}
                {/* 결제수단 관리 폼 동일 */}
                {activePanel === 'payment' && (
                  <form onSubmit={handlePaymentSave} className="px-6 py-6 sm:px-8">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">카드 소유자명</label>
                          <input name="cardHolder" value={paymentForm.cardHolder} onChange={handlePaymentFieldChange} className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">유효기간 4자리</label>
                          <input name="expiryDate" value={paymentForm.expiryDate} onChange={handlePaymentFieldChange} maxLength={4} placeholder="MMYY" className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">카드 번호 16자리</label>
                        <input name="cardNumber" value={paymentForm.cardNumber} onChange={handlePaymentFieldChange} maxLength={16} placeholder="0000000000000000" className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">CVC 3자리</label>
                          <input name="cvc" value={paymentForm.cvc} onChange={handlePaymentFieldChange} maxLength={3} placeholder="123" className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">비밀번호 앞 2자리</label>
                          <input name="pinPrefix" value={paymentForm.pinPrefix} onChange={handlePaymentFieldChange} maxLength={2} placeholder="12" className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">청구지 주소</label>
                        <input name="billingAddress" value={paymentForm.billingAddress} onChange={handlePaymentFieldChange} className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">우편번호</label>
                          <input name="postalCode" value={paymentForm.postalCode} onChange={handlePaymentFieldChange} placeholder="06142" className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">연락처</label>
                          <input name="phoneNumber" value={paymentForm.phoneNumber} onChange={handlePaymentFieldChange} placeholder="01012345678" className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-primary/40" />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                        {isCardLoading ? '저장된 카드 정보를 불러오는 중입니다...' : '저장된 카드 정보가 있으면 자동으로 채워집니다.'}
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                      <button type="button" onClick={closePanels} className="h-12 rounded-2xl border border-white/10 px-5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5">취소</button>
                      <button type="submit" className="h-12 rounded-2xl bg-primary px-5 text-sm font-semibold text-black">저장</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Topbar;