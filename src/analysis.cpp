#include "analysis.hpp"
#include <algorithm>
#include <cctype>
#include <set>

using namespace std;

string lower(string text) {
    for (char& letter : text) letter = tolower((unsigned char) letter);
    return text;
}

RiverTrace::RiverTrace(Data input) : data(input), graph(input.segments.size()), tree(input.rivers), segment_index(10007) {
    for (int i = 0; i < (int) data.segments.size(); i++) segment_index.insert(to_string(data.segments[i].id), i);
    for (int i = 0; i < (int) data.segments.size(); i++) {
        int next = data.segments[i].next;
        if (next != 0) graph.add_edge(i, segment_index.find(to_string(next)));
    }
    for (int i = 0; i < (int) data.stations.size(); i++) {
        station_index.insert(data.stations[i].id, i);
        histories.push_back(unique_ptr<History>(new History));
    }
    set<int> found_years;
    for (Record& row : data.records) {
        histories[station_index.find(row.station)]->insert(row);
        found_years.insert(row.year);
    }
    years.assign(found_years.begin(), found_years.end());
}

Record* RiverTrace::record(int station, int year) {
    if (station < 0 || station >= (int) data.stations.size()) return nullptr;
    return histories[station]->find(year);
}

double RiverTrace::score(Record& row) {
    double result = 0;
    if (row.bod_max >= 0) result += max(0.0, row.bod_max / 3.0 - 1);
    if (row.oxygen >= 0) result += max(0.0, (5.0 - row.oxygen) / 5.0);
    if (row.ph >= 0) result += max(0.0, 6.5 - row.ph) + max(0.0, row.ph_max - 8.5);
    if (row.coliform_max >= 0) result += max(0.0, row.coliform_max / 2500.0 - 1);
    return result;
}

vector<string> RiverTrace::reasons(Record& row) {
    vector<string> result;
    if (row.bod_max >= 3) result.push_back("BOD maximum reaches or exceeds 3 mg/L");
    if (row.oxygen >= 0 && row.oxygen <= 5) result.push_back("DO minimum reaches or falls below 5 mg/L");
    if (row.ph >= 0 && (row.ph < 6.5 || row.ph_max > 8.5)) result.push_back("pH range extends outside 6.5 to 8.5");
    if (row.coliform_max >= 2500) result.push_back("Faecal coliform maximum reaches or exceeds 2500 MPN/100 mL");
    return result;
}

string RiverTrace::status(Record* row) {
    if (row == nullptr) return "No data";
    if (!reasons(*row).empty()) return "Flagged";
    if (row->bod < 0 || row->oxygen < 0 || row->ph < 0 || row->coliform < 0) return "Incomplete";
    return "Within limits";
}

vector<RankedStation> RiverTrace::ranking(int year) {
    MaxHeap heap;
    for (int i = 0; i < (int) data.stations.size(); i++) {
        Record* row = record(i, year);
        if (status(row) == "Flagged") heap.push({i, score(*row)});
    }
    vector<RankedStation> result;
    while (!heap.empty()) result.push_back(heap.pop());
    return result;
}

vector<int> RiverTrace::search(string query, string river, int year, string wanted, string sort_order) {
    vector<int> result;
    query = lower(query);
    int exact = station_index.find(query);
    for (int i = 0; i < (int) data.stations.size(); i++) {
        Station& station = data.stations[i];
        if (exact != -1 && i != exact) continue;
        if (exact == -1 && lower(station.name + " " + station.id + " " + station.river).find(query) == string::npos) continue;
        if (!river.empty() && station.river != river) continue;
        if (!wanted.empty() && status(record(i, year)) != wanted) continue;
        result.push_back(i);
    }
    sort(result.begin(), result.end(), [&](int a, int b) {
        if (sort_order == "severity") {
            Record* first = record(a, year);
            Record* second = record(b, year);
            double one = first == nullptr ? -1 : score(*first);
            double two = second == nullptr ? -1 : score(*second);
            if (one != two) return one > two;
        }
        return data.stations[a].name < data.stations[b].name;
    });
    return result;
}

vector<int> RiverTrace::stations_on(Walk& walk, int start, bool flagged, int year) {
    vector<int> result;
    for (int node : walk.order) {
        for (int i = 0; i < (int) data.stations.size(); i++) {
            if (i == start || data.stations[i].segment != data.segments[node].id) continue;
            if (!flagged || status(record(i, year)) == "Flagged") result.push_back(i);
        }
    }
    return result;
}
