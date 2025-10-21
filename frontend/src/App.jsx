import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// Вспомогательная функция для получения заголовков с токеном
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

// Компонент для входа в систему
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onLogin(data.user)
      } else {
        setError(data.error || 'Ошибка входа')
      }
    } catch (error) {
      setError('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Вход в систему
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Система управления складом
          </p>
        </div>
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Имя пользователя
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                placeholder="Введите имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Компонент для управления пользователями (только для админа)
function UserManagement({ user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'worker'
  })
  const [creating, setCreating] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreating(true)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        setShowCreateForm(false)
        setNewUser({ username: '', password: '', role: 'worker' })
        loadUsers()
        alert('Пользователь создан успешно')
      } else {
        const data = await response.json()
        alert(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      alert('Ошибка при создании пользователя')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        loadUsers()
        alert('Пользователь удален')
      } else {
        const data = await response.json()
        alert(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      alert('Ошибка при удалении пользователя')
    }
  }

  if (user.role !== 'admin') {
    return <div className="text-center text-gray-500">У вас нет прав для просмотра этой страницы</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Управление пользователями</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
        >
          <span className="hidden sm:inline">Добавить пользователя</span>
          <span className="sm:hidden">Добавить</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Создать нового пользователя</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Имя пользователя</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Пароль</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewUser({...newUser, role: 'worker'})}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 ${
                    newUser.role === 'worker'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      newUser.role === 'worker' ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>
                    <div className="flex items-center space-x-2 min-w-0">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className={`font-medium text-sm sm:text-base truncate ${
                        newUser.role === 'worker' ? 'text-blue-900' : 'text-gray-700'
                      }`}>
                        Работник склада
                      </span>
                    </div>
                  </div>
                  <p className={`text-xs mt-2 hidden sm:block ${
                    newUser.role === 'worker' ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    Может редактировать точки на схемах
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setNewUser({...newUser, role: 'admin'})}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 ${
                    newUser.role === 'admin'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      newUser.role === 'admin' ? 'bg-red-500' : 'bg-gray-300'
                    }`}></div>
                    <div className="flex items-center space-x-2 min-w-0">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className={`font-medium text-sm sm:text-base truncate ${
                        newUser.role === 'admin' ? 'text-red-900' : 'text-gray-700'
                      }`}>
                        Администратор
                      </span>
                    </div>
                  </div>
                  <p className={`text-xs mt-2 hidden sm:block ${
                    newUser.role === 'admin' ? 'text-red-700' : 'text-gray-500'
                  }`}>
                    Полный доступ ко всем функциям
                  </p>
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={creating}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base"
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm sm:text-base"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Десктопная таблица */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Пользователь
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Роль
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Создан
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {u.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    u.role === 'admin' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {u.role === 'admin' ? 'Администратор' : 'Работник склада'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {u.id !== user.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Мобильные карточки */}
      <div className="md:hidden space-y-4">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{u.username}</h3>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                u.role === 'admin' 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {u.role === 'admin' ? 'Администратор' : 'Работник склада'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Создан: {new Date(u.created_at).toLocaleDateString()}
              </span>
              {u.id !== user.id && (
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  Удалить
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductsList({ user }) {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [positionsFilter, setPositionsFilter] = useState('all') // all | with | without
  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [productNameInput, setProductNameInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [showExcelImport, setShowExcelImport] = useState(false)
  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const fetchPage = useCallback(async (targetPage, replace = false) => {
    if (targetPage === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setError('')
    try {
      const url = new URL('/api/products', API_BASE)
      if (query.trim()) url.searchParams.set('q', query.trim())
      if (positionsFilter && positionsFilter !== 'all') url.searchParams.set('positions', positionsFilter)
      url.searchParams.set('page', String(targetPage))
      url.searchParams.set('limit', '30')
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const items = Array.isArray(data) ? data : (data.items || [])
      const nextHasMore = Array.isArray(data) ? items.length > 0 : Boolean(data.hasMore)
      setHasMore(nextHasMore)
      setPage(targetPage)
      setProducts(prev => replace ? items : [...prev, ...items])
    } catch (e) {
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [API_BASE, query, positionsFilter])

  // Initial load and when query changes -> reset and fetch page 1
  useEffect(() => {
    setProducts([])
    setPage(1)
    setHasMore(true)
    fetchPage(1, true)
  }, [query, positionsFilter, fetchPage])

  // Infinite scroll using IntersectionObserver
  const sentinelRef = useRef(null)
  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries, obs) => {
      const first = entries[0]
      if (first.isIntersecting && !loadingMore && !loading) {
        // Важно: снимаем наблюдение, чтобы избежать каскадной загрузки всех страниц
        obs.unobserve(first.target)
        fetchPage(page + 1).finally(() => {
          // После завершения загрузки пере-наблюдаем sentinel
          // Новый observer пересоздастся после обновления зависимостей
        })
      }
    }, { root: null, rootMargin: '200px', threshold: 0 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [page, hasMore, loadingMore, loading, fetchPage])

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showDropdown])

  const onChange = (e) => setQuery(e.target.value)

  const createProduct = async () => {
    if (!productNameInput.trim()) {
      alert('Введите название товара')
      return
    }

    setCreating(true)
    try {
      const response = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: productNameInput.trim() })
      })

      if (!response.ok) {
        throw new Error('Ошибка при создании товара')
      }

      const newProduct = await response.json()
      setProducts(prev => [newProduct, ...prev])
      setProductNameInput('')
      setShowCreateProduct(false)
      // После успешного создания товара закрываем режим редактирования
      setIsEditMode(false)
      setSelectedProducts(new Set())
      alert('Товар успешно создан!')
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Ошибка при создании товара')
    } finally {
      setCreating(false)
    }
  }

  const importExcel = async () => {
    if (!excelFile) {
      alert('Выберите Excel файл')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('excelFile', excelFile)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/products/import`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        let message = `Импорт завершен!\nСоздано товаров: ${result.createdProducts?.length || 0}\nУдалено товаров: ${result.deletedProducts?.length || 0}\nВсего в Excel: ${result.totalInExcel || 0}\nВсего в БД было: ${result.totalInDatabase || 0}`
        
        if (result.errors && result.errors.length > 0) {
          message += `\nОшибки: ${result.errors.length}`
        }
        
        alert(message)
        setExcelFile(null)
        setShowExcelImport(false)
        // После успешного импорта закрываем режим редактирования
        setIsEditMode(false)
        setSelectedProducts(new Set())
        // Обновляем список товаров
        window.location.reload()
      } else {
        alert(`Ошибка импорта: ${result.error}`)
      }
    } catch (error) {
      console.error('Error importing products:', error)
      alert('Ошибка при импорте товаров')
    } finally {
      setImporting(false)
    }
  }

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const selectAllProducts = () => {
    setSelectedProducts(new Set(products.map(p => p.id)))
  }

  const clearSelection = () => {
    setSelectedProducts(new Set())
  }

  const deleteSelectedProducts = async () => {
    if (selectedProducts.size === 0) {
      alert('Выберите товары для удаления')
      return
    }

    const productNames = products
      .filter(p => selectedProducts.has(p.id))
      .map(p => p.name)
      .join(', ')

    if (!confirm(`Вы уверены, что хотите удалить следующие товары?\n\n${productNames}\n\nЭто действие нельзя отменить.`)) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`${API_BASE}/api/products/batch`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productIds: Array.from(selectedProducts) })
      })

      if (!response.ok) {
        throw new Error('Ошибка при удалении товаров')
      }

      const result = await response.json()
      setProducts(prev => prev.filter(p => !selectedProducts.has(p.id)))
      setSelectedProducts(new Set())
      alert(`Успешно удалено товаров: ${result.deletedProducts.length}`)
    } catch (error) {
      console.error('Error deleting products:', error)
      alert('Ошибка при удалении товаров')
    } finally {
      setDeleting(false)
    }
  }

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode)
    if (isEditMode) {
      // При выходе из режима редактирования очищаем выбор
      setSelectedProducts(new Set())
    } else {
      // При включении режима редактирования закрываем форму создания товара
      setShowCreateProduct(false)
      setProductNameInput('')
    }
  }

  const content = useMemo(() => {
    if (loading && products.length === 0) return <div className="text-gray-500">Загрузка...</div>
    if (error && products.length === 0) return <div className="text-red-600">{error}</div>
    if (!loading && !error && products.length === 0) return <div className="text-gray-500">Ничего не найдено</div>
    return (
      <div className="grid gap-3">
        {products.map((p) => (
          <div
            key={p.id}
            className={`px-4 py-3 rounded-xl bg-white flex items-center gap-4 ${
              isEditMode && selectedProducts.has(p.id) ? 'px-4 py-3 rounded-xl bg-white shadow hover:shadow-md-selected' : ''
            }`}
          >
            {isEditMode && (
              <input
                type="checkbox"
                checked={selectedProducts.has(p.id)}
                onChange={() => toggleProductSelection(p.id)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
            )}
            <Link
              to={`/products/${p.id}`}
              className={`${isEditMode ? 'flex-1' : ''} -my-3 -mx-4 py-3 px-4 flex-1 text-gray-800`}
            >
              {p.name}
            </Link>
          </div>
        ))}
        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} />
        {loadingMore && (
          <div className="text-gray-500 py-3">Загрузка...</div>
        )}
        {!hasMore && products.length > 0 && (
          <div className="text-gray-400 py-3 text-sm text-center">Это все результаты</div>
        )}
      </div>
    )
  }, [loading, loadingMore, hasMore, error, products, selectedProducts, isEditMode])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold">Список товаров</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {user.role === 'admin' && (
              <div className="relative dropdown-container">
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  Управление
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        toggleEditMode()
                        setShowDropdown(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {isEditMode ? 'Завершить редактирование' : 'Редактировать товары'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateProduct(!showCreateProduct)
                        setShowDropdown(false)
                        // При создании товара закрываем режим редактирования и импорт Excel
                        if (!showCreateProduct) {
                          setIsEditMode(false)
                          setSelectedProducts(new Set())
                          setShowExcelImport(false)
                          setExcelFile(null)
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Новый товар
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowExcelImport(!showExcelImport)
                        setShowDropdown(false)
                        // При импорте закрываем режим редактирования и создание товара
                        if (!showExcelImport) {
                          setIsEditMode(false)
                          setSelectedProducts(new Set())
                          setShowCreateProduct(false)
                          setProductNameInput('')
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Импорт из Excel
                    </button>
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
        <input
          type="text"
          value={query}
          onChange={onChange}
          placeholder="Поиск по имени..."
          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Фильтр:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPositionsFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                positionsFilter === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setPositionsFilter('with')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                positionsFilter === 'with'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              С точками
            </button>
            <button
              onClick={() => setPositionsFilter('without')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                positionsFilter === 'without'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Без точек
            </button>
          </div>
        </div>
        
            {user.role === 'admin' && isEditMode && products.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={selectAllProducts}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Выбрать все
            </button>
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Очистить выбор
            </button>
            <span className="text-sm text-gray-600">
              {selectedProducts.size > 0 ? `Выбрано: ${selectedProducts.size} из ${products.length}` : ''}
            </span>
            
            {selectedProducts.size > 0 && (
              <>
                <button
                  onClick={deleteSelectedProducts}
                  disabled={deleting}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Удаление...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Удалить выбранные
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
        
        {user.role === 'admin' && showCreateProduct && (
          <div className="bg-white p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-3">Создать новый товар</h3>
              <div className="flex gap-3 flex-col">
              <input
                type="text"
                value={productNameInput}
                onChange={(e) => setProductNameInput(e.target.value)}
                placeholder="Название товара..."
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                disabled={creating}
              />
              <div className="flex gap-2">
              <button
                onClick={createProduct}
                disabled={creating || !productNameInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Создание...
                  </>
                ) : (
                  'Создать'
                )}
              </button>
              <button
                onClick={() => {
                  setShowCreateProduct(false)
                  setProductNameInput('')
                  // При отмене создания товара закрываем режим редактирования
                  setIsEditMode(false)
                  setSelectedProducts(new Set())
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                Отмена
              </button>
              </div>
              </div>
          </div>
        )}

        {user.role === 'admin' && showExcelImport && (
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Импорт товаров из Excel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите Excel файл (.xlsx, .xls)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={importing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Названия товаров должны быть в первом столбце Excel файла
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={importExcel}
                  disabled={!excelFile || importing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Импорт...
                    </>
                  ) : (
                    'Импортировать'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowExcelImport(false)
                    setExcelFile(null)
                    // При отмене импорта закрываем режим редактирования
                    setIsEditMode(false)
                    setSelectedProducts(new Set())
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
        
        {content}
      </div>
    </div>
  )
}

function ProductDetail({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [warehouses, setWarehouses] = useState([])
  const [productName, setProductName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false)
  const [warehouseNameInput, setWarehouseNameInput] = useState('')

  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        // Загружаем информацию о товаре
        const productRes = await fetch(`${API_BASE}/api/products/${id}`)
        if (productRes.ok) {
          const productData = await productRes.json()
          if (!ignore) setProductName(productData.name || `Товар #${id}`)
        }
        
        // Загружаем все склады; если points_count отсутствует, досчитываем через /warehouses/:id/map
        const res = await fetch(`${API_BASE}/api/warehouses?productId=${id}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (!ignore) {
          const list = Array.isArray(data) ? data : []
          const augmented = await Promise.all(
            list.map(async (w) => {
              if (typeof w.points_count === 'number') return w
              try {
                const mres = await fetch(`${API_BASE}/api/warehouses/${w.id}/map?productId=${id}`)
                if (mres.ok) {
                  const m = await mres.json()
                  const count = Array.isArray(m.positions) ? m.positions.length : 0
                  return { ...w, points_count: count }
                }
              } catch {}
              return { ...w, points_count: 0 }
            })
          )
          setWarehouses(augmented)
        }
      } catch (e) {
        if (!ignore) setError('Ошибка загрузки складов')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [id])

  const createWarehouse = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/warehouses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: warehouseNameInput })
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при создании склада')
      }
      
      const newWarehouse = await response.json()
      setShowCreateWarehouse(false)
      setWarehouseNameInput('')
      
      alert(`Склад "${newWarehouse.name}" успешно создан!`)
      
      // Обновляем список складов
      const res = await fetch(`${API_BASE}/api/warehouses`)
      if (res.ok) {
        const data = await res.json()
        setWarehouses(data || [])
      }
    } catch (error) {
      console.error('Error creating warehouse:', error)
      alert('Ошибка при создании склада')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4"> 
        <button 
          onClick={() => navigate(-1)} 
          className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
        {user.role === 'admin' && (
          <button 
              onClick={() => setShowCreateWarehouse(!showCreateWarehouse)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              {showCreateWarehouse ? 'Отменить' : 'Новый склад'}
            </button>
        )}
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{productName || `Товар #${id}`}</h2>
          
        </div>
        {user.role === 'admin' && showCreateWarehouse && (
          <div className="bg-white p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-3">Создать новый склад</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={warehouseNameInput}
                onChange={(e) => setWarehouseNameInput(e.target.value)}
                placeholder="Введите название нового склада"
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={createWarehouse}
                  disabled={!warehouseNameInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  Создать
                </button>
                <button
                  onClick={() => {
                    setShowCreateWarehouse(false)
                    setWarehouseNameInput('')
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  Отменить
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {loading && <div className="text-gray-500">Загрузка...</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && !error && (
            <div className="grid gap-3">
              {warehouses.map((w) => (
                <Link
                  key={w.id}
                  to={`/products/${id}/warehouses/${w.id}`}
                  className="px-4 py-3 rounded-xl bg-white flex items-center justify-between"
                >
                  <div className="text-gray-800">{w.name}</div>
                  {typeof w.points_count === 'number' && (
                    <span className="text-sm text-gray-600">Точек: {w.points_count}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WarehouseMap({ user }) {
  const { id, productId } = useParams()
  const navigate = useNavigate()
  const [positions, setPositions] = useState([])
  const [hoverPosition, setHoverPosition] = useState(null)
  const [draggedPosition, setDraggedPosition] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showDeleteButton, setShowDeleteButton] = useState(null)
  const [error, setError] = useState('')
  const [productName, setProductName] = useState('')
  const [warehouseName, setWarehouseName] = useState('')
  const [warehouseImage, setWarehouseImage] = useState('/warehouse-scheme.svg')
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [containerHeight, setContainerHeight] = useState(500)
  const [showWarehouseEdit, setShowWarehouseEdit] = useState(false)
  const [warehouseNameInput, setWarehouseNameInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeAction, setActiveAction] = useState(null) // null, 'image', 'name', 'edit'
  const [lastTap, setLastTap] = useState(0)
  const [wasDragging, setWasDragging] = useState(false)

  const calculateContainerHeight = (imageUrl, containerWidth = null) => {
    const img = new Image()
    img.onload = () => {
      const aspectRatio = img.height / img.width
      // Получаем реальную ширину контейнера или используем переданную
      const actualWidth = containerWidth || (document.querySelector('.warehouse-container')?.offsetWidth || 800)
      const calculatedHeight = Math.min(actualWidth * aspectRatio, 1000) // Максимум 1000px
      setContainerHeight(Math.max(calculatedHeight, 300)) // Минимум 300px
    }
    img.src = imageUrl.startsWith('/uploads/') ? `${API_BASE}${imageUrl}` : imageUrl
  }

  useEffect(() => {
    let resizeTimeout
    const handleResize = () => {
      if (warehouseImage) {
        clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
          const container = document.querySelector('.warehouse-container')
          const containerWidth = container?.offsetWidth || 800
          calculateContainerHeight(warehouseImage, containerWidth)
        }, 150)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [warehouseImage])

  // Закрытие дропдауна при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  // Синхронизация состояний - только одно действие может быть активно
  useEffect(() => {
    if (activeAction === 'image') {
      setShowWarehouseEdit(false)
      setIsEditMode(false)
      setWarehouseNameInput('')
    } else if (activeAction === 'name') {
      setShowImageUpload(false)
      setIsEditMode(false)
    } else if (activeAction === 'edit') {
      setShowImageUpload(false)
      setShowWarehouseEdit(false)
      setWarehouseNameInput('')
    } else if (activeAction === null) {
      setShowImageUpload(false)
      setShowWarehouseEdit(false)
      setIsEditMode(false)
      setWarehouseNameInput('')
    }
  }, [activeAction])

  useEffect(() => {
    let ignore = false
    async function load() {
      setError('')
      try {
        // Загружаем информацию о товаре
        if (productId) {
          const productRes = await fetch(`${API_BASE}/api/products/${productId}`)
          if (productRes.ok) {
            const productData = await productRes.json()
            if (!ignore) setProductName(productData.name || `Товар #${productId}`)
          }
        }

        // Загружаем информацию о складе
        const warehouseRes = await fetch(`${API_BASE}/api/warehouses/${id}`)
        if (warehouseRes.ok) {
          const warehouseData = await warehouseRes.json()
          if (!ignore) {
            setWarehouseName(warehouseData.name || `Склад #${id}`)
            const imagePath = warehouseData.image_path || '/warehouse-scheme.svg'
            setWarehouseImage(imagePath)
            calculateContainerHeight(imagePath)
          }
        } else {
          // Fallback к мок-данным
          const warehouseNames = {
            1: "Главный склад",
            2: "Резервный склад", 
            3: "Региональный склад"
          }
          if (!ignore) setWarehouseName(warehouseNames[id] || `Склад #${id}`)
        }

        // Загружаем позиции
        const url = new URL(`${API_BASE}/api/warehouses/${id}/map`)
        if (productId) {
          url.searchParams.set('productId', productId)
        }
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (!ignore) {
          setPositions(data.positions || [])
        }
      } catch (e) {
        if (!ignore) setError('Ошибка загрузки карты склада, показаны мок-данные')
        if (!ignore) {
          // fallback mock data
          setPositions([
            { x: 20, y: 15 },
            { x: 30, y: 15 },
            { x: 50, y: 25 },
            { x: 70, y: 50 }
          ])
        }
      }
    }
    load()
    return () => { ignore = true }
  }, [id, productId])

  const addPosition = (event) => {
    if (!isEditMode) return
    
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    
    setPositions([...positions, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }])
  }

  const addRandomPosition = () => {
    if (!isEditMode) return
    
    // Генерируем случайные координаты с отступами от краев (10-90% от размера контейнера)
    const x = Math.random() * 80 + 10 // 10-90%
    const y = Math.random() * 80 + 10 // 10-90%
    
    setPositions([...positions, { x, y }])
  }

  const handleDoubleClickOnMap = (event) => {
    if (!isEditMode) return
    event.stopPropagation()
    addPosition(event)
    setShowDeleteButton(null)
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/warehouses/${id}/image`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setWarehouseImage(result.imagePath)
        calculateContainerHeight(result.imagePath)
        setShowImageUpload(false)
        setActiveAction(null)
        alert('Изображение успешно загружено!')
      } else {
        alert('Ошибка при загрузке изображения')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Ошибка при загрузке изображения')
    }
  }

  const removePosition = (index) => {
    setPositions(positions.filter((_, i) => i !== index))
    setShowDeleteButton(null)
  }

  const handleDoubleClick = (index, event) => {
    if (!isEditMode) return
    event.stopPropagation()
    setShowDeleteButton(showDeleteButton === index ? null : index)
  }

  const startDrag = (index, event) => {
    if (!isEditMode) return
    event.preventDefault()
    setDraggedPosition(index)
  }

  const handleDrag = (event) => {
    if (draggedPosition === null) return
    
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    
    const newPositions = [...positions]
    newPositions[draggedPosition] = { 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    }
    setPositions(newPositions)
  }

  const endDrag = () => {
    setDraggedPosition(null)
    setWasDragging(false)
  }

  // Touch события для поддержки тачскринов
  const startTouchDrag = (index, event) => {
    if (!isEditMode) return
    // Не вызываем preventDefault для passive событий
    setDraggedPosition(index)
  }

  const handleTouchMove = (event) => {
    if (draggedPosition === null) return
    // Не вызываем preventDefault для passive событий
    
    setWasDragging(true)
    
    const touch = event.touches[0]
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100
    
    const newPositions = [...positions]
    newPositions[draggedPosition] = { 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    }
    setPositions(newPositions)
  }

  // Обработка двойного тапа для тачскринов
  const handleTouchTap = (index, event) => {
    if (!isEditMode) return
    
    const currentTime = new Date().getTime()
    const tapLength = currentTime - lastTap
    
    if (tapLength < 500 && tapLength > 0) {
      // Двойной тап - показываем/скрываем кнопку удаления
      // Не вызываем preventDefault для passive событий
      handleDoubleClick(index, event)
    }
    
    setLastTap(currentTime)
  }

  // Обработка двойного тапа для карты (добавление новых точек)
  const handleMapTouchTap = (event) => {
    if (!isEditMode) return
    
    // Не обрабатываем если это не карта или если был drag
    if (event.target !== event.currentTarget || wasDragging) {
      return
    }
    
    const currentTime = new Date().getTime()
    const tapLength = currentTime - lastTap
    
    if (tapLength < 500 && tapLength > 0) {
      // Двойной тап - добавляем новую точку
      // Не вызываем preventDefault для passive событий
      addPosition(event)
      setShowDeleteButton(null)
    }
    
    setLastTap(currentTime)
  }

  const savePositions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/warehouses/${id}/positions`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          productId: Number(productId),
          positions: positions
        })
      })
      
      if (response.ok) {
        alert('Позиции сохранены успешно!')
        setIsEditMode(false)
        setActiveAction(null)
      } else {
        alert('Ошибка при сохранении позиций')
      }
    } catch (error) {
      console.error('Error saving positions:', error)
      alert('Ошибка при сохранении позиций')
    }
  }

  const updateWarehouseName = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/warehouses/${id}/name`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: warehouseNameInput })
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при обновлении названия склада')
      }
      
      setWarehouseName(warehouseNameInput)
      setShowWarehouseEdit(false)
      setWarehouseNameInput('')
      setActiveAction(null)
    } catch (error) {
      console.error('Error updating warehouse name:', error)
      alert('Ошибка при обновлении названия склада')
    }
  }

  const deleteWarehouse = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот склад? Это действие нельзя отменить.')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/warehouses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Ошибка при удалении склада')
      }

      alert('Склад успешно удален!')
      navigate('/') // Перенаправляем на главную страницу
    } catch (error) {
      console.error('Error deleting warehouse:', error)
      alert('Ошибка при удалении склада')
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <div className="relative dropdown-container">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Управление</span>
              <span className="sm:hidden">Меню</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  {activeAction === null && (
                    <>
                      {/* Кнопка редактирования точек - доступна всем */}
                      <button
                        onClick={() => {
                          setActiveAction('edit')
                          setIsEditMode(true)
                          setShowDeleteButton(null)
                          setShowDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Редактировать точки
                      </button>
                      
                      {/* Остальные функции - только для админов */}
                      {user.role === 'admin' && (
                        <>
                          <button
                            onClick={() => {
                              setActiveAction('image')
                              setShowImageUpload(true)
                              setShowDropdown(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Изменить схему
                          </button>
                          
                          <button
                            onClick={() => {
                              setActiveAction('name')
                              setShowWarehouseEdit(true)
                              setShowDropdown(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Изменить название
                          </button>
                          
                          <button
                            onClick={() => {
                              deleteWarehouse()
                              setShowDropdown(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Удалить склад
                          </button>
                        </>
                      )}
                    </>
                  )}
                  
                  {activeAction === 'image' && (
                    <button
                      onClick={() => {
                        setActiveAction(null)
                        setShowImageUpload(false)
                        setShowDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Отменить загрузку
                    </button>
                  )}
                  
                  {activeAction === 'name' && (
                    <button
                      onClick={() => {
                        setActiveAction(null)
                        setShowWarehouseEdit(false)
                        setWarehouseNameInput('')
                        setShowDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Отменить редактирование названия
                    </button>
                  )}
                  
                  {activeAction === 'edit' && (
                    <>
                      <button
                        onClick={() => {
                          savePositions()
                          setActiveAction(null)
                          setIsEditMode(false)
                          setShowDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Сохранить
                      </button>
                      
                      <button
                        onClick={() => {
                          setActiveAction(null)
                          setIsEditMode(false)
                          setShowDeleteButton(null)
                          setShowDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Отменить редактирование
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold">
          {productName && warehouseName ? `${productName}, ${warehouseName}` : `Склад #${id}`}
        </h2>
        {error && <div className="text-amber-600 text-sm">{error}</div>}
        {showImageUpload && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-purple-800 font-medium mb-3">Загрузка схемы склада</h3>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="text-purple-700 text-sm">
                Поддерживаемые форматы: JPG, PNG, GIF, SVG. Максимальный размер: 5MB
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowImageUpload(false)
                    setActiveAction(null)
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                >
                  Отменить
                </button>
              </div>
            </div>
          </div>
        )}
        {showWarehouseEdit && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-orange-800 font-medium mb-3">Изменить название склада</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={warehouseNameInput}
                onChange={(e) => setWarehouseNameInput(e.target.value)}
                placeholder="Введите новое название склада"
                className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={updateWarehouseName}
                  disabled={!warehouseNameInput.trim()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setActiveAction(null)
                    setShowWarehouseEdit(false)
                    setWarehouseNameInput('')
                    setShowDropdown(false)
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Отменить
                </button>
              </div>
            </div>
          </div>
        )}
        {isEditMode && (
          <button
            onClick={addRandomPosition}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 hover:border-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Создать точку</span>
            <span className="sm:hidden">Точка</span>
          </button>
        )}
          
        <div className="bg-white rounded-xl p-4">
          <div
            className="relative w-full warehouse-container"
            style={{ height: `${containerHeight}px` }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                addPosition(e)
                setShowDeleteButton(null)
              }
            }}
            onDoubleClick={handleDoubleClickOnMap}
            onMouseMove={handleDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchMove={handleTouchMove}
            onTouchEnd={(e) => {
              endDrag()
              handleMapTouchTap(e)
            }}
          >
            <img 
              src={warehouseImage.startsWith('/uploads/') ? `${API_BASE}${warehouseImage}` : warehouseImage} 
              alt="Схема склада" 
              className="absolute inset-0 w-full h-full object-contain rounded-lg"
              onError={(e) => {
                console.log('Image failed to load, falling back to default');
                e.target.src = '/warehouse-scheme.svg';
                setWarehouseImage('/warehouse-scheme.svg');
              }}
            />
            <div className="absolute inset-0">
              {positions.map((position, index) => {
                const isHover = hoverPosition === index
                const isDragging = draggedPosition === index
                return (
                  <div
                    key={index}
                    className="absolute position-point"
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onMouseEnter={() => setHoverPosition(index)}
                    onMouseLeave={() => setHoverPosition(null)}
                    onMouseDown={(e) => startDrag(index, e)}
                    onTouchStart={(e) => startTouchDrag(index, e)}
                    onTouchEnd={(e) => handleTouchTap(index, e)}
                    onDoubleClick={(e) => handleDoubleClick(index, e)}
                  >
                    <span className={
                      `block rounded-full transition-all ${
                        isEditMode ? 'cursor-move' : 'cursor-pointer'
                      } ${
                        isDragging ? 'scale-150 bg-red-500 ring-4 ring-red-300 shadow-lg' :
                        isHover ? 'scale-125 bg-orange-500 ring-4 ring-orange-300 shadow-lg' : 
                        'bg-orange-500 hover:scale-110 border-2 border-orange-300'
                      }`}
                      style={{
                        width: isEditMode ? '20px' : '16px',
                        height: isEditMode ? '20px' : '16px'
                      }}
                    />
                    {isEditMode && showDeleteButton === index && (
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removePosition(index)
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full shadow-lg transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {isEditMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Режим редактирования:</strong> Создайте точку при помощи кнопки, 
              перетащите существующие точки для перемещения, двойной клик/тап по существующей точке для показа кнопки удаления.
            </p>
          </div>
        )}
        
      </div>
    </div>
  )
}

// Компонент навигации
function Navigation({ user, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Логотип */}
          <Link to="/" className="text-xl font-bold text-gray-900">
            Склад
          </Link>

          {/* Десктопное меню */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex space-x-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900">
                Товары
              </Link>
              {user.role === 'admin' && (
                <Link to="/users" className="text-gray-600 hover:text-gray-900">
                  Пользователи
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.username} ({user.role === 'admin' ? 'Администратор' : 'Работник'})
              </span>
              <button
                onClick={onLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Выйти
              </button>
            </div>
          </div>

          {/* Мобильная кнопка меню */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Мобильное меню */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
            <div className="pt-4 space-y-3">
              <Link 
                to="/" 
                className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Товары
              </Link>
              {user.role === 'admin' && (
                <Link 
                  to="/users" 
                  className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Пользователи
                </Link>
              )}
              <div className="pt-3 border-t border-gray-200">
                <div className="px-3 py-2 text-sm text-gray-600">
                  {user.username} ({user.role === 'admin' ? 'Администратор' : 'Работник'})
                </div>
                <button
                  onClick={() => {
                    onLogout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// Защищенный маршрут
function ProtectedRoute({ children, user }) {
  if (!user) {
    return <div className="text-center text-gray-500">Загрузка...</div>
  }
  return children
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Проверяем, есть ли сохраненный токен
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      // Проверяем токен на сервере
      fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json()
        } else {
          throw new Error('Invalid token')
        }
      })
      .then(data => {
        setUser(data.user)
      })
      .catch(() => {
        // Токен недействителен, очищаем localStorage
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      })
      .finally(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} onLogout={handleLogout} />
        <Routes>
          <Route 
            path="/" 
            element={
              <ProtectedRoute user={user}>
                <ProductsList user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/products/:id" 
            element={
              <ProtectedRoute user={user}>
                <ProductDetail user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/products/:productId/warehouses/:id" 
            element={
              <ProtectedRoute user={user}>
                <WarehouseMap user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/users" 
            element={
              <ProtectedRoute user={user}>
                <UserManagement user={user} />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

