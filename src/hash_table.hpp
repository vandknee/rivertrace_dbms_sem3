#pragma once
#include <string>
#include <vector>

using namespace std;

class HashTable {
    struct Entry {
        string key;
        int value;
    };
    vector<vector<Entry>> buckets;

    unsigned int hash(string key) {
        unsigned int value = 0;
        for (char letter : key) {
            value = (value * 31 + (unsigned char) letter) % buckets.size();
        }
        return value;
    }

public:
    HashTable(int size = 101) : buckets(size > 0 ? size : 101) {}

    bool insert(string key, int value) {
        unsigned int slot = hash(key);
        for (Entry& entry : buckets[slot]) {
            if (entry.key == key) return false;
        }
        buckets[slot].push_back({key, value});
        return true;
    }

    int find(string key) {
        unsigned int slot = hash(key);
        for (Entry& entry : buckets[slot]) {
            if (entry.key == key) return entry.value;
        }
        return -1;
    }
};
