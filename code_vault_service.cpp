#include <iostream>
#include <vector>
#include <string>
#include <memory>
#include <map>
#include <chrono>
#include <thread>
#include <mutex>
#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <boost/property_tree/ptree.hpp>
#include <boost/property_tree/json_parser.hpp>

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
using tcp = boost::asio::ip::tcp;

class CodeProduct {
private:
    std::string id;
    std::string title;
    std::string description;
    double price;
    std::string language;
    std::vector<std::string> tags;
    std::string authorId;
    std::string codeContent;
    uint32_t downloads;
    float rating;

public:
    CodeProduct(const std::string& title, double price, const std::string& language)
        : title(title), price(price), language(language) {
        id = generateUUID();
        downloads = 0;
        rating = 0.0f;
    }

    std::string toJson() const {
        boost::property_tree::ptree pt;
        pt.put("id", id);
        pt.put("title", title);
        pt.put("price", price);
        pt.put("language", language);
        pt.put("downloads", downloads);
        pt.put("rating", rating);

        std::stringstream ss;
        boost::property_tree::write_json(ss, pt);
        return ss.str();
    }

    static std::string generateUUID() {
        static std::random_device rd;
        static std::mt19937 gen(rd());
        static std::uniform_int_distribution<> dis(0, 15);
        static std::uniform_int_distribution<> dis2(8, 11);

        std::stringstream ss;
        ss << std::hex;
        for (int i = 0; i < 8; i++) ss << dis(gen);
        ss << "-";
        for (int i = 0; i < 4; i++) ss << dis(gen);
        ss << "-4";
        for (int i = 0; i < 3; i++) ss << dis(gen);
        ss << "-";
        ss << dis2(gen);
        for (int i = 0; i < 3; i++) ss << dis(gen);
        ss << "-";
        for (int i = 0; i < 12; i++) ss << dis(gen);
        return ss.str();
    }
};

class CodeVaultServer {
private:
    net::io_context& ioc;
    tcp::acceptor acceptor;
    std::map<std::string, std::shared_ptr<CodeProduct>> products;
    std::mutex productsMutex;

public:
    CodeVaultServer(net::io_context& ioc, uint16_t port)
        : ioc(ioc),
          acceptor(ioc, tcp::endpoint(tcp::v4(), port)) {
        accept();
    }

    void accept() {
        acceptor.async_accept(
            [this](boost::system::error_code ec, tcp::socket socket) {
                if (!ec) {
                    std::make_shared<Session>(std::move(socket), this)->start();
                }
                accept();
            });
    }

    void addProduct(std::shared_ptr<CodeProduct> product) {
        std::lock_guard<std::mutex> lock(productsMutex);
        products[product->getId()] = product;
    }

    std::vector<std::shared_ptr<CodeProduct>> searchProducts(const std::string& query) {
        std::lock_guard<std::mutex> lock(productsMutex);
        std::vector<std::shared_ptr<CodeProduct>> results;
        
        for (const auto& pair : products) {
            if (pair.second->matchesSearch(query)) {
                results.push_back(pair.second);
            }
        }
        return results;
    }
};

class Session : public std::enable_shared_from_this<Session> {
private:
    tcp::socket socket;
    beast::flat_buffer buffer;
    http::request<http::string_body> req;
    http::response<http::string_body> res;
    CodeVaultServer* server;

public:
    Session(tcp::socket socket, CodeVaultServer* server)
        : socket(std::move(socket)), server(server) {}

    void start() {
        readRequest();
    }

private:
    void readRequest() {
        auto self = shared_from_this();

        http::async_read(
            socket,
            buffer,
            req,
            [self](boost::system::error_code ec, std::size_t) {
                if (!ec) {
                    self->processRequest();
                }
            });
    }

    void processRequest() {
        res.version(req.version());
        res.keep_alive(false);

        switch (req.method()) {
            case http::verb::get:
                handleGet();
                break;
            case http::verb::post:
                handlePost();
                break;
            default:
                res.result(http::status::bad_request);
                res.body() = "Invalid request method";
                break;
        }

        writeResponse();
    }

    void handleGet() {
        std::string target = req.target().to_string();
        if (target.find("/api/products/search") == 0) {
            auto query = parseQueryString(target);
            auto results = server->searchProducts(query["q"]);
            res.result(http::status::ok);
            res.set(http::field::content_type, "application/json");
            res.body() = productsToJson(results);
        } else {
            res.result(http::status::not_found);
            res.body() = "Endpoint not found";
        }
    }

    void handlePost() {
        std::string target = req.target().to_string();
        if (target == "/api/products") {
            try {
                auto product = parseProductFromJson(req.body());
                server->addProduct(product);
                res.result(http::status::created);
                res.body() = "Product created successfully";
            } catch (const std::exception& e) {
                res.result(http::status::bad_request);
                res.body() = e.what();
            }
        } else {
            res.result(http::status::not_found);
            res.body() = "Endpoint not found";
        }
    }

    void writeResponse() {
        auto self = shared_from_this();

        res.set(http::field::content_length, res.body().size());

        http::async_write(
            socket,
            res,
            [self](boost::system::error_code ec, std::size_t) {
                self->socket.shutdown(tcp::socket::shutdown_send, ec);
            });
    }
};

int main() {
    try {
        net::io_context ioc{1};
        CodeVaultServer server(ioc, 8080);
        
        std::vector<std::thread> threads;
        for (auto i = 0; i < std::thread::hardware_concurrency(); ++i) {
            threads.emplace_back([&ioc] { ioc.run(); });
        }

        for (auto& t : threads) {
            t.join();
        }
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
