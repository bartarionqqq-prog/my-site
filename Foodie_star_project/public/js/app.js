const API = "/api";
const USER_ID = 1; // Demo profile. Replace with authenticated user ID when auth is added.

const samplePlaces = [
  {id:1,name:"Кафе «Аниме»",category:"Кафе",category_slug:"cafe",average_check:350,rating:4.8,review_count:120,image_url:"assets/places/anime-cafe.png",description:"Уютное аниме-кафе с десертами и милыми деталями.",address:"ул. Ленина, 12"},
  {id:2,name:"Кофейня «Moon»",category:"Кофейни",category_slug:"coffee",average_check:400,rating:4.7,review_count:98,image_url:"assets/places/moon-cafe.png",description:"Ночная кофейня с кофе, десертами и лунной атмосферой.",address:"пр-т Мира, 8"},
  {id:3,name:"Суши-бар «Kawaii»",category:"Суши и роллы",category_slug:"sushi",average_check:500,rating:4.9,review_count:210,image_url:"assets/places/kawaii-sushi.png",description:"Роллы, сеты и японские закуски в уютном kawaii-интерьере.",address:"ул. Сакуры, 5"},
  {id:4,name:"Кофейня «Cloud»",category:"Кофейни",category_slug:"coffee",average_check:250,rating:4.6,review_count:76,image_url:"assets/places/cloud-cafe.png",description:"Кофе, матча, какао и домашняя выпечка в облачной атмосфере.",address:"ул. Цветочная, 3"},
  {id:5,name:"Бургерная «Pixel»",category:"Фастфуд",category_slug:"fastfood",average_check:300,rating:4.5,review_count:64,image_url:"assets/places/pixel-burger.png",description:"Сочные бургеры и картофель фри по дружелюбной цене.",address:"ул. Молодёжная, 19"},
  {id:6,name:"Кондитерская «Berry»",category:"Десерты",category_slug:"dessert",average_check:280,rating:4.8,review_count:88,image_url:"assets/places/berry-patisserie.png",description:"Пирожные, клубничные десерты и лимонады.",address:"ул. Ягодная, 7"}
];

async function api(path, options) {
  const response = await fetch(`${API}${path}`, options);
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}
function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[char]));
}
function stars(rating) { return `<span class="stars">★★★★★</span> <b>${Number(rating).toFixed(1)}</b>`; }

function placeCard(place, compact=false) {
  const image = escapeHtml(place.image_url || "");
  return `<article class="${compact ? "result-card" : "place-card"}">
    <img src="${image}" alt="${escapeHtml(place.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/foodie-hero.png'">
    <div class="place-card-copy">
      <h3>${escapeHtml(place.name)}</h3>
      <div class="rating">${stars(place.rating)} <small>(${place.review_count || 0} отзывов)</small></div>
      ${compact ? `<p>${escapeHtml(place.description || place.category || "")}</p><div class="result-meta">♡ ${escapeHtml(place.category || "")} · ${escapeHtml(place.address || "")}</div>` : ""}
      <div class="price">от ${Number(place.average_check).toLocaleString("ru-RU")} ₽</div>
      <div class="card-actions">
        <a class="pink-button" href="place.html?id=${encodeURIComponent(place.id)}">Подробнее →</a>
        <button class="heart-button" data-favorite="${place.id}" aria-label="Добавить в избранное">♡</button>
      </div>
    </div>
  </article>`;
}

async function getPlaces(params = "") {
  try { return await api(`/places${params}`); }
  catch (error) { console.warn("API unavailable, showing preview data", error); return samplePlaces; }
}

async function renderHome() {
  const host = document.querySelector("#popular-places");
  if (!host) return;
  const places = await getPlaces("?sort=rating");
  host.innerHTML = places.slice(0,3).map(place => placeCard(place)).join("");
  bindFavoriteButtons();
}

// Единые категории используются и в PostgreSQL, и в демонстрационном режиме.
const CATEGORY_ALIASES = {
  cafe: ["кафе", "cafe"],
  pizza: ["пицца", "пиццерия", "пиццерии", "pizza"],
  sushi: ["суши", "роллы", "суши и роллы", "sushi"],
  fastfood: ["фастфуд", "бургер", "бургеры", "бургерная", "fastfood"],
  coffee: ["кофе", "кофейня", "кофейни", "coffee", "латте", "капучино", "матча"],
  dessert: ["десерт", "десерты", "кондитерская", "торт", "пирожное", "сладости", "dessert"]
};

