FROM node:20-alpine

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем package.json и yarn.lock (если есть)
COPY package.json ./

# Устанавливаем зависимости
RUN yarn install

# Копируем исходный код приложения
COPY . .

# Открываем порт, который использует приложение
EXPOSE 3000

# Генерируем Prisma клиент
RUN npx prisma generate

# Запускаем приложение
CMD ["npm", "start"]
# # Применяем Prisma миграции
# CMD ["npx", "prisma", "migrate", "deploy"]