// Этот скрипт предназначен для статической версии приложения
// Он использует только localStorage для хранения истории поиска

// Получаем Telegram ID из URL
const urlParams = new URLSearchParams(window.location.search);
const telegramUserId = urlParams.get('user_id');

// Отображаем Telegram ID пользователя, если он есть
if (telegramUserId) {
  document.getElementById('telegramUserIdDisplay').textContent = `Telegram ID: ${telegramUserId}`;
}

// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;
tg.expand();

// Глобальные переменные для хранения данных
let carsData = [];
let filteredCars = [];
let currentSearchParams = {};

// Загрузка данных автомобилей
async function loadCarsData() {
  try {
    const response = await fetch('cars.json');
    carsData = await response.json();
    filteredCars = [...carsData];
    displayCars(filteredCars);
    loadBrands();
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
  }
}

// Загрузка списка марок автомобилей
function loadBrands() {
  const brandSelect = document.getElementById('brand');
  const brands = [...new Set(carsData.map(car => car.brand))].sort();
  
  brands.forEach(brand => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    brandSelect.appendChild(option);
  });
}

// Отображение автомобилей
function displayCars(cars) {
  const carsContainer = document.getElementById('carsContainer');
  carsContainer.innerHTML = '';
  
  if (cars.length === 0) {
    carsContainer.innerHTML = '<p class="no-results">Нет автомобилей, соответствующих выбранным критериям</p>';
    return;
  }
  
  cars.forEach(car => {
    const carCard = document.createElement('div');
    carCard.className = 'car-card';
    
    carCard.innerHTML = `
      <h3>${car.brand} ${car.model}</h3>
      <p><strong>Тип кузова:</strong> ${car.body_type}</p>
      <p><strong>Двигатель:</strong> ${car.engine_type}</p>
      <p><strong>Год выпуска:</strong> ${car.year}</p>
      <p><strong>Цена:</strong> ${car.price.toLocaleString()} ₽</p>
      <p><strong>Пробег:</strong> ${car.mileage.toLocaleString()} км</p>
    `;
    
    carsContainer.appendChild(carCard);
  });
}

// Применение фильтров
async function applyFilters() {
  const brand = document.getElementById('brand').value;
  const bodyType = document.getElementById('bodyType').value;
  const engineType = document.getElementById('engineType').value;
  const yearFrom = parseInt(document.getElementById('yearFrom').value) || 0;
  const yearTo = parseInt(document.getElementById('yearTo').value) || 3000;
  const priceFrom = parseInt(document.getElementById('priceFrom').value) || 0;
  const priceTo = parseInt(document.getElementById('priceTo').value) || 100000000;
  const mileageMax = parseInt(document.getElementById('mileageMax').value) || 1000000;
  
  // Сохраняем параметры текущего поиска
  currentSearchParams = {
    brand,
    body_type: bodyType,
    engine_type: engineType,
    year_from: yearFrom,
    year_to: yearTo,
    price_from: priceFrom,
    price_to: priceTo,
    mileage_max: mileageMax,
    telegram_user_id: telegramUserId || 'anonymous'
  };
  
  // Применяем фильтры
  filteredCars = carsData.filter(car => {
    if (brand && car.brand !== brand) return false;
    if (bodyType && car.body_type !== bodyType) return false;
    if (engineType && car.engine_type !== engineType) return false;
    if (yearFrom && car.year < yearFrom) return false;
    if (yearTo && car.year > yearTo) return false;
    if (priceFrom && car.price < priceFrom) return false;
    if (priceTo && car.price > priceTo) return false;
    if (mileageMax && car.mileage > mileageMax) return false;
    return true;
  });
  
  // Отображаем отфильтрованные автомобили
  displayCars(filteredCars);
  
  // Сохраняем историю поиска
  await saveSearchHistory(currentSearchParams);
}

// Сохранение истории поиска
async function saveSearchHistory(searchData) {
  // Добавляем метку времени
  searchData.timestamp = new Date().toISOString();
  
  try {
    // Сохраняем в localStorage
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    history.unshift(searchData);
    
    // Ограничиваем историю до 100 записей
    if (history.length > 100) {
      history.pop();
    }
    
    localStorage.setItem('searchHistory', JSON.stringify(history));
    console.log('✅ История поиска сохранена локально');
  } catch (e) {
    console.error('❌ Ошибка при сохранении истории локально:', e);
  }
  
  // Если это Telegram WebApp, отправляем данные обратно в бот
  if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    tg.sendData(JSON.stringify(searchData));
    console.log('✅ Данные отправлены в Telegram бот');
  }
}

