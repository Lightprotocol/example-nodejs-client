# example-nodejs-client

Commonjs script that executes basic compression/decompression/transfer instructions.

### Requirements

**You need to have the CLI installed to run this example on Localnet. For installation instructions, see [here](https://github.com/Lightprotocol/light-protocol/tree/main/cli#readme)**

### Start a light test-validator for localnet

```bash
# Start a light test-validator using the CLI
light test-validator
```

### Running the Token Example

To run the `token.ts` example:

1. By default, it interacts with Solana Devnet.
2. Create a `.env` file in the root directory using `.env.example` as a template.
3. Set your `RPC_ENDPOINT`, `PAYER_KEYPAIR`, `MINT_ADDRESS` in the `.env` file.

### Running the full example

```bash
npm install
```

```bash
# npm run connection
# npm run token
# npm run lamports
# npm run extended
# npm run lookup-table
npm run example
npm run debug-ix-too-large
```
