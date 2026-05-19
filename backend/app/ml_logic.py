import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, timedelta

def predict_sales_with_rf(history_data):
    # 1. 데이터프레임 생성
    df = pd.DataFrame(history_data)
    
    # 2. 날짜 피처 엔지니어링 (AI가 이해할 수 있는 숫자로 변환)
    df['date'] = pd.to_datetime(df['date'])
    df['day_of_week'] = df['date'].dt.dayofweek  # 0:월, 6:일
    df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
    
    # 강수량 데이터가 없을 경우를 대비해 0.0으로 초기화
    if 'precipitation' not in df.columns:
        df['precipitation'] = 0.0

    # 3. 학습할 특성(X)과 타겟(y) 분리
    # 현재는 요일, 주말 여부, 강수량(precipitation)을 학습시킨다고 가정
    features = ['day_of_week', 'is_weekend', 'precipitation']
    X = df[features]
    y = df['sales_qty']
    
    # 4. 랜덤 포레스트 모델 생성 및 학습
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # 5. 내일 데이터 준비 (예측용)
    tomorrow = datetime.now() + timedelta(days=1)
    tomorrow_precip = 0.0  # 실제로는 기상청 API에서 가져와야 함
    
    X_next = pd.DataFrame([[
        tomorrow.weekday(),
        1 if tomorrow.weekday() >= 5 else 0,
        tomorrow_precip
    ]], columns=features)
    
    # 6. 예측 결과 반환
    prediction = model.predict(X_next)
    return round(prediction[0])
