-- river_summary
select r.name as river, count(distinct s.id) as stations, count(q.id) as annual_records
from river r left join monitoring_station s on s.river_id = r.id
left join water_quality_record q on q.station_id = s.id
group by r.id, r.name order by r.name;

-- flagged_stations
select station_id, station_name, river_name, report_year, do_min, bod_max, ph_min, ph_max, fc_max
from quality_details where report_year = 2023 and quality_status = 'Flagged' order by river_name, station_name;

-- missing_records
select s.id, s.name, r.name as river
from monitoring_station s join river r on r.id = s.river_id
where not exists (select 1 from water_quality_record q where q.station_id = s.id and q.report_year = 2023)
order by r.name, s.name;

-- year_comparison
select a.station_id, a.station_name, a.report_year, b.report_year as previous_year,
  a.bod_max, b.bod_max as previous_bod_max, a.do_min, b.do_min as previous_do_min,
  a.ph_min, b.ph_min as previous_ph_min, a.ph_max, b.ph_max as previous_ph_max,
  a.fc_max, b.fc_max as previous_fc_max
from quality_details a left join water_quality_record b
  on b.station_id = a.station_id and b.report_year = a.report_year - 1
where a.report_year = 2023 order by a.station_name;

-- Run these examples after importing the supplied data.
select station_id, station_name, report_year, do_min, do_max, quality_status
from quality_details where station_id = '1049' order by report_year;

select c.name as tributary, p.name as parent_river
from tributary t join river c on c.id = t.child_id
join river p on p.id = t.parent_id order by p.name, c.name;

select id, json_length(edit_history) as edits
from water_quality_record where json_length(edit_history) > 0;
