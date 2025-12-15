import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

let db: Database | null = null;

const DB_PATH = process.env.DB_PATH || './data/ailo.db';

// 初始化数据库
export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();
  
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // 如果数据库文件存在，加载它
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表
  createTables();
  
  // 创建默认管理员账号
  await createDefaultAdmin();
  
  // 保存数据库
  saveDatabase();
  
  console.log('Database initialized successfully');
}

// 创建数据表
function createTables(): void {
  if (!db) throw new Error('Database not initialized');

  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'user',
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 创意库表
  db.run(`
    CREATE TABLE IF NOT EXISTS creative_ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      imageUrl TEXT,
      isSmart INTEGER DEFAULT 0,
      isSmartPlus INTEGER DEFAULT 0,
      isBP INTEGER DEFAULT 0,
      smartPlusConfig TEXT,
      bpFields TEXT,
      "order" INTEGER DEFAULT 0,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      updatedAt INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Prompt 预设表
  db.run(`
    CREATE TABLE IF NOT EXISTS prompt_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      updatedAt INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // 生成历史记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS generation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      imageUrl TEXT NOT NULL,
      prompt TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      model TEXT NOT NULL,
      isThirdParty INTEGER DEFAULT 0,
      inputImageData TEXT,
      inputImageName TEXT,
      inputImageType TEXT,
      creativeTemplateId INTEGER,
      creativeTemplateType TEXT,
      bpInputs TEXT,
      smartPlusOverrides TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // 分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      parentId INTEGER,
      "order" INTEGER DEFAULT 0,
      isActive INTEGER DEFAULT 1,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      updatedAt INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (parentId) REFERENCES categories(id)
    )
  `);

  // API 配置表（每个用户有自己的配置）
  db.run(`
    CREATE TABLE IF NOT EXISTS api_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      configKey TEXT NOT NULL,
      configValue TEXT NOT NULL,
      updatedAt INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (userId) REFERENCES users(id),
      UNIQUE(userId, configKey)
    )
  `);

  // 系统配置表（全局配置，管理端用）
  db.run(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      configKey TEXT UNIQUE NOT NULL,
      configValue TEXT NOT NULL,
      description TEXT,
      updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 运行表迁移（为旧表添加 userId 字段）
  runMigrations();
}

// 数据库迁移
function runMigrations(): void {
  if (!db) return;

  // 检查 users 是否有 coins 字段
  try {
    const result = db.exec("PRAGMA table_info(users)");
    if (result.length > 0) {
      const columns = result[0].values.map((row: any) => row[1]);
      if (!columns.includes('coins')) {
        db.run('ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0');
        console.log('Migration: Added coins to users');
      }
    }
  } catch (e) {
    // 表可能不存在，忽略
  }

  // 检查 creative_ideas 是否有 userId 字段
  try {
    const result = db.exec("PRAGMA table_info(creative_ideas)");
    if (result.length > 0) {
      const columns = result[0].values.map((row: any) => row[1]);
      if (!columns.includes('userId')) {
        db.run('ALTER TABLE creative_ideas ADD COLUMN userId INTEGER');
        console.log('Migration: Added userId to creative_ideas');
      }
    }
  } catch (e) {
    // 表可能不存在，忽略
  }

  // 检查 generation_history 是否有 userId 字段
  try {
    const result = db.exec("PRAGMA table_info(generation_history)");
    if (result.length > 0) {
      const columns = result[0].values.map((row: any) => row[1]);
      if (!columns.includes('userId')) {
        db.run('ALTER TABLE generation_history ADD COLUMN userId INTEGER');
        console.log('Migration: Added userId to generation_history');
      }
    }
  } catch (e) {
    // 表可能不存在，忽略
  }

  // 检查 creative_ideas 是否有 isOfficial 字段
  try {
    const result = db.exec("PRAGMA table_info(creative_ideas)");
    if (result.length > 0) {
      const columns = result[0].values.map((row: any) => row[1]);
      if (!columns.includes('isOfficial')) {
        db.run('ALTER TABLE creative_ideas ADD COLUMN isOfficial INTEGER DEFAULT 0');
        console.log('Migration: Added isOfficial to creative_ideas');
      }
      if (!columns.includes('categoryId')) {
        db.run('ALTER TABLE creative_ideas ADD COLUMN categoryId INTEGER');
        console.log('Migration: Added categoryId to creative_ideas');
      }
      if (!columns.includes('cost')) {
        db.run('ALTER TABLE creative_ideas ADD COLUMN cost INTEGER DEFAULT 1');
        console.log('Migration: Added cost to creative_ideas');
      }
      if (!columns.includes('status')) {
        db.run('ALTER TABLE creative_ideas ADD COLUMN status TEXT DEFAULT "active"');
        console.log('Migration: Added status to creative_ideas');
      }
      if (!columns.includes('suggestedAspectRatio')) {
        db.run('ALTER TABLE creative_ideas ADD COLUMN suggestedAspectRatio TEXT');
        console.log('Migration: Added suggestedAspectRatio to creative_ideas');
      }
      if (!columns.includes('suggestedResolution')) {
        db.run('ALTER TABLE creative_ideas ADD COLUMN suggestedResolution TEXT');
        console.log('Migration: Added suggestedResolution to creative_ideas');
      }
    }
  } catch (e) {
    // 表可能不存在，忽略
  }
}

// 创建默认管理员账号
async function createDefaultAdmin(): Promise<void> {
  if (!db) return;

  const DEFAULT_ADMIN_USERNAME = 'admin';
  const DEFAULT_ADMIN_PASSWORD = 'admin123';
  const DEFAULT_ADMIN_EMAIL = 'admin@penguin.magic';

  // 检查管理员是否已存在
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  stmt.bind([DEFAULT_ADMIN_USERNAME]);
  const exists = stmt.step();
  stmt.free();

  if (exists) {
    console.log('[Admin] 默认管理员账号已存在');
    return;
  }

  // 加密密码
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, salt);

  // 创建管理员账号
  db.run(
    `INSERT INTO users (username, email, password, nickname, role, coins, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'admin', 1000, strftime('%s', 'now'), strftime('%s', 'now'))`,
    [DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL, hashedPassword, '超级管理员']
  );

  console.log('[Admin] 默认管理员账号已创建');
  console.log('[Admin] 用户名: admin');
  console.log('[Admin] 密码: admin123');
}

// 保存数据库到文件
export function saveDatabase(): void {
  if (!db) return;
  
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// 获取数据库实例
export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// 关闭数据库
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// 执行查询并返回结果
export function query<T>(sql: string, params: any[] = []): T[] {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  
  return results;
}

// 执行单条查询
export function queryOne<T>(sql: string, params: any[] = []): T | null {
  const results = query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

// 执行更新/插入/删除
export function execute(sql: string, params: any[] = []): number {
  const database = getDatabase();
  database.run(sql, params);
  saveDatabase();
  
  // 获取最后插入的 ID
  const result = database.exec('SELECT last_insert_rowid() as id');
  return result.length > 0 && result[0].values.length > 0 
    ? result[0].values[0][0] as number 
    : 0;
}

// 获取受影响的行数
export function getChanges(): number {
  const database = getDatabase();
  const result = database.exec('SELECT changes() as count');
  return result.length > 0 && result[0].values.length > 0 
    ? result[0].values[0][0] as number 
    : 0;
}
