/* eslint-disable camelcase */
const { Blake2b } = require('rust-cardano-crypto');

const http = require('http');
const cbor = require('cbor');
const bs58 = require('bs58');

const blocks = [
  '5f313146284c82f21c40414eda1da0bddfc98a450514d1335ba0bdfc6b2dfcff',
  '8c261afe5c6c0aab644372ea0e9e2fbabc122ee32536365ace20a645db2fc651',
  '39113fc1a832540c00e1cfade6d9aef0c32ded3b66401ad7aa126a95fbcc8bdb',
];

function queryBlock(id) {

  http.get(`http://127.0.0.1:80/mainnet/block/${id}`, resp => {

    let data = Buffer.from([]);

    resp.on('data', chunk => {
      data = Buffer.concat([data, chunk]);
    });

    resp.on('end', () => {
      console.log('Total bytes: ' + data.length);
      console.log(handleBlock(data));
    });

  }).on('error', e => console.error(e));
}

function queryEpoch(number, callback, callbackEnd) {

  http.get(`http://127.0.0.1:80/mainnet/epoch/${number}`, resp => {

    let data = Buffer.from([]);

    resp.on('data', chunk => {
      data = Buffer.concat([data, chunk]);
    });

    resp.on('end', () => {
      console.log('Total bytes: ' + data.length);
      handleEpoch(data, callback, callbackEnd);
    });

  }).on('error', e => console.error(e));
}

// queryBlock(blocks[2]);
function epochs(n) {
  console.log('Epoch: ' + n);
  queryEpoch(n, b => {
    if (!b.isGenesis && (b.slot[1] % 1000 === 0)) {
      console.log('Slot: ' + b.slot[1]);
    }
    if (b.upd) {
      console.log(b);
    }
  }, () => {
    if (n < 101) {
      epochs(n + 1);
    }
  });
}

epochs(1);

function handleEpoch(buffer, callback, callbackEnd) {
  const arr = [...buffer];
  const getBytes = n => arr.splice(0, n);
  const getInt32 = () => getBytes(4).reduce((a, x, i) => a + (x << ((3 - i) * 8)), 0);
  const getBlob = () => {
    const len = getInt32();
    const blob = Buffer.from(getBytes(len));
    if (len % 4 > 0) {
      getBytes(4 - (len % 4)); // remove the padding
    }
    return blob;
  };
  const magic = String.fromCharCode(...getBytes(8));
  if (magic !== '\xfeCARDANO') {
    throw new Error('Unexpected magic! ' + magic);
  }
  const fileType = Buffer.from(getBytes(4)).toString('hex');
  if (fileType !== '5041434b') {
    throw new Error('Unexpected pack file type! ' + fileType);
  }
  const fileVersion = getInt32();
  if (fileVersion !== 1) {
    throw new Error('Unexpected pack file version! ' + JSON.stringify(fileVersion));
  }
  while (arr.length > 0) {
    callback(handleBlock(getBlob()));
  }
  callbackEnd();
}

function handleBlock(buffer) {
  const [blockType, [header, body]] = cbor.decode(buffer);
  const hash = headerToId(header, blockType);
  const common = { hash, magic: header[0], prev: header[1].toString('hex') };
  switch (blockType) {
    case 0: return { ...common, ...handleGenesisBlock(header) };
    case 1: return { ...common, ...handleRegularBlock(header, body) };
    default:
      throw new Error('Unexpected block type! ' + blockType);
  }
}

function handleGenesisBlock(header) {
  const [epoch, [chainDifficulty]] = header[3];
  return {
    epoch,
    height: chainDifficulty,
    isGenesis: true,
  };
}

function handleRegularBlock(header, body) {
  const consensus = header[3];
  const [epoch, slot] = consensus[0];
  const [chainDifficulty] = consensus[2];
  const txs = body[0];
  const [upd1, upd2] = body[3];
  const res = {
    slot: [epoch, slot],
    height: chainDifficulty,
    txs: txs.map(tx => {
      const [[inputs, outputs], witnesses] = tx;
      return {
        id: rustRawTxToId(cbor.encode(tx)),
        inputs: inputs.map(inp => {
          const [type, tagged] = inp;
          const [txId, idx] = cbor.decode(tagged.value);
          return { type, txId: txId.toString('hex'), idx };
        }),
        outputs: outputs.map(out => {
          const [address, value] = out;
          return { address: bs58.encode(cbor.encode(address)), value };
        }),
        witnesses: witnesses.map(w => {
          const [type, tagged] = w;
          return { type, sign: cbor.decode(tagged.value) };
        })
      };
    })
  };
  return (upd1.length || upd2.length) ? { ...res, upd: [upd1, upd2] } : res;
}

function headerToId(header, type = 1) {
  return Buffer.from(Blake2b.blake2b_256(cbor.encode([type, header]))).toString('hex');
}

function rustRawTxToId(rustTxBody) {
  if (!rustTxBody) {
    throw new Error('Cannot decode inputs from undefined transaction!');
  }
  try {
    const [inputs, outputs, attributes] =
      decodedTxToBase(cbor.decode(Buffer.from(rustTxBody)));
    const enc = cbor.encode([
      new CborIndefiniteLengthArray(inputs),
      new CborIndefiniteLengthArray(outputs),
      attributes
    ]);
    // eslint-disable-next-line
    return Buffer.from(Blake2b.blake2b_256(enc)).toString('hex');
  } catch (e) {
    throw new Error('Failed to convert raw transaction to ID! ' + JSON.stringify(e));
  }
}

function decodedTxToBase(decodedTx) {
  if (Array.isArray(decodedTx)) {
    // eslint-disable-next-line default-case
    switch (decodedTx.length) {
      case 2: {
        const signed = decodedTx;
        return signed[0];
      }
      case 3: {
        const base = decodedTx;
        return base;
      }
    }
  }
  throw new Error('Unexpected decoded tx structure! ' + JSON.stringify(decodedTx));
}

class CborIndefiniteLengthArray {
  constructor(elements) {
    this.elements = elements;
  }
  encodeCBOR(encoder) {
    return encoder.push(
      Buffer.concat([
        Buffer.from([0x9f]), // indefinite array prefix
        ...this.elements.map((e) => cbor.encode(e)),
        Buffer.from([0xff]), // end of array
      ])
    );
  }
}
