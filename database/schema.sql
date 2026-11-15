-- Run once in a new database. Existing tables cause an error.
create table river_basin (
  id int primary key auto_increment,
  name varchar(120) not null unique
) engine=innodb;

create table river (
  id int primary key auto_increment,
  basin_id int not null,
  name varchar(120) not null unique,
  foreign key (basin_id) references river_basin(id)
);

create table river_segment (
  id int primary key,
  next_id int,
  longitude decimal(10,6) not null,
  latitude decimal(9,6) not null,
  length_km decimal(10,3) not null check (length_km >= 0),
  feature json not null,
  foreign key (next_id) references river_segment(id)
);

create table tributary (
  id int primary key auto_increment,
  child_id int not null unique,
  parent_id int not null,
  foreign key (child_id) references river(id),
  foreign key (parent_id) references river(id),
  check (child_id <> parent_id)
);

create table monitoring_station (
  id varchar(32) primary key,
  name varchar(160) not null,
  river_id int not null,
  state varchar(100) not null,
  segment_id int not null,
  foreign key (river_id) references river(id),
  foreign key (segment_id) references river_segment(id)
);

create table water_quality_record (
  id int primary key auto_increment,
  station_id varchar(32) not null,
  report_year smallint not null check (report_year between 1900 and 2100),
  source_ref varchar(500) not null,
  notes varchar(500),
  edit_history json not null default (json_array()),
  unique (station_id, report_year),
  index (report_year),
  foreign key (station_id) references monitoring_station(id),
  do_min decimal(14,4),
  do_max decimal(14,4),
  check ((do_min is null and do_max is null) or
         (do_min is not null and do_max is not null and do_min >= 0 and do_min <= do_max)),
  bod_min decimal(14,4),
  bod_max decimal(14,4),
  check ((bod_min is null and bod_max is null) or
         (bod_min is not null and bod_max is not null and bod_min >= 0 and bod_min <= bod_max)),
  ph_min decimal(14,4),
  ph_max decimal(14,4),
  check ((ph_min is null and ph_max is null) or
         (ph_min is not null and ph_max is not null and ph_min >= 0 and ph_min <= ph_max and ph_max <= 14)),
  fc_min decimal(14,4),
  fc_max decimal(14,4),
  check ((fc_min is null and fc_max is null) or
         (fc_min is not null and fc_max is not null and fc_min >= 0 and fc_min <= fc_max))
);

create table river_water_level (
  id int primary key auto_increment,
  station_id varchar(32) not null,
  measured_on date not null,
  level_m decimal(10,3) not null,
  datum varchar(120) not null,
  source_ref varchar(500) not null,
  unique (station_id, measured_on, datum),
  foreign key (station_id) references monitoring_station(id)
);

create table pollutant (
  id int primary key auto_increment,
  name varchar(120) not null unique,
  unit varchar(50) not null
);

create table pollution_source (
  id int primary key auto_increment,
  segment_id int not null,
  name varchar(160) not null,
  source_ref varchar(500) not null,
  foreign key (segment_id) references river_segment(id)
);

create table pollution_record (
  id int primary key auto_increment,
  record_id int not null,
  pollutant_id int not null,
  source_id int,
  observation varchar(500) not null,
  source_ref varchar(500) not null,
  foreign key (record_id) references water_quality_record(id),
  foreign key (pollutant_id) references pollutant(id),
  foreign key (source_id) references pollution_source(id)
);

create view quality_details as
select q.*, s.name as station_name, r.id as river_id, r.name as river_name,
  case when bod_max >= 3 or do_min <= 5 or ph_min < 6.5 or ph_max > 8.5 or fc_max >= 2500 then 'Flagged'
       when bod_min is null or do_min is null or ph_min is null or fc_min is null then 'Incomplete'
       else 'Within limits' end as quality_status
from water_quality_record q
join monitoring_station s on s.id = q.station_id
join river r on r.id = s.river_id;

