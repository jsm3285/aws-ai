import pandas as pd
from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from .models import Base, Product

print("🧹 기존 테이블 삭제 및 최신 구조로 재생성 중 (DB 밀기)...")
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def import_products():
    db = SessionLocal()
    try:
        # 1. 원본 상품 리스트 CSV 읽기
        file_path = '편의점 상품 데이터 Sheets 내보내기 - 편의점 상품 데이터 Sheets 내보내기.csv'
        df = pd.read_csv(file_path)
        print(f"📦 총 {len(df)}개의 상품 정보를 읽었습니다.")

        for _, row in df.iterrows():
            exists = db.query(Product).filter(Product.id == str(row['상품ID'])).first()
            if not exists:
                new_product = Product(
                    id=str(row['상품ID']),
                    category=row['카테고리'],
                    name=row['상품명'],
                    price=int(row['단가(원)'])
                )
                db.add(new_product)
        
        db.commit()
        print("✅ 상품 마스터 데이터(Product) 100여 개 등록 완료!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 오류 발생: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import_products()