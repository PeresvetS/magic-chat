FROM node:20-alpine

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем package.json и yarn.lock (если есть)
COPY package.json package.json

# Устанавливаем зависимости
RUN yarn install

# Копируем исходный код приложения
COPY . .

# Открываем порт, который использует приложение
EXPOSE 3000

# Генерируем Prisma клиент
RUN npx prisma generate

# Запускаем приложение
CMD ["sh", "-c", "npx prisma migrate deploy && node ./index.js"]
# # Применяем Prisma миграции
# CMD ["npx", "prisma", "migrate", "deploy"]