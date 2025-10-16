use js_sys::{Array, Promise, Uint8Array};
use wasm_bindgen::prelude::*;
use web_sys::{window, AesDerivedKeyParams, AesGcmParams, CryptoKey, Pbkdf2Params};

#[wasm_bindgen]
pub fn derive_key(
    password_key: &CryptoKey,
    salt: &Uint8Array,
    key_usages: Array,
) -> Result<Promise, JsValue> {
    let window = window().ok_or_else(|| JsValue::from_str("No global window exists"))?;
    let crypto = window
        .crypto()
        .map_err(|_| JsValue::from_str("Crypto API not available"))?;

    let derive_promise = crypto
        .subtle()
        .derive_key_with_object_and_object(
            &Pbkdf2Params::new("PBKDF2", &"SHA-256".into(), 100000, &salt),
            &password_key,
            &AesDerivedKeyParams::new("AES-GCM", 256),
            false,
            &key_usages,
        )
        .map_err(|e| e)?;

    Ok(derive_promise)
}

#[wasm_bindgen]
pub fn encrypt(iv: &Uint8Array, key: &CryptoKey, data: &[u8]) -> Result<Promise, JsValue> {
    let window = window().ok_or_else(|| JsValue::from_str("No global window exists"))?;
    let crypto = window
        .crypto()
        .map_err(|_| JsValue::from_str("Crypto API not available"))?;

    let derive_promise = crypto
        .subtle()
        .encrypt_with_object_and_u8_array(&AesGcmParams::new("AES-GCM", iv), key, data)
        .map_err(|e| e)?;

    Ok(derive_promise)
}

#[wasm_bindgen]
pub fn decrypt(iv: &Uint8Array, key: &CryptoKey, data: &[u8]) -> Result<Promise, JsValue> {
    let window = window().ok_or_else(|| JsValue::from_str("No global window exists"))?;
    let crypto = window
        .crypto()
        .map_err(|_| JsValue::from_str("Crypto API not available"))?;

    let derive_promise = crypto
        .subtle()
        .decrypt_with_object_and_u8_array(&AesGcmParams::new("AES-GCM", iv), key, data)
        .map_err(|e| e)?;

    Ok(derive_promise)
}
