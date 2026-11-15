#pragma once
#include "models.hpp"
#include "hash_table.hpp"
#include <stdexcept>

using namespace std;

struct TreeRow {
    string name;
    int depth;
};

class RiverTree {
    vector<River> rivers;
    vector<vector<int>> children;
    vector<int> roots;

    void visit(int node, int depth, vector<TreeRow>& rows) {
        rows.push_back({rivers[node].name, depth});
        for (int child : children[node]) visit(child, depth + 1, rows);
    }

public:
    RiverTree(vector<River> input) : rivers(input), children(input.size()) {
        HashTable index;
        for (int i = 0; i < (int) rivers.size(); i++) {
            if (!index.insert(rivers[i].name, i)) throw runtime_error("Duplicate river name");
        }
        for (int i = 0; i < (int) rivers.size(); i++) {
            if (rivers[i].parent.empty()) {
                roots.push_back(i);
            } else {
                int parent = index.find(rivers[i].parent);
                if (parent == -1 || parent == i) throw runtime_error("Invalid parent river");
                children[parent].push_back(i);
            }
        }
        for (int i = 0; i < (int) rivers.size(); i++) {
            int node = i;
            int steps = 0;
            while (!rivers[node].parent.empty() && steps <= (int) rivers.size()) {
                node = index.find(rivers[node].parent);
                if (node == -1) throw runtime_error("River tree is disconnected");
                steps++;
            }
            if (steps > (int) rivers.size()) throw runtime_error("River tree contains a cycle");
        }
    }

    vector<TreeRow> all() {
        vector<TreeRow> rows;
        for (int root : roots) visit(root, 0, rows);
        return rows;
    }
};
