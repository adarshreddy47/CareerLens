import re
from functools import lru_cache
from sentence_transformers import SentenceTransformer, util


JOB_ROLES = {
    "AI Engineer": [
        "Python", "Machine Learning", "Deep Learning",
        "PyTorch", "TensorFlow", "RAG", "LangChain"
    ],

    "Frontend Developer": [
        "HTML", "CSS", "JavaScript", "React.js",
        "TypeScript", "Tailwind CSS"
    ],

    "Backend Developer": [
        "Python", "FastAPI", "PostgreSQL",
        "REST APIs", "Docker", "Redis"
    ],

    "Full Stack Developer": [
        "React.js", "JavaScript", "Node.js",
        "SQL", "REST APIs", "PostgreSQL"
    ],

    "Java Developer": [
        "Java", "Spring Boot", "SQL",
        "Hibernate", "REST APIs"
    ],

    "Data Analyst": [
        "Python", "SQL", "Excel",
        "Power BI", "Pandas", "NumPy"
    ],

    "Machine Learning Engineer": [
        "Python", "Scikit-learn", "Machine Learning",
        "TensorFlow", "PyTorch", "Pandas"
    ],

    "Software Test Engineer": [
        "Java", "Python", "Selenium",
        "Postman", "Pytest", "JUnit"
    ],

    "Generative AI Engineer": [
        "Python", "LLMs", "RAG", "LangChain",
        "LangGraph", "MCP", "Vector Databases"
    ],

    "DevOps Engineer": [
        "Linux", "Docker", "Kubernetes",
        "Git", "AWS", "CI/CD"
    ]
}


ALL_SKILLS = sorted({
    skill
    for skills in JOB_ROLES.values()
    for skill in skills
})


@lru_cache(maxsize=1)
def get_model():
    return SentenceTransformer(
        "all-MiniLM-L6-v2"
    )


def extract_skills(text):

    found_skills = []

    for skill in ALL_SKILLS:

        pattern = (
            r"(?<![\w])"
            + re.escape(skill)
            + r"(?![\w])"
        )

        if re.search(pattern, text, re.IGNORECASE):
            found_skills.append(skill)

    return found_skills


def calculate_similarity(resume_text, job_description):

    model = get_model()

    resume_embedding = model.encode(
        resume_text,
        convert_to_tensor=True
    )

    job_embedding = model.encode(
        job_description,
        convert_to_tensor=True
    )

    similarity = util.cos_sim(
        resume_embedding,
        job_embedding
    ).item()

    return round(max(0, min(1, similarity)) * 100, 2)


def analyze_job(resume_text, job_description):

    resume_skills = extract_skills(resume_text)

    required_skills = extract_skills(job_description)

    matching_skills = [
        skill for skill in required_skills
        if skill in resume_skills
    ]

    missing_skills = [
        skill for skill in required_skills
        if skill not in resume_skills
    ]

    semantic_score = calculate_similarity(
        resume_text,
        job_description
    )

    if required_skills:

        skill_score = round(
            len(matching_skills)
            / len(required_skills) * 100,
            2
        )

        overall_score = round(
            semantic_score * 0.4
            + skill_score * 0.6,
            2
        )

    else:
        skill_score = None
        overall_score = semantic_score

    if overall_score >= 75:
        recommendation = "Strong match - Recommended to apply"

    elif overall_score >= 50:
        recommendation = "Moderate match - Consider applying and improving skills"

    else:
        recommendation = "Limited match - Review job requirements"

    return {
        "overall_score": overall_score,
        "semantic_score": semantic_score,
        "skill_score": skill_score,
        "resume_skills": resume_skills,
        "required_skills": required_skills,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "recommendation": recommendation
    }


def recommend_careers(resume_text):

    results = []

    for role, skills in JOB_ROLES.items():

        description = (
            role + " requires experience in "
            + ", ".join(skills)
        )

        analysis = analyze_job(
            resume_text,
            description
        )

        analysis["job_role"] = role

        results.append(analysis)

    results.sort(
        key=lambda item: item["overall_score"],
        reverse=True
    )

    return results[:3]