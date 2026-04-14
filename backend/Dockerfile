# 1. 파이썬 3.11 이미지 사용
FROM python:3.11-slim

# 2. 컨테이너 내 작업 디렉토리 설정
WORKDIR /app

# 3. 필요한 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 소스 코드 복사
COPY . .

# 5. FastAPI 실행 (8000 포트)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
