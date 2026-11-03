use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

pub mod auth;

pub type Tx = mpsc::UnboundedSender<String>;

#[derive(Default)]
pub struct Hub {
    // Maps meeting_id -> List of client senders
    pub rooms: Mutex<HashMap<String, Vec<Tx>>>,
}

impl Hub {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    pub fn subscribe(&self, meeting_id: String, tx: Tx) {
        let mut rooms = self.rooms.lock().unwrap();
        rooms.entry(meeting_id).or_default().push(tx);
    }

    pub fn broadcast(&self, meeting_id: &str, msg: String) {
        let mut rooms = self.rooms.lock().unwrap();
        if let Some(clients) = rooms.get_mut(meeting_id) {
            // Remove disconnected clients while broadcasting
            clients.retain(|client| {
                client.send(msg.clone()).is_ok()
            });
        }
    }
}
