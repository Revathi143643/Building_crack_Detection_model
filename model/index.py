from pathlib import Path
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
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["POST"], allow_headers=["*"])


def prepare_image(content: bytes) -> np.ndarray:
    try:
        image = Image.open(__import__("io").BytesIO(content)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from exc

    if model is None:
        raise HTTPException(status_code=503, detail="The model artifact is invalid or unavailable.")

    shape = model.input_shape
    if not isinstance(shape, tuple) or len(shape) != 4 or shape[1] is None or shape[2] is None:
        raise HTTPException(status_code=500, detail="The model has no fixed image input shape.")
    image = image.resize((int(shape[2]), int(shape[1])))
    return np.asarray(image, dtype=np.float32)[None, ...]


@app.get("/health")
def health() -> dict[str, str]:
    if model is None:
        return {"status": "degraded", "error": model_error or "Model unavailable"}
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: Annotated[UploadFile, File(...)]) -> dict[str, object]:
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Images must be 10 MB or smaller.")
    batch = prepare_image(content)
    output = np.asarray(model.predict(batch, verbose=0)).squeeze()

    if np.ndim(output) == 0:
        probability = float(output)
        has_crack = probability >= 0.5
        confidence = probability if has_crack else 1 - probability
    else:
        probabilities = tf.nn.softmax(output).numpy()
        crack_index = int(np.argmax(probabilities))
        confidence = float(probabilities[crack_index])
        has_crack = crack_index == 1

    return {
        "has_crack": has_crack,
        "label": "Crack detected" if has_crack else "No crack detected",
        "confidence": round(confidence, 4),
    }