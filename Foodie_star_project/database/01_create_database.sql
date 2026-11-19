-- Выполнить в Query Tool pgAdmin, подключившись к серверу PostgreSQL.
-- Этот файл создаёт базу данных. CREATE DATABASE нельзя запускать внутри транзакции.
CREATE DATABASE foodie_star
    WITH ENCODING = 'UTF8'
    TEMPLATE = template0;
