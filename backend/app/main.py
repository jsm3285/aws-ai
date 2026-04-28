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

# database, models, auth 임포트
from . import models, database, auth

app = FastAPI(title="Nexus Core API v3.5 - Kinetic Auth")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서버 시작 시 DB 테이블 생성
models.Base.metadata.create_all(bind=database.engine)

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

# 발주 저장을 위한 새로운 스키마
class OrderItem(BaseModel):
    product_id: str
    suggested_qty: int

class OrderCreateRequest(BaseModel):
    items: List[OrderItem]

class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "staff"

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

@app.post("/api/register")
def register_user(payload: RegisterRequest, db: Session = Depends(database.get_db)):
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

    return {"status": "success", "message": "회원가입이 완료되었습니다."}

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
    
    # 1. 실제 물리 재고(InventoryLots)에서 수량 차감
    remaining_to_sell = item.quantity
    
    # 유통기한이 임박한 순서대로 재고 묶음을 가져옴
    lots = db.query(models.InventoryLots).filter(
        models.InventoryLots.product_id == item.product_id,
        models.InventoryLots.quantity > 0
    ).order_by(models.InventoryLots.expiration_date.asc()).all()

    # 총 재고 확인
    total_available = sum(lot.quantity for lot in lots)
    if total_available < item.quantity:
        raise HTTPException(status_code=400, detail=f"재고가 부족합니다. (현재: {total_available}개)")

    # 유통기한 순으로 수량 차감 실행
    for lot in lots:
        if remaining_to_sell <= 0:
            break
        
        if lot.quantity >= remaining_to_sell:
            lot.quantity -= remaining_to_sell
            remaining_to_sell = 0
        else:
            remaining_to_sell -= lot.quantity
            lot.quantity = 0

    # 2. 판매 이력(SalesHistory) 업데이트 (기존 통계용 로직)
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
    from sqlalchemy import func
    
    # 1. 실제 물리 재고(InventoryLots) 확인합산
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

