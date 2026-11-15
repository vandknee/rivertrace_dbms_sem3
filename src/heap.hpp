#pragma once
#include <vector>
#include <utility>
#include <stdexcept>

using namespace std;

struct RankedStation {
    int station;
    double score;
};

class MaxHeap {
    vector<RankedStation> items;

    bool higher(RankedStation a, RankedStation b) {
        if (a.score != b.score) return a.score > b.score;
        return a.station < b.station;
    }

public:
    bool empty() { return items.empty(); }

    void push(RankedStation item) {
        items.push_back(item);
        int child = items.size() - 1;
        while (child > 0) {
            int parent = (child - 1) / 2;
            if (!higher(items[child], items[parent])) break;
            swap(items[child], items[parent]);
            child = parent;
        }
    }

    RankedStation pop() {
        if (empty()) throw runtime_error("The heap is empty");
        RankedStation top = items[0];
        items[0] = items.back();
        items.pop_back();
        int parent = 0;
        while (parent * 2 + 1 < (int) items.size()) {
            int child = parent * 2 + 1;
            if (child + 1 < (int) items.size() && higher(items[child + 1], items[child])) child++;
            if (!higher(items[child], items[parent])) break;
            swap(items[child], items[parent]);
            parent = child;
        }
        return top;
    }
};
