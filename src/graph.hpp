#pragma once
#include <vector>

using namespace std;

struct Walk {
    vector<int> order;
    vector<int> parent;
};

class Graph {
    vector<vector<int>> downstream;
    vector<vector<int>> upstream;

public:
    Graph(int size);
    void add_edge(int from, int to);
    Walk bfs(int start, bool up);
    Walk dfs(int start, bool up);
    vector<int> path(int from, int to);
    int size();
};
