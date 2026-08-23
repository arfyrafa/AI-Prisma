# Migrations

MVP ini membuat skema langsung dari metadata SQLAlchemy (`app/db/init_db.py`)
supaya demo bisa jalan dengan satu perintah `docker compose up`.

Saat skema mulai berubah di lingkungan yang menyimpan data nyata, ganti dengan
Alembic:

```bash
pip install alembic
alembic init migrations
# arahkan sqlalchemy.url ke DATABASE_URL, lalu:
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

Setelah Alembic aktif, hapus pemanggilan `Base.metadata.create_all` di
`app/db/init_db.py` dan jalankan `alembic upgrade head` pada startup container.