function normalizeSearch(value) {
  return String(value || "").toLocaleLowerCase("ru-RU").trim().replace(/ё/g, "е");
}

function matchesCategory(place, slug) {
  if (!slug || slug === "all") return true;
  return place.category_slug === slug;
}

function filterSamplePlaces({search="", category="all", maxPrice="", sort="popular"} = {}) {
  const term = normalizeSearch(search);
  let result = samplePlaces.filter(place => {
    if (!matchesCategory(place, category)) return false;
    if (maxPrice && Number(place.average_check) > Number(maxPrice)) return false;
    if (!term) return true;
    const searchable = normalizeSearch([
      place.name, place.category, place.category_slug, place.description, place.address
    ].join(" "));
    const textMatch = searchable.includes(term);
    const categoryMatch = Object.entries(CATEGORY_ALIASES).some(([slug, aliases]) =>
      (place.category_slug === slug) && aliases.some(alias => normalizeSearch(alias).includes(term) || term.includes(normalizeSearch(alias)))
    );
    return textMatch || categoryMatch;
  });
  if (sort === "cheap") result.sort((a,b) => a.average_check - b.average_check);
  else if (sort === "rating") result.sort((a,b) => b.rating - a.rating);
  else result.sort((a,b) => b.rating - a.rating || b.review_count - a.review_count);
  return result;
}

async function renderSearch() {
  const params = new URLSearchParams(location.search);
  const form = document.querySelector("#search-form");
  const filterForm = document.querySelector("#filter-form");
  const input = document.querySelector("#search-input");
  const results = document.querySelector("#search-results");
  const count = document.querySelector("#result-count");
  if (!results || !count) return;

  let selectedCategory = params.get("category") || "all";
  if (input) input.value = params.get("search") || "";
  if (filterForm && params.get("maxPrice")) {
    const radio = filterForm.querySelector(`[name="maxPrice"][value="${CSS.escape(params.get("maxPrice"))}"]`);
    if (radio) radio.checked = true;
  }
  if (filterForm && params.get("sort")) filterForm.elements.sort.value = params.get("sort");

  function updateCategoryLinks() {
    document.querySelectorAll("[data-category]").forEach(link => {
      const active = link.dataset.category === selectedCategory;
      link.classList.toggle("active-category", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  async function load() {
    const search = input?.value.trim() || "";
    const maxPrice = filterForm?.querySelector('[name="maxPrice"]:checked')?.value || "";
    const sort = filterForm?.elements.sort.value || "popular";
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (selectedCategory !== "all") query.set("category", selectedCategory);
    if (maxPrice) query.set("maxPrice", maxPrice);
    if (sort) query.set("sort", sort);

    let places;
    try {
      places = await api(`/places?${query.toString()}`);
    } catch (error) {
      console.warn("API unavailable, filtering preview data", error);
      places = filterSamplePlaces({search, category:selectedCategory, maxPrice, sort});
    }
    results.innerHTML = places.length
      ? places.map(place => placeCard(place,true)).join("")
      : `<div class="empty-state">По этому запросу ничего не найдено ♡<br><small>Попробуй другое название или сними часть фильтров.</small></div>`;
    count.textContent = `найдено: ${places.length} ♡`;
    const nextUrl = `${location.pathname}${query.toString() ? `?${query.toString()}` : ""}`;
    history.replaceState({}, "", nextUrl);
    updateCategoryLinks();
    bindFavoriteButtons();
  }

  document.querySelectorAll("[data-category]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      selectedCategory = link.dataset.category || "all";
      load();
    });
  });
  form?.addEventListener("submit", event => { event.preventDefault(); load(); });
  filterForm?.addEventListener("submit", event => { event.preventDefault(); load(); });
  filterForm?.addEventListener("change", load);

  // Поиск обновляет результаты по мере ввода, не требуя перезагрузки страницы.
  let searchTimer;
  input?.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 250);
  });
  updateCategoryLinks();
  await load();
}

