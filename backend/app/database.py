from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. mysql-db: docker ps에서 확인된 컨테이너 이름
# 2. root / root_password: docker-compose.yml에 설정된 계정 정보
# 3. my_database: docker-compose.yml에 설정된 DB 이름
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:root_password@mysql-db:3306/my_database"

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