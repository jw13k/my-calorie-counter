# Dreamean Node.js 백엔드 서버 배포용 이미지

FROM node:18-alpine

WORKDIR /app

# Dreamean 내부의 모든 소스를 컨테이너 최상위로 복사
COPY Dreamean ./

# 환경변수 설정 (docker-compose에 맞춰 7860으로 설정)
ENV PORT=7860
EXPOSE 7860

# 헬스체크 (node alpine에는 wget이 기본 탑재되어 있음)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:7860/ || exit 1

# Node.js 서버 실행 (정적 파일 + API 프록시 역할 동시 수행)
CMD ["node", "server.js"]
