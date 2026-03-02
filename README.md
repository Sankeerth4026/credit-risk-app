# CreditRisk AI

A credit risk classification system that predicts applicant risk levels (P1–P4) using Logistic Regression, served through a FastAPI backend and a React + Vite frontend.

---

## Stack

**Frontend** — React 18, Vite, Recharts, Axios, CSS Modules

**Backend** — FastAPI, Uvicorn, scikit-learn, joblib

**Deployment** — Vercel (frontend), Render (backend)

---

## Risk Categories

| Flag | Meaning |
|---|---|
| **P1** | Very Low Risk |
| **P2** | Low Risk |
| **P3** | Moderate Risk |
| **P4** | High Risk |

---

## Local Setup

**1. Train the model**
```bash
python train_model.py
```

**2. Start the backend**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

**3. Start the frontend**
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — both terminals must run simultaneously.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Model status check |
| GET | `/schema` | Feature column names |
| POST | `/predict/single` | Score one applicant |
| POST | `/predict/batch` | Score from CSV / Excel |

---

## Deployment

**Backend → Render**

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `python -m uvicorn main:app --host 0.0.0.0 --port 10000`

**Frontend → Vercel**

Update `App.jsx`:
```js
const API = '/api'
```
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## Model

85 input features (80 numeric, 5 categorical) merged from CIBIL and internal bank datasets. Missing values encoded as -99999 are treated as NaN. Preprocessing uses median imputation and standard scaling for numerics, mode imputation and one-hot encoding for categoricals.

---

**Author** — [Sankeerth](https://github.com/Sankeerth4026)
