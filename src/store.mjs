import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
export function openStore(dir){
 mkdirSync(dir,{recursive:true});mkdirSync(join(dir,'uploads'),{recursive:true});
 const db=new DatabaseSync(join(dir,'clubhouse.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id));
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS operations(userId TEXT NOT NULL,id TEXT NOT NULL,fingerprint TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(userId,id));
 CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
 const get=(kind,id)=>{const row=db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind,id);return row?JSON.parse(row.data):null};
 const list=kind=>db.prepare('SELECT data FROM records WHERE kind=?').all(kind).map(r=>JSON.parse(r.data));
 const put=(kind,id,data)=>{db.prepare('INSERT INTO records(kind,id,data) VALUES (?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind,id,JSON.stringify(data));return data};
 const meta=(k,v)=>v===undefined?JSON.parse(db.prepare('SELECT value FROM meta WHERE key=?').get(k)?.value||'null'):(db.prepare('INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,JSON.stringify(v)),v);
 return {db,get,list,put,meta,users:()=>db.prepare('SELECT data FROM users').all().map(r=>JSON.parse(r.data)),user:id=>{const r=db.prepare('SELECT * FROM users WHERE id=?').get(id);return r?{...JSON.parse(r.data),email:r.email,password:r.password}:null},saveUser:u=>{const {password,email,...safe}=u;db.prepare('INSERT INTO users VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,password=excluded.password,data=excluded.data').run(u.id,email,password,JSON.stringify(safe));return safe}};
}
