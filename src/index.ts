import { Psbt, script as btcscript, opcodes, networks, payments } from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';

const network = networks.testnet;
const ECPair = ECPairFactory(ecc);

const fetch = require('node-fetch'); // or use native fetch in browsers
const RPC = `https://blockstream.info/testnet/api`

async function getUTXOs(address: any) {
  const url = `${RPC}/address/${address}/utxo`;
  const response = await fetch(url);
  const utxos = await response.json();

  console.log(utxos);
  // Each UTXO contains: txid, vout, value (in sats), status.confirmed, etc.
  return utxos;
}

const LOCK_ADDRESS = process.env.ADDRESS || `tb1qfpfy0hhzpax6xkjz9y0ns6hdj36kp04geatuw0`;
const LOCK_PRIVATE_KEY = process.env.PRIVATE_KEY || ``;

async function getScriptPubKey(txid: any, vout: any) {
  const res = await fetch(`${RPC}/tx/${txid}`);
  const tx = await res.json();
  const output = tx.vout[vout];

  return output.scriptpubkey;
}

const LOCKED_AMOUNT = 51000;
const FEE = 200;

async function submit(utxo: any) {
    const serializedStakingData = Buffer.concat([
        Buffer.from("6e756c6c", "hex"), // 4 bytes, endianess not applicable to byte array
        Buffer.from("2d091a1939c276293677886792B77EBa59183c97", "hex") // 20 bytes, endianess not applicable to byte array
    ]);
    const script = btcscript.compile([opcodes.OP_RETURN, serializedStakingData]);
    const psbt = new Psbt({ network });

    let funding_amount = utxo.value; //sat
    let changeAmount = funding_amount - LOCKED_AMOUNT - FEE;

    psbt.addOutputs([
        {
            address: "tb1ql3zk8pngnhlga9xle7hg5zu486u369qttvdwhq",
            value: LOCKED_AMOUNT
        },
        {
            script: script,
            value: 0,
        },
        {
            address: LOCK_ADDRESS, // Your BTC address to receive change
            value: changeAmount,
        }
    ]);

    // Add Your funding UTXO
    let scriptPubKey = await getScriptPubKey(utxo.txid, utxo.vout);
    psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        sequence: 0xfffffffd,
        witnessUtxo: {
            script: Buffer.from(scriptPubKey, "hex"),
            value: funding_amount,
        },
    });

    // funding account private key
    const signer = ECPair.fromWIF(LOCK_PRIVATE_KEY, network);

    psbt.signInput(0, signer);

    const validator = (
        pubkey: Buffer,
        msghash: Buffer,
        signature: Buffer,
    ): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature);
    console.log(psbt.validateSignaturesOfAllInputs(validator));

    console.log("input number: ", psbt.inputCount);
    psbt.finalizeAllInputs();

    let tx = psbt.extractTransaction()

    return tx.toHex();
}

getUTXOs(LOCK_ADDRESS).then((utxos) => {
    console.log(`ADDR: ${LOCK_ADDRESS}, KEY: ${LOCK_PRIVATE_KEY}`);
    if (utxos.length <= 0) {
        process.exit("No utxo found")
    }
    let utxo = utxos.find((item: any) => item.value >= (LOCKED_AMOUNT + FEE))
    submit(utxo).then((data) => {
        console.log(
            `curl -XPOST ${RPC}/tx -H "Content-Type: text/plain" -d "${data}"`
        )
    })
});
