const fs = require('node:fs');
const { pool, transaction } = require('./connection');

// The supplied CSVs contain plain, unquoted fields.
function rows(file) {
  const lines = fs.readFileSync('data/' + file + '.csv', 'utf8').trimEnd().split(/\r?\n/);
  const columns = lines.shift().split(',');
  return lines.map(line => {
    const values = line.split(',');
    if (values.length !== columns.length || line.includes('"')) throw Error('Unexpected CSV format in ' + file);
    return Object.fromEntries(columns.map((key, i) => [key, values[i] || null]));
  });
}
async function seed(db) {
  const [basin] = await db.execute('insert into river_basin(name) values (?)', ['Ganga']);
  const river_ids = new Map();
  const rivers = rows('rivers');
  for (const river of rivers) {
    const [result] = await db.execute('insert into river(basin_id,name) values (?,?)', [basin.insertId, river.name]);
    river_ids.set(river.name, result.insertId);
  }
  for (const river of rivers.filter(row => row.parent)) {
    await db.execute('insert into tributary(child_id,parent_id) values (?,?)', [river_ids.get(river.name), river_ids.get(river.parent)]);
  }
  const features = JSON.parse(fs.readFileSync('data/network.geojson')).features;
  const geometry = new Map(features.map(item => [String(item.properties.id), item]));
  const segments = rows('segments');
  for (const row of segments) {
    await db.execute('insert into river_segment(id,longitude,latitude,length_km,feature) values (?,?,?,?,?)',
      [row.id, row.longitude, row.latitude, row.length_km, JSON.stringify(geometry.get(row.id))]);
  }
  for (const row of segments.filter(row => Number(row.next))) {
    await db.execute('update river_segment set next_id=? where id=?', [row.next, row.id]);
  }
  for (const row of rows('stations')) {
    await db.execute('insert into monitoring_station(id,name,river_id,state,segment_id) values (?,?,?,?,?)',
      [row.id, row.name, river_ids.get(row.river), row.state, row.segment]);
  }
  for (const row of rows('records')) {
    const source = 'https://cpcb.nic.in/wqm/' + row.year + '/WQuality_River-Data-' + row.year + '.pdf';
    let note = null;
    if (row.year === '2022' && ['1489','1491'].includes(row.station)) note = 'BOD and faecal coliform below detection limit.';
    if (row.year === '2022' && row.station === '2283') note = 'Faecal coliform unavailable.';
    await db.execute('insert into water_quality_record(station_id,report_year,do_min,do_max,bod_min,bod_max,ph_min,ph_max,fc_min,fc_max,source_ref,notes) values (?,?,?,?,?,?,?,?,?,?,?,?)',
      [...Object.values(row), source, note]);
  }
  for (const pair of [['Dissolved oxygen','mg/L'],['Biochemical oxygen demand','mg/L'],['pH','unitless'],['Faecal coliform','MPN/100 mL']]) {
    await db.execute('insert into pollutant(name,unit) values (?,?)', pair);
  }
}
transaction(seed).then(() => console.log('Project data imported.')).catch(error => {
  console.error('Import rolled back:', error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
