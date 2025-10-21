/* app.js - simple client-side logic with localStorage persistence */

// --- Helpful utilities ---
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 9);
}

function daysBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.max(0, Math.ceil(ms / (1000*60*60*24)));
}

// --- Storage keys ---
const STORAGE = {
  CARS: 'car_rental_cars_v1',
  BOOKINGS: 'car_rental_bookings_v1'
};

// --- Default demo data (only added once) ---
const defaultCars = [
  { id: uid(), name: 'Honda City', type: 'Sedan', price: 3000, image: '' },
  { id: uid(), name: 'Maruti Swift', type: 'Hatchback', price: 2000, image: '' },
  { id: uid(), name: 'Toyota Innova', type: 'SUV', price: 4000, image: '' },
  { id: uid(), name: 'Mahindra Scorpio', type: 'SUV', price: 4200, image: '' }
];

function getCars() {
  const raw = localStorage.getItem(STORAGE.CARS);
  if (!raw) {
    localStorage.setItem(STORAGE.CARS, JSON.stringify(defaultCars));
    return defaultCars.slice();
  }
  return JSON.parse(raw);
}

function setCars(list) {
  localStorage.setItem(STORAGE.CARS, JSON.stringify(list));
}

function getBookings() {
  const raw = localStorage.getItem(STORAGE.BOOKINGS);
  return raw ? JSON.parse(raw) : [];
}

function setBookings(list) {
  localStorage.setItem(STORAGE.BOOKINGS, JSON.stringify(list));
}

// --- UI rendering ---
function renderCars(filter = '') {
  const grid = $('#carsGrid');
  grid.innerHTML = '';
  const cars = getCars().filter(c => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q);
  });

  if (cars.length === 0) {
    $('#noCarsMsg').style.display = 'block';
  } else {
    $('#noCarsMsg').style.display = 'none';
  }

  cars.forEach(car => {
    const div = document.createElement('div');
    div.className = 'card car-card';
    div.innerHTML = `
      <img src="${car.image || 'https://picsum.photos/seed/' + encodeURIComponent(car.name) + '/600/360'}" alt="${car.name}" />
      <h4>${car.name}</h4>
      <p class="muted">${car.type}</p>
      <p><strong>₹${car.price.toLocaleString()}</strong> / day</p>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn primary btn-book" data-id="${car.id}">Book</button>
        <button class="btn btn-details" data-id="${car.id}">Details</button>
      </div>
    `;
    grid.appendChild(div);
  });
}

