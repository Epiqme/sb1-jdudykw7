# Voyager Connect / Icebreaker Elite backend — container image.
# Works on any host that runs Docker (Render, Railway, Fly.io, etc.).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Hosts provide the port via $PORT; default to 8001 locally.
ENV PORT=8001
EXPOSE 8001

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
