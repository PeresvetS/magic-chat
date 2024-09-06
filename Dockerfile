FROM node:20-alpine

# Установка необходимых пакетов
RUN apk update && \
  apk add --no-cache util-linux python3 g++ vim make curl git bash sed

# Установка рабочего каталога
WORKDIR /usr/src/app

# Установка переменных окружения (если необходимо)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

# Копирование файлов package.json для установки зависимостей
COPY package.json package.json

# Установка зависимостей
RUN yarn install

# Копирование всех файлов в контейнер
COPY . .

# Экспонирование порта для доступа к приложению
EXPOSE 3000

CMD ["yarn", "start"]
