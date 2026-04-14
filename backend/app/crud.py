from sqlalchemy.orm import Session
from . import models, schemas
from datetime import date

# --- 상품(Product) 관련 ---

def get_product(db: Session, product_id: str):
    """특정 상품 정보 조회"""
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    """전체 상품 목록 조회"""
    return db.query(models.Product).offset(skip).limit(limit).all()


# --- 재고(Inventory & Lots) 관련 ---

def get_inventory_summary(db: Session):
    """
    대시보드용 재고 요약 정보 조회
    상품별로 흩어져 있는 inventory_lots의 수량을 합산해서 가져옵니다.
    """
    # 실제 운영 시에는 이 로직을 통해 실시간 합계를 계산하거나 
    # summary 테이블을 따로 만들어 관리할 수 있습니다.
    return db.query(models.Product).all()

def create_inventory_lot(db: Session, lot: schemas.InventoryLotCreate):
    """새로운 재고 배치 추가 (입고 시 사용)"""
    db_lot = models.InventoryLot(**lot.dict())
    db.add(db_lot)
    db.commit()
    db.refresh(db_lot)
    return db_lot


# --- 판매 및 분석(Sales History) 관련 ---

def get_sales_history(db: Session, start_date: date, end_date: date):
    """특정 기간 동안의 판매 기록 조회 (AI 학습 데이터 추출용)"""
    return db.query(models.SalesHistory).filter(
        models.SalesHistory.date >= start_date,
        models.SalesHistory.date <= end_date
    ).all()

def get_daily_stats(db: Session, target_date: date):
    """특정 날짜의 매출 및 발주 통계 조회"""
    results = db.query(models.SalesHistory).filter(models.SalesHistory.date == target_date).all()
    
    total_sales = sum(item.sales_qty * item.unit_price for item in results)
    total_orders = sum(item.order_qty for item in results)
    
    return {
        "date": target_date,
        "total_sales_amount": total_sales,
        "total_order_count": total_orders
    }