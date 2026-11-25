from sqlalchemy.orm import Session
from fastapi.encoders import jsonable_encoder
from models import Resume, AnalysisHistory


def save_analysis(
    db: Session,
    user_id,
    filename,
    extracted_text,
    skills,
    education,
    project_experience,
    analysis_type,
    results
):
    try:
        resume = Resume(
            user_id=user_id,
            filename=filename,
            extracted_text=extracted_text,
            skills=skills,
            education=education,
            project_experience=project_experience
        )

        db.add(resume)
        db.flush()

        history = AnalysisHistory(
            user_id=user_id,
            resume_id=resume.id,
            analysis_type=analysis_type,
            results=jsonable_encoder(results)
        )

        db.add(history)
        db.commit()
        db.refresh(history)

        return history.id

    except Exception:
        db.rollback()
        raise


def get_analysis_history(db: Session, user_id):
    records = (
        db.query(AnalysisHistory, Resume)
        .join(
            Resume,
            AnalysisHistory.resume_id == Resume.id
        )
        .filter(
            AnalysisHistory.user_id == user_id,
            Resume.user_id == user_id
        )
        .order_by(AnalysisHistory.created_at.desc())
        .all()
    )

    return [
        {
            "id": history.id,
            "filename": resume.filename,
            "analysis_type": history.analysis_type,
            "results": history.results,
            "created_at": history.created_at
        }
        for history, resume in records
    ]