async function bindFavoriteButtons() {
  document.querySelectorAll("[data-favorite]").forEach(button => {
    if (button.dataset.bound) return;
    button.dataset.bound = "1";
    button.addEventListener("click", async () => {
      const placeId = Number(button.dataset.favorite);
      try {
        await api("/favorites", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:USER_ID,place_id:placeId})});
        button.classList.add("saved"); button.textContent = "♥";
      } catch {
        const saved = JSON.parse(localStorage.getItem("foodie-favorites") || "[]");
        if (!saved.includes(placeId)) saved.push(placeId);
        localStorage.setItem("foodie-favorites", JSON.stringify(saved));
        button.classList.add("saved"); button.textContent = "♥";
      }
    });
  });
}

async function renderFavorites() {
  const host = document.querySelector("#favorites-list");
  if (!host) return;
  let places;
  try { places = await api(`/favorites?user_id=${USER_ID}`); }
  catch {
    const ids = JSON.parse(localStorage.getItem("foodie-favorites") || "[]");
    places = samplePlaces.filter(place => ids.includes(place.id));
  }
  host.innerHTML = places.length ? places.map(place => placeCard(place,true)).join("") : `<div class="empty-state">Здесь пока пусто... Сохрани сердечком понравившееся место! ♡<br><br><a class="pink-button" href="search.html">Найти заведения</a></div>`;
  host.querySelectorAll("[data-favorite]").forEach(button => {
    button.textContent = "♥"; button.classList.add("saved");
    button.addEventListener("click", async () => {
      try { await api(`/favorites/${button.dataset.favorite}?user_id=${USER_ID}`, {method:"DELETE"}); }
      catch {}
      button.closest(".result-card")?.remove();
    });
  });
}

async function renderPlace() {
  const host = document.querySelector("#place-detail");
  if (!host) return;
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { host.innerHTML = `<div class="empty-state">Не выбрано заведение. <a href="search.html">Вернуться к поиску</a></div>`; return; }
  let place;
  try { place = await api(`/places/${encodeURIComponent(id)}`); }
  catch { place = samplePlaces.find(item => String(item.id) === String(id)); }
  if (!place) { host.innerHTML = `<div class="empty-state">Заведение не найдено ♡</div>`; return; }
  host.innerHTML = `<div class="detail-top">
    <img class="detail-image" src="${escapeHtml(place.image_url)}" alt="${escapeHtml(place.name)}" onerror="this.onerror=null;this.src='assets/foodie-hero.png'">
    <div class="detail-copy"><span class="tiny-label">✧ YOUR NEXT HAPPY PLACE ✧</span><h1>${escapeHtml(place.name)} ♡</h1>
    <div>${stars(place.rating)} <small>(${place.review_count || 0} отзывов)</small></div>
    <div class="detail-price">от ${Number(place.average_check).toLocaleString("ru-RU")} ₽ / человек</div>
    <p>${escapeHtml(place.description)}</p>
    <div class="detail-facts"><div>⌖ Адрес: ${escapeHtml(place.address)}</div><div>◷ Часы работы: ${escapeHtml(place.opening_hours || "уточняйте у заведения")}</div><div>♡ Категория: ${escapeHtml(place.category)}</div></div>
    <button class="pink-button" id="detail-favorite" data-favorite="${place.id}">Добавить в избранное ♡</button></div></div>
    <section class="review-list"><div class="section-heading"><h2>Отзывы посетителей ♡</h2><span class="pixel-caption">GUESTBOOK</span></div>
    ${(place.reviews || []).length ? place.reviews.map(review => `<div class="review"><b>${escapeHtml(review.author_name)} · ${"★".repeat(review.rating)}</b><p>${escapeHtml(review.body)}</p></div>`).join("") : `<div class="review">Пока нет отзывов. Стань первым гостем! ♡</div>`}</section>`;
  bindFavoriteButtons();
}

function setupGifSlots() {
  document.querySelectorAll("[data-gif]").forEach(slot => {
    const src = slot.dataset.gif;
    if (!src) return;

    const img = new Image();
    img.alt = slot.dataset.gifAlt || "Декоративная GIF-анимация Foodie☆";
    img.decoding = "async";
    img.onload = () => {
      slot.replaceChildren(img);
      slot.classList.add("gif-loaded");
    };
    img.onerror = () => {
      // If the GIF hasn't been copied into public/assets/gif yet,
      // keep the decorative placeholder instead of showing a broken image.
      slot.classList.remove("gif-loaded");
    };
    img.src = src;
  });
}

