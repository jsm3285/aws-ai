import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime, date
from .database import SessionLocal, engine
from .models import Base, Product, SalesHistory, InventoryLots, User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def import_csv_to_db():
    print("🏃‍♂️판매 히스토리 데이터를 4년치 CSV에서 읽어 기존 DB 구조에 주입합니다...")
    
    db = SessionLocal()
    try:
        print("👤 초기 사용자 계정을 생성 중...")
        admin_user = User(username="admin", hashed_password=pwd_context.hash("1234"), full_name="점장", role="admin")
        db.add(admin_user)
        staff_user = User(username="staff", hashed_password=pwd_context.hash("1234"), full_name="이알바 스탭", role="staff")
        db.add(staff_user)
        db.commit()
        print("✅ 초기 계정 생성 완료")

        file_name = 'convenience_store_real_products_4years.csv'
        df = pd.read_csv(file_name)
        print(f"📊 총 {len(df)}행의 4년치 판매 데이터를 읽어왔습니다.")

        # 상품 등록(Product) 과정은 import_products.py가 이미 수행했으므로 삭제.

        print("📈 판매 및 발주 이력을 4년치 분량 등록 중...")
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

        print("🔋 실시간 재고(최종일자 기준) 데이터를 설정 중...")
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
        print("✨ 4년치 이력 데이터 주입이 완료되었습니다!")

    except Exception as e:
        db.rollback()
        print(f"❌ 오류 발생: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import_csv_to_db()