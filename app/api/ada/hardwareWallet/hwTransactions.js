// @flow
import {
  Logger,
  stringifyError,
  stringifyData
} from '../../../utils/logging';
import type {
  BaseSignRequest,
} from '../adaTypes';
import type { UtxoLookupMap }  from '../lib/utils';
import { utxosToLookupMap, derivePathAsString, verifyAccountLevel }  from '../lib/utils';
import type {
  SendFunc,
  TxBodiesFunc
} from '../lib/state-fetch/types';
import {
  SendTransactionError,
  InvalidWitnessError,
} from '../errors';
import type {
  BroadcastTrezorSignedTxResponse,
  PrepareAndBroadcastLedgerSignedTxResponse
} from '../index';
import type {
  LedgerSignTxPayload,
} from '../../../domain/HWSignTx';
import type {
  BIP32Path,
  InputTypeUTxO,
  OutputTypeAddress,
  OutputTypeChange,
  SignTransactionResponse as LedgerSignTxResponse,
  Witness
} from '@cardano-foundation/ledgerjs-hw-app-cardano';
import { makeCardanoBIP44Path } from 'yoroi-extension-ledger-bridge';
import type {
  $CardanoSignTransaction,
  CardanoInput,
  CardanoOutput,
} from 'trezor-connect/lib/types/cardano';
import type {
  Address, Value, Addressing,
} from '../lib/storage/models/common/interfaces';

import type { ConfigType } from '../../../../config/config-types';

import { RustModule } from '../lib/cardanoCrypto/rustLoader';

declare var CONFIG: ConfigType;

// ==================== TREZOR ==================== //
/** Generate a payload for Trezor SignTx */
export async function createTrezorSignTxPayload(
  signRequest: BaseSignRequest,
  getTxsBodiesForUTXOs: TxBodiesFunc,
): Promise<$CardanoSignTransaction> {
  const txJson: TransactionType = signRequest.unsignedTx.to_json();

  const utxoMap = utxosToLookupMap(
    signRequest.senderUtxos.map(utxo => ({
      utxo_id: utxo.utxo_id,
      tx_hash: utxo.tx_hash,
      tx_index: utxo.tx_index,
      receiver: utxo.receiver,
      amount: utxo.amount,
    }))
  );

  // Inputs
  const trezorInputs = _transformToTrezorInputs(
    txJson.inputs,
    new Map(signRequest.senderUtxos.map(utxo => [
      utxo.receiver,
      { addressing: utxo.addressing },
    ])),
    utxoMap,
  );

  // Output
  const trezorOutputs = _generateTrezorOutputs(
    txJson.outputs,
    signRequest.changeAddr
  );

  // Transactions
  // Map inputs to UNIQUE tx hashes (there might be multiple inputs from the same tx)
  const txsHashes = [...new Set(txJson.inputs.map(x => x.id))];
  const txsBodiesMap = await getTxsBodiesForUTXOs({ txsHashes });
  const txsBodies = txJson.inputs.map((x) => txsBodiesMap[x.id]);

  return {
    inputs: trezorInputs,
    outputs: trezorOutputs,
    transactions: txsBodies,
    protocol_magic: CONFIG.network.protocolMagic,
  };
}

/** Send a transaction and save the new change address */
export async function broadcastTrezorSignedTx(
  signedTxHex: string,
  sendTx: SendFunc
): Promise<BroadcastTrezorSignedTxResponse> {
  Logger.debug('hwTransactions::broadcastTrezorSignedTx: called');
  const signedTxBytes = Buffer.from(signedTxHex, 'hex');
  const signedTx = RustModule.Wallet.SignedTransaction.from_bytes(signedTxBytes);

  try {
    const body = { signedTx };
    const backendResponse = await sendTx(body);
    Logger.debug('hwTransactions::broadcastTrezorSignedTx: success');

    return backendResponse;
  } catch (sendTxError) {
    Logger.error('hwTransactions::broadcastTrezorSignedTx error: ' + stringifyError(sendTxError));
    if (sendTxError instanceof InvalidWitnessError) {
      throw new InvalidWitnessError();
    }
    throw new SendTransactionError();
  }
}

function _transformToTrezorInputs(
  inputs: Array<TxoPointerType>,
  addressMap: Map<string, Addressing>,
  utxoMap: UtxoLookupMap,
): Array<CardanoInput> {
  return inputs.map((input: TxoPointerType) => {
    const utxo = utxoMap[input.id][input.index];
    const addressingInfo = addressMap.get(utxo.receiver);
    if (addressingInfo == null) throw new Error('_transformToTrezorInputs should never happen');
    verifyAccountLevel(addressingInfo);
    const { addressing } = addressingInfo;
    return {
      path: derivePathAsString(
        addressing.path[0],
        addressing.path[1],
        addressing.path[2]
      ),
      prev_hash: input.id,
      prev_index: input.index,
      type: 0
    };
  });
}

function _generateTrezorOutputs(
  txOutputs: Array<TxOutType>,
  changeAddr: Array<{| ...Address, ...Value, ...Addressing |}>,
): Array<CardanoOutput> {
  return txOutputs.map(txOutput => {
    const change = changeAddr.find(addr => addr.address === txOutput.address);
    if (change != null) {
      verifyAccountLevel({ addressing: change.addressing });
      return {
        amount: txOutput.value.toString(),
        path: derivePathAsString(
          change.addressing.path[0],
          change.addressing.path[1],
          change.addressing.path[2],
        )
      };
    }
    return {
      address: txOutput.address,
      amount: txOutput.value.toString(),
    };
  });
}

