const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const run = require('node:util').promisify(execFile);
const { transaction } = require('./connection');

const snapshots = {
  segments: 'select id, coalesce(next_id,0) as next, longitude, latitude, length_km from river_segment order by id',
  rivers: 'select r.name, p.name as parent from river r left join tributary t on t.child_id=r.id left join river p on p.id=t.parent_id order by r.id',
  stations: 'select s.id,s.name,r.name as river,s.state,s.segment_id as segment from monitoring_station s join river r on r.id=s.river_id order by s.id',
  records: 'select station_id as station,report_year as year,do_min,do_max,bod_min,bod_max,ph_min,ph_max,fc_min,fc_max from water_quality_record order by station_id,report_year'
};
function csv_cell(value) {
  if (value === null) return '';
  return '"' + String(value).replaceAll('"','""') + '"';
}
async function explore(program,args) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(),'rivertrace-'));
  try {
    const data = path.join(folder,'data');
    await fs.mkdir(data);
    await transaction(async db => {
      for (const [name,sql] of Object.entries(snapshots)) {
        const [rows,columns] = await db.query(sql);
        const keys = columns.map(c => c.name);
        const lines = rows.map(row => keys.map(k => csv_cell(row[k])).join(','));
        await fs.writeFile(path.join(data,name+'.csv'), [keys.join(','),...lines].join('\n')+'\n');
      }
    });
    const {stdout} = await run(program,args,{cwd:folder,timeout:15000,maxBuffer:4194304,windowsHide:true});
    return JSON.parse(stdout);
  } finally {
    await fs.rm(folder,{recursive:true,force:true});
  }
}
module.exports = explore;
