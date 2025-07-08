DROP TEMPORARY TABLE IF EXISTS temporary_shopee_import;

-- Create temp table WITHOUT: id, idHash, pict_link, timestamp
CREATE TEMPORARY TABLE temporary_shopee_import (
    price_ori DECIMAL(10,2),
    delivery VARCHAR(255),
    item_category_detail TEXT,
    specification TEXT,
    title TEXT,
    w_date DATE,
    link_ori TEXT,
    item_rating DECIMAL(2,1),
    seller_name VARCHAR(255),
    idElastic VARCHAR(255),
    price_actual DECIMAL(10,2),
    sitename VARCHAR(100),
    total_rating INT,
    total_sold INT,
    favorite INT
);

-- Load CSV data excluding dropped columns
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/cleaned_shopee_data_for_mysql.csv'
INTO TABLE temporary_shopee_import
FIELDS TERMINATED BY ',' 
OPTIONALLY ENCLOSED BY '"'
ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(
    price_ori, 
    delivery, 
    item_category_detail, 
    specification, 
    title, 
    @w_date, 
    link_ori, 
    item_rating, 
    seller_name, 
    idElastic, 
    price_actual, 
    sitename, 
    @idHash,           -- skipped with dummy
    total_rating, 
    @id,               -- skipped with dummy
    total_sold, 
    @pict_link,        -- skipped with dummy
    favorite, 
    @timestamp         -- skipped with dummy
)
SET 
w_date = STR_TO_DATE(@w_date, '%d/%m/%Y');

-- Check row count
SELECT COUNT(*) AS total_rows FROM temporary_shopee_import;

-- NULL check
SELECT 
    SUM(CASE WHEN title IS NULL THEN 1 ELSE 0 END) AS null_titles,
    SUM(CASE WHEN price_actual IS NULL THEN 1 ELSE 0 END) AS null_prices,
    SUM(CASE WHEN seller_name IS NULL THEN 1 ELSE 0 END) AS null_sellers
FROM temporary_shopee_import;

-- Check date ranges
SELECT MIN(w_date), MAX(w_date) FROM temporary_shopee_import;

-- ---------------------
-- DESTINATION TABLES
-- ---------------------

CREATE TABLE IF NOT EXISTS sellers (
    seller_id INT AUTO_INCREMENT PRIMARY KEY,
    seller_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (seller_name)
);

CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    specifications TEXT,
    original_price DECIMAL(10,2),
    current_price DECIMAL(10,2),
    average_rating DECIMAL(2,1),
    total_ratings INT,
    total_sold INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_path VARCHAR(255) NOT NULL,
    UNIQUE KEY (category_path)
);

CREATE TABLE IF NOT EXISTS product_listings (
    listing_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    seller_id INT,
    category_id INT,
    listing_date DATE,
    product_url TEXT,
    favorite_count INT,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (seller_id) REFERENCES sellers(seller_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Insert unique sellers
INSERT IGNORE INTO sellers (seller_name)
SELECT DISTINCT seller_name FROM temporary_shopee_import;

-- Insert unique categories
INSERT IGNORE INTO categories (category_path)
SELECT DISTINCT item_category_detail FROM temporary_shopee_import;

-- Insert products
INSERT INTO products (
    title, specifications, original_price, current_price, 
    average_rating, total_ratings, total_sold
)
SELECT 
    title, specification, price_ori, price_actual, 
    item_rating, total_rating, total_sold
FROM temporary_shopee_import;

-- Insert product listings
INSERT INTO product_listings (
    product_id, seller_id, category_id, listing_date, product_url, favorite_count
)
SELECT 
    p.product_id, s.seller_id, c.category_id, 
    t.w_date, t.link_ori, t.favorite
FROM temporary_shopee_import t
JOIN products p ON t.title = p.title
JOIN sellers s ON t.seller_name = s.seller_name
JOIN categories c ON t.item_category_detail = c.category_path;

-- Optional: create views and indexes (unchanged)
-- VIEW: top selling
CREATE OR REPLACE VIEW top_selling_products AS
SELECT 
    p.product_id, p.title, p.total_sold, p.average_rating,
    s.seller_name, c.category_path,
    RANK() OVER (ORDER BY p.total_sold DESC) AS sales_rank
FROM products p
JOIN product_listings pl ON p.product_id = pl.product_id
JOIN sellers s ON pl.seller_id = s.seller_id
JOIN categories c ON pl.category_id = c.category_id;

-- VIEW: daily listing count
CREATE OR REPLACE VIEW daily_listings AS
SELECT 
    listing_date,
    COUNT(*) AS new_listings,
    COUNT(DISTINCT seller_id) AS unique_sellers
FROM product_listings
GROUP BY listing_date
ORDER BY listing_date;

-- Indexing
CREATE INDEX idx_seller_name ON sellers(seller_name);
CREATE INDEX idx_product_title ON products(title(255));
CREATE INDEX idx_product_price ON products(current_price);
CREATE INDEX idx_product_rating ON products(average_rating);
CREATE INDEX idx_listing_date ON product_listings(listing_date);
CREATE INDEX idx_listing_seller ON product_listings(seller_id);

-- Aggregate: Price by Category
SELECT 
    c.category_path,
    COUNT(*) AS product_count,
    AVG(p.current_price) AS avg_price,
    MIN(p.current_price) AS min_price,
    MAX(p.current_price) AS max_price
FROM products p
JOIN product_listings pl ON p.product_id = pl.product_id
JOIN categories c ON pl.category_id = c.category_id
GROUP BY c.category_path
ORDER BY avg_price DESC;

-- Seller performance
SELECT 
    s.seller_name,
    COUNT(DISTINCT pl.product_id) AS product_count,
    SUM(p.total_sold) AS total_sales,
    AVG(p.average_rating) AS avg_rating
FROM sellers s
JOIN product_listings pl ON s.seller_id = pl.seller_id
JOIN products p ON pl.product_id = p.product_id
GROUP BY s.seller_name
ORDER BY total_sales DESC
LIMIT 20;

-- Cleanup
DROP TEMPORARY TABLE IF EXISTS temporary_shopee_import;
