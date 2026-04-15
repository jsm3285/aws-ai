import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  
  // 1. 상태 관리 (입력값, 로딩, 에러 메시지)
  const [formData, setFormData] = useState({ userId: '', password: '' });
  const [signupData, setSignupData] = useState({
    fullName: '',
    userId: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  // 2. 로그인 처리 함수
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.userId || !formData.password) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // 백엔드 login 엔드포인트 호출
      // FastAPI의 OAuth2PasswordRequestForm 형식을 맞추기 위해 URLSearchParams 사용
      const params = new URLSearchParams();
      params.append('username', formData.userId);
      params.append('password', formData.password);

      const response = await axios.post('http://localhost:8000/api/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (response.data.access_token) {
        // ⭐️ 중요: 로그인 성공 시 정보를 로컬 스토리지에 저장
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('userRole', response.data.role); // 'admin' 또는 'staff'
        localStorage.setItem('userName', response.data.full_name);
        localStorage.setItem('username', formData.userId);

        console.log(`${response.data.full_name}님 환영합니다! (권한: ${response.data.role})`);
        
        // 대시보드로 이동
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("로그인 에러:", err);
      setError("아이디 또는 비밀번호가 일치하지 않습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!signupData.fullName || !signupData.userId || !signupData.password) {
      setError('이름, 아이디, 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post('http://localhost:8000/api/register', {
        username: signupData.userId,
        password: signupData.password,
        full_name: signupData.fullName,
        role: signupData.role,
      });

      setSuccess('회원가입이 완료되었습니다. 로그인해주세요.');
      setMode('login');
      setFormData({ userId: signupData.userId, password: '' });
      setSignupData({
        fullName: '',
        userId: '',
        password: '',
        confirmPassword: '',
        role: 'staff',
      });
    } catch (err) {
      const serverDetail = err.response?.data?.detail;
      setError(typeof serverDetail === 'string' ? serverDetail : '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* 배경 빛 효과 (Tailwind 기본 컬러로 보정) */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]"></div>

      <div className="relative glass-panel w-full max-w-md p-10 rounded-3xl shadow-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="material-symbols-outlined text-white text-3xl">inventory_2</span>
            </div>
          </div>
          <h1 className="font-headline text-3xl font-black tracking-tight mb-2 text-white">통합 로그인</h1>
          <p className="text-gray-500 text-[10px] uppercase font-bold tracking-[0.3em]">Inventory OS v2.4 Kinetic</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl p-1 bg-white/5 border border-white/10">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            className={`h-11 rounded-xl text-xs font-bold tracking-widest transition-colors ${mode === 'login' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
            className={`h-11 rounded-xl text-xs font-bold tracking-widest transition-colors ${mode === 'signup' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            회원가입
          </button>
        </div>

        {mode === 'login' ? (
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">User ID</label>
              <input 
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none placeholder:text-gray-600" 
                placeholder="아이디 입력" 
                type="text" 
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
              <input 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none placeholder:text-gray-600" 
                placeholder="비밀번호 입력" 
                type="password" 
                autoComplete="current-password"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full h-16 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">login</span>
                  SIGN IN
                </>
              )}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSignup}>
            <input
              name="fullName"
              value={signupData.fullName}
              onChange={handleSignupChange}
              placeholder="이름"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none placeholder:text-gray-600"
              type="text"
            />
            <input
              name="userId"
              value={signupData.userId}
              onChange={handleSignupChange}
              placeholder="아이디"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none placeholder:text-gray-600"
              type="text"
              autoComplete="username"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="password"
                value={signupData.password}
                onChange={handleSignupChange}
                placeholder="비밀번호"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none placeholder:text-gray-600"
                type="password"
              />
              <input
                name="confirmPassword"
                value={signupData.confirmPassword}
                onChange={handleSignupChange}
                placeholder="비밀번호 확인"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none placeholder:text-gray-600"
                type="password"
              />
            </div>
            <select
              name="role"
              value={signupData.role}
              onChange={handleSignupChange}
              className="w-full bg-[#1a1b21] border border-white/10 rounded-2xl py-3 px-5 text-white outline-none"
            >
              <option value="staff">직원</option>
              <option value="admin">점장</option>
            </select>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  SIGN UP
                </>
              )}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-red-400 text-xs font-bold text-center animate-pulse">{error}</p>
        )}
        {success && (
          <p className="mt-4 text-emerald-400 text-xs font-bold text-center">{success}</p>
        )}

        <div className="mt-8 flex justify-center space-x-8 text-[11px] font-bold text-gray-500">
          <button type="button" className="hover:text-white transition-colors uppercase tracking-widest">Forgot Account?</button>
          <button type="button" className="hover:text-white transition-colors uppercase tracking-widest">Support</button>
        </div>
      </div>
    </div>
  );
}

export default Login;