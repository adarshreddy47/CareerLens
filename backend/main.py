from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Form,
    Depends
)

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from resume_parser import extract_resume_text
from history import save_analysis, get_analysis_history
from database import get_db
from models import User

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

from recommendation import (
    recommend_careers,
    analyze_job
)

import re


app = FastAPI(title="CareerLens API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "CareerLens Backend is running"
    }


@app.get("/api/health")
def health():
    return {"status": "success"}


# Resume Upload

@app.post("/api/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file"
        )

    contents = await file.read(10 * 1024 * 1024 + 1)

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="PDF must be smaller than 10 MB"
        )

    try:
        text = extract_resume_text(contents)

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to read the PDF"
        )

    if not text or not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text found in the PDF"
        )

    return {
        "filename": file.filename,
        "message": "Resume uploaded successfully",
        "extracted_text": text,
        "word_count": len(text.split())
    }


# Extract Resume Sections

def extract_section(text, headings):

    all_headings = [
        "summary",
        "objective",
        "education",
        "academic qualifications",
        "experience",
        "work experience",
        "professional experience",
        "projects",
        "projects (continued)",
        "academic projects",
        "personal projects",
        "technical skills",
        "skills",
        "certifications",
        "achievements",
        "languages",
        "internships",
        "interests"
    ]

    collected = []
    active = False

    for line in text.splitlines():

        clean_line = line.strip()
        normalized = clean_line.lower().rstrip(":").strip()

        if normalized in headings:
            active = True
            continue

        if normalized in all_headings:
            active = False
            continue

        if active and clean_line:
            collected.append(clean_line)

    return "\n".join(collected)


# Save Results Helper

def store_results(
    db,
    user,
    resume,
    analysis_type,
    results,
    skills
):

    text = resume["extracted_text"]

    education = extract_section(
        text,
        ["education", "academic qualifications"]
    )

    project_experience = extract_section(
        text,
        [
            "projects",
            "projects (continued)",
            "academic projects",
            "personal projects"
        ]
    )

    try:

        history_id = save_analysis(
            db=db,
            user_id=user.id,
            filename=resume["filename"],
            extracted_text=text,
            skills=skills,
            education=education,
            project_experience=project_experience,
            analysis_type=analysis_type,
            results=results
        )

        return history_id

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Analysis could not be saved to the database"
        )


# Career Recommendations

@app.post("/api/career-recommendations")
async def career_recommendations(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    resume = await upload_resume(file, user)

    text = resume["extracted_text"]

    recommendations = recommend_careers(text)

    skills = set()

    for item in recommendations:

        skills.update(
            item.get("resume_skills", []) or []
        )

        skills.update(
            item.get("matching_skills", []) or []
        )

    history_id = store_results(
        db=db,
        user=user,
        resume=resume,
        analysis_type="career",
        results=recommendations,
        skills=sorted(skills)
    )

    return {
        "filename": resume["filename"],
        "recommendations": recommendations,
        "history_id": history_id
    }


# Job Compatibility

@app.post("/api/job-compatibility")
async def job_compatibility(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if not job_description.strip():

        raise HTTPException(
            status_code=400,
            detail="Please enter a job description"
        )

    resume = await upload_resume(file, user)

    text = resume["extracted_text"]

    analysis = analyze_job(
        text,
        job_description
    )

    skills = sorted(
        set(
            analysis.get("resume_skills", []) or []
        ).union(
            analysis.get("matching_skills", []) or []
        )
    )

    history_id = store_results(
        db=db,
        user=user,
        resume=resume,
        analysis_type="job",
        results={
            "job_description": job_description,
            "analysis": analysis
        },
        skills=skills
    )

    return {
        "filename": resume["filename"],
        "analysis": analysis,
        "history_id": history_id
    }


# Authentication Request Models

class RegisterRequest(BaseModel):

    name: str
    email: str
    password: str


class LoginRequest(BaseModel):

    email: str
    password: str


# User Registration

@app.post("/api/register")
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):

    name = data.name.strip()
    email = data.email.strip().lower()
    password = data.password

    if not name or len(name) > 100:

        raise HTTPException(
            status_code=400,
            detail="Enter a valid name"
        )

    if len(email) > 255 or not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+",
        email
    ):

        raise HTTPException(
            status_code=400,
            detail="Enter a valid email"
        )

    if (
        len(password) < 8
        or len(password.encode("utf-8")) > 72
        or not re.search(r"[A-Za-z]", password)
        or not re.search(r"[0-9]", password)
        or not re.search(r"[^A-Za-z0-9\s]", password)
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain at least 8 characters, "
                "a letter, a number and a special character, "
                "with a maximum of 72 bytes"
            )
        )

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password)
    )

    db.add(user)

    try:

        db.commit()

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    db.refresh(user)

    return {
        "message": "Registration successful",
        "user_id": user.id,
        "name": user.name,
        "email": user.email
    }


# User Login

@app.post("/api/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):

    email = data.email.strip().lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if (
        not user
        or len(data.password.encode("utf-8")) > 72
        or not verify_password(
            data.password,
            user.password_hash
        )
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(user.id)

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


# User Profile

@app.get("/api/profile")
def profile(
    user: User = Depends(get_current_user)
):

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }


# Personal Analysis History

@app.get("/api/history")
def analysis_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    return {
        "history": get_analysis_history(
            db,
            user.id
        )
    }