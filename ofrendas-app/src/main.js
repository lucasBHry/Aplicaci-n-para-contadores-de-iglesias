const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let db;
let SQL;

function getDbPath() {
  return path.join(app.getPath('userData'), 'ofrendas.db');
}

async function initDatabase() {
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();
  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'contador',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS registro_dias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL,
      contadores TEXT NOT NULL DEFAULT '[]',
      modified_by TEXT,
      modified_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS registro_filas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_id INTEGER NOT NULL,
      nombre TEXT,
      ofrenda REAL,
      ofrenda_especial REAL,
      descripcion_especial TEXT,
      diezmo REAL,
      fila_orden INTEGER,
      FOREIGN KEY (dia_id) REFERENCES registro_dias(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS comentarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_id INTEGER NOT NULL,
      autor TEXT NOT NULL,
      texto TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (dia_id) REFERENCES registro_dias(id) ON DELETE CASCADE
    );
  `);

  // Migration: add diezmo column if it doesn't exist yet
  try { db.run('ALTER TABLE registro_filas ADD COLUMN diezmo REAL'); } catch(e) {}

  saveDb();
}

function saveDb() {
  fs.writeFileSync(getDbPath(), Buffer.from(db.export()));
}

function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

function dbAll(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 750, minWidth: 800, minHeight: 600,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
    show: false
  });
  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ─── IPC ─────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');

ipcMain.handle('config:get', (_, key) => { const r = dbGet('SELECT value FROM config WHERE key=?',[key]); return r?r.value:null; });
ipcMain.handle('config:set', (_, key, value) => { dbRun('INSERT OR REPLACE INTO config(key,value) VALUES(?,?)',[key,value]); return true; });

ipcMain.handle('setup:check', () => ({ needsSetup: !dbGet("SELECT id FROM users WHERE role='admin' LIMIT 1") }));
ipcMain.handle('setup:create', (_, { orgName, password }) => {
  try {
    dbRun("INSERT INTO users(username,password_hash,role) VALUES('administrador',?,'admin')", [bcrypt.hashSync(password,10)]);
    dbRun("INSERT OR REPLACE INTO config(key,value) VALUES('org_name',?)", [orgName]);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('auth:login', (_, { username, password }) => {
  const user = dbGet('SELECT * FROM users WHERE username=? AND active=1', [username]);
  if (!user) return { ok: false, error: 'Usuario no encontrado o desactivado' };
  if (!bcrypt.compareSync(password, user.password_hash)) return { ok: false, error: 'Contraseña incorrecta' };
  return { ok: true, user: { id: user.id, username: user.username, role: user.role } };
});

ipcMain.handle('contadores:list', () => dbAll("SELECT id,username,active FROM users WHERE role='contador' ORDER BY username"));
ipcMain.handle('contadores:add', (_, { username, password }) => {
  try { dbRun("INSERT INTO users(username,password_hash,role) VALUES(?,?,'contador')",[username,bcrypt.hashSync(password,10)]); return {ok:true}; }
  catch(e) { return {ok:false,error:'Ese nombre ya existe'}; }
});
ipcMain.handle('contadores:edit', (_, { id, username, password }) => {
  try {
    if (password) dbRun('UPDATE users SET username=?,password_hash=? WHERE id=?',[username,bcrypt.hashSync(password,10),id]);
    else dbRun('UPDATE users SET username=? WHERE id=?',[username,id]);
    return {ok:true};
  } catch(e) { return {ok:false,error:'Ese nombre ya existe'}; }
});
ipcMain.handle('contadores:delete', (_, id) => { dbRun('DELETE FROM users WHERE id=?',[id]); return {ok:true}; });
ipcMain.handle('contadores:toggle', (_, id) => {
  const u = dbGet('SELECT active FROM users WHERE id=?',[id]);
  const n = u.active ? 0 : 1;
  dbRun('UPDATE users SET active=? WHERE id=?',[n,id]);
  return {ok:true,active:n};
});

ipcMain.handle('dias:list', () => dbAll('SELECT * FROM registro_dias ORDER BY substr(fecha,7,4) DESC, substr(fecha,4,2) DESC, substr(fecha,1,2) DESC'));
ipcMain.handle('dias:create', (_, { fecha, createdBy }) => {
  try {
    dbRun('INSERT INTO registro_dias(fecha,created_by,contadores) VALUES(?,?,?)',[fecha,createdBy,JSON.stringify([createdBy])]);
    const row = dbGet('SELECT * FROM registro_dias WHERE fecha=?',[fecha]);
    for (let i=0;i<20;i++) db.run('INSERT INTO registro_filas(dia_id,fila_orden) VALUES(?,?)',[row.id,i]);
    saveDb();
    return {ok:true,id:row.id};
  } catch(e) { return {ok:false,error:'Ya existe un registro para esa fecha'}; }
});
ipcMain.handle('dias:get', (_, id) => {
  const dia = dbGet('SELECT * FROM registro_dias WHERE id=?',[id]);
  if (!dia) return null;
  return { ...dia, filas: dbAll('SELECT * FROM registro_filas WHERE dia_id=? ORDER BY fila_orden',[id]), comentarios: dbAll('SELECT * FROM comentarios WHERE dia_id=? ORDER BY created_at',[id]) };
});
ipcMain.handle('dias:save', (_, { id, filas, username }) => {
  const dia = dbGet('SELECT * FROM registro_dias WHERE id=?',[id]);
  let contadores = JSON.parse(dia.contadores||'[]');
  if (!contadores.includes(username)) contadores.push(username);
  const now = new Date().toLocaleString('es-ES');
  let mod = dia.modified_by||'';
  if (mod) mod+='\n';
  mod+=`Modificado por ${username} — ${now}`;
  db.run('UPDATE registro_dias SET contadores=?,modified_by=?,modified_at=? WHERE id=?',[JSON.stringify(contadores),mod,now,id]);
  db.run('DELETE FROM registro_filas WHERE dia_id=?',[id]);
  filas.forEach((f,i) => db.run('INSERT INTO registro_filas(dia_id,nombre,ofrenda,ofrenda_especial,descripcion_especial,diezmo,fila_orden) VALUES(?,?,?,?,?,?,?)',
    [id,f.nombre||null,f.ofrenda??null,f.ofrenda_especial??null,f.descripcion_especial||null,f.diezmo??null,i]));
  saveDb();
  return {ok:true};
});
ipcMain.handle('dias:delete', (_, id) => {
  db.run('DELETE FROM registro_dias WHERE id=?',[id]);
  db.run('DELETE FROM registro_filas WHERE dia_id=?',[id]);
  db.run('DELETE FROM comentarios WHERE dia_id=?',[id]);
  saveDb(); return {ok:true};
});
ipcMain.handle('dias:add-rows', (_, { id, count }) => {
  const max = dbGet('SELECT MAX(fila_orden) as m FROM registro_filas WHERE dia_id=?',[id]);
  let start = (max&&max.m!=null?max.m:-1)+1;
  for (let i=0;i<count;i++) db.run('INSERT INTO registro_filas(dia_id,fila_orden) VALUES(?,?)',[id,start+i]);
  saveDb(); return {ok:true};
});

ipcMain.handle('comentarios:add', (_, { diaId, autor, texto }) => { dbRun('INSERT INTO comentarios(dia_id,autor,texto) VALUES(?,?,?)',[diaId,autor,texto]); return {ok:true}; });

ipcMain.handle('personas:list', (_, year) => {
  const yearStr = String(year || '').trim();
  const rows = dbAll(`SELECT DISTINCT rf.nombre FROM registro_filas rf JOIN registro_dias rd ON rf.dia_id=rd.id WHERE rf.nombre IS NOT NULL AND rf.nombre!='' AND substr(rd.fecha,7,4)=? ORDER BY rf.nombre`,[yearStr]);
  return rows.map(r=>r.nombre);
});
ipcMain.handle('personas:years', () => {
  return dbAll("SELECT DISTINCT substr(fecha,7,4) as y FROM registro_dias ORDER BY y DESC").map(r=>r.y).filter(Boolean);
});
ipcMain.handle('personas:data', (_, { nombre, year }) => {
  const months = Array.from({length:12},(_,i)=>{
    const m = String(i+1).padStart(2,'0');
    const r = dbGet(`SELECT SUM(rf.ofrenda) as ofrenda, SUM(rf.ofrenda_especial) as ofrenda_especial, SUM(rf.diezmo) as diezmo FROM registro_filas rf JOIN registro_dias rd ON rf.dia_id=rd.id WHERE rf.nombre=? AND substr(rd.fecha,7,4)=? AND substr(rd.fecha,4,2)=?`,[nombre,String(year),m]);
    return { mes:i, ofrenda:r&&r.ofrenda?Number(r.ofrenda):0, ofrenda_especial:r&&r.ofrenda_especial?Number(r.ofrenda_especial):0, diezmo:r&&r.diezmo?Number(r.diezmo):0 };
  });
  const porFecha = dbAll(`SELECT rd.fecha, rd.id as dia_id, SUM(rf.ofrenda) as ofrenda, SUM(rf.ofrenda_especial) as ofrenda_especial, SUM(rf.diezmo) as diezmo, GROUP_CONCAT(rf.descripcion_especial, ' | ') as descripciones FROM registro_filas rf JOIN registro_dias rd ON rf.dia_id=rd.id WHERE rf.nombre=? AND substr(rd.fecha,7,4)=? GROUP BY rd.fecha ORDER BY rd.fecha`,[nombre,String(year)]);
  return { months, porFecha: porFecha.map(f=>({...f,ofrenda:Number(f.ofrenda)||0,ofrenda_especial:Number(f.ofrenda_especial)||0,diezmo:Number(f.diezmo)||0})) };
});
ipcMain.handle('personas:add-fila', (_, { nombre, fecha, ofrenda, ofrenda_especial, descripcion_especial, diezmo, currentUser }) => {
  let dia = dbGet('SELECT * FROM registro_dias WHERE fecha=?',[fecha]);
  if (!dia) {
    db.run('INSERT INTO registro_dias(fecha,created_by,contadores) VALUES(?,?,?)',[fecha,currentUser,JSON.stringify([currentUser])]);
    saveDb();
    dia = dbGet('SELECT * FROM registro_dias WHERE fecha=?',[fecha]);
    for (let i=0;i<20;i++) db.run('INSERT INTO registro_filas(dia_id,fila_orden) VALUES(?,?)',[dia.id,i]);
    saveDb();
  }
  let contadores = JSON.parse(dia.contadores||'[]');
  if (!contadores.includes(currentUser)) contadores.push(currentUser);
  const now = new Date().toLocaleString('es-ES');
  let mod = dia.modified_by||''; if (mod) mod+='\n';
  mod+=`Modificado por ${currentUser} — ${now}`;
  db.run('UPDATE registro_dias SET contadores=?,modified_by=?,modified_at=? WHERE id=?',[JSON.stringify(contadores),mod,now,dia.id]);
  const empty = dbGet('SELECT id FROM registro_filas WHERE dia_id=? AND nombre IS NULL LIMIT 1',[dia.id]);
  if (empty) {
    db.run('UPDATE registro_filas SET nombre=?,ofrenda=?,ofrenda_especial=?,descripcion_especial=?,diezmo=? WHERE id=?',
      [nombre,ofrenda??null,ofrenda_especial??null,descripcion_especial||null,diezmo??null,empty.id]);
  } else {
    const max = dbGet('SELECT MAX(fila_orden) as m FROM registro_filas WHERE dia_id=?',[dia.id]);
    db.run('INSERT INTO registro_filas(dia_id,nombre,ofrenda,ofrenda_especial,descripcion_especial,diezmo,fila_orden) VALUES(?,?,?,?,?,?,?)',
      [dia.id,nombre,ofrenda??null,ofrenda_especial??null,descripcion_especial||null,diezmo??null,(max&&max.m!=null?max.m:0)+1]);
  }
  saveDb();
  return {ok:true,diaId:dia.id};
});

ipcMain.handle('pdf:save', async (_, { buffer, base64, filename }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath: filename, filters: [{ name:'PDF', extensions:['pdf'] }] });
  if (!filePath) return {ok:false};
  if (base64) {
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  } else if (buffer) {
    fs.writeFileSync(filePath, Buffer.from(buffer));
  }
  return {ok:true};
});
ipcMain.handle('xlsx:save', async (_, { buffer, base64, filename }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath: filename, filters: [{ name:'Excel', extensions:['xlsx'] }] });
  if (!filePath) return {ok:false};
  if (base64) {
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  } else if (buffer) {
    fs.writeFileSync(filePath, Buffer.from(buffer));
  }
  return {ok:true};
});
ipcMain.handle('logo:pick', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, { title:'Seleccionar logo', filters:[{name:'Imágenes',extensions:['png','jpg','jpeg','gif','webp']}], properties:['openFile'] });
  if (!filePaths||!filePaths[0]) return {ok:false};
  const data = fs.readFileSync(filePaths[0]);
  const ext = path.extname(filePaths[0]).slice(1).toLowerCase();
  const mime = ext==='jpg'?'image/jpeg':`image/${ext}`;
  const base64 = `data:${mime};base64,${data.toString('base64')}`;
  dbRun("INSERT OR REPLACE INTO config(key,value) VALUES('logo',?)",[base64]);
  return {ok:true,logo:base64};
});
ipcMain.handle('logo:remove', () => { dbRun("DELETE FROM config WHERE key='logo'"); return {ok:true}; });
ipcMain.handle('admin:change-password', (_, { oldPassword, newPassword }) => {
  const user = dbGet("SELECT * FROM users WHERE role='admin' LIMIT 1");
  if (!user) return {ok:false,error:'No se encontró el administrador'};
  if (!bcrypt.compareSync(oldPassword,user.password_hash)) return {ok:false,error:'La contraseña actual es incorrecta'};
  dbRun('UPDATE users SET password_hash=? WHERE id=?',[bcrypt.hashSync(newPassword,10),user.id]);
  return {ok:true};
});
ipcMain.handle('backup:save', async () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const { filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath:`backup-ofrendas-${stamp}.db`, filters:[{name:'Base de datos',extensions:['db']}] });
  if (!filePath) return {ok:false};
  fs.writeFileSync(filePath, Buffer.from(db.export()));
  return {ok:true};
});
ipcMain.handle('backup:restore', (_, { buffer }) => {
  try {
    const buf = Buffer.from(buffer);
    if (buf.slice(0,6).toString('ascii') !== 'SQLite') return {ok:false,error:'Archivo no válido'};
    const backupDb = new SQL.Database(buf);
    const merge = (sql, params=[]) => { try { db.run(sql,params); } catch(e){} };
    const getAll = (bDb,sql) => { const rows=[]; const s=bDb.prepare(sql); while(s.step()) rows.push(s.getAsObject()); s.free(); return rows; };
    getAll(backupDb,"SELECT * FROM users WHERE role='contador'").forEach(u=>merge('INSERT OR IGNORE INTO users(username,password_hash,role,active) VALUES(?,?,?,?)',[u.username,u.password_hash,u.role,u.active]));
    getAll(backupDb,"SELECT * FROM config WHERE key NOT IN ('logo')").forEach(c=>merge('INSERT OR IGNORE INTO config(key,value) VALUES(?,?)',[c.key,c.value]));
    getAll(backupDb,'SELECT * FROM registro_dias').forEach(d=>merge('INSERT OR IGNORE INTO registro_dias(id,fecha,created_by,contadores,modified_by,modified_at,created_at) VALUES(?,?,?,?,?,?,?)',[d.id,d.fecha,d.created_by,d.contadores,d.modified_by,d.modified_at,d.created_at]));
    getAll(backupDb,'SELECT * FROM registro_filas').forEach(f=>merge('INSERT OR IGNORE INTO registro_filas(id,dia_id,nombre,ofrenda,ofrenda_especial,descripcion_especial,diezmo,fila_orden) VALUES(?,?,?,?,?,?,?,?)',[f.id,f.dia_id,f.nombre,f.ofrenda,f.ofrenda_especial,f.descripcion_especial,f.diezmo??null,f.fila_orden]));
    getAll(backupDb,'SELECT * FROM comentarios').forEach(c=>merge('INSERT OR IGNORE INTO comentarios(id,dia_id,autor,texto,created_at) VALUES(?,?,?,?,?)',[c.id,c.dia_id,c.autor,c.texto,c.created_at]));
    backupDb.close();
    saveDb();
    return {ok:true};
  } catch(e) { return {ok:false,error:e.message}; }
});

// ─── Excel generation with full styling (exceljs) ────────────────
ipcMain.handle('xlsx:generate', async (_, { year, orgName }) => {
  try {
    const ExcelJS = require('exceljs');

    // Fetch data
    const personas = dbAll(`SELECT DISTINCT rf.nombre FROM registro_filas rf JOIN registro_dias rd ON rf.dia_id=rd.id WHERE rf.nombre IS NOT NULL AND rf.nombre!='' AND substr(rd.fecha,7,4)=? ORDER BY rf.nombre`, [String(year)]).map(r => r.nombre);
    if (!personas.length) return { ok: false, error: 'No hay datos para este año' };

    const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const allData = personas.map(nombre => {
      const months = Array.from({length:12}, (_,i) => {
        const m = String(i+1).padStart(2,'0');
        const r = dbGet(`SELECT SUM(rf.ofrenda) as ofrenda, SUM(rf.ofrenda_especial) as ofrenda_especial, SUM(rf.diezmo) as diezmo FROM registro_filas rf JOIN registro_dias rd ON rf.dia_id=rd.id WHERE rf.nombre=? AND substr(rd.fecha,7,4)=? AND substr(rd.fecha,4,2)=?`, [nombre, String(year), m]);
        return { ofrenda: r&&r.ofrenda?Number(r.ofrenda):0, ofrenda_especial: r&&r.ofrenda_especial?Number(r.ofrenda_especial):0, diezmo: r&&r.diezmo?Number(r.diezmo):0 };
      });
      return { nombre, months };
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Ofrendas ${year}`);

    const NAVY = '1A3A5C', DARK_NAVY = '0F2540', YELLOW = 'FFD700', RED = 'C00000', WHITE = 'FFFFFF', LIGHT_BLUE = 'E8F1FB', ALT_ROW = 'F0F6FF';
    const totalCols = 1 + 12 * 3 + 3 + 1; // nombre + 12 months*3 + totals*3 + total general

    const mkFont = (bold=false, sz=10, color=null) => ({ bold, size: sz, color: color ? { argb: 'FF'+color } : undefined });
    const mkFill = (color) => ({ type:'pattern', pattern:'solid', fgColor:{ argb:'FF'+color } });
    const mkBorder = (style='thin', color='888888') => {
      const s = { style, color:{ argb:'FF'+color } };
      return { top:s, bottom:s, left:s, right:s };
    };
    const mkAlign = (h='center', v='middle', wrap=false) => ({ horizontal:h, vertical:v, wrapText:wrap });

    // ── Row 1: Title ──
    ws.addRow([`Ofrendas ${year} de ${orgName}`]);
    const titleRow = ws.getRow(1);
    titleRow.height = 24;
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = ws.getCell(1,1);
    titleCell.font = mkFont(true, 14, WHITE);
    titleCell.fill = mkFill(NAVY);
    titleCell.alignment = mkAlign('center','middle');
    titleCell.border = mkBorder('medium', NAVY);

    // ── Row 2: Month headers ──
    const hRow2 = ws.addRow(['Nombre']);
    hRow2.height = 20;
    ws.getCell(2,1).font = mkFont(true,10,WHITE);
    ws.getCell(2,1).fill = mkFill(NAVY);
    ws.getCell(2,1).alignment = mkAlign('center','middle');
    ws.getCell(2,1).border = mkBorder('medium',NAVY);

    MONTHS_ES.forEach((m, mi) => {
      const startCol = 2 + mi * 3;
      ws.mergeCells(2, startCol, 2, startCol+2);
      const cell = ws.getCell(2, startCol);
      cell.value = m;
      const bg = mi%2===0 ? NAVY : DARK_NAVY;
      cell.font = mkFont(true, 9, WHITE);
      cell.fill = mkFill(bg);
      cell.alignment = mkAlign('center','middle');
      cell.border = mkBorder('medium', NAVY);
      // fill merged
      for(let c=startCol+1;c<=startCol+2;c++){ws.getCell(2,c).fill=mkFill(bg);ws.getCell(2,c).border=mkBorder('medium',NAVY);}
    });

    // Total year header
    const totYearStart = 2 + 12*3;
    ws.mergeCells(2, totYearStart, 2, totYearStart+2);
    const tyCell = ws.getCell(2, totYearStart);
    tyCell.value = `Total ${year}`;
    tyCell.font = mkFont(true,10,WHITE);
    tyCell.fill = mkFill(RED);
    tyCell.alignment = mkAlign('center','middle');
    tyCell.border = mkBorder('medium',RED);
    for(let c=totYearStart+1;c<=totYearStart+2;c++){ws.getCell(2,c).fill=mkFill(RED);ws.getCell(2,c).border=mkBorder('medium',RED);}

    // Total general header
    const totGenCol = totYearStart+3;
    ws.mergeCells(2, totGenCol, 3, totGenCol); // spans rows 2 and 3
    const tgHead = ws.getCell(2, totGenCol);
    tgHead.value = 'Total general';
    tgHead.font = mkFont(true,10,WHITE);
    tgHead.fill = mkFill(RED);
    tgHead.alignment = mkAlign('center','middle',true);
    tgHead.border = mkBorder('medium',RED);

    // ── Row 3: Subheaders ──
    const hRow3 = ws.addRow(['']);
    hRow3.height = 16;
    ws.getCell(3,1).font = mkFont(true,9,'333333');
    ws.getCell(3,1).fill = mkFill(YELLOW);
    ws.getCell(3,1).alignment = mkAlign('center');
    ws.getCell(3,1).border = mkBorder('thin');

    const subLabels = ['Ofrenda (€)','Ofr. especial (€)','Diezmo (€)'];
    for(let mi=0;mi<12;mi++){
      const sc=2+mi*3;
      subLabels.forEach((lbl,li)=>{
        const cell=ws.getCell(3,sc+li);
        cell.value=lbl;
        cell.font=mkFont(true,8,'333333');
        cell.fill=mkFill(YELLOW);
        cell.alignment=mkAlign('center');
        cell.border=mkBorder('thin');
      });
    }
    subLabels.forEach((lbl,li)=>{
      const cell=ws.getCell(3,totYearStart+li);
      cell.value=lbl;
      cell.font=mkFont(true,8,WHITE);
      cell.fill=mkFill(RED);
      cell.alignment=mkAlign('center');
      cell.border=mkBorder('thin',RED);
    });

    // ── Data rows ──
    allData.forEach(({nombre, months}, ri) => {
      const rowIdx = 4 + ri;
      const row = ws.addRow([]);
      row.height = 15;
      const isEven = ri%2===0;
      const rowBg = isEven ? WHITE : ALT_ROW;

      // Nombre
      const nCell = ws.getCell(rowIdx,1);
      nCell.value = nombre;
      nCell.font = mkFont(true,10);
      nCell.fill = mkFill(rowBg);
      nCell.alignment = mkAlign('left','middle');
      nCell.border = mkBorder('thin');

      let totOf=0,totEsp=0,totDi=0;
      months.forEach((m,mi)=>{
        const sc=2+mi*3;
        const of=Number(m.ofrenda)||0, esp=Number(m.ofrenda_especial)||0, di=Number(m.diezmo)||0;
        totOf+=of; totEsp+=esp; totDi+=di;
        [of,esp,di].forEach((val,li)=>{
          const cell=ws.getCell(rowIdx,sc+li);
          cell.value=val>0?val:0;
          cell.numFmt=val>0?'#,##0.00 "€"':'0 "€"';
          cell.font=mkFont(false,10);
          cell.fill=mkFill(rowBg);
          cell.alignment=mkAlign('center','middle');
          cell.border=mkBorder('thin');
        });
      });

      // Year totals
      [totOf,totEsp,totDi].forEach((val,li)=>{
        const cell=ws.getCell(rowIdx,totYearStart+li);
        cell.value=val>0?val:0;
        cell.numFmt=val>0?'#,##0.00 "€"':'0 "€"';
        cell.font=mkFont(true,10,WHITE);
        cell.fill=mkFill(RED);
        cell.alignment=mkAlign('center','middle');
        cell.border=mkBorder('thin',RED);
      });

      // Total general
      const total=totOf+totEsp+totDi;
      const tgCell=ws.getCell(rowIdx,totGenCol);
      tgCell.value=total>0?total:0;
      tgCell.numFmt=total>0?'#,##0.00 "€"':'0 "€"';
      tgCell.font=mkFont(true,13,WHITE);
      tgCell.fill=mkFill(DARK_NAVY);
      tgCell.alignment=mkAlign('center','middle');
      tgCell.border=mkBorder('medium',DARK_NAVY);
    });

    // ── Column widths ──
    ws.getColumn(1).width = 24;
    for(let c=2;c<=totalCols;c++) ws.getColumn(c).width = 10;

    // Save dialog
    const now = new Date();
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `ofrendas-${year}.xlsx`,
      filters: [{ name:'Excel', extensions:['xlsx'] }]
    });
    if (!filePath) return { ok: false };
    await wb.xlsx.writeFile(filePath);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
});