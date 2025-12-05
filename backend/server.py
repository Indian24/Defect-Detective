import os
import uuid
import base64
import json
from typing import List, Optional
from datetime import datetime
import logging

import httpx
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

class UserMessage:
    def __init__(self, text: str, file_contents=None):
        self.text = text
        self.file_contents = file_contents or [] 


class ImageContent:
    def __init__(self, image_base64: str, mime_type: str = "image/png"):
        self.image_base64 = image_base64
        self.mime_type = mime_type


class LlmChat:

    def __init__(self, api_key: str, session_id: Optional[str] = None, system_message: Optional[str] = None):
        self.api_key = GOOGLE_API_KEY
        self.system_message = system_message or ""
        self._model = "gemini-2.0-flash"

    def with_model(self, *args, **kwargs):
        if len(args) == 2 and args[1]:
            self._model = args[1]
        elif "model" in kwargs and kwargs["model"]:
            self._model = kwargs["model"]
        return self

    async def send_message(self, user_message: UserMessage) -> str:
        if not self.api_key:
            raise RuntimeError("No API key provided for Gemini.")

        prompt_text = self.system_message.strip()
        if prompt_text:
            prompt_text += "\n\n"
        prompt_text += user_message.text

        parts = [{"text": prompt_text}]
        for img in user_message.file_contents:
            parts.append({
                "inlineData": {
                    "mimeType": getattr(img, "mime_type", "image/png"),
                    "data": img.image_base64,
                }
            })

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": parts,
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 512,
            },
        }

        model = self._model or "gemini-2.0-flash"
        url = f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={self.api_key}"

        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(url, json=payload)

        if resp.status_code == 403 and "reported as leaked" in resp.text:
            raise RuntimeError(
                "Your Gemini API key was reported as leaked and is blocked. "
                "Please generate a new key and update GOOGLE_API_KEY."
            )

        resp.raise_for_status()
        data = resp.json()

        if isinstance(data, dict) and "candidates" in data and data["candidates"]:
            cand = data["candidates"][0]
            content = cand.get("content", {})
            parts = content.get("parts", [])
            texts = [p.get("text", "") for p in parts if isinstance(p, dict) and "text" in p]
            if texts:
                return "\n".join(texts)

        return json.dumps(data)

load_dotenv()

app = FastAPI(title="Defect Detective API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY")
DATABASE_NAME = os.environ.get("DB_NAME", "defect_detective")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]

class DefectResult(BaseModel):
    defect_type: str
    confidence: float
    severity: str
    description: str


class AnalysisResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    upload_time: datetime = Field(default_factory=datetime.utcnow)
    total_defects: int
    defects_found: List[DefectResult]
    analysis_complete: bool = True
    image_base64: Optional[str] = None


class AnalysisResponse(BaseModel):
    success: bool
    message: str
    analysis: Optional[AnalysisResult] = None

def create_gemini_chat() -> LlmChat:
    if not GOOGLE_API_KEY:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set in the environment. "
            "Please set a valid Gemini API key."
        )

    return LlmChat(
        api_key=GOOGLE_API_KEY,
        session_id=f"defect_analysis_{uuid.uuid4()}",
        system_message="""You are an expert industrial defect detection AI. Analyze images for manufacturing and industrial defects like:
        - Cold joints in welds
        - Foreign materials/contaminants
        - Cracks and fractures  
        - Corrosion and rust
        - Surface imperfections
        - Misaligned components
        - Dimensional issues
        
        Return ONLY a valid JSON response with this exact structure:
        {
            "defects_found": [
                {
                    "defect_type": "Cold Joint",
                    "confidence": 92,
                    "severity": "High",
                    "description": "Incomplete weld penetration detected in joint area"
                },
                {
                    "defect_type": "Foreign Material", 
                    "confidence": 86,
                    "severity": "Medium",
                    "description": "Metallic debris embedded in surface"
                }
            ],
            "total_defects": 2
        }
        
        If no defects are found, return:
        {
            "defects_found": [],
            "total_defects": 0
        }""",
    ).with_model("gemini", "gemini-2.0-flash")

@app.get("/")
async def root():
    return {"message": "Defect Detective API is running"}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_defects(file: UploadFile = File(...)):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are supported")

        contents = await file.read()
        base64_image = base64.b64encode(contents).decode("utf-8")

        try:
            chat = create_gemini_chat()
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))

        image_content = ImageContent(image_base64=base64_image, mime_type=file.content_type)

        user_message = UserMessage(
            text="Analyze this manufacturing/industrial image for defects. Return JSON response only.",
            file_contents=[image_content],
        )

        try:
            response = await chat.send_message(user_message)
        except Exception as e:
            msg = str(e)
            if "reported as leaked" in msg:
                raise HTTPException(
                    status_code=500,
                    detail=(
                        "LLM provider (Gemini) blocked the API key because it was "
                        "reported as leaked. Please generate a new API key and "
                        "update GOOGLE_API_KEY in your environment."
                    ),
                )
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed while calling LLM: {msg}",
            )

        try:
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            analysis_data = json.loads(response_text)
        except json.JSONDecodeError:
            analysis_data = {
                "defects_found": [
                    {
                        "defect_type": "Analysis Error",
                        "confidence": 50,
                        "severity": "Unknown",
                        "description": "Could not parse AI response properly",
                    }
                ],
                "total_defects": 1,
            }

        defects = [
            DefectResult(**defect) for defect in analysis_data.get("defects_found", [])
        ]

        analysis = AnalysisResult(
            filename=file.filename,
            total_defects=analysis_data.get("total_defects", len(defects)),
            defects_found=defects,
            image_base64=base64_image,
        )

        analysis_dict = analysis.model_dump()
        analysis_dict["upload_time"] = analysis.upload_time.isoformat()
        await db.analyses.insert_one(analysis_dict)

        return AnalysisResponse(
            success=True,
            message=f"Analysis complete. Found {analysis.total_defects} defects.",
            analysis=analysis,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/api/history", response_model=List[AnalysisResult])
async def get_analysis_history(limit: int = 10):
    try:
        cursor = db.analyses.find().sort("upload_time", -1).limit(limit)
        analyses = await cursor.to_list(length=limit)

        result = []
        for analysis in analyses:
            if isinstance(analysis.get("upload_time"), str):
                analysis["upload_time"] = datetime.fromisoformat(analysis["upload_time"])
            result.append(AnalysisResult(**analysis))

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@app.get("/api/analysis/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(analysis_id: str):
    try:
        analysis = await db.analyses.find_one({"id": analysis_id})
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")

        if isinstance(analysis.get("upload_time"), str):
            analysis["upload_time"] = datetime.fromisoformat(analysis["upload_time"])

        return AnalysisResult(**analysis)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analysis: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
