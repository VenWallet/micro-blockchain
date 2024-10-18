import crypto from 'crypto';
// import cryptoJs from 'crypto-js';

export class CryptShared {
  // static decryptRsa(text: string) {
  //   try {
  //     const cipheredBytes = Buffer.from(text, 'base64');
  //     const decoded = crypto
  //       .privateDecrypt(
  //         {
  //           key: process.env.PRIVATE_KEY as string,
  //           passphrase: process.env.PASSWORD_CRYPTO,
  //           padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  //         },
  //         cipheredBytes,
  //       )
  //       .toString();
  //     return decoded;
  //   } catch (error) {
  //     throw new Error('Error decrypting text');
  //   }
  // }
  // static encryptRsa(text: string) {
  //   try {
  //     const encrypted = crypto.publicEncrypt(
  //       {
  //         key: process.env.PUBLIC_KEY as string,
  //         padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  //       },
  //       Buffer.from(text),
  //     );
  //     return encrypted.toString('base64');
  //   } catch (error) {
  //     throw new Error('Error encrypting text');
  //   }
  // }
  //   static encryptAES(text: string) {
  //     const ciphertext = cryptoJs.AES.encrypt(text, process.env.PRIVATE_KEY as string).toString();
  //     return ciphertext;
  //   }
  //   static decryptAES(text: string) {
  //     var bytes = cryptoJs.AES.decrypt(text, process.env.PRIVATE_KEY as string);
  //     var originalText = bytes.toString(cryptoJs.enc.Utf8);
  //     return originalText;
  //   }
}
