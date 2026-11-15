#include "graph.hpp"
#include <queue>
#include <stack>
#include <algorithm>
#include <stdexcept>

using namespace std;

Graph::Graph(int size) : downstream(size), upstream(size) {}
int Graph::size() { return downstream.size(); }

void Graph::add_edge(int from, int to) {
    if (from < 0 || to < 0 || from >= size() || to >= size()) {
        throw runtime_error("Unknown river segment in a connection");
    }
    downstream[from].push_back(to);
    upstream[to].push_back(from);
}

Walk Graph::bfs(int start, bool up) {
    Walk walk;
    walk.parent.assign(size(), -1);
    if (start < 0 || start >= size()) return walk;
    vector<vector<int>>& edges = up ? upstream : downstream;
    queue<int> pending;
    walk.parent[start] = start;
    pending.push(start);
    while (!pending.empty()) {
        int node = pending.front();
        pending.pop();
        walk.order.push_back(node);
        for (int next : edges[node]) {
            if (walk.parent[next] != -1) continue;
            walk.parent[next] = node;
            pending.push(next);
        }
    }
    return walk;
}

Walk Graph::dfs(int start, bool up) {
    Walk walk;
    walk.parent.assign(size(), -1);
    if (start < 0 || start >= size()) return walk;
    vector<vector<int>>& edges = up ? upstream : downstream;
    stack<int> pending;
    pending.push(start);
    walk.parent[start] = start;
    while (!pending.empty()) {
        int node = pending.top();
        pending.pop();
        walk.order.push_back(node);
        for (int i = (int) edges[node].size() - 1; i >= 0; i--) {
            int next = edges[node][i];
            if (walk.parent[next] != -1) continue;
            walk.parent[next] = node;
            pending.push(next);
        }
    }
    return walk;
}

vector<int> Graph::path(int from, int to) {
    Walk walk = bfs(from, false);
    vector<int> result;
    if (to < 0 || to >= size() || walk.parent[to] == -1) return result;
    int current = to;
    while (current != from) {
        result.push_back(current);
        current = walk.parent[current];
    }
    result.push_back(from);
    reverse(result.begin(), result.end());
    return result;
}
