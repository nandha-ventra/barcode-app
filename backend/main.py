import os
import uuid
from datetime import datetime
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship


load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL missing in .env file")

# SQLAlchemy needs this driver format
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg2://",
        1,
    )

# Railway external Postgres usually works with sslmode=require
if "sslmode=" not in DATABASE_URL:
    separator = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{separator}sslmode=require"


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()


class Distributor(Base):
    __tablename__ = "distributors"

    distributor_id = Column(String, primary_key=True, index=True)
    distributor_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    batches = relationship("QRBatch", back_populates="distributor")


class QRBatch(Base):
    __tablename__ = "qr_batches"

    batch_id = Column(String, primary_key=True, index=True)

    distributor_id = Column(
        String,
        ForeignKey("distributors.distributor_id"),
        nullable=False,
    )

    initial_quantity = Column(Integer, nullable=False)
    current_quantity = Column(Integer, nullable=False)

    status = Column(String, default="GENERATED")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    distributor = relationship("Distributor", back_populates="batches")


class QuantityTransaction(Base):
    __tablename__ = "quantity_transactions"

    transaction_id = Column(String, primary_key=True, index=True)
    batch_id = Column(String, ForeignKey("qr_batches.batch_id"), nullable=False)
    distributor_id = Column(String, ForeignKey("distributors.distributor_id"), nullable=False)

    old_quantity = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)

    transaction_type = Column(String, nullable=False)
    remarks = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


