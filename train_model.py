
import pandas as pd
import numpy as np
import joblib
import json
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report, accuracy_score

ROOT = Path(__file__).parent          
MODEL_DIR = ROOT / "model"            
MODEL_DIR.mkdir(exist_ok=True)        

df  = pd.read_excel(ROOT / "External_Cibil_Dataset.xlsx")
df2 = pd.read_excel(ROOT / "Internal_Bank_Dataset.xlsx")
combined_df = pd.merge(df, df2, on="PROSPECTID")

combined_df.replace(-99999, np.nan, inplace=True)
combined_df = combined_df[combined_df.isna().sum(axis=1) < 20]

risk_map = {"P1": 0, "P2": 1, "P3": 2, "P4": 3}
y = combined_df["Approved_Flag"].map(risk_map)
X = combined_df.drop(["Approved_Flag", "PROSPECTID"], axis=1)

num_cols = X.select_dtypes(include=np.number).columns.tolist()
cat_cols = X.select_dtypes(exclude=np.number).columns.tolist()

num_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler",  StandardScaler())
])

cat_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("onehot",  OneHotEncoder(drop="first", handle_unknown="ignore"))
])

preprocessor = ColumnTransformer([
    ("num", num_pipeline, num_cols),
    ("cat", cat_pipeline, cat_cols)
])

model_pipeline = Pipeline([
    ("preprocessing", preprocessor),
    ("model", LogisticRegression(max_iter=1000))
])
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.35, random_state=42
)
model_pipeline.fit(X_train, y_train)
y_pred = model_pipeline.predict(X_test)

print(classification_report(y_test, y_pred))
print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
joblib.dump(model_pipeline, MODEL_DIR / "credit_risk_pipeline.pkl")
print(f" Model saved → {MODEL_DIR / 'credit_risk_pipeline.pkl'}")
feature_schema = {
    "num_cols": num_cols,
    "cat_cols": cat_cols,
    "all_cols": num_cols + cat_cols,
}
with open(MODEL_DIR / "feature_schema.json", "w") as f:
    json.dump(feature_schema, f, indent=2)
print(f"✅  Schema saved → {MODEL_DIR / 'feature_schema.json'}")