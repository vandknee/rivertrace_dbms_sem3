create trigger if not exists save_previous_reading before update on water_quality_record
for each row set new.edit_history = json_array_append(old.edit_history, '$',
  json_object('edited_at_utc', utc_timestamp(6), 'station_id', old.station_id,
    'report_year', old.report_year, 'source_ref', old.source_ref, 'notes', old.notes,
    'do_min', old.do_min, 'do_max', old.do_max, 'bod_min', old.bod_min, 'bod_max', old.bod_max,
    'ph_min', old.ph_min, 'ph_max', old.ph_max, 'fc_min', old.fc_min, 'fc_max', old.fc_max));

delimiter //
create trigger if not exists validate_parent_insert before insert on tributary
for each row call check_parent(new.child_id, new.parent_id)//
create trigger if not exists validate_parent_update before update on tributary
for each row call check_parent(new.child_id, new.parent_id)//
delimiter ;

delimiter //
create trigger if not exists require_observation_evidence before insert on pollution_record
for each row
begin
  if trim(new.source_ref) = '' or trim(new.observation) = '' then
    signal sqlstate '45000' set message_text = 'Provide an observation and its evidence reference.';
  end if;
end//
create trigger if not exists require_updated_evidence before update on pollution_record
for each row
begin
  if trim(new.source_ref) = '' or trim(new.observation) = '' then
    signal sqlstate '45000' set message_text = 'Provide an observation and its evidence reference.';
  end if;
end//
delimiter ;
