use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;
use wasm_bindgen::prelude::*;
use web_sys::CryptoKey;

#[wasm_bindgen]
pub fn derive_key(password_key: &CryptoKey, salt: &[u8]) -> CryptoKey {
    let mut key = [0u8; 32]; // 256-bit key

    pbkdf2_hmac::<Sha256>(password_key, salt, 100_000, &mut key);

    CryptoKey::from(key)
}
