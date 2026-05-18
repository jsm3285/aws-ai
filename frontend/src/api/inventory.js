// frontend/src/api/inventory.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

export const getAIRecommendations = async () => {
  // AI 발주 제안 페이지(code.html)에서 사용할 데이터를 가져옵니다.
  const response = await axios.get(`${API_URL}/ai-orders`);
  return response.data;
};

export const registerItem = async (itemData) => {
  // 스캔/등록 페이지에서 입력한 데이터를 백엔드로 보냅니다.
  const response = await axios.post(`${API_URL}/items`, itemData);
  return response.data;
};

// --- Inbound Receiving API ---
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const getPendingOrders = async () => {
  const response = await axios.get(`${API_URL}/api/orders/pending`, getAuthHeaders());
  return response.data;
};

export const createInboundDraft = async (payload) => {
  const response = await axios.post(`${API_URL}/api/inbound/draft`, payload, getAuthHeaders());
  return response.data;
};

export const getPendingInbounds = async () => {
  const response = await axios.get(`${API_URL}/api/inbound/pending`, getAuthHeaders());
  return response.data;
};

export const approveInbound = async (receiptId, payload) => {
  const response = await axios.post(`${API_URL}/api/inbound/${receiptId}/approve`, payload, getAuthHeaders());
  return response.data;
};