const fs = require('node:fs');
const { pool, transaction } = require('./connection');
const { fields, references, optional, validate } = require('./entities');
const reports = new Map();
for (const section of fs.readFileSync(__dirname + '/reports.sql','utf8').split(/^-- /m).slice(1)) {
  const end = section.indexOf('\n');
  reports.set(section.slice(0,end).trim(), section.slice(end).trim());
}
function problem(status, message) {
  return Object.assign(new Error(message), {status});
}
async function read_body(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 24000) throw problem(413,'Form is too large.');
  }
  try { return JSON.parse(body); } catch { throw problem(400,'Send a JSON form.'); }
}
async function workspace(req, url) {
  const [, ,entity,id,extra] = url.pathname.split('/');
  const query = url.searchParams;
  if (extra || !entity) throw problem(404,'Unknown database page.');
  if (req.method === 'GET') {
    if (entity === 'catalog') return {fields,references,optional,reports:[...reports.keys()]};
    if (entity === 'overview') {
      const counts = {};
      for (const table of Object.keys(fields)) {
        const [[row]] = await pool.query('select count(*) as total from ' + table);
        counts[table] = row.total;
      }
      return counts;
    }
    if (entity === 'report' && reports.has(id)) {
      const sql = reports.get(id);
      const [result_sets] = await pool.execute(sql, sql.includes('?') ? [query.get('year')] : []);
      return result_sets[0];
    }
  }
  if (!Object.hasOwn(fields,entity)) throw problem(404,'Unknown table.');
  if (req.method === 'GET') {
    const values = [], conditions = [];
    let sql = 'select * from ' + entity;
    if (entity === 'river_segment') sql = 'select id,next_id,longitude,latitude,length_km from river_segment';
    if (entity === 'water_quality_record') {
      sql = 'select * from quality_details';
      for (const [key,column] of [['year','report_year'],['river','river_id']]) {
        if (query.get(key)) { conditions.push(column + ' = ?'); values.push(query.get(key)); }
      }
      if (query.get('q')) {
        conditions.push('(station_name like ? or station_id like ? or river_name like ?)');
        values.push(...Array(3).fill('%' + query.get('q') + '%'));
      }
    }
    if (id) { conditions.push('id = ?'); values.push(decodeURIComponent(id)); }
    if (conditions.length) sql += ' where ' + conditions.join(' and ');
    return (await pool.execute(sql + ' order by id', values))[0];
  }
  if (entity === 'river_segment' || !['POST','PUT','DELETE'].includes(req.method)) throw problem(405,'Operation unavailable.');
  if ((req.method === 'POST') === Boolean(id)) throw problem(400,'Check the record ID.');
  let values;
  if (req.method !== 'DELETE') {
    const body = await read_body(req);
    try { values = validate(entity,body,Boolean(id)); } catch (error) { throw problem(400,error.message); }
  }
  return transaction(async db => {
    // Serialize hierarchy edits before the cycle triggers read the parent chain.
    if (entity === 'tributary') await db.query('select id from river order by id for update');
    const key = id && decodeURIComponent(id);
    if (id) {
      const [rows] = await db.execute('select id from ' + entity + ' where id=? for update',[key]);
      if (!rows.length) throw problem(404,'Record no longer exists.');
    }
    if (req.method === 'DELETE') {
      if (entity === 'water_quality_record') await db.execute('delete from pollution_record where record_id=?',[key]);
      await db.execute('delete from ' + entity + ' where id=?',[key]);
      return {deleted:true};
    }
    const columns = Object.keys(values);
    if (id) {
      await db.execute('update ' + entity + ' set ' + columns.map(k => k+'=?').join(',') + ' where id=?',[...Object.values(values),key]);
      return {updated:true};
    }
    const [result] = await db.execute('insert into ' + entity + ' (' + columns.join(',') + ') values (' + columns.map(() => '?').join(',') + ')',Object.values(values));
    return {id:values.id || result.insertId};
  });
}
module.exports = workspace;
