#pragma once
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <iomanip>
#include <cmath>
#include <locale>

using namespace std;

class Json {
    enum Kind { Null, Object, Array, Text, Number, Boolean };
    Kind kind = Null;
    map<string, Json> fields;
    vector<Json> items;
    string text;
    double number = 0;
    bool flag = false;

    static string quote(string value) {
        string result = "\"";
        string digits = "0123456789abcdef";
        for (unsigned char ch : value) {
            if (ch == '"' || ch == '\\') {
                result += '\\';
                result += ch;
            } else if (ch < 32) {
                result += "\\u00";
                result += digits[ch / 16];
                result += digits[ch % 16];
            } else result += ch;
        }
        return result + "\"";
    }

public:
    using list = vector<Json>;
    Json() = default;
    Json(nullptr_t) {}
    Json(bool value) : kind(Boolean), flag(value) {}
    Json(int value) : kind(Number), number(value) {}
    Json(double value) : kind(Number), number(value) {}
    Json(string value) : kind(Text), text(value) {}
    Json(const char* value) : kind(Text), text(value) {}
    Json(list value) : kind(Array), items(move(value)) {}
    Json(initializer_list<pair<const string, Json>> value)
        : kind(Object), fields(value) {}
    Json(vector<int> values) : kind(Array) {
        for (int value : values) items.push_back(value);
    }
    Json(vector<string> values) : kind(Array) {
        for (string value : values) items.push_back(value);
    }
    Json& operator[](string key) {
        kind = Object;
        return fields[key];
    }
    Json& operator[](int index) {
        kind = Array;
        if (index >= (int) items.size()) items.resize(index + 1);
        return items[index];
    }
    string dump() const {
        if (kind == Null) return "null";
        if (kind == Text) return quote(text);
        if (kind == Boolean) return flag ? "true" : "false";
        if (kind == Number) {
            if (!isfinite(number)) return "null";
            ostringstream output;
            output.imbue(locale::classic());
            output << setprecision(17) << number;
            return output.str();
        }
        string result = kind == Array ? "[" : "{";
        bool first = true;
        if (kind == Array) {
            for (const Json& item : items) {
                if (!first) result += ",";
                result += item.dump();
                first = false;
            }
        } else {
            for (const pair<const string, Json>& field : fields) {
                if (!first) result += ",";
                result += quote(field.first) + ":" + field.second.dump();
                first = false;
            }
        }
        return result + (kind == Array ? "]" : "}");
    }
};
