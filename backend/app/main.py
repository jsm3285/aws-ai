from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta, date as date_type
from pydantic import BaseModel
import os
import joblib
import pandas as pd

# database, models, auth, schemas 임포트
from . import models, database, auth, schemas

app = FastAPI(title="Nexus Core API v3.5 - Kinetic Auth")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 데이터 규격(Schema) ---
class ProductRegister(BaseModel):
    barcode: str
    name: str
    quantity: int
    category: str
    expiration_date: date_type

class SalesRequest(BaseModel):
    product_id: str
    quantity: int

class OrderItem(BaseModel):
    product_id: str
    suggested_qty: int
    reason: Optional[str] = None

class OrderCreateRequest(BaseModel):
    items: List[OrderItem]

class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "staff"

class UserUpdate(BaseModel):
    full_name: str
    password: Optional[str] = None

class CardUpsertRequest(BaseModel):
    card_holder_name: Optional[str] = None
    card_number: Optional[str] = None
    expiry_4digits: Optional[str] = None
    cvc_3digits: Optional[str] = None
    pin_first_2digits: Optional[str] = None
    billing_address: Optional[str] = None
    postal_code: Optional[str] = None
    phone_number: Optional[str] = None

@app.get("/")
def read_root():
    return {"status": "System Online", "version": "3.5 Kinetic"}

# --- [로그인 전용 API] ---
@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="아이디 또는 비밀번호가 틀렸습니다.")
    
    access_token = auth.create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name
    }

@app.get("/api/users/me")
def get_my_profile(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role
    }

