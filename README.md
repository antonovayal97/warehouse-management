# 🏭 Система управления складом

Полнофункциональная система управления складом с аутентификацией, управлением товарами и схемами складов.

## 🚀 Возможности

- **Аутентификация**: Роли администратора и работника склада
- **Управление товарами**: Создание, удаление, импорт из Excel
- **Схемы складов**: Интерактивные схемы с точками размещения
- **Адаптивный дизайн**: Работает на всех устройствах
- **Touch-поддержка**: Работа с тачскринами

## 🛠 Технологии

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js
- **База данных**: PostgreSQL
- **Контейнеризация**: Docker, Docker Compose

## 📦 Установка и запуск

### Локальная разработка

```bash
# Клонирование репозитория
git clone <repository-url>
cd warehouse-management

# Запуск с Docker Compose
docker-compose up --build -d

# Приложение будет доступно:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Первоначальная настройка

1. **Вход в систему:**
   - Логин: `admin`
   - Пароль: `admin123`

2. **Создание пользователей:**
   - Перейдите в "Пользователи" (только для админов)
   - Создайте новых работников склада

## 🔧 Конфигурация

### Переменные окружения

**Backend:**
```bash
NODE_ENV=production
JWT_SECRET=your-secure-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=warehouse
DB_USER=warehouse_user
DB_PASSWORD=your-secure-password
```

**Frontend:**
```bash
VITE_API_BASE_URL=http://localhost:5000
```

## 🚀 Деплой

### 1. VPS/Сервер

```bash
# На сервере
git clone <repository-url>
cd warehouse-management

# Настройка переменных окружения
cp .env.example .env
nano .env

# Запуск
docker-compose -f docker-compose.prod.yml up --build -d
```

### 2. Nginx конфигурация

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📝 Обновление приложения

### Через Git (рекомендуемый способ)

```bash
# На сервере
cd /path/to/warehouse-management
git pull origin main
docker-compose down
docker-compose up --build -d
```

### Прямое редактирование

```bash
# Подключение к серверу
ssh user@your-server

# Редактирование файлов
nano frontend/src/App.jsx
nano backend/server.js

# Перезапуск после изменений
docker-compose restart frontend backend
```

## 🔐 Роли пользователей

### Администратор
- Управление товарами (создание, удаление, импорт)
- Управление складами (создание, удаление, изменение)
- Управление пользователями
- Редактирование схем складов

### Работник склада
- Просмотр товаров и складов
- Редактирование точек на схемах складов

## 📊 API Endpoints

### Аутентификация
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/me` - Информация о текущем пользователе

### Товары
- `GET /api/products` - Список товаров
- `POST /api/products` - Создание товара (админ)
- `DELETE /api/products/batch` - Удаление товаров (админ)
- `POST /api/products/import` - Импорт из Excel (админ)

### Склады
- `GET /api/warehouses` - Список складов
- `POST /api/warehouses` - Создание склада (админ)
- `PUT /api/warehouses/:id/positions` - Сохранение позиций
- `POST /api/warehouses/:id/image` - Загрузка схемы (админ)

### Пользователи
- `GET /api/users` - Список пользователей (админ)
- `POST /api/users` - Создание пользователя (админ)
- `DELETE /api/users/:id` - Удаление пользователя (админ)

## 🐳 Docker

### Сборка образов

```bash
# Frontend
docker build -t warehouse-frontend ./frontend

# Backend
docker build -t warehouse-backend ./backend
```

### Docker Compose

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_BASE_URL=http://localhost:5000

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=warehouse
      - POSTGRES_USER=warehouse_user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🔄 CI/CD

### GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /path/to/warehouse-management
          git pull origin main
          docker-compose down
          docker-compose up --build -d
```

## 📱 Мобильная версия

Приложение полностью адаптивно и поддерживает:
- Touch-события для работы с точками
- Адаптивные меню и формы
- Оптимизированные размеры для мобильных устройств

## 🛡 Безопасность

- JWT токены для аутентификации
- Хеширование паролей с bcrypt
- Ролевая авторизация
- Валидация входных данных

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Убедитесь в правильности переменных окружения
3. Проверьте подключение к базе данных

## 📄 Лицензия

MIT License
