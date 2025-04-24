# safe-box-submiter

1. Install `node` and run the commands below to generate your locking transaction

```
npm i

export ADDRESS=``
export PRIVATE_KEY=``
npm run send
```

2. Copy the output and push your tx

```
curl -XPOST https://blockstream.info/testnet/api/tx -H "Content-Type: text/plain" -d "xxxx"
```

