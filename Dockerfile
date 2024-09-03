FROM node:20-alpine

RUN apk update && \
  apk add --no-cache util-linux python3 g++ vim make curl git bash sed

WORKDIR /usr/src/app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

COPY package.json package.json

RUN yarn install

COPY . .

EXPOSE 3000

CMD ["node", "./index.js"]
