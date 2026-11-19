-- Обновление уже существующей базы foodie_star.
-- Выполнить один раз в pgAdmin -> foodie_star -> Query Tool.
-- Сохраняет ID заведений, избранное и отзывы.

UPDATE places
SET image_url = 'assets/places/anime-cafe.png'
WHERE slug = 'cafe-anime';

UPDATE places
SET category_id = (SELECT id FROM categories WHERE slug = 'coffee'),
    name = 'Кофейня «Moon»',
    slug = 'coffee-moon',
    description = 'Ночная кофейня с кофе, десертами и лунной атмосферой.',
    image_url = 'assets/places/moon-cafe.png'
WHERE slug = 'pizza-moon';

UPDATE places
SET image_url = 'assets/places/kawaii-sushi.png'
WHERE slug = 'sushi-kawaii';

UPDATE places
SET image_url = 'assets/places/cloud-cafe.png'
WHERE slug = 'coffee-cloud';

UPDATE places
SET image_url = 'assets/places/pixel-burger.png'
WHERE slug = 'burger-pixel';

UPDATE places
SET image_url = 'assets/places/berry-patisserie.png'
WHERE slug = 'dessert-berry';
