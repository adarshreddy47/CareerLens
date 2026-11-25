from sqlalchemy import text
from database import engine, Base
import models

try:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    print("PostgreSQL connected successfully!")

    Base.metadata.create_all(bind=engine)

    print("All CareerLens tables created successfully!")

except Exception as e:
    print("Database connection failed:")
    print(e)