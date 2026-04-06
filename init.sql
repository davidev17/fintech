-- FinBank Lab Database Init
-- DevSecOps Laboratory

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    type VARCHAR(30) NOT NULL CHECK (type IN ('transfer', 'deposit', 'withdrawal')),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100),
    size INTEGER,
    path VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table (DevSecOps)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Seed: Admin user (senha: Admin@123)
INSERT INTO users (name, email, password_hash, role, balance, account_number)
VALUES (
    'Admin FinBank',
    'admin@finbank.lab',
    '$2b$12$MZYTUoPR2zr.b0s4G48UTeb3tErcTkRi5sFRoyO6KZdiuT.xv4HQ6',
    'admin',
    999999.99,
    '0000-00001'
) ON CONFLICT (email) DO NOTHING;

-- Seed: Demo users (senha: User@123)
INSERT INTO users (name, email, password_hash, role, balance, account_number)
VALUES
    ('Alice Souza', 'alice@finbank.lab', '$2b$12$Y2COiYJqlLtntjBLs0RvbuT14iYgDjoQOi91nbe/Qf/qoqgOWa5dq', 'user', 5000.00, '0001-00001'),
    ('Bruno Lima', 'bruno@finbank.lab', '$2b$12$Y2COiYJqlLtntjBLs0RvbuT14iYgDjoQOi91nbe/Qf/qoqgOWa5dq', 'user', 3200.50, '0001-00002'),
    ('Carla Mendes', 'carla@finbank.lab', '$2b$12$Y2COiYJqlLtntjBLs0RvbuT14iYgDjoQOi91nbe/Qf/qoqgOWa5dq', 'user', 8750.00, '0001-00003')
ON CONFLICT (email) DO NOTHING;

-- Seed: Sample transactions
INSERT INTO transactions (sender_id, receiver_id, amount, type, status, description)
SELECT 
    (SELECT id FROM users WHERE email = 'alice@finbank.lab'),
    (SELECT id FROM users WHERE email = 'bruno@finbank.lab'),
    250.00, 'transfer', 'completed', 'Pagamento de aluguel'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'alice@finbank.lab');

INSERT INTO transactions (sender_id, receiver_id, amount, type, status, description)
SELECT
    (SELECT id FROM users WHERE email = 'bruno@finbank.lab'),
    (SELECT id FROM users WHERE email = 'carla@finbank.lab'),
    100.00, 'transfer', 'completed', 'Divisão de conta'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'bruno@finbank.lab');