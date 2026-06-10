# Dreamean 정적 사이트 배포용 이미지

FROM python:3.11-slim

WORKDIR /app

# 캐시 최적화용 (현재는 비어있음)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# 앱 소스 복사 (Dreamean 폴더)
COPY Dreamean ./Dreamean

EXPOSE 7860

# 환경변수
ENV PYTHONUNBUFFERED=1

# 헬스체크 (정상 응답 확인)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7860/').read()" || exit 1

# 내장 HTTP 서버로 Dreamean 폴더를 7860 포트에서 서빙
CMD ["python", "-m", "http.server", "7860", "--directory", "Dreamean"]
