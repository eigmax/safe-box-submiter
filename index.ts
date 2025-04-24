import { Psbt, script, opcodes, network } from 'bitcoinjs-lib';

const serializedStakingData = Buffer.concat([
    Buffer.from("6e756c6c", "hex"), // 4 bytes, endianess not applicable to byte array
    Buffer.from("2d091a1939c276293677886792B77EBa59183c97", "hex") // 20 bytes, endianess not applicable to byte array
]);
const script = script.compile([opcodes.OP_RETURN, serializedStakingData]);
const psbt = new Psbt({ network });
psbt.addOutput([{
    address: "tb1ql3zk8pngnhlga9xle7hg5zu486u369qttvdwhq",
    value: 51000.00000000001,
},{
    script: script,
    value: 0,
},
{
    address: "null", // Your BTC address to receive change
    value: changeAmount,
}]);

// Add Your funding UTXO
psbt.addInput({
    txid: utxo.txid,
    vout: utxo.vout,
    sequence: 0xfffffffd,
    witnessUtxo: {
        script: Buffer.from(utxo.scriptPubKey, "hex"),
        value: Your funding amount,
    },
});

const signedPsbt = await signer.signPsbt(psbt.toHex());
const txId = await signer.pushPsbt(signedPsbt);
