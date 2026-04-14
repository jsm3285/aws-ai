from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base
import datetime


# 1. 사용자 정보 (인증 및 권한 관리용)
class User(Base):
    __tablename__ = "users"
    username = Column(String(50), primary_key=True, index=True) # 아이디 (중복 불가)
    hashed_password = Column(String(255), nullable=False)       # 암호화된 비밀번호
    full_name = Column(String(100))                             # 실제 이름
    role = Column(String(20), default="staff")                  # 권한: "admin"(점장) 또는 "staff"(알바)
    
    
# 1. 상품 정보 (기존 유지)
class Product(Base):
    __tablename__ = "products"
    id = Column(String(20), primary_key=True, index=True)
    category = Column(String(50), index=True)
    name = Column(String(100))
    price = Column(Integer)

# 2. 재고 배치 (유통기한/선입선출용) 
# ⭐️ main.py와 맞추기 위해 이름을 InventoryLots로 수정했습니다.
class InventoryLots(Base):
    __tablename__ = "inventory_lots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(20), ForeignKey("products.id"))
    quantity = Column(Integer)
    expiration_date = Column(Date) 
    # ⭐️ main.py에서 사용하는 received_date 컬럼을 추가했습니다.
    received_date = Column(Date, default=datetime.date.today)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# 3. 판매 및 발주 이력 (AI 학습용 고도화)
class SalesHistory(Base):
    __tablename__ = "sales_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, index=True)
    product_id = Column(String(20), ForeignKey("products.id"))
    
    # 추가 데이터 컬럼
    category = Column(String(50))
    product_name = Column(String(100))
    unit_price = Column(Integer)
    
    # 핵심 지표
    current_stock = Column(Integer, default=0)  # 당일 판매 전 재고
    sales_qty = Column(Integer, default=0)      # 실제 판매량
    order_qty = Column(Integer, default=0)      # AI 제안 발주량
    
    # 외부 변수 및 유통기한
    precipitation = Column(Float, default=0.0)       # 강수량
    event_name = Column(String(50), nullable=True)   # 기념일
    earliest_expiration = Column(Date, nullable=True) # 가장 빠른 유통기한


