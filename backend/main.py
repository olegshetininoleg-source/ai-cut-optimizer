from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from optimizer import calculate_cutting 

app = FastAPI(title="Cut List Optimizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Part(BaseModel):
    id: str
    w: float
    h: float
    count: int
    edge_w: int = 0  # Кол-во кромок по стороне W (0, 1 или 2)
    edge_h: int = 0  # Кол-во кромок по стороне H (0, 1 или 2)

class CutRequest(BaseModel):
    sheet_w: float
    sheet_h: float
    kerf: float = 4.0  
    parts: List[Part]

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Сервер раскроя запущен. Ирина на связи!"}

@app.post("/calculate")
def calculate(request: CutRequest):
    parts_dict = [
        {
            "id": p.id, "w": p.w, "h": p.h, "count": p.count, 
            "edge_w": p.edge_w, "edge_h": p.edge_h
        } for p in request.parts
    ]
    
    layout = calculate_cutting(request.sheet_w, request.sheet_h, parts_dict, request.kerf)
    
    return {
        "status": "success",
        "sheets_used": len(layout),
        "layout": layout
    }