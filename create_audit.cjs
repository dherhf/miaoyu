const fs = require('fs');
const mysql = require('mysql2/promise');

const env = fs.readFileSync('D:/Ai/妙语/tic/.env', 'utf8');
const lines = env.split('\n');
const cfg = {};
lines.forEach(l => {
  const parts = l.split('=');
  if (parts.length === 2) cfg[parts[0].trim()] = parts[1].trim();
});

(async () => {
  const conn = await mysql.createConnection({
    host: cfg.MYSQL_HOST,
    user: cfg.MYSQL_USERNAME,
    password: cfg.MYSQL_PASSWORD,
    database: cfg.MYSQL_DATABASE
  });

  const sql = `CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT NOT NULL AUTO_INCREMENT,
    operator_id BIGINT NOT NULL,
    operator_name VARCHAR(50) NOT NULL,
    operator_type VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id BIGINT DEFAULT NULL,
    before_data JSON DEFAULT NULL,
    after_data JSON DEFAULT NULL,
    ip VARCHAR(50) DEFAULT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_operator (operator_id, created_at),
    KEY idx_target (target_type, target_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

  await conn.execute(sql);
  console.log('audit_log table created');
  await conn.end();
})();
