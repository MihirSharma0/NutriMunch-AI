CREATE TABLE IF NOT EXISTS testimonials (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    author_role VARCHAR(255),
    user_id BIGINT,
    rating INT NOT NULL,
    program_result VARCHAR(255),
    content TEXT NOT NULL,
    avatar_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'APPROVED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
