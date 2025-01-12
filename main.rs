use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use tokio;
use uuid::Uuid;
use bcrypt::{hash, verify, DEFAULT_COST};

#[derive(Debug, Serialize, Deserialize)]
struct CodeProduct {
    id: Uuid,
    title: String,
    description: String,
    price: f64,
    language: String,
    category: String,
    author_id: Uuid,
    code_content: String,
    rating: f32,
    downloads: i32,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
struct User {
    id: Uuid,
    username: String,
    email: String,
    password_hash: String,
    reputation: i32,
    is_verified: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct Purchase {
    id: Uuid,
    user_id: Uuid,
    product_id: Uuid,
    purchase_date: chrono::DateTime<chrono::Utc>,
    amount: f64,
}

async fn create_product(
    pool: web::Data<Pool<Postgres>>,
    product: web::Json<CodeProduct>,
) -> impl Responder {
    let result = sqlx::query!(
        "INSERT INTO products (id, title, description, price, language, category, author_id, code_content, rating, downloads)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id",
        Uuid::new_v4(),
        product.title,
        product.description,
        product.price,
        product.language,
        product.category,
        product.author_id,
        product.code_content,
        0.0,
        0
    )
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(record) => HttpResponse::Ok().json(record),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

async fn get_products_by_category(
    pool: web::Data<Pool<Postgres>>,
    category: web::Path<String>,
) -> impl Responder {
    let products = sqlx::query_as!(
        CodeProduct,
        "SELECT * FROM products WHERE category = $1",
        category.into_inner()
    )
    .fetch_all(pool.get_ref())
    .await;

    match products {
        Ok(products) => HttpResponse::Ok().json(products),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

async fn search_products(
    pool: web::Data<Pool<Postgres>>,
    query: web::Query<HashMap<String, String>>,
) -> impl Responder {
    let search_term = query.get("q").unwrap_or(&String::new());
    
    let products = sqlx::query_as!(
        CodeProduct,
        "SELECT * FROM products 
         WHERE title ILIKE $1 
         OR description ILIKE $1 
         OR language ILIKE $1",
        format!("%{}%", search_term)
    )
    .fetch_all(pool.get_ref())
    .await;

    match products {
        Ok(products) => HttpResponse::Ok().json(products),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

async fn process_purchase(
    pool: web::Data<Pool<Postgres>>,
    purchase_info: web::Json<Purchase>,
) -> impl Responder {
    let transaction = pool.begin().await.unwrap();

    let purchase_result = sqlx::query!(
        "INSERT INTO purchases (id, user_id, product_id, purchase_date, amount)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id",
        Uuid::new_v4(),
        purchase_info.user_id,
        purchase_info.product_id,
        chrono::Utc::now(),
        purchase_info.amount
    )
    .fetch_one(&pool)
    .await;

    match purchase_result {
        Ok(_) => {
            transaction.commit().await.unwrap();
            HttpResponse::Ok().json("Purchase successful")
        }
        Err(e) => {
            transaction.rollback().await.unwrap();
            HttpResponse::InternalServerError().body(e.to_string())
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    
    let pool = Pool::connect(&database_url)
        .await
        .expect("Failed to create pool");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .route("/api/products", web::post().to(create_product))
            .route("/api/products/category/{category}", web::get().to(get_products_by_category))
            .route("/api/products/search", web::get().to(search_products))
            .route("/api/purchase", web::post().to(process_purchase))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test;

    #[actix_rt::test]
    async fn test_create_product() {
        let pool = create_test_pool().await;
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .route("/api/products", web::post().to(create_product))
        ).await;

        let product = CodeProduct {
            id: Uuid::new_v4(),
            title: "Test Product".to_string(),
            description: "Test Description".to_string(),
            price: 99.99,
            language: "Rust".to_string(),
            category: "Backend".to_string(),
            author_id: Uuid::new_v4(),
            code_content: "// Test code".to_string(),
            rating: 0.0,
            downloads: 0,
            created_at: chrono::Utc::now(),
        };

        let req = test::TestRequest::post()
            .uri("/api/products")
            .set_json(&product)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }
}