function setupSparkles() {
  if (matchMedia("(pointer: coarse)").matches) return;
  document.addEventListener("pointermove", event => {
    if (Math.random() > .14) return;
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle-cursor"; sparkle.textContent = Math.random() > .5 ? "✦" : "♡";
    sparkle.style.left = `${event.clientX}px`; sparkle.style.top = `${event.clientY}px`;
    document.body.appendChild(sparkle); setTimeout(() => sparkle.remove(), 700);
  });
}

// Функция для создания одной падающей гифки
function createFallingGif() {
  const img = document.createElement("img");
  img.src = "assets/gif/pixel.gif";
  img.className = "falling-gif";
  
  // Случайная позиция по горизонтали (от 0 до 90% ширины экрана)
  const randomLeft = Math.random() * 90;
  img.style.left = `${randomLeft}vw`;
  
  // Случайный размер (от 40px до 100px)
  const randomSize = Math.random() * 40 + 30; 
  img.style.width = `${randomSize}px`;

  // Случайная скорость падения (от 3 до 7 секунд)
  const randomSpeed = Math.random() * 10 + 8;
  img.style.setProperty("--speed", `${randomSpeed}s`);

  // Случайное вращение (от 180 до 1080 градусов)
  const randomSpin = Math.random() * 900 + 180;
  img.style.setProperty("--spin", `${randomSpin}deg`);

  // Случайное отклонение в сторону при падении
  const randomX = (Math.random() - 0.5) * 200; 
  img.style.setProperty("--target-x", `${randomX}px`);

  document.body.appendChild(img);

  // Удаляем элемент из DOM после завершения анимации, чтобы не грузить память
  setTimeout(() => {
    img.remove();
  }, randomSpeed * 1000);
}

// Запускаем "дождь" из гифок
function startGifRain() {
  // Создаем первую гифку сразу
  createFallingGif();
  
  // Затем создаем новые каждые 300-800 миллисекунд
  const interval = setInterval(() => {
    // Чтобы не перегружать браузер, создаем не больше 8 гифок одновременно
    if (document.querySelectorAll('.falling-gif').length < 8) {
      createFallingGif();
    }
  }, Math.random() * 500 + 300);
}

// ФУНКЦИЯ ДЛЯ ЭКРАНА ЗАГРУЗКИ
function setupPageLoader() {
  // Создаем экран загрузки, если его нет в HTML
  if (!document.getElementById("page-loader")) {
    const loader = document.createElement("div");
    loader.id = "page-loader";
    loader.innerHTML = `
      <img src="assets/gif/load.gif" alt="Загрузка...">
      <p>Загружаем вкусняшки... ♡</p>
    `;
    document.body.appendChild(loader);
  }

  const loader = document.getElementById("page-loader");

  // 1. Скрываем загрузку, когда страница загрузилась
  window.addEventListener("load", () => {
    setTimeout(() => {
      loader.classList.add("hidden");
    }, 400); // Небольшая задержка, чтобы гифка успела покрутиться
  });

  // 2. Показываем загрузку при переходе по ссылкам
  document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", (e) => {
      // Проверяем, что это внутренняя ссылка (не якорь, не внешняя)
      const href = link.getAttribute("href");
      if (href && !href.startsWith("#") && !href.startsWith("http") && !link.getAttribute("target")) {
        e.preventDefault(); // Останавливаем мгновенный переход
        loader.classList.remove("hidden"); // Показываем прелоадер
        
        setTimeout(() => {
          window.location.href = href; // Переходим на новую страницу
        }, 300); // Задержка перед переходом
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupGifSlots(); 
  setupSparkles();
  setupPageLoader(); // <-- Запускаем прелоадер
  
  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "search") renderSearch();
  if (page === "place") renderPlace();
  if (page === "favorites") renderFavorites();

  startGifRain(); // Запускаем дождь из гифок (если он тебе нужен, оставь)
});
