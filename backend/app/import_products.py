import pandas as pd
from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from .models import Base, Product

# 테이블 생성 (이미 있으면 건너뜀)
Base.metadata.create_all(bind=engine)

def import_products():
    db = SessionLocal()
    try:
        # 1. 원본 상품 리스트 CSV 읽기 (파일명을 실제 파일과 확인하세요!)
        file_path = '편의점 상품 데이터 Sheets 내보내기 - 편의점 상품 데이터 Sheets 내보내기.csv'
        df = pd.read_csv(file_path)
        print(f"📦 총 {len(df)}개의 상품 정보를 읽었습니다.")

        for _, row in df.iterrows():
            # 중복 체크: 이미 있는 상품ID면 건너뜀
            exists = db.query(Product).filter(Product.id == str(row['상품ID'])).first()
            if not exists:
                new_product = Product(
                    id=str(row['상품ID']),
                    category=row['카테고리'],
                    name=row['상품명'],
                    price=int(row['단가(원)']) # ⭐️ 단가(원) -> price로 매칭
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