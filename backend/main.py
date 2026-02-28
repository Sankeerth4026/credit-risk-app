import json
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io

app = FastAPI(title="CreditRisk API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
MODEL_PATH  = Path(__file__).parent.parent / "model" / "credit_risk_pipeline.pkl"
SCHEMA_PATH = Path(__file__).parent.parent / "model" / "feature_schema.json"

pipeline = None
schema   = None

@app.on_event("startup")
def load_model():
    global pipeline, schema
    if MODEL_PATH.exists():
        pipeline = joblib.load(MODEL_PATH)
    if SCHEMA_PATH.exists():
        schema = json.loads(SCHEMA_PATH.read_text())

RISK_META = {
    0: {"code": "P1", "label": "Very Low Risk",  "description": "Excellent creditworthiness. Approve with standard terms."},
    1: {"code": "P2", "label": "Low Risk",        "description": "Good creditworthiness. Approve with minor conditions."},
    2: {"code": "P3", "label": "Moderate Risk",   "description": "Average creditworthiness. Approve with additional scrutiny."},
    3: {"code": "P4", "label": "High Risk",       "description": "Poor creditworthiness. High probability of default."},
}

class SinglePredictRequest(BaseModel):
    features: dict

class PredictionResult(BaseModel):
    risk_code: str
    risk_label: str
    description: str
    confidence: float
    probabilities: dict
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": pipeline is not None}

@app.get("/schema")
def get_schema():
    if not schema:
        raise HTTPException(404, "Feature schema not found. Run train_model.py first.")
    return schema

@app.post("/predict/single", response_model=PredictionResult)
def predict_single(body: SinglePredictRequest):
    if pipeline is None:
        raise HTTPException(503, "Model not loaded.")
    df = pd.DataFrame([body.features])
    if schema:
        for c in schema["all_cols"]:
            if c not in df.columns:
                df[c] = np.nan
        df = df[schema["all_cols"]]
        for c in schema.get("num_cols", []):
            df[c] = pd.to_numeric(df[c], errors="coerce")
    df.replace(-99999, np.nan, inplace=True)

    pred  = int(pipeline.predict(df)[0])
    proba = pipeline.predict_proba(df)[0].tolist()
    meta  = RISK_META[pred]

    return {
        "risk_code":  meta["code"],
        "risk_label": meta["label"],
        "description": meta["description"],
        "confidence": round(float(max(proba)) * 100, 2),
        "probabilities": {RISK_META[i]["code"]: round(p * 100, 2) for i, p in enumerate(proba)},
    }

@app.post("/predict/batch")
async def predict_batch(file: UploadFile = File(...)):
    if pipeline is None:
        raise HTTPException(503, "Model not loaded.")

    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Could not parse file: {e}")

    df.replace(-99999, np.nan, inplace=True)

    if schema:
        for c in schema["all_cols"]:
            if c not in df.columns:
                df[c] = np.nan
        input_df = df[schema["all_cols"]].copy()
        for c in schema.get("num_cols", []):
            input_df[c] = pd.to_numeric(input_df[c], errors="coerce")
    else:
        input_df = df

    preds = pipeline.predict(input_df)
    proba = pipeline.predict_proba(input_df)

    results = []
    for i, (p, prob) in enumerate(zip(preds, proba)):
        meta = RISK_META[int(p)]
        results.append({
            "row": i + 1,
            "risk_code":  meta["code"],
            "risk_label": meta["label"],
            "confidence": round(float(max(prob)) * 100, 2),
        })

    distribution = {}
    for r in results:
        distribution[r["risk_code"]] = distribution.get(r["risk_code"], 0) + 1

    return {
        "total": len(results),
        "distribution": distribution,
        "results": results,
    }