function renderManageCars() {
  const list = $('#manageCarsList');
  list.innerHTML = '';
  const cars = getCars();
  cars.forEach(car => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <h4>${car.name}</h4>
      <p class="muted">${car.type} — ₹${car.price.toLocaleString()} / day</p>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn small btn-edit" data-id="${car.id}">Edit</button>
        <button class="btn small btn-delete" data-id="${car.id}">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderBookings() {
  const container = $('#bookingsList');
  const bookings = getBookings();
  container.innerHTML = '';
  if (bookings.length === 0) {
    $('#noBookingsMsg').style.display = 'block';
    return;
  }
  $('#noBookingsMsg').style.display = 'none';

  bookings.forEach(b => {
    const car = getCars().find(c => c.id === b.carId) || { name: 'Unknown' };
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <h4>${car.name}</h4>
      <p>${b.renterName} • ${b.renterPhone}</p>
      <p class="muted">${b.startDate} → ${b.endDate} (${b.days} days)</p>
      <p><strong>₹${b.total.toLocaleString()}</strong></p>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn small btn-cancel" data-id="${b.id}">Cancel</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// --- Modal helpers ---
function openModal(car) {
  $('#modalCarId').value = car.id;
  $('#modalCarName').textContent = `Book: ${car.name} — ₹${car.price.toLocaleString()}/day`;
  $('#startDate').value = '';
  $('#endDate').value = '';
  $('#renterName').value = '';
  $('#renterPhone').value = '';
  $('#pricePreview').textContent = '₹0';
  $('#bookingModal').setAttribute('aria-hidden', 'false');
}

function closeModal() {
  $('#bookingModal').setAttribute('aria-hidden', 'true');
}

// --- Event wiring ---
function init() {
  // initial renders
  renderCars();
  renderManageCars();
  renderBookings();

  // navigation
  $('#showCatalogBtn').onclick = () => showView('catalog');
  $('#showBookingsBtn').onclick = () => showView('bookings');
  $('#showAdminBtn').onclick = () => showView('admin');

  // search + filter
  $('#searchInput').oninput = (e) => {
    const q = e.target.value + ' ' + $('#typeFilter').value;
    renderCars($('#searchInput').value || $('#typeFilter').value);
  };
  $('#typeFilter').onchange = () => {
    const q = $('#typeFilter').value ? $('#typeFilter').value : $('#searchInput').value;
    renderCars(q);
  };
  $('#clearFilters').onclick = () => {
    $('#searchInput').value = '';
    $('#typeFilter').value = '';
    renderCars();
  };

  // delegate booking and details button clicks on catalog
  $('#carsGrid').addEventListener('click', (ev) => {
    const bookBtn = ev.target.closest('.btn-book');
    if (bookBtn) {
      const id = bookBtn.dataset.id;
      const car = getCars().find(c => c.id === id);
      openModal(car);
      return;
    }
    const detailsBtn = ev.target.closest('.btn-details');
    if (detailsBtn) {
      const id = detailsBtn.dataset.id;
      const car = getCars().find(c => c.id === id);
      alert(`${car.name}\nType: ${car.type}\nPrice/day: ₹${car.price}`);
      return;
    }
  });

  // booking modal logic: update price preview when dates change
  $('#startDate').addEventListener('change', updatePricePreview);
  $('#endDate').addEventListener('change', updatePricePreview);

  function updatePricePreview() {
    const carId = $('#modalCarId').value;
    const car = getCars().find(c => c.id === carId);
    const start = $('#startDate').value;
    const end = $('#endDate').value;
    if (!car || !start || !end) {
      $('#pricePreview').textContent = '₹0';
      return;
    }
    const days = daysBetween(start, end);
    const total = days * car.price;
    $('#pricePreview').textContent = `₹${total.toLocaleString()} (${days} day${days !== 1 ? 's' : ''})`;
  }

  // booking form submit
  $('#bookingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const carId = $('#modalCarId').value;
    const car = getCars().find(c => c.id === carId);
    const start = $('#startDate').value;
    const end = $('#endDate').value;
    const renterName = $('#renterName').value.trim();
    const renterPhone = $('#renterPhone').value.trim();
    if (!start || !end || !renterName || !renterPhone) {
      alert('Please fill all fields.');
      return;
    }
    const days = daysBetween(start, end);
    if (days <= 0) {
      alert('End date must be after start date (minimum 1 day).');
      return;
    }
    const total = days * car.price;
    // Save booking
    const bookings = getBookings();
    bookings.push({
      id: uid(),
      carId,
      startDate: start,
      endDate: end,
      renterName,
      renterPhone,
      days,
      total,
      status: 'Booked'
    });
    setBookings(bookings);
    closeModal();
    renderBookings();
    alert('Booking confirmed!');
  });

  // cancel modal buttons
  $('#closeModal').onclick = closeModal;
  $('#cancelModal').onclick = closeModal;

  // admin add car
  $('#addCarForm').onsubmit = (e) => {
    e.preventDefault();
    const name = $('#carName').value.trim();
    const type = $('#carType').value;
    const price = Number($('#carPrice').value);
    const image = $('#carImage').value.trim();
    if (!name || !price) {
      alert('Please provide car name and price.');
      return;
    }
    const cars = getCars();
    cars.push({ id: uid(), name, type, price, image });
    setCars(cars);
    $('#addCarForm').reset();
    renderCars();
    renderManageCars();
    alert('Car added.');
  };

  // manage cars (edit/delete) delegation
  $('#manageCarsList').addEventListener('click', (ev) => {
    const del = ev.target.closest('.btn-delete');
    if (del) {
      const id = del.dataset.id;
      if (!confirm('Delete this car?')) return;
      const cars = getCars().filter(c => c.id !== id);
      setCars(cars);
      renderCars();
      renderManageCars();
      return;
    }
    const edit = ev.target.closest('.btn-edit');
    if (edit) {
      const id = edit.dataset.id;
      const cars = getCars();
      const idx = cars.findIndex(c => c.id === id);
      if (idx === -1) return;
      const newName = prompt('New name', cars[idx].name);
      if (newName) {
        cars[idx].name = newName;
        setCars(cars);
        renderCars();
        renderManageCars();
      }
    }
  });

  // bookings cancel
  $('#bookingsList').addEventListener('click', (ev) => {
    const cancelBtn = ev.target.closest('.btn-cancel');
    if (!cancelBtn) return;
    const id = cancelBtn.dataset.id;
    if (!confirm('Cancel booking?')) return;
    const bs = getBookings().filter(b => b.id !== id);
    setBookings(bs);
    renderBookings();
  });

  // initialize view
  showView('catalog');
}

// --- view switching ---
function showView(name) {
  // nav active state
  $$('#showCatalogBtn, #showBookingsBtn, #showAdminBtn').forEach(btn => btn.classList.remove('active'));
  if (name === 'catalog') {
    $('#showCatalogBtn').classList.add('active');
  } else if (name === 'bookings') {
    $('#showBookingsBtn').classList.add('active');
  } else {
    $('#showAdminBtn').classList.add('active');
  }

  $('#catalogView').style.display = name === 'catalog' ? '' : 'none';
  $('#bookingsView').style.display = name === 'bookings' ? '' : 'none';
  $('#adminView').style.display = name === 'admin' ? '' : 'none';
}

// Run
document.addEventListener('DOMContentLoaded', init);
