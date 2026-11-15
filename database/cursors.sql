delimiter //

create procedure if not exists observation_gaps(in selected_station varchar(32))
begin
  declare finished boolean default false;
  declare current_year, previous_year smallint;
  declare current_status varchar(20);
  
  declare result json default (json_array());
  declare history_rows cursor for
    select report_year, quality_status from quality_details
    where station_id = selected_station order by report_year;
  declare continue handler for not found set finished = true;

  open history_rows;
  read_history: loop
    fetch history_rows into current_year, current_status;
    if finished then leave read_history; end if;
    if previous_year is not null and current_year > previous_year + 1 then
      set result = json_array_append(result, '$', json_object('first_missing',previous_year+1,'last_missing',current_year-1));
    end if;
    set previous_year = current_year;
  end loop;
  close history_rows;
  select selected_station as station_id, result as gaps_between_records;
end//

create procedure if not exists status_changes(in selected_station varchar(32))
begin
  declare finished boolean default false;
  declare current_year, previous_year smallint;
  declare current_status varchar(20);
  declare previous_status varchar(20);
  declare result json default (json_array());
  declare history_rows cursor for
    select report_year, quality_status from quality_details
    where station_id = selected_station order by report_year;
  declare continue handler for not found set finished = true;

  open history_rows;
  read_history: loop
    fetch history_rows into current_year, current_status;
    if finished then leave read_history; end if;
    if previous_year = current_year - 1 and previous_status <> current_status then
      set result = json_array_append(result, '$', json_object('year',current_year,'previous',previous_status,'current',current_status));
    end if;
    set previous_status = current_status;
    set previous_year = current_year;
  end loop;
  close history_rows;
  select selected_station as station_id, result as consecutive_year_changes;
end//

create procedure if not exists flag_streak(in selected_station varchar(32))
begin
  declare finished boolean default false;
  declare current_year, previous_year smallint;
  declare current_status varchar(20);
  declare streak int default 0;
  declare longest int default 0;
  
  declare history_rows cursor for
    select report_year, quality_status from quality_details
    where station_id = selected_station order by report_year;
  declare continue handler for not found set finished = true;

  open history_rows;
  read_history: loop
    fetch history_rows into current_year, current_status;
    if finished then leave read_history; end if;
    if current_status = 'Flagged' then
      set streak = if(previous_year = current_year - 1, streak+1, 1);
      set longest = greatest(longest, streak);
    else
      set streak = 0;
    end if;
    set previous_year = current_year;
  end loop;
  close history_rows;
  select selected_station as station_id, longest as longest_flagged_streak;
end//
delimiter ;
