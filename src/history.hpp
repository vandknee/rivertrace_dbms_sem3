#pragma once
#include "models.hpp"

using namespace std;

class History {
    struct Node {
        Record record;
        Node* next;
    };
    Node* head = nullptr;

public:
    History() = default;
    History(const History&) = delete;
    History& operator=(const History&) = delete;

    ~History() {
        while (head != nullptr) {
            Node* old = head;
            head = head->next;
            delete old;
        }
    }

    void insert(Record record) {
        Node* item = new Node{record, nullptr};
        if (head == nullptr || record.year < head->record.year) {
            item->next = head;
            head = item;
            return;
        }
        Node* current = head;
        while (current->next != nullptr && current->next->record.year < record.year) {
            current = current->next;
        }
        item->next = current->next;
        current->next = item;
    }

    Record* find(int year) {
        Node* current = head;
        while (current != nullptr) {
            if (current->record.year == year) return &current->record;
            current = current->next;
        }
        return nullptr;
    }

    vector<Record> all() {
        vector<Record> records;
        Node* current = head;
        while (current != nullptr) {
            records.push_back(current->record);
            current = current->next;
        }
        return records;
    }
};
