#include "api.hpp"
#include <algorithm>
#include <stdexcept>

using namespace std;

string parameter(map<string, string>& request, string name, string fallback = "") {
    map<string, string>::iterator found = request.find(name);
    return found == request.end() ? fallback : found->second;
}

Json reading(Record* row) {
    if (row == nullptr) return nullptr;
    Json result;
    result["year"] = row->year;
    vector<string> names = {"do", "bod", "ph", "fc"};
    double values[] = {row->oxygen, row->oxygen_max, row->bod, row->bod_max, row->ph, row->ph_max, row->coliform, row->coliform_max};
    for (int i = 0; i < 4; i++) {
        if (values[i * 2] < 0) result[names[i]] = nullptr;
        else {
            result[names[i]]["min"] = values[i * 2];
            result[names[i]]["max"] = values[i * 2 + 1];
        }
    }
    return result;
}

Json station_json(RiverTrace& project, int index, int year) {
    Station& station = project.data.stations[index];
    Record* row = project.record(index, year);
    Json result;
    result["id"] = station.id;
    result["name"] = station.name;
    result["river"] = station.river;
    result["state"] = station.state;
    result["segment"] = station.segment;
    result["status"] = project.status(row);
    result["reading"] = reading(row);
    result["score"] = row == nullptr ? 0 : project.score(*row);
    return result;
}

Json station_list(RiverTrace& project, vector<int> indices, int year) {
    Json::list rows;
    for (int index : indices) rows.push_back(station_json(project, index, year));
    return rows;
}

Json segment_list(RiverTrace& project, vector<int> indices) {
    Json::list rows;
    for (int index : indices) rows.push_back(project.data.segments[index].id);
    return rows;
}

ApiResponse json_response(Json result, int code = 200) {
    return {code, move(result)};
}

ApiResponse handle_api(RiverTrace& project, string action, map<string, string>& request) {
    try {
        string year_text = parameter(request, "year", project.years.empty() ? "1900" : to_string(project.years.back()));
        if (year_text.size() != 4 || year_text.find_first_not_of("0123456789") != string::npos) throw runtime_error("Choose a valid year");
        int year = stoi(year_text);
        if (!project.years.empty() && find(project.years.begin(), project.years.end(), year) == project.years.end()) throw runtime_error("No records for this year");
        Json result;
        if (action == "overview") {
            result["stations"] = (int) project.data.stations.size();
            result["segments"] = (int) project.data.segments.size();
            result["records"] = (int) project.data.records.size();
            result["flagged"] = (int) project.ranking(year).size();
            result["years"] = project.years;
            result["year"] = year;
            result["rivers"] = Json::list();
            int i = 0;
            for (River& river : project.data.rivers) result["rivers"][i++] = river.name;
            return json_response(move(result));
        }
        if (action == "stations") {
            string sort = parameter(request, "sort", "name");
            if (sort != "name" && sort != "severity") throw runtime_error("Unknown sort order");
            return json_response(station_list(project, project.search(parameter(request, "q"), parameter(request, "river"), year, parameter(request, "status"), sort), year));
        }
        if (action == "ranking") {
            Json::list rows;
            for (RankedStation item : project.ranking(year)) {
                Json row = station_json(project, item.station, year);
                row["reasons"] = project.reasons(*project.record(item.station, year));
                rows.push_back(move(row));
            }
            return json_response(move(rows));
        }
        if (action == "tree") {
            Json::list rows;
            for (TreeRow item : project.tree.all()) {
                Json row;
                row["name"] = item.name;
                row["depth"] = item.depth;
                rows.push_back(move(row));
            }
            return json_response(move(rows));
        }
        if (action == "network") {
            result["segments"] = Json::list();
            for (int i = 0; i < (int) project.data.segments.size(); i++) {
                Segment& segment = project.data.segments[i];
                result["segments"][i]["id"] = segment.id;
                result["segments"][i]["next"] = segment.next;
                result["segments"][i]["x"] = segment.x;
                result["segments"][i]["y"] = segment.y;
            }
            result["stations"] = station_list(project, project.search("", "", year, "", "name"), year);
            return json_response(move(result));
        }
        if (action != "station" && action != "trace" && action != "path") return json_response({{"error", "API route not found"}}, 404);
        int station = project.station_index.find(parameter(request, "id"));
        if (station == -1) return json_response({{"error", "Station not found"}}, 404);
        if (action == "station") {
            result = station_json(project, station, year);
            Json::list rows;
            for (Record row : project.histories[station]->all()) rows.push_back(reading(&row));
            result["history"] = move(rows);
            return json_response(move(result));
        }
        int start = project.segment_index.find(to_string(project.data.stations[station].segment));
        if (action == "path") {
            int target = project.station_index.find(parameter(request, "to"));
            if (target == -1) return json_response({{"error", "Destination station not found"}}, 404);
            int end = project.segment_index.find(to_string(project.data.stations[target].segment));
            vector<int> path = project.graph.path(start, end);
            result["segments"] = segment_list(project, path);
            result["found"] = !path.empty();
            result["hops"] = path.empty() ? 0 : (int) path.size() - 1;
            result["same_segment"] = start == end;
            return json_response(move(result));
        }
        string direction = parameter(request, "direction", "upstream");
        string method = parameter(request, "method", "bfs");
        if (direction != "upstream" && direction != "downstream") throw runtime_error("Choose upstream or downstream");
        if (method != "bfs" && method != "dfs") throw runtime_error("Choose BFS or DFS");
        bool up = direction == "upstream";
        Walk walk = method == "bfs" ? project.graph.bfs(start, up) : project.graph.dfs(start, up);
        result["segments"] = segment_list(project, walk.order);
        result["stations"] = station_list(project, project.stations_on(walk, station, false, year), year);
        result["candidates"] = station_list(project, project.stations_on(walk, station, true, year), year);
        result["direction"] = direction;
        result["method"] = method;
        result["visited"] = (int) walk.order.size();
        return json_response(move(result));
    } catch (exception& error) {
        return json_response({{"error", error.what()}}, 400);
    }
}
