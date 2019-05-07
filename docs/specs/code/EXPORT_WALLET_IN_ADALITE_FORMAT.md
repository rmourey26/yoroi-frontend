# Abstract

Allow users to export their master private key following AdaLite's format,
so that their wallet can be restored using the AdaLite wallet app.

# Motivation

This is a workaround that might be useful for users who somehow find themselves
unable to move their funds using Yoroi.

# Proposal

Write a functionality that exports a user wallet into a `.json` file, following the
format detailed below.

## Adalite's Import/Export Wallet Representation

Adalite's format for importing a wallet is found in the file
[`keypass-json.js`](https://github.com/vacuumlabs/adalite/blob/develop/app/frontend/wallet/keypass-json.js) and follows roughly the same representation
used by [Daedalus](https://github.com/input-output-hk/daedalus/blob/154d35475d41204e2c7bff3011197432f0a1fd39/features/tests/e2e/documents/default-wallet.json), eg.:

```
{
  wallet: {
    accounts: [
      {
        name: "Initial account",
        index: HARDENED_THRESHOLD,
      },
    ],
    walletSecretKey: WIAwbsQgbz9X0WhvOnVeH+yRs7Ri93ESTdMspBHzeLnPUR6hLZL/NazfB40z2x8FZhLwNIt83DCuMR1nGG+ZqvsD/ouyzg3ec729fnrqEMO4A+qPTJmpiRgQZfYO2KDJDRxLtMyofXl90VVZOEke/QddnZ8CGHoR/lCemJgZuvzBpw==,
    walletMeta: {
      name: "Imported Wallet",
      assurance: "normal",
      unit: "ADA",
    },
    passwordHash: "WGQxNHw4fDF8V0NERGRHY0JGcThzelVyeFdza00wM1VjYnloeVBBQXBvdWtwdWFsUTExNGVFdz09fFJXMk5kUmVJYmg2REtsa2lsWG8rQ1lvTStRZmJkMzRmRVd0MG4rSy82YUU9",
  },
  fileType: "WALLETS_EXPORT",
  fileVersion: "1.0.0",
}
```
Notes:
- `HARDENED_THRESHOLD = 0x80000000` (ie. 2^31)
- `fileType`: *must* have value `"WALLETS_EXPORT"`
- `fileVersion`: Since Daedalus only uses derivation scheme v1, AdaLite uses this field
  to indicate which derivation scheme is adopted: `1.0.0` stands for derivation
  scheme v1 and `2.0.0` stands for derivation scheme v2.

The main attributes to compute are `walletSecretKey` and `passwordHash`.

### Derivation of `walletSecretKey`

The cryptographic functions used in AdaLite are defined in the custom JS library
`cardano-crypto`.

(TODO: determine if same outputs can be obtained using our rust bindings.)

`walletSecretKey` is roughly obtained as follows:

```
const {mnemonicToRootKeypair, cardanoMemoryCombine} = require('cardano-crypto.js')
const cbor = require('borc')

const mnemonic = "logic easily genre kangaroo ..."
const password = "the_password"

mnemonicToRootKeypair(mnemonic, 2).then(walletSecret => {
  const secretKey = walletSecret.slice(0, 64)
  const extendedPublicKey = walletSecret.slice(64, 128)
  const encryptedWalletSecret = Buffer.concat([cardanoMemoryCombine(secretKey, password), extendedPublicKey])
  const walletSecretKey = cbor.encode(encryptedWalletSecret).toString('base64'))
})
```

### Derivation of `passwordHash`

The hashing function is based on the fast "async" (scrypt)[https://www.npmjs.com/package/scrypt-async] javascript implementation. The `passwordHash` field is essentially
constructed as follows (see [`keypass-json.js`](https://github.com/vacuumlabs/adalite/blob/develop/app/frontend/wallet/keypass-json.js)):
```
async function hashPasswordAndPack(password, salt) {
  const [n, r, p, hashLen] = [14, 8, 1, 32]
  const hash = await new Promise((resolve, reject) => {
    scrypt(
      cbor.encode(transformPassword(password)),
      salt,
      {
        N: 1 << n,
        r,
        p,
        dkLen: hashLen,
        encoding: 'base64',
        interruptStep: 1000,
      },
      (hash) => resolve(hash)
    )
  })
  return [n.toString(), r.toString(), p.toString(), salt.toString('base64'), hash].join('|')
}
```

## UI Changes

In the Settings, (perhaps section "Wallet"?) add a button labeled "Export to
AdaLite". The user will need to input his/her spending password in order to
re-encrypt the root key following AdaLite procedure.

Important: this is only an export feature so users must be warned that there is
currently no way to import back an AdaLite wallet (of course, they may create
a new Yoroi wallet and then send their funds to it).
