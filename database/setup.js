const fs = require('node:fs');
const {pool} = require('./connection');

async function setup() {
  const [[row]] = await pool.query('select count(*) as total from information_schema.tables where table_schema=database()');
  if (row.total) throw Error('Choose a new empty database. Existing objects were left in place.');
  const sql = ['schema.sql','procedures.sql','cursors.sql','triggers.sql']
    .map(file => fs.readFileSync(__dirname+'/'+file,'utf8')).join('\n');
  let delimiter = ';', statement = '';
  const db = await pool.getConnection();
  try {
    for (const line of sql.split(/\r?\n/)) {
      if (line.startsWith('--') || !line.trim()) continue;
      if (line.startsWith('delimiter ')) {
        delimiter = line.split(' ')[1];
        continue;
      }
      statement += line+'\n';
      if (line.trimEnd().endsWith(delimiter)) {
        await db.query(statement.trimEnd().slice(0,-delimiter.length));
        statement = '';
      }
    }
  } finally { db.release(); }
}
setup().then(()=>console.log('Schema created.')).catch(error=>{
  console.error(error.message); process.exitCode=1;
}).finally(()=>pool.end());
