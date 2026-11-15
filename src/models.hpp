#pragma once
#include <string>
#include <vector>

using namespace std;

struct Station {
    string id;
    string name;
    string river;
    string state;
    int segment;
};

struct Record {
    string station;
    int year;
    double oxygen;
    double oxygen_max;
    double bod;
    double bod_max;
    double ph;
    double ph_max;
    double coliform;
    double coliform_max;
};

struct Segment {
    int id;
    int next;
    double x;
    double y;
    double length;
};

struct River {
    string name;
    string parent;
};

struct Data {
    vector<Station> stations;
    vector<Record> records;
    vector<Segment> segments;
    vector<River> rivers;
};
