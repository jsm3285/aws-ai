from pydantic import BaseModel
from datetime import date
from typing import Optional, List

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

# --- Purchase Order Schemas ---
class PurchaseOrderItemBase(BaseModel):
    product_id: str
    order_qty: int
    reason: Optional[str] = None

class PurchaseOrderCreate(BaseModel):
    items: List[PurchaseOrderItemBase]

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: int
    po_id: int
    product_name: Optional[str] = None
    received_qty: Optional[int] = None
    expiration_date: Optional[date] = None
    class Config:
        from_attributes = True

class PurchaseOrderResponse(BaseModel):
    id: int
    order_date: date
    status: str
    items: List[PurchaseOrderItemResponse] = []
    class Config:
        from_attributes = True

# --- Inbound Receipt Schemas ---
class InboundReceiptItemBase(BaseModel):
    product_id: str
    received_qty: int
    expiration_date: Optional[date] = None

class InboundReceiptCreate(BaseModel):
    po_id: Optional[int] = None
    items: List[InboundReceiptItemBase]

class InboundReceiptItemResponse(InboundReceiptItemBase):
    id: int
    receipt_id: int
    class Config:
        from_attributes = True

class InboundReceiptResponse(BaseModel):
    id: int
    po_id: Optional[int] = None
    received_date: date
    status: str
    items: List[InboundReceiptItemResponse] = []
    class Config:
        from_attributes = True

class InboundReceiptApprove(BaseModel):
    items: List[InboundReceiptItemBase]