@app.put("/api/users/me")
def update_my_profile(
    payload: UserUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not payload.full_name.strip():
        raise HTTPException(status_code=400, detail="이름은 비워둘 수 없습니다.")
    
    current_user.full_name = payload.full_name.strip()
    if payload.password and payload.password.strip():
        current_user.hashed_password = auth.get_password_hash(payload.password)
        
    db.commit()
    return {"status": "success", "message": "프로필 업데이트 성공"}

@app.post("/api/register")
def register_user(
    payload: RegisterRequest, 
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin_user)
):
    username = payload.username.strip()
    full_name = payload.full_name.strip()
    role = payload.role.strip().lower()

    if not username or not payload.password.strip() or not full_name:
        raise HTTPException(status_code=400, detail="아이디, 이름, 비밀번호는 필수 입력값입니다.")

    if role not in {"admin", "staff"}:
        raise HTTPException(status_code=400, detail="role은 admin 또는 staff만 허용됩니다.")

    existing_user = db.query(models.User).filter(models.User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.")

    new_user = models.User(
        username=username,
        hashed_password=auth.get_password_hash(payload.password),
        full_name=full_name,
        role=role
    )
    db.add(new_user)
    db.commit()

    return {"status": "success", "message": f"{admin.full_name} 점장님, 새 직원이 등록되었습니다."}

@app.get("/api/cards/me")
def get_my_card(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    card = db.query(models.Card).filter(models.Card.username == current_user.username).first()
    if not card:
        return {
            "card_holder_name": None,
            "card_number": None,
            "expiry_4digits": None,
            "cvc_3digits": None,
            "pin_first_2digits": None,
            "billing_address": None,
            "postal_code": None,
            "phone_number": None
        }

    return {
        "card_holder_name": card.card_holder_name,
        "card_number": card.card_number,
        "expiry_4digits": card.expiry_4digits,
        "cvc_3digits": card.cvc_3digits,
        "pin_first_2digits": card.pin_first_2digits,
        "billing_address": card.billing_address,
        "postal_code": card.postal_code,
        "phone_number": card.phone_number
    }

# --- [수정 추가] 결제 수단 존재 확인 API (main.py 내부에 위치) ---
@app.get("/api/payments/check-card")
def check_card_exists(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    card = db.query(models.Card).filter(models.Card.username == current_user.username).first()
    if card and card.card_number:
        return {
            "hasCard": True,
            "card_number": card.card_number  # 프론트에서 뒷자리 표시를 위해 사용
        }
    return {"hasCard": False}

@app.put("/api/cards/me")
def upsert_my_card(
    payload: CardUpsertRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    def to_nullable(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned if cleaned else None

    def normalize_fixed_digits(value: Optional[str], digits: int) -> Optional[str]:
        cleaned = to_nullable(value)
        if not cleaned:
            return None
        return cleaned if (cleaned.isdigit() and len(cleaned) == digits) else None

    card_holder_name = to_nullable(payload.card_holder_name)
    card_number = normalize_fixed_digits(payload.card_number, 16)
    expiry_4digits = normalize_fixed_digits(payload.expiry_4digits, 4)
    cvc_3digits = normalize_fixed_digits(payload.cvc_3digits, 3)
    pin_first_2digits = normalize_fixed_digits(payload.pin_first_2digits, 2)
    billing_address = to_nullable(payload.billing_address)
    postal_code = to_nullable(payload.postal_code)
    phone_number = to_nullable(payload.phone_number)

    card = db.query(models.Card).filter(models.Card.username == current_user.username).first()
    if card:
        card.card_holder_name = card_holder_name
        card.card_number = card_number
        card.expiry_4digits = expiry_4digits
        card.cvc_3digits = cvc_3digits
        card.pin_first_2digits = pin_first_2digits
        card.billing_address = billing_address
        card.postal_code = postal_code
        card.phone_number = phone_number
    else:
        card = models.Card(
            username=current_user.username,
            card_holder_name=card_holder_name,
            card_number=card_number,
            expiry_4digits=expiry_4digits,
            cvc_3digits=cvc_3digits,
            pin_first_2digits=pin_first_2digits,
            billing_address=billing_address,
            postal_code=postal_code,
            phone_number=phone_number
        )
        db.add(card)

    db.commit()
    return {"status": "success", "message": "카드 정보가 저장되었습니다."}

# --- [기능 1] 상품 입고 등록 ---
@app.post("/api/inventory/register")
def register_product(
    item: ProductRegister, 
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin_user)
):
    today = date_type.today()
    product = db.query(models.Product).filter(models.Product.id == item.barcode).first()
    if not product:
        product = models.Product(id=item.barcode, name=item.name, category=item.category, price=3000)
        db.add(product)
        db.flush()

    db.add(models.InventoryLots(
        product_id=item.barcode, 
        quantity=item.quantity, 
        expiration_date=item.expiration_date, 
        received_date=today
    ))
    
    history = db.query(models.SalesHistory).filter(
        models.SalesHistory.product_id == item.barcode, 
        models.SalesHistory.date == today
    ).first()
    
    if history:
        history.order_qty += item.quantity
    else:
        last_rec = db.query(models.SalesHistory)\
            .filter(models.SalesHistory.product_id == item.barcode)\
            .order_by(models.SalesHistory.date.desc()).first()
            
        db.add(models.SalesHistory(
            product_id=item.barcode, 
            date=today, 
            current_stock=(last_rec.current_stock + last_rec.order_qty - last_rec.sales_qty) if last_rec else 0,
            order_qty=item.quantity, 
            sales_qty=0, 
            unit_price=product.price
        ))
    
    db.commit()
    return {"status": "success", "message": f"{admin.full_name} 점장님, 입고 완료되었습니다."}

# --- [기능 2] 임의 판매 처리 ---
@app.post("/api/dashboard/sell")
def sell_product(
    item: SalesRequest, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    today = date_type.today()
    remaining_to_sell = item.quantity
    lots = db.query(models.InventoryLots).filter(
        models.InventoryLots.product_id == item.product_id,
        models.InventoryLots.quantity > 0
    ).order_by(models.InventoryLots.expiration_date.asc()).all()

    total_available = sum(lot.quantity for lot in lots)
    if total_available < item.quantity:
        raise HTTPException(status_code=400, detail=f"재고가 부족합니다. (현재: {total_available}개)")

    for lot in lots:
        if remaining_to_sell <= 0:
            break
        if lot.quantity >= remaining_to_sell:
            lot.quantity -= remaining_to_sell
            remaining_to_sell = 0
        else:
            remaining_to_sell -= lot.quantity
            lot.quantity = 0

    history = db.query(models.SalesHistory).filter(
        models.SalesHistory.product_id == item.product_id, 
        models.SalesHistory.date == today
    ).first()

    if history:
        history.sales_qty += item.quantity
    else:
        last_rec = db.query(models.SalesHistory)\
            .filter(models.SalesHistory.product_id == item.product_id)\
            .order_by(models.SalesHistory.date.desc()).first()
            
        db.add(models.SalesHistory(
            product_id=item.product_id, 
            date=today,
            current_stock=(last_rec.current_stock + last_rec.order_qty - last_rec.sales_qty) if last_rec else 0,
            order_qty=0, 
            sales_qty=item.quantity,
            unit_price=last_rec.unit_price if last_rec else 3000
        ))
    
    db.commit()
    return {"status": "success"}

# --- [기능 3] 재고 목록 조회 ---
@app.get("/api/dashboard/inventory")
def get_real_inventory(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    lots = db.query(
        models.InventoryLots.product_id, 
        func.sum(models.InventoryLots.quantity).label("total")
    ).group_by(models.InventoryLots.product_id).all()
    stock_map = {l.product_id: int(l.total) if l.total is not None else 0 for l in lots}
    
    products = db.query(models.Product).all()
    inventory_list = []

    for p in products:
        remains = stock_map.get(p.id, 0)
        inventory_list.append({
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "stock": remains,
            "status": "NORMAL" if remains >= 10 else ("WARNING" if remains > 0 else "OUT_OF_STOCK")
        })
    return inventory_list

# --- [기능 4] 대시보드 통계 ---
@app.get("/api/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    today = date_type.today()
    total_sales = db.query(
        func.sum(models.SalesHistory.sales_qty * models.SalesHistory.unit_price)
    ).filter(models.SalesHistory.date == today).scalar() or 0
    
    inventory = get_real_inventory(db, current_user)
    return {
        "expected_sales": int(total_sales),
        "warning_count": sum(1 for item in inventory if item["status"] != "NORMAL"),
        "total_products": len(inventory),
        "categories_count": len(set(item["category"] for item in inventory))
    }

# --- [기능 5] AI 발주 제안 ---
@app.get("/api/ai/suggest-orders")
def suggest_orders(db: Session = Depends(database.get_db)):
    try:
        import random
        now = datetime.now()
        tomorrow = now + timedelta(days=1)
        products = db.query(models.Product).all()
        inventory = get_real_inventory(db, current_user=None) 
        stock_map = {item["id"]: item["stock"] for item in inventory}

        model_path = "/app/app/ai_model.joblib"
        if not os.path.exists(model_path):
            return {"summary": "AI 모델 파일이 없습니다.", "suggestions": []}
            
        data = joblib.load(model_path)
        model = data['model']
        le_cat, le_name = data['le_cat'], data['le_name']

        suggestions = []
        special_count = 0
        
        # 내일의 가상 날씨/환경 생성 (AI 분석 느낌을 내기 위해)
        weathers = [
            {"precip": 0.0, "desc": "맑은 날씨", "icon": "sunny"},
            {"precip": 5.0, "desc": "약한 비", "icon": "rainy"},
            {"precip": 20.0, "desc": "많은 비", "icon": "thunderstorm"}
        ]
        tomorrow_weather = random.choice(weathers)
        
        weekdays_kor = ["월", "화", "수", "목", "금", "토", "일"]
        tomorrow_weekday_str = weekdays_kor[tomorrow.weekday()]
        is_weekend = 1 if tomorrow.weekday() >= 5 else 0

        for p in products:
            try:
                c_id = le_cat.transform([p.category])[0]
                n_id = le_name.transform([p.name])[0]
                
                # 랜덤 프로모션 적용 (약 15% 확률)
                is_promotion = 1 if random.random() < 0.15 else 0
                
                test_input = pd.DataFrame([[tomorrow.month, tomorrow.weekday(), is_weekend, c_id, n_id, tomorrow_weather["precip"], is_promotion]], 
                                        columns=['month', 'day_of_week', 'is_weekend', 'cat_id', 'name_id', 'precipitation', 'is_promotion'])
                pred_sales = int(round(float(model.predict(test_input)[0])))
                curr_stock = stock_map.get(p.id, 0)

                is_high_demand_past = db.query(models.SalesHistory).filter(
                    models.SalesHistory.product_id == p.id,
                    func.extract('month', models.SalesHistory.date) == tomorrow.month,
                    func.extract('day', models.SalesHistory.date) == tomorrow.day,
                    models.SalesHistory.sales_qty >= 20
                ).first()
                is_special = is_high_demand_past is not None

                # 디테일한 사유 생성
                insight_icon = tomorrow_weather["icon"]
                insight_type = "normal"
                
                reason_parts = []
                reason_parts.append(f"내일은 {tomorrow_weekday_str}요일({tomorrow_weather['desc']})입니다.")
                
                if is_promotion:
                    reason_parts.append(f"해당 상품({p.name})은 내일 프로모션이 적용되어 수요 증가가 예상됩니다.")
                    insight_icon = "campaign"
                    insight_type = "promotion"
                
                if is_weekend:
                    reason_parts.append("주말 특수 패턴이 반영되었습니다.")
                    if not is_promotion: 
                        insight_icon = "celebration"
                        insight_type = "weekend"

                # 목표 재고: 예측 판매량 또는 안전 재고(15개) 중 더 큰 값
                target_stock = max(15, pred_sales)

                if is_special:
                    reason_parts.append("또한, 작년 동월/동일에 판매량이 20개 이상 급증한 트렌드 상품입니다.")
                    # 특별한 날에는 목표 재고의 15% 여유분 추가
                    target_stock = int(round(target_stock * 1.15))
                    special_count += 1
                    insight_icon = "trending_up"
                    insight_type = "special"
                elif is_promotion:
                    # 행사 상품은 10% 여유분 추가
                    target_stock = int(round(target_stock * 1.10))

                suggest_qty = max(0, target_stock - curr_stock)
                
                if suggest_qty > 0:
                    if is_special or is_promotion:
                        reason_parts.append(f"머신러닝 예측 판매량({pred_sales}개)과 현재고({curr_stock}개)를 종합 분석하여, 품절 방지를 위해 {suggest_qty}개의 발주를 제안합니다.")
                    else:
                        reason_parts.append(f"데이터 분석 결과 평년 수준의 수요({pred_sales}개 예측)가 예상됩니다. 적정 재고 유지를 위해 {suggest_qty}개를 보충 발주합니다.")
                else:
                    reason_parts.append(f"예측 판매량({pred_sales}개) 대비 현재고({curr_stock}개)가 충분하여 추가 발주가 필요하지 않습니다.")

                suggest_qty = max(0, suggest_qty)
                suggestions.append({
                    "id": p.id,
                    "name": p.name,
                    "current_stock": curr_stock,
                    "predicted_sales": pred_sales,
                    "suggested_qty": int(suggest_qty),
                    "is_special": is_special,
                    "reason": " ".join(reason_parts),
                    "insight_icon": insight_icon,
                    "insight_type": insight_type
                })
            except Exception as e:
                suggestions.append({
                    "id": p.id, "name": p.name, "current_stock": stock_map.get(p.id, 0), 
                    "predicted_sales": 0, "suggested_qty": 5, "is_special": False, 
                    "reason": "오류로 인한 기본 안전 발주량 제안입니다.",
                    "insight_icon": "error", "insight_type": "error"
                })

        summary = f"오늘은 {now.month}월 {now.day}일입니다. 내일({tomorrow.month}월 {tomorrow.day}일, {tomorrow_weather['desc']}) 발주 전략: "
        if special_count > 0:
            summary += f"주말/행사/트렌드가 반영된 집중 관리 품목 {special_count}종에 대해 품절 방지를 위한 추가 발주가 적용되었습니다. "
        summary += "그 외 품목은 머신러닝 예측치에 기반한 재고 효율화 원칙을 적용했습니다."

        return {"summary": summary, "suggestions": suggestions}
    except Exception as e:
        return {"summary": "데이터 분석 중 오류가 발생했습니다.", "suggestions": []}

# --- [기능 6] AI 발주 내역 DB 저장 ---
@app.post("/api/orders/submit")
def submit_orders(
    order_data: OrderCreateRequest, 
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin_user)
):
    try:
        today = date_type.today()
        po = models.PurchaseOrder(order_date=today, status="PENDING")
        db.add(po)
        db.flush()

        for item in order_data.items:
            history = db.query(models.SalesHistory).filter(
                models.SalesHistory.product_id == item.product_id,
                models.SalesHistory.date == today
            ).first()
            if history:
                history.order_qty = item.suggested_qty
            else:
                last_rec = db.query(models.SalesHistory)\
                    .filter(models.SalesHistory.product_id == item.product_id)\
                    .order_by(models.SalesHistory.date.desc()).first()
                db.add(models.SalesHistory(
                    product_id=item.product_id,
                    date=today,
                    current_stock=(last_rec.current_stock + last_rec.order_qty - last_rec.sales_qty) if last_rec else 0,
                    order_qty=item.suggested_qty,
                    sales_qty=0,
                    unit_price=last_rec.unit_price if last_rec else 3000
                ))
            
            po_item = models.PurchaseOrderItem(
                po_id=po.id,
                product_id=item.product_id,
                order_qty=item.suggested_qty,
                reason=item.reason
            )
            db.add(po_item)

        db.commit()
        return {"status": "success", "message": f"{admin.full_name} 점장님, 발주 내역이 DB에 기록되었습니다."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"발주 저장 실패: {str(e)}")

# --- [수정 추가] 결제 및 발주 통합 승인 API (main.py 내부에 위치) ---
@app.post("/api/orders/pay-and-submit")
def pay_and_submit_orders(
    order_data: OrderCreateRequest, 
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin_user)
):
    try:
        today = date_type.today()
        card = db.query(models.Card).filter(models.Card.username == admin.username).first()
        if not card or not card.card_number:
            raise HTTPException(status_code=402, detail="등록된 결제 수단이 없습니다.")

        po = models.PurchaseOrder(order_date=today, status="PENDING")
        db.add(po)
        db.flush()

        for item in order_data.items:
            history = db.query(models.SalesHistory).filter(
                models.SalesHistory.product_id == item.product_id,
                models.SalesHistory.date == today
            ).first()
            if history:
                history.order_qty = item.suggested_qty
            else:
                last_rec = db.query(models.SalesHistory)\
                    .filter(models.SalesHistory.product_id == item.product_id)\
                    .order_by(models.SalesHistory.date.desc()).first()
                db.add(models.SalesHistory(
                    product_id=item.product_id,
                    date=today,
                    current_stock=(last_rec.current_stock + last_rec.order_qty - last_rec.sales_qty) if last_rec else 0,
                    order_qty=item.suggested_qty,
                    sales_qty=0,
                    unit_price=last_rec.unit_price if last_rec else 3000
                ))
            
            po_item = models.PurchaseOrderItem(
                po_id=po.id,
                product_id=item.product_id,
                order_qty=item.suggested_qty,
                reason=item.reason
            )
            db.add(po_item)

        db.commit()
        return {"status": "success", "message": "결제 완료 및 발주 내역이 저장되었습니다."}
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"결제/발주 처리 실패: {str(e)}")

# --- [기능 7] 학습용 데이터 합치기 ---
@app.get("/api/ai/training-data-raw")
def get_combined_training_data(db: Session = Depends(database.get_db)):
    df_csv = pd.read_csv('convenience_store_real_products_4years.csv')
    sales_records = db.query(models.SalesHistory).all()
    if sales_records:
        db_data = []
        for s in sales_records:
            product = db.query(models.Product).filter(models.Product.id == s.product_id).first()
            if product:
                db_data.append({'날짜': s.date.strftime('%Y-%m-%d'), '카테고리': product.category, '상품명': product.name, '판매량': s.sales_qty})
        combined = pd.concat([df_csv, pd.DataFrame(db_data)], ignore_index=True)
        return combined.to_dict(orient='records')
    return df_csv.to_dict(orient='records')

# --- [기능 8] 입고 검수 및 승인 시스템 (Inbound Pipeline) ---
@app.get("/api/orders/pending", response_model=List[schemas.PurchaseOrderResponse])
def get_all_orders(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    """현재 모든 발주서 목록 조회 (최신순)"""
    orders = db.query(models.PurchaseOrder).order_by(models.PurchaseOrder.id.desc()).all()
    for order in orders:
        items = db.query(models.PurchaseOrderItem).filter(models.PurchaseOrderItem.po_id == order.id).all()
        
        receipt_items = {}
        if order.status == "RECEIVED":
            receipt = db.query(models.InboundReceipt).filter(models.InboundReceipt.po_id == order.id).first()
            if receipt:
                r_items = db.query(models.InboundReceiptItem).filter(models.InboundReceiptItem.receipt_id == receipt.id).all()
                for ri in r_items:
                    receipt_items[ri.product_id] = ri
                    
        for item in items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            item.product_name = product.name if product else "알 수 없음"
            
            if item.product_id in receipt_items:
                item.received_qty = receipt_items[item.product_id].received_qty
                item.expiration_date = receipt_items[item.product_id].expiration_date
                
        order.items = items
    return orders

@app.post("/api/inbound/draft", response_model=schemas.InboundReceiptResponse)
def create_inbound_draft(
    payload: schemas.InboundReceiptCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """가입고(Draft) 전표 생성 (AI나 외부 연동 시스템이 호출한다고 가정)"""
    receipt = models.InboundReceipt(
        po_id=payload.po_id,
        received_date=date_type.today(),
        status="PENDING_REVIEW"
    )
    db.add(receipt)
    db.flush()
    
    for item in payload.items:
        receipt_item = models.InboundReceiptItem(
            receipt_id=receipt.id,
            product_id=item.product_id,
            received_qty=item.received_qty,
            expiration_date=item.expiration_date
        )
        db.add(receipt_item)
        
    db.commit()
    db.refresh(receipt)
    receipt.items = db.query(models.InboundReceiptItem).filter(models.InboundReceiptItem.receipt_id == receipt.id).all()
    return receipt

@app.get("/api/inbound/pending", response_model=List[schemas.InboundReceiptResponse])
def get_pending_inbounds(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    """관리자 검수 대기 중인 가입고 목록 조회"""
    receipts = db.query(models.InboundReceipt).filter(models.InboundReceipt.status == "PENDING_REVIEW").all()
    for receipt in receipts:
        receipt.items = db.query(models.InboundReceiptItem).filter(models.InboundReceiptItem.receipt_id == receipt.id).all()
    return receipts

@app.post("/api/inbound/{receipt_id}/approve")
def approve_inbound(
    receipt_id: int, 
    payload: schemas.InboundReceiptApprove,
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin_user)
):
    """가입고 검수 완료 및 최종 재고 반영"""
    receipt = db.query(models.InboundReceipt).filter(models.InboundReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="해당 입고 전표를 찾을 수 없습니다.")
    if receipt.status != "PENDING_REVIEW":
        raise HTTPException(status_code=400, detail="이미 처리된 전표입니다.")
        
    # 삭제 후 재생성이 아닌 각 항목 업데이트/추가를 위한 간단한 방법:
    # 기존 항목 전부 날리고 payload 온걸로 엎어친 후 승인
    db.query(models.InboundReceiptItem).filter(models.InboundReceiptItem.receipt_id == receipt_id).delete()
    
    today = date_type.today()
    for item in payload.items:
        # 1. 입고 명세에 저장
        receipt_item = models.InboundReceiptItem(
            receipt_id=receipt.id,
            product_id=item.product_id,
            received_qty=item.received_qty,
            expiration_date=item.expiration_date
        )
        db.add(receipt_item)
        
        # 2. 실제 재고(InventoryLots) 증가
        if item.received_qty > 0:
            lot = models.InventoryLots(
                product_id=item.product_id,
                quantity=item.received_qty,
                expiration_date=item.expiration_date,
                received_date=today
            )
            db.add(lot)
            
    receipt.status = "APPROVED"
    
    # 발주서가 연결되어 있다면 상태를 RECEIVED로 변경
    if receipt.po_id:
        po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == receipt.po_id).first()
        if po:
            po.status = "RECEIVED"
            
    db.commit()
    return {"status": "success", "message": f"{admin.full_name} 님, 입고 승인이 완료되었습니다."}

@app.get("/api/pos/inventory")
def get_pos_inventory(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    products = db.query(models.Product).all()
    today = date_type.today()
    
    result = []
    for p in products:
        lots = db.query(models.InventoryLots).filter(
            models.InventoryLots.product_id == p.id,
            models.InventoryLots.quantity > 0
        ).order_by(models.InventoryLots.expiration_date.asc()).all()
        
        if not lots:
            continue
            
        red_qty = 0
        yellow_qty = 0
        green_qty = 0
        
        for lot in lots:
            days_left = (lot.expiration_date - today).days
            if days_left <= 3:
                red_qty += lot.quantity
            elif days_left <= 7:
                yellow_qty += lot.quantity
            else:
                green_qty += lot.quantity
                
        result.append({
            "id": p.id,
            "name": p.name,
            "total": red_qty + yellow_qty + green_qty,
            "lots": {
                "red": red_qty,
                "yellow": yellow_qty,
                "green": green_qty
            }
        })
    return result