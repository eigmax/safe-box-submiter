import { Psbt, script as btcscript, opcodes, networks, payments } from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';

const network = networks.testnet;
const ECPair = ECPairFactory(ecc);


async function submit() {
    const serializedStakingData = Buffer.concat([
        Buffer.from("6e756c6c", "hex"), // 4 bytes, endianess not applicable to byte array
        Buffer.from("8943545177806ED17B9F23F0a21ee5948eCaa776", "hex") // 20 bytes, endianess not applicable to byte array
    ]);
    const script = btcscript.compile([opcodes.OP_RETURN, serializedStakingData]);
    const psbt = new Psbt({ network });

    let funding_amount = 846400; //sat
    let locked_amount = 41000;
    let fee = 200;
    let changeAmount = funding_amount - locked_amount - fee;

    psbt.addOutputs([
        {
            address: "tb1ql3zk8pngnhlga9xle7hg5zu486u369qttvdwhq",
            value: locked_amount
        },
        {
            script: script,
            value: 0,
        },
        {
            address: "tb1qfpfy0hhzpax6xkjz9y0ns6hdj36kp04geatuw0", // Your BTC address to receive change
            value: changeAmount,
        }
    ]);

    // https://mempool.space/testnet/tx/06a6a1c5eab13172e77aa020bc9b62251f3fa664109fde06d1a1587e96dcbe12
    let utxo = {
        txid: "359e50fbbe1bedee04c3f7063dd5ed8efdd48fb4957b00808b96d1f4cb3741a5",
        vout: 2,
        scriptPubKey: "0014485247dee20f4da35a42291f386aed947560bea8",
    };

    // Add Your funding UTXO
    psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        sequence: 0xfffffffd,
        witnessUtxo: {
            script: Buffer.from(utxo.scriptPubKey, "hex"),
            value: funding_amount,
        },
    });

    // funding account private key
    let private_key: string = process.env.PRIVATE_KEY || "";
    const signer = ECPair.fromWIF(private_key, network);

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

submit().then((data) => {
    console.log(
        `curl -XPOST https://blockstream.info/testnet/api/tx -H "Content-Type: text/plain" -d "${data}"`
    )
})
