import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime, date
from .database import SessionLocal, engine
from .models import Base, Product, SalesHistory, InventoryLots, User
from passlib.context import CryptContext

# 비밀번호 암호화 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def import_csv_to_db():
    # ⭐️ [가장 중요] 함수가 시작되자마자 테이블을 싹 지우고 새로 만듭니다.
    # 이렇게 해야 models.py의 최신 구조(username 등)가 DB에 강제 반영됩니다.
    print("🧹 기존 테이블 삭제 및 최신 구조로 재생성 중...")
    Base.metadata.drop_all(bind=engine)   # 1. 꼬여있는 옛날 테이블들 싹 삭제
    Base.metadata.create_all(bind=engine) # 2. 최신 models.py 기준으로 다시 생성
    
    db = SessionLocal()
    try:
        # --- [1] 사용자 계정 생성 ---
        print("👤 초기 사용자 계정을 생성 중...")
        
        # 테이블을 새로 만들었으므로 중복 체크(if) 없이 바로 넣습니다.
        admin_user = User(
            username="admin",
            hashed_password=pwd_context.hash("1234"),
            full_name="점장",
            role="admin"
        )
        db.add(admin_user)
        print("✅ 점장 계정 생성 완료 (ID: admin / PW: 1234)")

        staff_user = User(
            username="staff",
            hashed_password=pwd_context.hash("1234"),
            full_name="이알바 스탭",
            role="staff"
        )
        db.add(staff_user)
        print("✅ 알바생 계정 생성 완료 (ID: staff / PW: 1234)")
        
        db.commit()

        # --- [2] CSV 데이터 로드 ---
<<<<<<< HEAD
        file_name = 'convenience_store_real_products_365days.csv'
=======
        file_name = 'convenience_store_real_products_4years.csv'
>>>>>>> ca88073 (feat: AI 발주 제안 페이지 데이터 연동 및 현재고/분석사유 추가)
        df = pd.read_csv(file_name)
        print(f"📊 총 {len(df)}행의 데이터를 읽어왔습니다.")

        # --- [3] 상품 마스터(Product) 등록 ---
        print("📦 상품 마스터 정보를 등록 중...")
        unique_products = df[['상품ID', '카테고리', '상품명', '단가']].drop_duplicates()
        for _, row in unique_products.iterrows():
            product = Product(
                id=row['상품ID'],
                category=row['카테고리'],
                name=row['상품명'],
                price=row['단가']
            )
            db.add(product)
        db.commit()

        # --- [4] 판매 이력(SalesHistory) 등록 ---
        print("📈 판매 및 발주 이력을 등록 중...")
        history_list = []
        for _, row in df.iterrows():
            history = SalesHistory(
                date=datetime.strptime(row['날짜'], '%Y-%m-%d').date(),
                product_id=row['상품ID'],
                category=row['카테고리'],
                product_name=row['상품명'],
                unit_price=row['단가'],
                current_stock=row['현재재고'],
                sales_qty=row['판매량'],
                order_qty=row['발주량'],
                earliest_expiration=datetime.strptime(row['유통기한'], '%Y-%m-%d').date() if pd.notna(row['유통기한']) else None
            )
            history_list.append(history)
            
            if len(history_list) >= 1000:
                db.bulk_save_objects(history_list)
                db.commit()
                history_list = []
        
        if history_list:
            db.bulk_save_objects(history_list)
            db.commit()

        # --- [5] 실시간 재고(InventoryLots) 설정 ---
        print("🔋 실시간 재고 데이터를 설정 중...")
        last_date = df['날짜'].max()
        last_day_df = df[df['날짜'] == last_date]
        
        for _, row in last_day_df.iterrows():
            if row['현재재고'] > 0:
                lot = InventoryLots(
                    product_id=row['상품ID'],
                    quantity=row['현재재고'],
                    expiration_date=datetime.strptime(row['유통기한'], '%Y-%m-%d').date() if pd.notna(row['유통기한']) else None,
                    received_date=date.today()
                )
                db.add(lot)
        
        db.commit()
        print("✨ 모든 데이터와 계정 세팅이 완료되었습니다!")

    except Exception as e:
        db.rollback()
        print(f"❌ 오류 발생: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import_csv_to_db()