app = FastAPI(title="QR Quantity Tracking API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


class DistributorCreate(BaseModel):
    distributor_name: str = Field(..., min_length=1)


class QRBatchCreate(BaseModel):
    distributor_id: str
    quantity: int = Field(..., gt=0)


class QuantityUpdateRequest(BaseModel):
    new_quantity: int = Field(..., ge=0)
    remarks: Optional[str] = None


@app.on_event("startup")
def seed_default_distributors():
    db = SessionLocal()

    try:
        count = db.query(Distributor).count()

        if count == 0:
            distributors = [
                Distributor(
                    distributor_id="DIST-001",
                    distributor_name="ABC Distributor",
                ),
                Distributor(
                    distributor_id="DIST-002",
                    distributor_name="XYZ Distributor",
                ),
                Distributor(
                    distributor_id="DIST-003",
                    distributor_name="Sample Distributor",
                ),
            ]

            db.add_all(distributors)
            db.commit()

    finally:
        db.close()


@app.get("/")
def home():
    return {
        "message": "QR Quantity Tracking API running"
    }


@app.get("/distributors")
def get_distributors(db: Session = Depends(get_db)):
    distributors = db.query(Distributor).order_by(Distributor.created_at.desc()).all()

    return {
        "data": [
            {
                "distributor_id": item.distributor_id,
                "distributor_name": item.distributor_name,
                "created_at": item.created_at,
            }
            for item in distributors
        ]
    }


@app.post("/distributors")
def create_distributor(
    payload: DistributorCreate,
    db: Session = Depends(get_db),
):
    distributor = Distributor(
        distributor_id=f"DIST-{uuid.uuid4().hex[:8].upper()}",
        distributor_name=payload.distributor_name,
    )

    db.add(distributor)
    db.commit()
    db.refresh(distributor)

    return {
        "message": "Distributor created successfully",
        "data": {
            "distributor_id": distributor.distributor_id,
            "distributor_name": distributor.distributor_name,
        },
    }


@app.post("/qr-batches")
def create_qr_batch(
    payload: QRBatchCreate,
    db: Session = Depends(get_db),
):
    distributor = (
        db.query(Distributor)
        .filter(Distributor.distributor_id == payload.distributor_id)
        .first()
    )

    if not distributor:
        raise HTTPException(status_code=404, detail="Distributor not found")

    batch_id = f"BATCH-{uuid.uuid4().hex[:10].upper()}"

    batch = QRBatch(
        batch_id=batch_id,
        distributor_id=distributor.distributor_id,
        initial_quantity=payload.quantity,
        current_quantity=payload.quantity,
        status="GENERATED",
    )

    transaction = QuantityTransaction(
        transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
        batch_id=batch_id,
        distributor_id=distributor.distributor_id,
        old_quantity=0,
        new_quantity=payload.quantity,
        transaction_type="GENERATED",
        remarks="QR batch generated",
    )

    db.add(batch)
    db.add(transaction)
    db.commit()
    db.refresh(batch)

    qr_payload = {
        "batch_id": batch.batch_id,
        "distributor_id": distributor.distributor_id,
        "distributor_name": distributor.distributor_name,
        "initial_quantity": batch.initial_quantity,
    }

    return {
        "message": "QR batch created successfully",
        "data": {
            "batch_id": batch.batch_id,
            "distributor_id": distributor.distributor_id,
            "distributor_name": distributor.distributor_name,
            "initial_quantity": batch.initial_quantity,
            "current_quantity": batch.current_quantity,
            "status": batch.status,
            "qr_payload": qr_payload,
        },
    }


@app.get("/qr-batches")
def get_qr_batches(
    distributor_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(QRBatch).join(Distributor)

    if distributor_id:
        query = query.filter(QRBatch.distributor_id == distributor_id)

    batches = query.order_by(QRBatch.created_at.desc()).all()

    return {
        "data": [
            {
                "batch_id": item.batch_id,
                "distributor_id": item.distributor_id,
                "distributor_name": item.distributor.distributor_name,
                "initial_quantity": item.initial_quantity,
                "current_quantity": item.current_quantity,
                "status": item.status,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            }
            for item in batches
        ]
    }


@app.get("/qr-batches/{batch_id}")
def get_batch_details(
    batch_id: str,
    db: Session = Depends(get_db),
):
    batch = (
        db.query(QRBatch)
        .filter(QRBatch.batch_id == batch_id)
        .first()
    )

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    transactions = (
        db.query(QuantityTransaction)
        .filter(QuantityTransaction.batch_id == batch_id)
        .order_by(QuantityTransaction.created_at.desc())
        .all()
    )

    return {
        "data": {
            "batch_id": batch.batch_id,
            "distributor_id": batch.distributor_id,
            "distributor_name": batch.distributor.distributor_name,
            "initial_quantity": batch.initial_quantity,
            "current_quantity": batch.current_quantity,
            "status": batch.status,
            "created_at": batch.created_at,
            "updated_at": batch.updated_at,
            "transactions": [
                {
                    "transaction_id": item.transaction_id,
                    "old_quantity": item.old_quantity,
                    "new_quantity": item.new_quantity,
                    "transaction_type": item.transaction_type,
                    "remarks": item.remarks,
                    "created_at": item.created_at,
                }
                for item in transactions
            ],
        }
    }


@app.patch("/qr-batches/{batch_id}/quantity")
def update_batch_quantity(
    batch_id: str,
    payload: QuantityUpdateRequest,
    db: Session = Depends(get_db),
):
    batch = (
        db.query(QRBatch)
        .filter(QRBatch.batch_id == batch_id)
        .first()
    )

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    old_quantity = batch.current_quantity

    batch.current_quantity = payload.new_quantity
    batch.status = "UPDATED"
    batch.updated_at = datetime.utcnow()

    transaction = QuantityTransaction(
        transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
        batch_id=batch.batch_id,
        distributor_id=batch.distributor_id,
        old_quantity=old_quantity,
        new_quantity=payload.new_quantity,
        transaction_type="CLIENT_UPDATE",
        remarks=payload.remarks,
    )

    db.add(transaction)
    db.commit()
    db.refresh(batch)

    return {
        "message": "Quantity updated successfully",
        "data": {
            "batch_id": batch.batch_id,
            "old_quantity": old_quantity,
            "current_quantity": batch.current_quantity,
            "status": batch.status,
        },
    }