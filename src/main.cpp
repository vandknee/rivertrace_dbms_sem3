#include "api.hpp"
#include "loader.hpp"
#include <iostream>

using namespace std;

int main(int argc, char* argv[]) {
    Json output;
    try {
        if (argc < 2 || argc % 2 != 0) throw runtime_error("Expected an action followed by parameter pairs");
        map<string, string> request;
        for (int i = 2; i < argc; i += 2) request[argv[i]] = argv[i + 1];
        RiverTrace project(load_data("data"));
        ApiResponse response = handle_api(project, argv[1], request);
        output["status"] = response.status;
        output["body"] = move(response.body);
    } catch (exception& error) {
        output["status"] = 500;
        output["body"]["error"] = error.what();
    }
    cout << output.dump() << "\n";
}
