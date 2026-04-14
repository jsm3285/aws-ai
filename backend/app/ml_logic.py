import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, timedelta

def predict_sales_with_rf(history_data):
<<<<<<< HEAD
    # 🚨 보완점 1: 신상품 등 데이터가 너무 적어 학습 불가능할 때의 방어 로직
    if not history_data or len(history_data) < 3:
        return 10  # 학습 데이터가 부족하면 기본 10개 제안

=======
>>>>>>> 8f972fef14f5be128d5f061e2c61720e43418ef9
    # 1. 데이터프레임 생성
    df = pd.DataFrame(history_data)
    
    # 2. 날짜 피처 엔지니어링 (AI가 이해할 수 있는 숫자로 변환)
    df['date'] = pd.to_datetime(df['date'])
    df['day_of_week'] = df['date'].dt.dayofweek  # 0:월, 6:일
    df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
    
<<<<<<< HEAD
    # 강수량 데이터가 없을 경우를 대비해 0.0으로 초기화
    if 'precipitation' not in df.columns:
        df['precipitation'] = 0.0

    # 3. 학습할 특성(X)과 타겟(y) 분리
=======
    # 3. 학습할 특성(X)과 타겟(y) 분리
    # 현재는 요일, 주말 여부, 강수량(precipitation)을 학습시킨다고 가정
>>>>>>> 8f972fef14f5be128d5f061e2c61720e43418ef9
    features = ['day_of_week', 'is_weekend', 'precipitation']
    X = df[features]
    y = df['sales_qty']
    
<<<<<<< HEAD
    # 4. 랜덤 포레스트 모델 생성 및 학습 (매 호출 시 최신 데이터로 실시간 학습됨)
=======
    # 4. 랜덤 포레스트 모델 생성 및 학습
>>>>>>> 8f972fef14f5be128d5f061e2c61720e43418ef9
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # 5. 내일 데이터 준비 (예측용)
    tomorrow = datetime.now() + timedelta(days=1)
<<<<<<< HEAD
    tomorrow_precip = 0.0  # 기상청 API 연동 전 임시값
=======
    tomorrow_precip = 0.0  # 실제로는 기상청 API에서 가져와야 함
>>>>>>> 8f972fef14f5be128d5f061e2c61720e43418ef9
    
    X_next = pd.DataFrame([[
        tomorrow.weekday(),
        1 if tomorrow.weekday() >= 5 else 0,
        tomorrow_precip
    ]], columns=features)
    
    # 6. 예측 결과 반환
    prediction = model.predict(X_next)
<<<<<<< HEAD
    predicted_sales = prediction[0]
    
    # 🚨 보완점 2: '예상 판매량'이 아닌 '발주 제안량' 계산
    # df의 가장 마지막 행(가장 최신 날짜)의 현재 재고를 가져옴
    current_stock = df['current_stock'].iloc[-1] if 'current_stock' in df.columns else 0
    
    # 돌발 상황 대비 안전재고 (예상 판매량의 20% 추가)
    safety_stock = predicted_sales * 0.2
    
    # 최종 발주 추천량 = 예상 판매량 + 안전재고 - 현재 재고
    order_qty = int(predicted_sales + safety_stock - current_stock)
    
    # 발주량이 마이너스가 되지 않도록 방어 (최소 0개 발주)
    return max(0, order_qty)
=======
    return round(prediction[0])
>>>>>>> 8f972fef14f5be128d5f061e2c61720e43418ef9
