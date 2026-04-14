from pydantic import BaseModel
from datetime import date
from typing import Optional

class ProductBase(BaseModel):
    id: str
    category: str
    name: str
    price: int

class Product(ProductBase):
    class Config:
        from_attributes = True

# main.py에서 response_model=List[schemas.Inventory]로 호출하므로
# 이름을 Inventory로 정의해줍니다.
class Inventory(BaseModel):
    id: str
    category: str
    name: str
    price: int
    # 현재 재고 요약 등에 필요한 필드가 있다면 추가 가능
    
    class Config:
        from_attributes = True

class SalesHistoryBase(BaseModel):
    date: date
    product_id: str
    category: str
    product_name: str
    unit_price: int
    current_stock: int
    sales_qty: int
    order_qty: int
    earliest_expiration: Optional[date] = None

class SalesHistory(SalesHistoryBase):
    id: int
    class Config:
        from_attributes = True