from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os

# 1. 환경 변수 DATABASE_URL을 읽어오고, 없으면 로컬 호스트(localhost)로 연결합니다.
#    (도커 안에서는 docker-compose.yml에 설정된 DATABASE_URL 환경 변수가 사용됨)
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "mysql+pymysql://root:root_password@localhost:3306/my_database"
)
# pool_pre_ping=True 옵션을 추가하면 DB 연결이 끊겼을 때 자동으로 재연결을 시도합니다.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()