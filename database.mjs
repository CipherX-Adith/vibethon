import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function openDatabase(databasePath, migrationPath) {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 1) { db.close(); throw new Error('Database schema is newer than this app version.'); }
  if (version < 1) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(readFileSync(migrationPath, 'utf8'));
      db.exec('PRAGMA user_version = 1');
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      db.close();
      throw error;
    }
  }
  return db;
}

export function seedDemoListings(db, items) {
  if (db.prepare('SELECT 1 FROM listings WHERE is_demo = 1 LIMIT 1').get()) return;
  const now = Date.now();
  const organizations = new Map();
  db.exec('BEGIN IMMEDIATE');
  try {
    const addOrg = db.prepare('INSERT OR IGNORE INTO organizations (id,name,created_at) VALUES (?,?,?)');
    const addListing = db.prepare('INSERT OR IGNORE INTO listings (id,organization_id,created_by,type,family,material,amount,unit,location,price,properties_json,required_properties_json,status,is_demo,created_at,updated_at) VALUES (?,?,NULL,?,?,?,?,?,?,?,?,?,?,1,?,?)');
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      let orgId = organizations.get(item.company);
      if (!orgId) {
        orgId = 'demo-org-' + String(index + 1);
        organizations.set(item.company, orgId);
        addOrg.run(orgId, item.company, now);
      }
      const created = now - index * 1000;
      addListing.run(item.id,orgId,item.type,item.family,item.material,item.amount,item.unit,item.location,item.price,JSON.stringify(item.properties||[]),JSON.stringify(item.requiredProperties||[]),'active',created,created);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
