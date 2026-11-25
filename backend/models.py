from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    ForeignKey,
    DateTime,
    JSON
)

from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    password_hash = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    filename = Column(String(255), nullable=False)
    extracted_text = Column(Text, nullable=False)
    skills = Column(JSON)
    education = Column(Text)
    project_experience = Column(Text)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True)
    job_role = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    resume_id = Column(
        Integer,
        ForeignKey("resumes.id"),
        nullable=False
    )
    analysis_type = Column(String(50), nullable=False)
    results = Column(JSON, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


class SemanticMatch(Base):
    __tablename__ = "semantic_matches"

    id = Column(Integer, primary_key=True)
    analysis_id = Column(
        Integer,
        ForeignKey("analysis_history.id"),
        nullable=False
    )
    job_id = Column(
        Integer,
        ForeignKey("job_descriptions.id"),
        nullable=False
    )
    semantic_score = Column(Float)
    skill_score = Column(Float)
    overall_score = Column(Float)
    matching_skills = Column(JSON)
    missing_skills = Column(JSON)
    recommendation = Column(Text)
    
