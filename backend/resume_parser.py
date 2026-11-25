import pymupdf


def extract_resume_text(file_bytes):
    text = ""

    with pymupdf.open(stream=file_bytes, filetype="pdf") as document:
        for page in document:
            text += page.get_text(sort=True) + "\n"

    return text.strip()