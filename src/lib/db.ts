import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_emUFP8HfOa2Z@ep-noisy-boat-a1bcbu4t-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// 接続テスト
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('データベース接続エラー:', err);
  } else {
    console.log('データベース接続成功:', res.rows[0]);
  }
});

export default pool;
