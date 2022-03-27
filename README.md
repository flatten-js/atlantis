# Atlantis
![GitHub package.json version](https://img.shields.io/github/package-json/v/flatten-js/atlantis)
![GitHub repo size](https://img.shields.io/github/repo-size/flatten-js/atlantis)

> Encrypted folders that appear only at runtime

Compresses and encrypts a folder into a single file, and decompresses and decrypts it as a folder only at runtime.
I think everyone has secrets they want to hide. That is what I mean.

## Getting Started

### Installtion

Clone the repository and use it.
```
C:¥>git clone https://github.com/flatten-js/atlantis.git
```

Resolve dependencies before use.
```
C:¥>cd atlantis && yarn
```

### Quickstart

#### Encryption using AES

##### Step1: Creating a common key

Create a common key using ```OpenSSL```.  
**NOTE:** Keep the common key in a safe place.
```
C:¥atlantis>openssl rand -base64 -out password 32
```

##### Step2: Folder Encryption

Compresses and encrypts folders into a single file.  
If successful, the file will be saved in the same hierarchy as the specified folder.  
**NOTE:** The specified folders are not automatically deleted for safety reasons.
```
C:¥atlantis>node index.js create <your_folder_path>
Please enter your common key: <your_common_key_path>
```

##### Step3: Folder Decryption

Decrypts and decompresses encrypted files.  
If successful, an ```atlantis``` folder will be created on the same level as the specified file.
```
C:¥atlantis>node index.js <your_encrypted_file_path>
Please enter your common key: <your_common_key_path>
```

##### Step4: Update files in folder

Update the inside of the ```atlantis``` folder that is created during execution (decryption).  
Ctrl+C to exit and select ```y``` to compress and encrypt again and save to a single file.  
**NOTE:** In case of forced termination for any reason, the file is compressed and encrypted again and saved in a single file.
```
Do you want to encrypt again? (Y/n) y
```




