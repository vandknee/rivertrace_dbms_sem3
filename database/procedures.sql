delimiter //

create procedure if not exists check_parent(in child int, in parent int)
begin
  declare ancestor int default parent;
  while ancestor is not null do
    if ancestor = child then
      signal sqlstate '45000' set message_text = 'This relationship would create a tributary cycle.';
    end if;
    set ancestor = (select parent_id from tributary where child_id = ancestor);
  end while;
end//

create procedure if not exists river_summary()
begin
  select r.name as river, count(distinct s.id) as stations, count(q.id) as annual_records
from river r left join monitoring_station s on s.river_id = r.id
left join water_quality_record q on q.station_id = s.id
group by r.id, r.name order by r.name;
end//

create procedure if not exists flagged_stations(in selected_year smallint)
begin
  select station_id, station_name, river_name, report_year, do_min, bod_max, ph_min, ph_max, fc_max
from quality_details where report_year = selected_year and quality_status = 'Flagged' order by river_name, station_name;
end//

create procedure if not exists missing_records(in selected_year smallint)
begin
  select s.id, s.name, r.name as river
from monitoring_station s join river r on r.id = s.river_id
where not exists (select 1 from water_quality_record q where q.station_id = s.id and q.report_year = selected_year)
order by r.name, s.name;
end//

create procedure if not exists year_comparison(in selected_year smallint)
begin
  select a.station_id, a.station_name, a.report_year, b.report_year as previous_year,
  a.bod_max, b.bod_max as previous_bod_max, a.do_min, b.do_min as previous_do_min,
  a.ph_min, b.ph_min as previous_ph_min, a.ph_max, b.ph_max as previous_ph_max,
  a.fc_max, b.fc_max as previous_fc_max
from quality_details a left join water_quality_record b
  on b.station_id = a.station_id and b.report_year = a.report_year - 1
where a.report_year = selected_year order by a.station_name;
end//
delimiter ;
