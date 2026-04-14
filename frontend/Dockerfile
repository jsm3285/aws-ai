# frontend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 이 부분이 중요합니다!
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]