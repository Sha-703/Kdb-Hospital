FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --silent
COPY . .
CMD ["npm","start"]
