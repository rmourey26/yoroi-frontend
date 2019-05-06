# Abstract

Allow users to export their master private key following AdaLite's format,
so that their wallet can be restored using the AdaLite wallet app.


# Motivation

This is a workaround that might be useful for users who somehow find themselves
unable to move their funds using Yoroi.

# Proposal

Write a functionality that exports a user wallet in a .json file, following the
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

The main attributes to compute are `walletSecretKey` and `passwordHash`.

### Derivation of `walletSecretKey`

The cryptographic functions used in AdaLite are defined in the custom JS library
`cardano-crypto`.

(TODO: determine if same outputs can be obtained using our rust bindings.)

`walletSecretKey` is roughly obtained as follows:

```
// starting from the mnemonic
const {mnemonicToRootKeypair, cardanoMemoryCombine} = require('cardano-crypto.js')
...
const mnemonic = "logic easily ..."
const walletSecretDef = await mnemonicToRootKeypair(mnemonic, 1)
...
const secretKey = walletSecretDef.rootSecret.slice(0, 64)
const encryptedWalletSecret = cardanoMemoryCombine(secretKey, password)

const walletSecretKey = cbor.encode(encryptedWalletSecret).toString('base64')
```



### Derivation of `passwordHash`

TODO

### The `fileVersion` field

Since Daedalus only uses derivation scheme v1, AdaLite uses this field
to indicate which derivation scheme is adopted: `1.0.0` stands for derivation
scheme v1 and `2.0.0` stands for derivation scheme v2.

## UI Changes

In the Settings, (perhaps section "Wallet"?) add a button labeled "Export to
AdaLite".
