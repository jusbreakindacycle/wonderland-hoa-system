import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import aesjs from 'aes-js';

/**
 * Encrypted session storage for Supabase Auth.
 *
 * Guide §11.3 forbids plain AsyncStorage as the final Stage 1 session store,
 * because the stored value is a bearer credential. It also rules out putting
 * the session directly in SecureStore, which is not sized for a full session
 * payload on Android.
 *
 * This is Supabase's documented large-secure-store pattern: a random AES key
 * per write lives in `expo-secure-store` (Android Keystore-backed), and the
 * ciphertext lives in AsyncStorage under the same key name.
 *
 * The resident's password is never given to this adapter — only the session
 * that Supabase returns (Guide §11.3, §17).
 */
export class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    // `crypto.getRandomValues` comes from react-native-get-random-values,
    // imported once at the app entry point.
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));

    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));

    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) {
      return null;
    }

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) {
        return null;
      }
      return await this.decrypt(key, encrypted);
    } catch {
      // A ciphertext we can no longer decrypt (key cleared by the OS, restored
      // backup, corrupted write) is unusable. Drop it and present as signed
      // out rather than crashing the boot sequence. Nothing is logged: the
      // value is credential material.
      await this.removeItem(key);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    // Both halves must go. Leaving the SecureStore key behind would keep a
    // decryption key for a session the user has signed out of (Guide §11.9).
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}
