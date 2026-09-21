from io import BytesIO
from pathlib import Path
import os
from typing import Annotated

import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

MODEL_PATH = Path(__file__).with_name("crack_detection_model.keras")
MAX_FILE_SIZE = 10 * 1024 * 1024
model = None
model_error = None
try:
    model = tf.keras.models.load_model(MODEL_PATH)
except Exception as exc:
    model_error = str(exc)

app = FastAPI(title="Structure Scan model API")
allowed_origins = [
    origin.strip()
    for origin in os.getenv("MODEL_API_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_methods=["POST"], allow_headers=["*"])


def prepare_image(content: bytes) -> np.ndarray:
    try:
        image = Image.open(BytesIO(content)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from exc

    if model is None:
        raise HTTPException(status_code=503, detail="The model artifact is invalid or unavailable.")

    shape = model.input_shape
    if not isinstance(shape, tuple) or len(shape) != 4 or shape[1] is None or shape[2] is None:
        raise HTTPException(status_code=500, detail="The model has no fixed image input shape.")
    image = image.resize((int(shape[2]), int(shape[1])))
    # The saved model contains the MobileNetV2 preprocessing layer and expects
    # float pixels in the 0-255 range at its public input.
    return np.asarray(image, dtype=np.float32)[None, ...]


def decode_prediction(output: np.ndarray) -> tuple[bool, float]:
    values = np.asarray(output, dtype=np.float32).reshape(-1)
    if values.size == 0:
        raise HTTPException(status_code=500, detail="The model returned no prediction.")

    if values.size == 1:
        value = float(values[0])
        probability = value if 0 <= value <= 1 else float(tf.math.sigmoid(value).numpy())
        return probability >= 0.5, probability if probability >= 0.5 else 1 - probability

    probabilities = tf.nn.softmax(values).numpy()
    crack_index = int(np.argmax(probabilities))
    return crack_index == 1, float(probabilities[crack_index])


@app.get("/health")
def health() -> dict[str, str]:
    if model is None:
        return {"status": "degraded", "error": model_error or "Model unavailable"}
    return {"status": "ok"}


def get_severity(confidence: float) -> tuple[str, str]:
    percentage = confidence * 100
    if percentage >= 85:
        return "High", "Arrange a professional inspection as soon as possible."
    if percentage >= 70:
        return "Medium", "Schedule a professional inspection and monitor the area."
    return "Low", "Document the area and arrange an inspection if the crack changes."


@app.post("/predict")
async def predict(file: Annotated[UploadFile, File(...)]) -> dict[str, object]:
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Images must be 10 MB or smaller.")
    batch = prepare_image(content)
    output = model.predict(batch, verbose=0)
    has_crack, confidence = decode_prediction(output)

    severity = None
    recommendation = None
    if has_crack:
        severity, recommendation = get_severity(confidence)

    return {
        "has_crack": has_crack,
        "label": "Crack detected" if has_crack else "No crack detected",
        "confidence": round(confidence, 4),
        "severity": severity,
        "recommendation": recommendation,
    }