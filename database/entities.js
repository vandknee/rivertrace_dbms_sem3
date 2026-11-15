// Only these names can become SQL identifiers.
const fields = {
  river_basin: ['name'],
  river: ['name','basin_id'],
  river_segment: ['next_id','longitude','latitude','length_km'],
  tributary: ['child_id','parent_id'],
  monitoring_station: ['id','name','river_id','state','segment_id'],
  water_quality_record: ['station_id','report_year','do_min','do_max','bod_min','bod_max','ph_min','ph_max','fc_min','fc_max','source_ref','notes'],
  river_water_level: ['station_id','measured_on','level_m','datum','source_ref'],
  pollutant: ['name','unit'],
  pollution_source: ['name','segment_id','source_ref'],
  pollution_record: ['record_id','pollutant_id','source_id','observation','source_ref']
};
const references = {
  basin_id:'river_basin', river_id:'river', child_id:'river', parent_id:'river',
  segment_id:'river_segment', station_id:'monitoring_station', record_id:'water_quality_record',
  pollutant_id:'pollutant', source_id:'pollution_source'
};
const optional = ['source_id','notes', ...fields.water_quality_record.filter(key => /_(min|max)$/.test(key))];
function validate(entity, body, updating) {
  const keys = fields[entity].filter(key => !(updating && key === 'id'));
  const values = {};
  for (const key of keys) {
    const value = body[key];
    if (value == null || value === '') {
      if (!optional.includes(key)) throw Error('Required field: ' + key);
      values[key] = null;
    } else {
      if (!['number','string'].includes(typeof value) || !String(value).trim() || /[\r\n]/.test(value)) throw Error('Invalid value: ' + key);
      values[key] = String(value).trim();
    }
  }
  if (entity === 'water_quality_record') {
    if (!/^\d{4}$/.test(values.report_year) || values.report_year < 1900 || values.report_year > 2100) throw Error('Year must be between 1900 and 2100.');
    for (const key of ['do','bod','ph','fc']) {
      const low = values[key + '_min'], high = values[key + '_max'];
      if (low === null && high === null) continue;
      if (![low,high].every(v => v !== null && /^\d+(\.\d{1,4})?$/.test(v)) ||
          Number(low) > Number(high) || (key === 'ph' && Number(high) > 14)) throw Error('Check both ends of the ' + key + ' range.');
    }
  }
  return values;
}
module.exports = { fields, references, optional, validate };