// Загрузка истории поиска
async function loadSearchHistory() {
  try {
    // Получаем историю из localStorage
    let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    
    // Если есть Telegram ID, фильтруем историю для этого пользователя
    if (telegramUserId) {
      history = history.filter(item => item.telegram_user_id === telegramUserId);
    }
    
    // Отображаем историю
    displaySearchHistory(history);
  } catch (error) {
    console.error('❌ Ошибка при загрузке истории поиска:', error);
  }
}

// Отображение истории поиска
function displaySearchHistory(history) {
  const historyContainer = document.getElementById('searchHistoryContainer');
  historyContainer.innerHTML = '';
  
  if (history.length === 0) {
    historyContainer.innerHTML = '<p>История поиска пуста</p>';
    return;
  }
  
  history.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    // Форматируем дату
    const date = new Date(item.timestamp);
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    
    // Создаем содержимое элемента истории
    let content = `<p><strong>Дата:</strong> ${formattedDate}</p>`;
    
    if (item.brand) content += `<p><strong>Марка:</strong> ${item.brand}</p>`;
    if (item.body_type) content += `<p><strong>Тип кузова:</strong> ${item.body_type}</p>`;
    if (item.engine_type) content += `<p><strong>Двигатель:</strong> ${item.engine_type}</p>`;
    
    if (item.year_from || item.year_to) {
      content += `<p><strong>Год:</strong> ${item.year_from || ''} - ${item.year_to || ''}</p>`;
    }
    
    if (item.price_from || item.price_to) {
      content += `<p><strong>Цена:</strong> ${item.price_from?.toLocaleString() || ''} - ${item.price_to?.toLocaleString() || ''} ₽</p>`;
    }
    
    if (item.mileage_max) {
      content += `<p><strong>Макс. пробег:</strong> ${item.mileage_max.toLocaleString()} км</p>`;
    }
    
    // Добавляем кнопку для повторного применения фильтров
    content += `<button class="apply-history-button">Применить фильтры</button>`;
    
    historyItem.innerHTML = content;
    
    // Добавляем обработчик для кнопки
    historyItem.querySelector('.apply-history-button').addEventListener('click', () => {
      applyHistoryFilters(item);
    });
    
    historyContainer.appendChild(historyItem);
  });
}

// Применение фильтров из истории
function applyHistoryFilters(historyItem) {
  // Устанавливаем значения фильтров
  document.getElementById('brand').value = historyItem.brand || '';
  document.getElementById('bodyType').value = historyItem.body_type || '';
  document.getElementById('engineType').value = historyItem.engine_type || '';
  document.getElementById('yearFrom').value = historyItem.year_from || '';
  document.getElementById('yearTo').value = historyItem.year_to || '';
  document.getElementById('priceFrom').value = historyItem.price_from || '';
  document.getElementById('priceTo').value = historyItem.price_to || '';
  document.getElementById('mileageMax').value = historyItem.mileage_max || '';
  
  // Применяем фильтры
  applyFilters();
}

// Очистка фильтров
function clearFilters() {
  document.getElementById('brand').value = '';
  document.getElementById('bodyType').value = '';
  document.getElementById('engineType').value = '';
  document.getElementById('yearFrom').value = '';
  document.getElementById('yearTo').value = '';
  document.getElementById('priceFrom').value = '';
  document.getElementById('priceTo').value = '';
  document.getElementById('mileageMax').value = '';
  
  // Сбрасываем фильтры и отображаем все автомобили
  filteredCars = [...carsData];
  displayCars(filteredCars);
}

// Переключение между вкладками
function switchTab(tabName) {
  // Скрываем все вкладки
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Отображаем выбранную вкладку
  document.getElementById(tabName).style.display = 'block';
  
  // Обновляем активную вкладку
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Если выбрана вкладка истории, загружаем историю
  if (tabName === 'historyTab') {
    loadSearchHistory();
  }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  // Загружаем данные автомобилей
  loadCarsData();
  
  // Настраиваем обработчики событий
  document.getElementById('applyFiltersButton').addEventListener('click', applyFilters);
  document.getElementById('clearFiltersButton').addEventListener('click', clearFilters);
  
  // Настраиваем переключение вкладок
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });
  
  // По умолчанию показываем вкладку поиска
  switchTab('searchTab');
});

// Если это Telegram WebApp, настраиваем обработчик для кнопки "Назад"
if (tg.BackButton) {
  tg.BackButton.onClick(() => {
    // Если открыта вкладка истории, возвращаемся к поиску
    if (document.getElementById('historyTab').style.display === 'block') {
      switchTab('searchTab');
    } else {
      // Иначе закрываем WebApp
      tg.close();
    }
  });
}
