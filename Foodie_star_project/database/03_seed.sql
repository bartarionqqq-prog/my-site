-- Демонстрационные данные. Фото загружаются с Unsplash по URL.
INSERT INTO users (username, email)
VALUES ('user_neko', 'neko@example.com')
ON CONFLICT (username) DO NOTHING;

INSERT INTO categories (name, slug, icon) VALUES
('Кафе', 'cafe', '☕'),
('Пиццерии', 'pizza', '🍕'),
('Суши и роллы', 'sushi', '🍣'),
('Фастфуд', 'fastfood', '🍔'),
('Кофейни', 'coffee', '🥤'),
('Десерты', 'dessert', '🍰')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO places
(category_id, name, slug, description, address, average_check, rating, review_count, image_url, opening_hours)
SELECT c.id, v.name, v.slug, v.description, v.address, v.price, v.rating, v.reviews, v.image, v.hours
FROM (VALUES
 ('cafe','Кафе «Аниме»','cafe-anime','Уютное кафе с мягким светом, десертами и милыми деталями в интерьере.','ул. Ленина, 12',350,4.8,120,'assets/places/anime-cafe.png','09:00–23:00'),
 ('coffee','Кофейня «Moon»','coffee-moon','Ночная кофейня с кофе, десертами и лунной атмосферой.','пр-т Мира, 8',400,4.7,98,'assets/places/moon-cafe.png','11:00–23:00'),
 ('sushi','Суши-бар «Kawaii»','sushi-kawaii','Роллы, сеты и японские закуски в спокойной атмосфере.','ул. Сакуры, 5',500,4.9,210,'assets/places/kawaii-sushi.png','11:00–22:00'),
 ('coffee','Кофейня «Cloud»','coffee-cloud','Кофе, матча, какао и домашняя выпечка.','ул. Цветочная, 3',250,4.6,76,'assets/places/cloud-cafe.png','08:00–21:00'),
 ('fastfood','Бургерная «Pixel»','burger-pixel','Сочные бургеры и картофель фри по дружелюбной цене.','ул. Молодёжная, 19',300,4.5,64,'assets/places/pixel-burger.png','10:00–00:00'),
 ('dessert','Кондитерская «Berry»','dessert-berry','Пирожные, клубничные десерты и лимонады.','ул. Ягодная, 7',280,4.8,88,'assets/places/berry-patisserie.png','10:00–21:00')
) AS v(category_slug,name,slug,description,address,price,rating,reviews,image,hours)
JOIN categories c ON c.slug = v.category_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO favorites (user_id, place_id)
SELECT u.id, p.id FROM users u, places p
WHERE u.username = 'user_neko' AND p.slug = 'cafe-anime'
ON CONFLICT (user_id, place_id) DO NOTHING;

INSERT INTO reviews (user_id, place_id, author_name, rating, body)
SELECT u.id, p.id, 'Маша_♡', 5, 'Очень милое место! Вкусный чай и уютная атмосфера ♡'
FROM users u, places p
WHERE u.username = 'user_neko' AND p.slug = 'cafe-anime'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.place_id = p.id);
