// frontend/src/api/inventory.js
import axios from 'axios';

const API_URL = "http://localhost:8000";

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