#include "loader.hpp"
#include "hash_table.hpp"
#include "tree.hpp"
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <cmath>
#include <set>

using namespace std;

vector<vector<string>> read_csv(string path, int columns) {
    ifstream file(path);
    if (!file) throw runtime_error("Cannot open " + path);
    vector<vector<string>> rows;
    string line;
    getline(file, line);
    int line_number = 1;
    while (getline(file, line)) {
        line_number++;
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (line.empty()) continue;
        vector<string> row;
        string cell;
        bool quoted = false;
        for (int i = 0; i < (int) line.size(); i++) {
            if (line[i] == '"') {
                if (quoted && i + 1 < (int) line.size() && line[i + 1] == '"') {
                    cell += '"';
                    i++;
                } else quoted = !quoted;
            } else if (line[i] == ',' && !quoted) {
                row.push_back(cell);
                cell.clear();
            } else cell += line[i];
        }
        row.push_back(cell);
        if (quoted || (int) row.size() != columns) {
            throw runtime_error(path + ": check columns on line " + to_string(line_number));
        }
        rows.push_back(row);
    }
    return rows;
}

double number(string text, bool missing = false) {
    if (text.empty() && missing) return -1;
    size_t used = 0;
    double value;
    try { value = stod(text, &used); }
    catch (...) { throw runtime_error("Invalid number: " + text); }
    if (used != text.size() || !isfinite(value) || value < 0) {
        throw runtime_error("Invalid number: " + text);
    }
    return value;
}

int integer(string text) {
    double value = number(text);
    if (value > 2147483647 || floor(value) != value) throw runtime_error("Invalid whole number: " + text);
    return (int) value;
}

Data load_data(string folder) {
    Data data;
    HashTable segments(10007), stations;
    for (vector<string> row : read_csv(folder + "/segments.csv", 5)) {
        Segment segment{integer(row[0]), integer(row[1]), number(row[2]), number(row[3]), number(row[4])};
        if (!segments.insert(row[0], data.segments.size())) throw runtime_error("Duplicate segment ID");
        data.segments.push_back(segment);
    }
    if (data.segments.empty()) throw runtime_error("No river segments found");
    for (Segment segment : data.segments) {
        if (segment.next != 0 && segments.find(to_string(segment.next)) == -1) {
            throw runtime_error("Missing downstream segment");
        }
    }
    for (vector<string> row : read_csv(folder + "/rivers.csv", 2)) data.rivers.push_back({row[0], row[1]});
    RiverTree tree(data.rivers);
    HashTable rivers;
    for (int i = 0; i < (int) data.rivers.size(); i++) rivers.insert(data.rivers[i].name, i);
    for (vector<string> row : read_csv(folder + "/stations.csv", 5)) {
        if (row[0].empty() || row[1].empty() || rivers.find(row[2]) == -1) throw runtime_error("Invalid station name or river");
        if (segments.find(row[4]) == -1) throw runtime_error("Station refers to a missing segment");
        if (!stations.insert(row[0], data.stations.size())) throw runtime_error("Duplicate station ID");
        data.stations.push_back({row[0], row[1], row[2], row[3], integer(row[4])});
    }
    set<string> seen;
    for (vector<string> row : read_csv(folder + "/records.csv", 10)) {
        if (stations.find(row[0]) == -1) throw runtime_error("Record refers to a missing station");
        int year = integer(row[1]);
        if (year < 1900 || year > 2100) throw runtime_error("Invalid record year");
        if (!seen.insert(row[0] + ":" + row[1]).second) throw runtime_error("Duplicate station-year record");
        Record record{row[0], year, number(row[2], true), number(row[3], true), number(row[4], true), number(row[5], true), number(row[6], true), number(row[7], true), number(row[8], true), number(row[9], true)};
        double values[] = {record.oxygen, record.oxygen_max, record.bod, record.bod_max, record.ph, record.ph_max, record.coliform, record.coliform_max};
        for (int i = 0; i < 8; i += 2) {
            if ((values[i] == -1) != (values[i + 1] == -1) || values[i] > values[i + 1]) throw runtime_error("Invalid minimum / maximum pair");
        }
        if (record.ph_max > 14) throw runtime_error("pH must be between 0 and 14");
        data.records.push_back(record);
    }
    return data;
}
