use std::env;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands;
use redis::streams::{StreamReadOptions, StreamReadReply};

mod hub;

use crate::hub::Hub;
use crate::hub::auth;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    tracing_subscriber::fmt::init();

    println!("Starting Real-time Hub...");

    let redis_url = env::var("REDIS_URL").expect("REDIS_URL must be set");
    let auth_secret = env::var("BETTER_AUTH_SECRET").expect("BETTER_AUTH_SECRET must be set");
    let port = env::var("PORT").unwrap_or_else(|_| "8081".to_string());
    let addr = format!("0.0.0.0:{}", port);

    let hub = Hub::new();
    let redis_client = redis::Client::open(redis_url.clone())?;
    
    // 1. Start Redis Stream Consumer Loop
    let hub_clone = Arc::clone(&hub);
    let redis_client_clone = redis_client.clone();
    tokio::spawn(async move {
        println!("Connecting to Redis at {}...", redis_url);
        let mut conn = match redis_client_clone.get_async_connection().await {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Failed to connect to Redis: {}", e);
                return;
            }
        };
        println!("Redis stream consumer started");

        let mut last_id = "$".to_string();
        loop {
            let options = StreamReadOptions::default().block(0).count(10);
            let streams = &["transcription.segment"];
            let ids = &[&last_id];
            
            let reply: StreamReadReply = match conn.xread_options(streams, ids, &options).await {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("Redis xread error: {}", e);
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                    continue;
                }
            };

            for stream in reply.keys {
                for id_record in stream.ids {
                    let meeting_id: String = id_record.get("meeting_id").unwrap_or_default();
                    let payload: String = id_record.get("payload").unwrap_or_default();
                    
                    hub_clone.broadcast(&meeting_id, payload);
                    last_id = id_record.id;
                }
            }
        }
    });

    // 2. Accept WebSocket Connections
    let listener = TcpListener::bind(&addr).await?;
    println!("Rust Realtime Hub listening on: {}", addr);

    loop {
        match listener.accept().await {
            Ok((stream, addr)) => {
                println!("New connection from: {}", addr);
                let hub_clone = Arc::clone(&hub);
                let secret = auth_secret.clone();

                tokio::spawn(async move {
                    let ws_stream = match accept_async(stream).await {
                        Ok(s) => s,
                        Err(e) => {
                            eprintln!("WS accept error: {}", e);
                            return;
                        }
                    };

                    let (mut write, mut read) = ws_stream.split();

                    // Simple Auth Handshake: First message must be the JWT
                    if let Some(Ok(msg)) = read.next().await {
                        if let Ok(token) = msg.to_text() {
                            match auth::validate_token(token, &secret) {
                                Ok(claims) => {
                                    println!("User {} authenticated", claims.sub);
                                    
                                    // For this prototype, we'll assume the client sends the meeting ID they want to watch next
                                    if let Some(Ok(meeting_msg)) = read.next().await {
                                        let meeting_id = meeting_msg.to_text().unwrap_or_default();
                                        println!("User subscribing to meeting: {}", meeting_id);
                                        
                                        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
                                        hub_clone.subscribe(meeting_id.to_string(), tx);

                                        while let Some(msg) = rx.recv().await {
                                            if write.send(tokio_tungstenite::tungstenite::Message::Text(msg)).await.is_err() {
                                                break;
                                            }
                                        }
                                    }
                                }
                                Err(e) => {
                                    let _ = write.send(tokio_tungstenite::tungstenite::Message::Text(format!("Auth error: {}", e))).await;
                                }
                            }
                        }
                    }
                });
            }
            Err(e) => {
                eprintln!("Listener accept error: {}", e);
            }
        }
    }
}