// ==================== LEDGER ==================== //
/** Generate a payload for Ledger SignTx */
export async function createLedgerSignTxPayload(
  signRequest: BaseSignRequest,
  getTxsBodiesForUTXOs: TxBodiesFunc,
): Promise<LedgerSignTxPayload> {
  const txJson: TransactionType = signRequest.unsignedTx.to_json();
  // Map inputs to UNIQUE tx hashes (there might be multiple inputs from the same tx)
  const txsHashes = [...new Set(txJson.inputs.map(x => x.id))];
  const txsBodiesMap = await getTxsBodiesForUTXOs({ txsHashes });

  const utxoMap = utxosToLookupMap(
    signRequest.senderUtxos.map(utxo => ({
      utxo_id: utxo.utxo_id,
      tx_hash: utxo.tx_hash,
      tx_index: utxo.tx_index,
      receiver: utxo.receiver,
      amount: utxo.amount,
    }))
  );

  // Inputs
  const ledgerInputs: Array<InputTypeUTxO> =
    _transformToLedgerInputs(
      txJson.inputs,
      new Map(signRequest.senderUtxos.map(utxo => [
        utxo.receiver,
        { addressing: utxo.addressing },
      ])),
      utxoMap,
      txsBodiesMap,
    );

  // Outputs
  const ledgerOutputs: Array<OutputTypeAddress | OutputTypeChange> =
    _transformToLedgerOutputs(
      txJson.outputs,
      signRequest.changeAddr,
    );

  return {
    inputs: ledgerInputs,
    outputs: ledgerOutputs,
  };
}

function _transformToLedgerInputs(
  inputs: Array<TxoPointerType>,
  addressMap: Map<string, Addressing>,
  utxoMap: UtxoLookupMap,
  txDataHexMap: {[key: string]:string}
): Array<InputTypeUTxO> {
  return inputs.map(input => {
    const utxo = utxoMap[input.id][input.index];
    const addressingInfo = addressMap.get(utxo.receiver);
    if (addressingInfo == null) throw new Error('_transformToTrezorInputs should never happen');
    verifyAccountLevel(addressingInfo);
    const { addressing } = addressingInfo;
    return {
      txDataHex: txDataHexMap[input.id],
      outputIndex: input.index,
      path: makeCardanoBIP44Path(
        addressing.path[0],
        addressing.path[1],
        addressing.path[2]
      ),
    };
  });
}

function _transformToLedgerOutputs(
  txOutputs: Array<TxOutType>,
  changeAddr: Array<{| ...Address, ...Value, ...Addressing |}>,
): Array<OutputTypeAddress | OutputTypeChange> {
  return txOutputs.map(txOutput => ({
    amountStr: txOutput.value.toString(),
    ..._ledgerOutputAddress58OrPath(txOutput, changeAddr)
  }));
}

function _ledgerOutputAddress58OrPath(
  txOutput: TxOutType,
  changeAddr: Array<{| ...Address, ...Value, ...Addressing |}>,
): { address58: string } | { path: BIP32Path }  {
  const change = changeAddr.find(addr => addr.address === txOutput.address);
  if (change != null) {
    verifyAccountLevel({ addressing: change.addressing });
    return { path: makeCardanoBIP44Path(
      change.addressing.path[0],
      change.addressing.path[1],
      change.addressing.path[2],
    ) };
  }

  return { address58: txOutput.address };
}

export async function prepareAndBroadcastLedgerSignedTx(
  ledgerSignTxResp: LedgerSignTxResponse,
  unsignedTx: RustModule.Wallet.Transaction,
  publicKey: RustModule.Wallet.PublicKey,
  keyLevel: number,
  sendTx: SendFunc,
): Promise<PrepareAndBroadcastLedgerSignedTxResponse> {
  try {
    Logger.debug('hwTransactions::prepareAndBroadcastLedgerSignedTx: called');

    const unsignedTxJson: TransactionType = unsignedTx.to_json();
    Logger.debug(`hwTransactions::prepareAndBroadcastLedgerSignedTx unsignedTx: ${stringifyData(
      unsignedTxJson
    )}`);
    const finalizer = new RustModule.Wallet.TransactionFinalized(unsignedTx);
    ledgerSignTxResp.witnesses.map((witness) => prepareWitness(
      finalizer,
      witness,
      publicKey,
      keyLevel,
    ));

    const backendResponse = await sendTx({ signedTx: finalizer.finalize() });
    Logger.debug('hwTransactions::prepareAndBroadcastLedgerSignedTx: success');

    return backendResponse;
  } catch (sendTxError) {
    Logger.error('hwTransactions::prepareAndBroadcastLedgerSignedTx error: ' + stringifyError(sendTxError));
    if (sendTxError instanceof InvalidWitnessError) {
      throw new InvalidWitnessError();
    } else {
      throw new SendTransactionError();
    }
  }
}

function prepareWitness(
  finalizer: RustModule.Wallet.TransactionFinalized,
  ledgerWitness: Witness,
  publicKey: RustModule.Wallet.PublicKey,
  keyLevel: number,
): void {
  let finalKey = publicKey;
  for (let i = keyLevel; i < ledgerWitness.path.length; i++) {
    finalKey = finalKey.derive(
      RustModule.Wallet.DerivationScheme.v2(),
      ledgerWitness.path[3]
    );
  }

  const txSignature = RustModule.Wallet.TransactionSignature.from_hex(
    ledgerWitness.witnessSignatureHex
  );

  const witness = RustModule.Wallet.Witness.from_external(finalKey, txSignature);
  finalizer.add_witness(witness);
}