# --- [기능 5] AI 발주 제안 (페이지 접속 시 자동 호출) ---
@app.get("/api/ai/suggest-orders")
def suggest_orders(db: Session = Depends(database.get_db)):
    try:
        # 1. 날짜 및 기초 데이터 설정
        now = datetime.now()
        tomorrow = now + timedelta(days=1)
        
        # 상품 목록 및 현재고 가져오기
        products = db.query(models.Product).all()
        inventory = get_real_inventory(db, current_user=None) 
        stock_map = {item["id"]: item["stock"] for item in inventory}

        # 2. 작년 데이터(CSV) 로드 - A열 날짜 기준 분석용
        csv_path = '/app/convenience_store_real_products_4years.csv'
        df_csv = pd.read_csv(csv_path)
        # 컬럼명 강제 지정 제거
        # df_csv.columns = ['날짜','코드','카테고리','상품명','가격','재고','입고','판매량','유통기한']
        df_csv['날짜'] = pd.to_datetime(df_csv['날짜'])
        df_csv['판매량'] = pd.to_numeric(df_csv['판매량'], errors='coerce').fillna(0)

        # 3. 학습된 AI 모델 불러오기
        model_path = "/app/app/ai_model.joblib"
        if not os.path.exists(model_path):
            return {"summary": "AI 모델 파일이 없습니다. 먼저 학습을 진행해주세요.", "suggestions": []}
            
        data = joblib.load(model_path)
        model = data['model']
        le_cat, le_name = data['le_cat'], data['le_name']

        suggestions = []
        special_count = 0

        # 4. 상품별 발주량 계산 루프
        for p in products:
            try:
                # [AI 예측] 내일 얼마나 팔릴까?
                c_id = le_cat.transform([p.category])[0]
                n_id = le_name.transform([p.name])[0]
                is_weekend = 1 if tomorrow.weekday() >= 5 else 0
                # 날씨나 행사 여부는 임의값(맑음=0.0, 행사없음=0)으로 우선 설정
                test_input = pd.DataFrame([[tomorrow.month, tomorrow.weekday(), is_weekend, c_id, n_id, 0.0, 0]], 
                                        columns=['month', 'day_of_week', 'is_weekend', 'cat_id', 'name_id', 'precipitation', 'is_promotion'])
                # AI가 예상한 순수 판매량 (예: 5.4개)
                pred_sales = model.predict(test_input)[0] 
                curr_stock = stock_map.get(p.id, 0)

                # [인기 상품 판단] 과거 동일 날짜(월/일)에 20개 이상 팔린 기록이 있는가? (기존 10개는 너무 낮아 100종 전체가 핫트렌드가 됨)
                is_high_demand_past = df_csv[
                    (df_csv['상품명'].str.strip() == p.name.strip()) & 
                    (df_csv['날짜'].dt.month == tomorrow.month) & 
                    (df_csv['날짜'].dt.day == tomorrow.day) & 
                    (df_csv['판매량'] >= 20)
                ]
                is_special = not is_high_demand_past.empty

                # [최종 발주량 계산] 점장님 맞춤 공식
                if is_special:
                    # 🔥 인기 상품: 품절 방지를 위해 부족 수량에 15% 여유분 추가!
                    if pred_sales > curr_stock:
                        shortage = pred_sales - curr_stock
                        suggest_qty = int(round(shortage * 1.15))
                    else:
                        suggest_qty = 0
                    special_count += 1
                else:
                    # ✅ 일반 상품: "발주 후 재고가 15개가 되도록" 맞춤
                    suggest_qty = 15 - curr_stock
                
                # 발주 수량이 마이너스가 되지 않도록 (최소 0개)
                suggest_qty = max(0, suggest_qty)

                suggestions.append({
                    "id": p.id,
                    "name": p.name,
                    "current_stock": curr_stock,
                    "predicted_sales": int(round(float(pred_sales))), # 소수점 없이 정수로만 표시
                    "suggested_qty": int(suggest_qty),      # 발주량은 무조건 깔끔한 정수
                    "is_special": is_special
                })

            except Exception as e:
                # 에러 발생 시 안전하게 5개만 제안
                print(f"🔥 상품 예측 중 예외 발생 ({p.name}): {e}")
                suggestions.append({
                    "id": p.id, "name": p.name, "current_stock": stock_map.get(p.id, 0),
                    "predicted_sales": 0, "suggested_qty": 5, "is_special": False
                })

        # 5. 점장님용 요약 리포트 생성
        summary = f"오늘은 {now.day}일입니다. 내일({tomorrow.day}일) 발주 전략: "
        if special_count > 0:
            summary += f"작년 판매 실적이 우수한 {special_count}종에 대해 품절 방지를 위해 부족 수량의 15% 여유분을 추가 발주합니다. "
        summary += "그 외 품목은 재고 효율을 위해 '발주 후 15개' 유지 원칙을 적용했습니다."

        return {
            "summary": summary,
            "suggestions": suggestions
        }

    except Exception as e:
        print(f"🔥 AI 발주 API 오류: {e}")
        return {"summary": "데이터 분석 중 오류가 발생했습니다.", "suggestions": []}

# --- [기능 6] AI 발주 내역 DB 저장 (발주 신청 버튼 클릭 시) ---
@app.post("/api/orders/submit")
def submit_orders(
    order_data: OrderCreateRequest, 
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin_user)
):
    try:
        today = date_type.today()
        for item in order_data.items:
            # SalesHistory에 발주 예정 수량(order_qty) 업데이트 또는 생성
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
        
        db.commit()
        return {"status": "success", "message": f"{admin.full_name} 점장님, 발주 내역이 DB에 기록되었습니다."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"발주 저장 실패: {str(e)}")

# --- [기능 7] 학습용 데이터 합치기 (CSV + DB) ---
@app.get("/api/ai/training-data-raw")
def get_combined_training_data(db: Session = Depends(database.get_db)):
    # 1. 기존 CSV 로드
    df_csv = pd.read_csv('convenience_store_real_products_4years.csv')
    
    # 2. DB에서 실제 판매 데이터(SalesHistory) 로드
    sales_records = db.query(models.SalesHistory).all()
    if sales_records:
        db_data = []
        for s in sales_records:
            product = db.query(models.Product).filter(models.Product.id == s.product_id).first()
            if product:
                db_data.append({
                    '날짜': s.date.strftime('%Y-%m-%d'),
                    '카테고리': product.category,
                    '상품명': product.name,
                    '판매량': s.sales_qty
                })
        df_db = pd.DataFrame(db_data)
        combined = pd.concat([df_csv, df_db], ignore_index=True)
        return combined.to_dict(orient='records')
    
    return df_csv.to_dict(orient='records')
