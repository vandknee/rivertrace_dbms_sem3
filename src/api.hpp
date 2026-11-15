#pragma once
#include "analysis.hpp"
#include "json.hpp"

using namespace std;

struct ApiResponse {
    int status;
    Json body;
};

ApiResponse handle_api(RiverTrace& project, string action, map<string, string>& request);
