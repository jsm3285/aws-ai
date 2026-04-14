import pandas as pd
import numpy as np
from xgboost import XGBRegressor  # 랜덤 포레스트 대신 XGBoost 임포트
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
import joblib
import os

def train_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    save_path = os.path.join(current_dir, 'ai_model.joblib')
    csv_path = '/app/convenience_store_real_products_4years.csv'

    print("\n🔄 AI 모델 학습을 시작합니다 (XGBoost)...")
    
    if not os.path.exists(csv_path):
        print(f"❌ 오류: {csv_path} 파일이 없습니다.")
        return

    # 1. 데이터 로드
    df = pd.read_csv(csv_path, encoding='utf-8')
    
    # 2. 전처리 (요일/주말 자동 판단)
    df['날짜'] = pd.to_datetime(df['날짜'])
    df['month'] = df['날짜'].dt.month
    df['day_of_week'] = df['날짜'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)

    le_cat, le_name = LabelEncoder(), LabelEncoder()
    df['cat_id'] = le_cat.fit_transform(df['카테고리'])
    df['name_id'] = le_name.fit_transform(df['상품명'])

    # 3. 데이터 분할 (70% 학습 / 30% 테스트)
    features = ['month', 'day_of_week', 'is_weekend', 'cat_id', 'name_id']
    X = df[features]
    y = df['판매량']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

    # 4. XGBoost 모델 생성 및 학습
    # n_estimators: 공부 횟수 (300번)
    # learning_rate: 학습 속도 (0.1)
    # max_depth: 나무의 깊이 (너무 깊으면 과적합되므로 10 정도가 적당합니다)
    model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.1,
        max_depth=10,
        random_state=42,
        objective='reg:squarederror'  # 회귀 문제 설정
    )
    
    model.fit(X_train, y_train)

    # 5. 성능 평가
    y_pred = model.predict(X_test)
    accuracy = r2_score(y_test, y_pred)
    accuracy_percent = accuracy * 100

    # 🎯 요청하신 출력 형식 적용
    print("-" * 45)
    print(f"🎯 AI 모델 검증 정확도: {accuracy_percent:.2f}%")
    print("-" * 45)

    # 6. 저장 여부 결정 (XGBoost로 성능 향상을 기대하며 기준 5% 유지)
    threshold = 5.0
    if accuracy_percent >= threshold:
        model_data = {'model': model, 'le_cat': le_cat, 'le_name': le_name}
        joblib.dump(model_data, save_path)
        print(f"✅ [승인] 정확도가 {threshold}%를 초과하여 모델을 저장했습니다.")
    else:
        print(f"❌ [거절] 정확도가 {threshold}% 미만이어서 저장되지 않았습니다.")
    print("-" * 45 + "\n")

if __name__ == "__main__":
    train_model()