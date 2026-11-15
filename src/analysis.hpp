#pragma once
#include "models.hpp"
#include "graph.hpp"
#include "history.hpp"
#include "hash_table.hpp"
#include "heap.hpp"
#include "tree.hpp"
#include <memory>

using namespace std;

class RiverTrace {
public:
    Data data;
    Graph graph;
    RiverTree tree;
    HashTable station_index;
    HashTable segment_index;
    vector<unique_ptr<History>> histories;
    vector<int> years;

    RiverTrace(Data input);
    Record* record(int station, int year);
    double score(Record& record);
    string status(Record* record);
    vector<string> reasons(Record& record);
    vector<int> search(string query, string river, int year, string status, string sort_order);
    vector<RankedStation> ranking(int year);
    vector<int> stations_on(Walk& walk, int start, bool flagged, int year);
};
