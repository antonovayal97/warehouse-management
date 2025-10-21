#!/bin/bash

# Скрипт для деплоя системы управления складом
# Использование: ./deploy.sh [production|development]

set -e

ENVIRONMENT=${1:-development}

echo "🚀 Деплой системы управления складом в режиме: $ENVIRONMENT"

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down

# Очистка старых образов (опционально)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🧹 Очистка старых образов..."
    docker system prune -f
fi

# Выбор конфигурации
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🏭 Запуск в продакшн режиме..."
    
    # Проверка наличия .env файла
    if [ ! -f .env ]; then
        echo "⚠️  Файл .env не найден. Создайте его на основе .env.example"
        echo "cp .env.example .env"
        echo "nano .env"
        exit 1
    fi
    
    # Запуск с продакшн конфигурацией
    docker-compose -f docker-compose.prod.yml up --build -d
else
    echo "🔧 Запуск в режиме разработки..."
    docker-compose up --build -d
fi

# Ожидание запуска сервисов
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверка статуса
echo "📊 Статус сервисов:"
docker-compose ps

# Проверка доступности
echo "🔍 Проверка доступности сервисов..."

# Проверка backend
if curl -f http://localhost:5000/api/auth/me > /dev/null 2>&1; then
    echo "✅ Backend доступен"
else
    echo "❌ Backend недоступен"
fi

# Проверка frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend доступен"
else
    echo "❌ Frontend недоступен"
fi

echo ""
echo "🎉 Деплой завершен!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo ""
echo "🔐 Данные для входа:"
echo "   Логин: admin"
echo "   Пароль: admin123"
echo ""
echo "📝 Полезные команды:"
echo "   Просмотр логов: docker-compose logs -f"
echo "   Остановка: docker-compose down"
echo "   Перезапуск: docker-compose restart"
echo ""
